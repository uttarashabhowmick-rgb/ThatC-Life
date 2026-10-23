// Minimal, dependency-free MCP server implementing the Streamable HTTP transport
// (MCP spec 2025-11-25): JSON-RPC 2.0 over POST /mcp, Mcp-Session-Id, MCP-Protocol-Version,
// Origin validation, optional bearer auth, 202 for notifications, DELETE to end a session.
import crypto from 'node:crypto';
import { tools, runTool, view } from './actions.js';
import { workspace, publish } from './store.js';

export const SUPPORTED = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = {
  name: 'thatc-life', title: 'ThatC Life', version: '1.0.0',
  description: 'Adaptive AI that changes how it helps as time, progress and circumstances change.',
};
const INSTRUCTIONS = 'ThatC Life is a time- and progress-aware coach. Start with start_session, then keep it informed with complete_step, report_blocker, update_time and change_goal. Always speak the returned text to the user; it is already written for voice. Never assume the user is distracted — ask which of hard / interrupted / approach applies.';

const sessions = new Map(); // mcp session id -> { household, protocol }

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message, data) => ({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });

function allowedOrigin(origin) {
  if (!origin) return true; // non-browser clients (Alexa+ cloud) send no Origin
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  try {
    const u = new URL(origin);
    return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(u.hostname) || extra.includes(origin);
  } catch { return false; }
}

async function handleRpc(msg, ctx) {
  const { method, params, id } = msg;
  const isNotification = id === undefined;
  switch (method) {
    case 'initialize': {
      const wanted = params?.protocolVersion;
      const protocol = SUPPORTED.includes(wanted) ? wanted : SUPPORTED[0];
      ctx.newSession = { protocol };
      return ok(id, {
        protocolVersion: protocol,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO, instructions: INSTRUCTIONS,
      });
    }
    case 'notifications/initialized': case 'notifications/cancelled': return null;
    case 'ping': return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: tools.map(({ run, ...t }) => t) });
    case 'tools/call': {
      const name = params?.name;
      if (!tools.find((t) => t.name === name)) return err(id, -32602, `Unknown tool: ${name}`);
      const ws = workspace(ctx.household);
      const r = await runTool(ws, name, params.arguments);
      if (r.isError) return ok(id, { content: [{ type: 'text', text: r.say }], isError: true });
      ws.lastVoice = { tool: name, args: params.arguments || {}, say: r.say, at: ws.now(), source: 'alexa' };
      if (ws.notice) ws.notice.source = 'alexa';
      publish(ws.id, { type: 'state' });
      const a = r.state.assessment;
      return ok(id, {
        content: [{ type: 'text', text: r.say }],
        structuredContent: a ? { mode: a.mode, remainingMinutes: Math.round(a.remainingMin), currentStep: a.current?.title ?? null, reason: a.reason, question: a.message.question } : { mode: null },
      });
    }
    default:
      return isNotification ? null : err(id, -32601, `Method not found: ${method}`);
  }
}

export async function handleMcp(req, res, body, household) {
  const send = (status, obj, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(obj === undefined ? '' : JSON.stringify(obj));
  };
  if (!allowedOrigin(req.headers.origin)) return send(403, err(null, -32000, 'Origin not allowed'));
  if (process.env.MCP_AUTH_TOKEN && req.headers.authorization !== `Bearer ${process.env.MCP_AUTH_TOKEN}`)
    return send(401, err(null, -32000, 'Unauthorized'), { 'WWW-Authenticate': 'Bearer' });

  if (req.method === 'GET') { res.writeHead(405, { Allow: 'POST, DELETE' }); return res.end(); } // no server-initiated stream offered
  const sid = req.headers['mcp-session-id'];
  if (req.method === 'DELETE') {
    if (!sid || !sessions.has(sid)) return send(404, err(null, -32001, 'Session not found'));
    sessions.delete(sid); return send(200, undefined);
  }
  if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST, GET, DELETE' }); return res.end(); }

  let msg;
  try { msg = JSON.parse(body); } catch { return send(400, err(null, -32700, 'Parse error')); }
  const batch = Array.isArray(msg);
  const list = batch ? msg : [msg];
  if (!list.length || list.some((m) => !m || m.jsonrpc !== '2.0')) return send(400, err(null, -32600, 'Invalid Request'));

  const isInit = list.some((m) => m.method === 'initialize');
  if (!isInit) {
    if (sid && !sessions.has(sid)) return send(404, err(null, -32001, 'Session not found or expired — re-initialize'));
    const pv = req.headers['mcp-protocol-version'];
    if (pv && !SUPPORTED.includes(pv)) return send(400, err(null, -32600, `Unsupported MCP-Protocol-Version: ${pv}`));
  }
  const ctx = { household: sessions.get(sid)?.household || household };
  const out = [];
  for (const m of list) {
    if (m.method === undefined) continue; // a client response; nothing to do
    const r = await handleRpc(m, ctx);
    if (r) out.push(r);
  }
  if (!out.length) return send(202, undefined);
  const headers = {};
  if (ctx.newSession) { const id = crypto.randomUUID(); sessions.set(id, { household, ...ctx.newSession }); headers['Mcp-Session-Id'] = id; }
  return send(200, batch ? out : out[0], headers);
}
