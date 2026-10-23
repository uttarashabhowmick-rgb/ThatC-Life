import fs from 'node:fs';
import path from 'node:path';
const FILE = path.join(process.cwd(), 'data', 'state.json');
const spaces = new Map();
const listeners = new Map();
let timer = null;

try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(FILE, 'utf8')))) spaces.set(k, v); } catch {}

export function workspace(id = 'demo') {
  if (!spaces.has(id)) spaces.set(id, { session: null, skewMs: 0, lastVoice: null });
  const ws = spaces.get(id);
  ws.now = () => Date.now() + (ws.skewMs || 0); // skew only ever set by the labelled demo clock
  ws.id = id;
  ws.onChange = ws.onChange || (() => publish(id, {}));
  return ws;
}
export function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      const out = {}; for (const [k, v] of spaces) { const { now, id, ...rest } = v; out[k] = rest; }
      fs.writeFileSync(FILE, JSON.stringify(out));
    } catch {}
  }, 200);
}
export const subscribe = (id, fn) => { if (!listeners.has(id)) listeners.set(id, new Set()); listeners.get(id).add(fn); return () => listeners.get(id).delete(fn); };
export const publish = (id, payload) => { persist(); for (const fn of listeners.get(id) || []) fn(payload); };
export const resetWorkspace = (id) => spaces.delete(id);
export const allWorkspaces = () => [...spaces.keys()].map((k) => workspace(k));
