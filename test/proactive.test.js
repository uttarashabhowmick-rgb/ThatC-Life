import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
process.env.THATC_PLAN_WAIT_MS = '400';
process.env.THATC_LLM_TIMEOUT_MS = '3000';
const { workspace, resetWorkspace } = await import('../src/store.js');
const { runTool } = await import('../src/actions.js');
const { tick } = await import('../src/monitor.js');
const { rules } = await import('../src/nlu.js');
const { builtinPlan } = await import('../src/engine.js');
const fresh = (id) => { resetWorkspace(id); return workspace(id); };
const adv = (ws, min) => { ws.skewMs = (ws.skewMs || 0) + min * 60000; };

test('ANY task gets a sensible plan, with real info sized to the time', async () => {
  for (const [g, m] of [['bake sourdough bread', 90], ['prepare for my visa interview', 45], ['learn the basics of sketching', 25], ['reorganise my wardrobe', 30], ['write a wedding toast', 20], ['file my taxes', 180], ['something totally unusual and vague', 17]]) {
    const ws = fresh('any-' + g); const r = await runTool(ws, 'start_session', { goal: g, minutes: m });
    const a = r.state.assessment;
    assert.ok(r.state.session.steps.length >= 3, g);
    assert.ok(a.current && a.brief.points.length >= 1, `${g}: has task information`);
    assert.ok(a.message.say.length > 20, g);
    assert.ok(a.tier.realistic.includes(String(m)) || a.mode === 'sprint', g);
  }
});

test('time changes how much information you get (fewer, sharper points)', async () => {
  const ws = fresh('sized'); await runTool(ws, 'start_session', { goal: 'investor presentation', minutes: 240 });
  const long = (await runTool(ws, 'get_guidance')).state.assessment.brief.points.length;
  await runTool(ws, 'update_time', { minutes_remaining: 8 });
  const short = (await runTool(ws, 'get_guidance')).state.assessment.brief.points.length;
  assert.ok(long > short, `${long} > ${short}`);
});

test('free-form speech: no fixed phrases required', () => {
  assert.deepEqual(rules('I want to learn five guitar chords in 30 minutes').args.minutes, 30);
  assert.match(rules('I want to learn five guitar chords in 30 minutes').args.goal, /guitar/);
  assert.equal(rules('Alexa, I have an exam tomorrow, give me an hour and a half to revise chemistry').tool, 'start_session');
  const ask = rules('I need to bake bread'); assert.ok(ask.ask && ask.pendingGoal);
  assert.deepEqual(rules('about an hour', { pendingGoal: ask.pendingGoal }).args, { goal: ask.pendingGoal, minutes: 60 });
  assert.equal(rules('what do I need to know', { hasSession: true }).tool, 'get_briefing');
  assert.equal(rules('I only have 15 minutes left', { hasSession: true }).tool, 'update_time');
});

test('PROACTIVE: it notices falling behind by itself — nobody says anything', async () => {
  const ws = fresh('proactive'); await runTool(ws, 'start_session', { goal: 'investor presentation', minutes: 120 });
  assert.equal(tick(ws), null, 'nothing to announce at the start');
  adv(ws, 25);
  const n = tick(ws);
  assert.ok(n, 'a notice was raised with no user input');
  assert.equal(n.source, 'auto'); assert.equal(n.speak, true);
  assert.ok(['recover', 'triage'].includes(n.sound)); assert.match(n.say, /behind|time|longer|Heads up/i);
  assert.equal(tick(ws), null, 'does not repeat itself');
});

test('time-box, halfway, ten-minutes and deadline each fire once, each with its own sound', async () => {
  const ws = fresh('events'); await runTool(ws, 'start_session', { goal: 'study for chemistry exam', minutes: 60 });
  const seen = []; const step = (m) => { adv(ws, m); const n = tick(ws); if (n) seen.push(n.sound); return n; };
  step(12);            // first step's time-box is long gone and pace slipped
  for (let i = 0; i < 12; i++) step(4);
  step(30);
  assert.ok(seen.includes('deadline'), 'alarm at the deadline: ' + seen);
  assert.equal(seen.filter((x) => x === 'deadline').length, 1);
  assert.ok(new Set(seen).size >= 3, 'different sounds for different events: ' + seen);
});

test('shortening the deadline does not instantly fire "halfway"; new task after finishing starts fresh', async () => {
  const ws = fresh('nohalf'); await runTool(ws, 'start_session', { goal: 'investor presentation', minutes: 120 });
  tick(ws); adv(ws, 10); tick(ws);
  await runTool(ws, 'update_time', { minutes_remaining: 25 });
  const n = tick(ws); assert.ok(!n || n.kind !== 'milestone', 'no instant milestone: ' + JSON.stringify(n && n.kind));
  assert.equal(rules('I want to learn five guitar chords in 30 minutes', { hasSession: true }).tool, 'start_session');
  assert.equal(rules('I only have 25 minutes left', { hasSession: true }).tool, 'update_time');
});

