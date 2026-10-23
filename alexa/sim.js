// Simulated Alexa+ — a real MCP client (Streamable HTTP, spec 2025-11-25) + a small utterance→tool router.
// In production Alexa+ does the language understanding and tool choice itself; here a rule-based router stands in.
const H = new URLSearchParams(location.search).get('h') || 'demo';
const $ = (s) => document.querySelector(s);
const log = $('#log'), trace = $('#trace'), orb = $('#orb');
let sessionId = null, tools = [], rpcId = 1;

// ---------- MCP client ----------
async function rpc(method, params, { notify = false } = {}) {
  const body = notify ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id: rpcId++, method, params };
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (sessionId) { headers['Mcp-Session-Id'] = sessionId; headers['MCP-Protocol-Version'] = '2025-11-25'; }
  const t = addTrace(`POST /mcp  ${method}`, body);
  const r = await fetch(`/mcp?h=${encodeURIComponent(H)}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const sid = r.headers.get('Mcp-Session-Id'); if (sid) sessionId = sid;
  const data = r.status === 202 ? null : await r.json();
  t(`${r.status}${data ? '  ' + JSON.stringify(data.result ?? data.error).slice(0, 700) : ''}`);
  if (data?.error) throw new Error(data.error.message);
  return data?.result;
}
function addTrace(head, body) {
  const el = document.createElement('div'); el.className = 't';
  el.innerHTML = `<div class="h"></div><div class="rq"></div><div class="rs"></div>`;
  el.children[0].textContent = head; el.children[1].textContent = JSON.stringify(body.params ?? {}).slice(0, 400);
  trace.prepend(el); return (res) => { el.children[2].textContent = '← ' + res; };
}
async function connect() {
  await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'alexa-plus-simulator', version: '1.0.0' } });
  await rpc('notifications/initialized', {}, { notify: true });
  tools = (await rpc('tools/list', {})).tools;
  $('#conn').textContent = `MCP connected · ${tools.length} tools`; $('#conn').classList.add('ok');
}
const callTool = async (name, args = {}) => {
  const r = await rpc('tools/call', { name, arguments: args });
  return { text: r.content?.[0]?.text || '', isError: r.isError, s: r.structuredContent };
};

// ---------- utterance → tool: the server's NLU (an LLM when configured, rules otherwise) stands in for Alexa+'s own understanding ----------
async function understand(u) {
  const r = await fetch(`/api/nlu?h=${encodeURIComponent(H)}`, { method: 'POST', body: JSON.stringify({ text: u }) });
  return r.json();
}

// ---------- UI ----------
function bubble(cls, html, who) {
  const d = document.createElement('div'); d.className = 'b ' + cls; d.innerHTML = (who ? `<small>${who}</small>` : '') + html.replace(/</g, '&lt;'); log.append(d); log.scrollTop = log.scrollHeight; return d;
}
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.04; u.pitch = 1.0;
  const v = speechSynthesis.getVoices().find((x) => /en-(US|GB)/.test(x.lang) && /(Samantha|Google US English|Jenny|Aria|Natural)/.test(x.name)); if (v) u.voice = v;
  u.onstart = () => { orb.className = 'orb speaking'; }; u.onend = () => { orb.className = 'orb'; $('#status').textContent = ''; };
  speechSynthesis.speak(u);
}
async function say(utterance) {
  if (!utterance.trim()) return;
  bubble('u', utterance); $('#status').textContent = 'Thinking…'; orb.className = 'orb listening';
  try {
    const nlu = await understand(utterance);
    if (nlu.ask) { bubble('a', nlu.ask, 'Alexa+ · via ThatC Life'); $('#status').textContent = 'asking a follow-up'; orb.className = 'orb'; speak(nlu.ask); return; }
    const name = nlu.tool, args = nlu.args || {};
    const r = await callTool(name, args);
    bubble('a', r.text, 'Alexa+ · via ThatC Life'); $('#status').textContent = `tool: ${name}${r.s?.mode ? ' → mode: ' + r.s.mode : ''}`;
    orb.className = 'orb'; speak(r.text);
  } catch (e) { bubble('a', 'Sorry, I couldn\'t reach ThatC Life. ' + e.message, 'Alexa+'); orb.className = 'orb'; }
}
const CHIPS = ['I need to finish an investor presentation in two hours', 'I want to learn five guitar chords in 30 minutes', 'I have to pack for a trip in 40 minutes', 'I finished that step', 'What do I need to know?', 'I only have 25 minutes left', 'Actually, change my goal to a two minute elevator pitch'];
$('#chips').innerHTML = CHIPS.map((c) => `<button class="chip">${c}</button>`).join('');
$('#chips').onclick = (e) => { if (e.target.classList.contains('chip')) say(e.target.textContent); };
$('#f').onsubmit = (e) => { e.preventDefault(); const v = $('#q').value; $('#q').value = ''; say(v); };

// real voice input where the browser supports it
const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const mic = $('#mic');
if (SR) {
  const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false;
  rec.onresult = (e) => say(e.results[0][0].transcript); rec.onend = () => { mic.classList.remove('on'); if (orb.className === 'orb listening') orb.className = 'orb'; };
  mic.onclick = () => { speechSynthesis.cancel(); mic.classList.add('on'); orb.className = 'orb listening'; $('#status').textContent = 'Listening…'; rec.start(); };
} else mic.onclick = () => $('#q').focus();

document.querySelectorAll('[data-adv]').forEach((b) => b.onclick = async () => { await fetch(`/api/demo/advance?h=${H}`, { method: 'POST', body: JSON.stringify({ minutes: +b.dataset.adv }) }); bubble('a', `⏩ Demo clock advanced ${b.dataset.adv} minutes.`, 'Demo'); });
$('#reset').onclick = async () => { await fetch(`/api/demo/reset?h=${H}`, { method: 'POST' }); log.innerHTML = ''; bubble('a', 'Reset. Tell me what you\'re working on and how long you have.', 'Alexa+ · via ThatC Life'); };
speechSynthesis?.getVoices?.();
connect().then(() => bubble('a', 'Hi — tell me what you\'re working on and how long you have.', 'Alexa+ · via ThatC Life')).catch((e) => { $('#conn').textContent = 'MCP error: ' + e.message; });

// ---- proactive: ThatC Life speaks up by itself (Alexa+ proactive notification), no one asked ----
let lastNoticeId; const es = new EventSource(`/api/events?h=${encodeURIComponent(H)}`);
es.onmessage = (e) => {
  const n = JSON.parse(e.data).notice;
  if (lastNoticeId === undefined) { lastNoticeId = n?.id || null; return; }
  if (!n || n.id === lastNoticeId) return; lastNoticeId = n.id;
  if (n.source !== 'auto' || !n.speak) return;
  bubble('a', n.say, 'Alexa+ · proactive'); $('#status').textContent = `noticed: ${n.kind}${n.mode ? ' → ' + n.mode : ''}`; speak(n.say);
};
