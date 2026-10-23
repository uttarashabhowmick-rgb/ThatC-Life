import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

let srv, base;
test.before(async () => { srv = createServer(); await new Promise((r) => srv.listen(0, r)); base = `http://127.0.0.1:${srv.address().port}`; });
test.after(() => srv.close());

let sid;
const rpc = async (body, headers = {}) => {
  const r = await fetch(`${base}/mcp?h=t1`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(sid ? { 'Mcp-Session-Id': sid, 'MCP-Protocol-Version': '2025-11-25' } : {}), ...headers }, body: JSON.stringify(body) });
  return { status: r.status, headers: r.headers, json: r.status === 202 ? null : await r.json() };
};
const call = async (name, args = {}) => (await rpc({ jsonrpc: '2.0', id: Math.random(), method: 'tools/call', params: { name, arguments: args } })).json.result;

test('initialize negotiates 2025-11-25 and issues a session id', async () => {
  const r = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
  assert.equal(r.json.result.protocolVersion, '2025-11-25');
  assert.ok(r.json.result.capabilities.tools);
  sid = r.headers.get('mcp-session-id'); assert.ok(sid);
  const n = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(n.status, 202);
});

test('tools/list exposes the ThatC Life tools with JSON Schema', async () => {
  const r = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const names = r.json.result.tools.map((t) => t.name);
  for (const n of ['start_session', 'get_guidance', 'complete_step', 'report_blocker', 'update_time', 'change_goal']) assert.ok(names.includes(n), n);
  assert.equal(r.json.result.tools[0].inputSchema.type, 'object');
});

test('rejects bad origin, unknown session, unknown tool', async () => {
  assert.equal((await rpc({ jsonrpc: '2.0', id: 3, method: 'ping' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await rpc({ jsonrpc: '2.0', id: 3, method: 'ping' }, { 'Mcp-Session-Id': 'nope' })).status, 404);
  assert.equal((await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } })).json.error.code, -32602);
});

test('full adaptive arc: explore → recover → triage/sprint → done', async () => {
  let r = await call('start_session', { goal: 'investor presentation', minutes: 120 });
  assert.equal(r.structuredContent.mode, 'explore');
  await fetch(`${base}/api/demo/advance?h=t1`, { method: 'POST', body: JSON.stringify({ minutes: 20 }) });
  r = await call('get_guidance');
  assert.equal(r.structuredContent.mode, 'recover');
  assert.match(r.content[0].text, /hard, did something interrupt you|approach/); // asks, never assumes
  r = await call('report_blocker', { reason: 'interrupted', minutes_lost: 20 });
  assert.match(r.content[0].text, /doesn't count against you/);
  r = await call('complete_step'); r = await call('complete_step'); r = await call('complete_step');
  r = await call('update_time', { minutes_remaining: 20 });
  assert.ok(['triage', 'sprint'].includes(r.structuredContent.mode), r.structuredContent.mode);
  r = await call('change_goal', { new_goal: 'two minute elevator pitch', minutes_remaining: 20 });
  assert.match(r.content[0].text, /keeping your finished work/);
  const st = await (await fetch(`${base}/api/state?h=t1`)).json();
  assert.equal(st.lastVoice.source, 'alexa');
  assert.ok(st.session.banked.length >= 3);
});

test('tool errors come back as isError, not protocol errors', async () => {
  const r = await call('report_blocker', { reason: 'bogus' });
  assert.equal(r.isError, true);
});