test('finishing everything triggers the DONE alarm', async () => {
  const ws = fresh('done'); await runTool(ws, 'start_session', { goal: 'pack for my trip', minutes: 40 });
  let r; for (let i = 0; i < 8; i++) { r = await runTool(ws, 'complete_step'); if (r.state.assessment.mode === 'done') break; }
  assert.equal(r.state.assessment.mode, 'done'); assert.equal(r.state.notice.sound, 'done');
});

test('every distinct event has a distinct sound defined', async () => {
  const defs = JSON.parse((await import('node:fs')).readFileSync(new URL('../tv/sounds.json', import.meta.url)));
  for (const k of ['start', 'explore', 'flow', 'recover', 'triage', 'sprint', 'step', 'blocker', 'time', 'goal', 'info', 'timebox', 'milestone', 'deadline', 'done', 'upgrade']) assert.ok(defs[k]?.length, k);
  const sig = Object.values(defs).map((n) => JSON.stringify(n)); assert.equal(new Set(sig).size, sig.length, 'no two sounds identical');
});

// ---- AI planner against a mock LLM server (the Anthropic Messages wire format) ----
function mockLLM(handler) {
  const srv = http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => handler(JSON.parse(b || '{}'), res)); });
  return new Promise((r) => srv.listen(0, () => r(srv)));
}
const plan = { label: 'Sourdough', primer: 'Feed the starter first; shape and bake only if time allows.', alternatives: ['a', 'b', 'c'], steps: [
  { key: 'levain', title: 'Build the levain', weight: .2, essential: true, explain: 'Feed starter 1:2:2.', do: 'Mix 20g starter, 40g flour, 40g water.', points: ['Use 20g starter + 40g flour + 40g water at 24°C.', 'It is ready when it doubles and domes (4–6 h).', 'Float test is unreliable; trust volume.'], express: 'Mix and leave warm.' },
  { key: 'mix', title: 'Mix and autolyse the dough', weight: .3, essential: true, explain: 'Flour and water rest.', do: 'Mix 500g flour, 350g water.', points: ['70% hydration is forgiving for a first loaf.', 'Rest 30 min before adding salt.'], express: 'Mix flour and water.' },
  { key: 'bake', title: 'Bake in a preheated Dutch oven', weight: .5, essential: true, explain: 'Steam gives the crust.', do: 'Bake 230°C lid on 20 min.', points: ['Preheat the pot 30 min at 245°C.', 'Lid on 20 min, off 20 min at 220°C.'], express: 'Bake lid on.' }] };

test('AI planner: tailored plan with task-specific facts replaces the generic one', async () => {
  const srv = await mockLLM((body, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ content: [{ type: 'text', text: '```json\n' + JSON.stringify(plan) + '\n```' }] })); });
  process.env.ANTHROPIC_API_KEY = 'test'; process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${srv.address().port}`;
  const ws = fresh('ai'); const r = await runTool(ws, 'start_session', { goal: 'bake sourdough bread', minutes: 300 });
  assert.equal(r.state.assessment.planSource, 'ai');
  assert.match(r.state.assessment.brief.points.join(' '), /20g starter/);
  assert.equal(r.state.session.label, 'Sourdough');
  srv.close(); delete process.env.ANTHROPIC_API_KEY;
});

test('AI planner: provider error or garbage falls back to the built-in plan — never breaks', async () => {
  for (const bad of [(b, res) => { res.statusCode = 500; res.end('{"error":"boom"}'); }, (b, res) => { res.end(JSON.stringify({ content: [{ type: 'text', text: 'sorry I cannot' }] })); }]) {
    const srv = await mockLLM(bad);
    process.env.ANTHROPIC_API_KEY = 'test'; process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${srv.address().port}`;
    const ws = fresh('ai-bad'); const r = await runTool(ws, 'start_session', { goal: 'pack for my trip', minutes: 40 });
    assert.equal(r.state.assessment.planSource, 'builtin'); assert.ok(r.state.session.steps.length >= 3);
    srv.close(); delete process.env.ANTHROPIC_API_KEY;
  }
});

test('AI planner: if the AI is slow the voice answers instantly, then the plan upgrades in place', async () => {
  const srv = await mockLLM((b, res) => setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(plan) }] })); }, 900));
  process.env.ANTHROPIC_API_KEY = 'test'; process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${srv.address().port}`;
  const ws = fresh('ai-slow'); const t0 = Date.now(); const r = await runTool(ws, 'start_session', { goal: 'bake sourdough bread', minutes: 300 });
  assert.ok(Date.now() - t0 < 800, 'answered before the slow AI finished'); assert.equal(r.state.assessment.planSource, 'builtin');
  await new Promise((r2) => setTimeout(r2, 1200));
  assert.equal(ws.session.planSource, 'ai'); assert.equal(ws.notice.kind, 'upgrade');
  srv.close(); delete process.env.ANTHROPIC_API_KEY;
});
