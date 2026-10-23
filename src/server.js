import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspace, subscribe, publish, resetWorkspace, allWorkspaces } from './store.js';
import { startMonitor } from './monitor.js';
import { route as nluRoute } from './nlu.js';
import { runTool, view } from './actions.js';
import { assess } from './engine.js';
import { handleMcp } from './mcp.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

const readBody = (req) => new Promise((resolve, reject) => {
  let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e6) reject(new Error('too large')); }); req.on('end', () => resolve(b));
});
const json = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

export function createServer() {
  for (const ws of allWorkspaces()) ws.onChange = () => publish(ws.id, {});
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      const h = url.searchParams.get('household') || url.searchParams.get('h') || 'demo';
      const p = url.pathname;

      if (p === '/mcp') return handleMcp(req, res, req.method === 'POST' ? await readBody(req) : '', h);

      if (p === '/api/state') return json(res, 200, view(workspace(h)));

      if (p === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        const ws = workspace(h);
        const push = () => res.write(`data: ${JSON.stringify(view(ws))}\n\n`);
        push();
        const unsub = subscribe(h, push);
        const beat = setInterval(push, 5000); // keeps countdown + reassessment fresh
        req.on('close', () => { unsub(); clearInterval(beat); });
        return;
      }

      if (p === '/api/action' && req.method === 'POST') {
        const { tool, args } = JSON.parse((await readBody(req)) || '{}');
        const ws = workspace(h);
        const r = await runTool(ws, tool, args);
        if (!r) return json(res, 404, { error: 'unknown tool' });
        if (!r.isError) { ws.lastVoice = { tool, args, say: r.say, at: ws.now(), source: 'remote' }; if (ws.notice) ws.notice.source = 'remote'; }
        publish(h, {});
        return json(res, 200, r);
      }

      // Natural language -> tool call (LLM when configured, rules otherwise). Used by the Alexa+ simulator.
      if (p === '/api/nlu' && req.method === 'POST') {
        const { text } = JSON.parse((await readBody(req)) || '{}');
        const ws = workspace(h);
        const live = !!ws.session && assess(ws.session, ws.now()).mode !== 'done'; // a finished session counts as no session
        const r = await nluRoute(String(text || ''), { hasSession: live, pendingGoal: ws.pendingGoal || null, goal: ws.session?.goal });
        ws.pendingGoal = r.pendingGoal || null;
        return json(res, 200, r);
      }

      // Demo-only controls (clearly labelled in the UI): time travel + reset.
      if (p === '/api/demo/advance' && req.method === 'POST') {
        const { minutes = 15 } = JSON.parse((await readBody(req)) || '{}');
        const ws = workspace(h); ws.skewMs = (ws.skewMs || 0) + minutes * 60000;
        publish(h, {}); return json(res, 200, view(ws)); // the monitor notices the change by itself on its next tick
      }
      if (p === '/api/demo/reset' && req.method === 'POST') { resetWorkspace(h); publish(h, {}); return json(res, 200, { ok: true }); }

      // static
      let rel = p === '/' ? '/index.html' : p;
      if (rel === '/tv' || rel === '/alexa') { res.writeHead(302, { Location: rel + '/' }); return res.end(); }
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.normalize(path.join(root, rel));
      const allowed = ['tv', 'alexa', 'public'].some((d) => file.startsWith(path.join(root, d) + path.sep)) || file === path.join(root, 'index.html');
      if (!allowed || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      json(res, 500, { error: String(e.message || e) });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  startMonitor(allWorkspaces, (ws) => publish(ws.id, {}));
  createServer().listen(port, '0.0.0.0', () => {
    console.log(`\n  ThatC Life running\n  Fire TV UI   http://localhost:${port}/tv/\n  Alexa+ sim   http://localhost:${port}/alexa/\n  MCP endpoint http://localhost:${port}/mcp   (Streamable HTTP, spec 2025-11-25)\n`);
  });
}
