// One registry of "tools" shared by the MCP server (Alexa+) and the Fire TV remote.
// Same brain, same state, different interfaces. Every tool also emits a "notice" (sound + text) the TV plays.
import { createSession, assess, snapshot, completeStep, reportBlocker, updateTime, changeGoal, builtinPlan, swapPlan, applyRebrief, fmt } from './engine.js';
import { planWithFallback, llmRebrief, provider } from './llm.js';

const PLAN_WAIT_MS = Number(process.env.THATC_PLAN_WAIT_MS || 6500); // voice must stay snappy; AI plan upgrades in place if late
const noSession = { say: 'You don\'t have an active session yet. Tell me what you\'re working on and how long you have.', needsSession: true };
let noticeSeq = 0;

export function notify(ws, n) {
  ws.notice = { id: ++noticeSeq + '-' + Date.now(), at: ws.now(), speak: false, source: 'tool', ...n };
  return ws.notice;
}
const race = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

export const tools = [
  {
    name: 'start_session', title: 'Start a ThatC Life session',
    description: 'Start an adaptive session for ANY task the user needs to finish by a deadline (study, cooking, packing, coding, workout, presentation, chores…). Call this when the user says what they need to do and how long they have.',
    inputSchema: { type: 'object', properties: {
      goal: { type: 'string', description: 'What the user wants to accomplish, in their own words.' },
      minutes: { type: 'number', description: 'Minutes available until the deadline.', minimum: 1, maximum: 1440 },
    }, required: ['goal', 'minutes'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async run(ws, { goal, minutes }) {
      if (!goal || !(minutes > 0)) return { error: 'Need a goal and minutes available.' };
      goal = String(goal).slice(0, 200); minutes = Math.min(1440, minutes);
      const builtin = builtinPlan(goal, minutes);
      const pending = planWithFallback(goal, minutes, builtin); // resolves to builtin on any failure
      const plan = (await race(pending, PLAN_WAIT_MS)) || builtin;
      ws.session = createSession(goal, minutes, ws.now(), plan);
      ws.lastNoticedMode = null;
      if (plan === builtin && provider()) upgradeLater(ws, ws.session, pending);
      return { sound: 'start' };
    },
  },
  {
    name: 'get_guidance', title: 'Get adaptive guidance',
    description: 'Reassess time, progress and goal, and return what to do right now plus the key information for it. Use for "what should I do", "how am I doing", "what\'s next".',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run(ws) { if (!ws.session) return noSession; return {}; },
  },
  {
    name: 'get_briefing', title: 'Get what you need to know',
    description: 'Return the specific information needed for the current step, sized to the time left (fewer, sharper points as time shrinks). Use for "what do I need to know", "give me tips", "help me with this step".',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run(ws) {
      if (!ws.session) return noSession;
      const a = assess(ws.session, ws.now());
      if (!a.brief?.points?.length) return {};
      return { override: `For ${a.current.title}, with ${fmt(a.remainingMin)} left: ${a.brief.points.map((p, i) => `${i + 1}. ${p}`).join(' ')}`, sound: 'info' };
    },
  },
  {
    name: 'complete_step', title: 'Mark a step complete',
    description: 'Mark a step as finished. With no argument, completes the current step. Triggers a full reassessment.',
    inputSchema: { type: 'object', properties: {
      step: { type: 'string', description: 'Optional step id or words from its title. Omit for the current step.' },
    }, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    run(ws, { step }) {
      if (!ws.session) return noSession;
      const r = completeStep(ws.session, step, ws.now());
      if (!r.ok) return { error: r.text };
      return { prefix: ['Nice. ', 'Done. ', 'Good. ', 'That\'s one down. '][Math.floor(Math.random() * 4)], sound: 'step' };
    },
  },
  {
    name: 'report_blocker', title: 'Report what is slowing things down',
    description: 'Tell ThatC Life why progress is slow so it can adapt. reason: "hard" (the step is difficult), "interrupted" (something took the user away), "approach" (the current method isn\'t working), "ontrack" (they\'re fine). ThatC Life also notices slow progress by itself, so this is only needed to answer its question.',
    inputSchema: { type: 'object', properties: {
      reason: { type: 'string', enum: ['hard', 'interrupted', 'approach', 'ontrack'] },
      minutes_lost: { type: 'number', description: 'For interruptions: how many minutes were lost.' },
    }, required: ['reason'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    run(ws, { reason, minutes_lost }) {
      if (!ws.session) return noSession;
      if (!['hard', 'interrupted', 'approach', 'ontrack'].includes(reason)) return { error: 'Reason must be hard, interrupted, approach or ontrack.' };
      reportBlocker(ws.session, reason, ws.now(), { minutes: minutes_lost });
      return { sound: 'blocker' };
    },
  },
  {
    name: 'update_time', title: 'Change the time remaining',
    description: 'The deadline moved. Set how many minutes are left from now (e.g. "I only have 25 minutes now"). ThatC Life re-plans around what is already done and re-sizes the information to the new time.',
    inputSchema: { type: 'object', properties: {
      minutes_remaining: { type: 'number', minimum: 1, maximum: 1440 },
    }, required: ['minutes_remaining'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    run(ws, { minutes_remaining }) {
      if (!ws.session) return noSession;
      if (!(minutes_remaining > 0)) return { error: 'Need minutes remaining.' };
      const s = ws.session; const m = Math.min(1440, minutes_remaining);
      updateTime(s, m, ws.now());
      if (provider()) rebriefLater(ws, s, m);
      return { prefix: 'Understood — the deadline just changed. ', sound: 'time' };
    },
  },
  {
    name: 'change_goal', title: 'Change the goal',
    description: 'The user\'s objective changed. Reassess from scratch while carrying forward finished work instead of throwing it away.',
    inputSchema: { type: 'object', properties: {
      new_goal: { type: 'string' },
      minutes_remaining: { type: 'number', description: 'Optional new time budget in minutes.' },
    }, required: ['new_goal'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async run(ws, { new_goal, minutes_remaining }) {
      if (!ws.session) return noSession;
      if (!new_goal) return { error: 'Need the new goal.' };
      const s = ws.session, now = ws.now(); const goal = String(new_goal).slice(0, 200);
      const rem = Math.max(3, minutes_remaining || (s.deadline - now) / 60000);
      const banked = [...s.banked, ...s.steps.filter((x) => x.done)].map((x) => x.title);
      const plan = await race(planWithFallback(goal, rem, builtinPlan(goal, rem), { bankedTitles: banked }), PLAN_WAIT_MS);
      const r = changeGoal(s, goal, now, minutes_remaining, plan || undefined);
      return { prefix: r.kept.length ? `Got it — new goal. I'm keeping your finished work: ${r.kept.join(', ').toLowerCase()}. ` : 'Got it — new goal. ', sound: 'goal' };
    },
  },
];

// A late AI plan replaces the instant built-in one, but only if nothing has been done yet.
function upgradeLater(ws, session, pending) {
  pending.then((plan) => {
    if (plan?.source !== 'ai' || ws.session !== session) return;
    if (swapPlan(session, plan, ws.now())) { notify(ws, { kind: 'upgrade', sound: 'info', say: 'I\'ve tailored your plan to this exact task.', source: 'auto' }); ws.onChange?.(); }
  }).catch(() => {});
}
function rebriefLater(ws, session, minutes) {
  llmRebrief(session.goal, session.steps.filter((x) => !x.done), minutes).then((list) => {
    if (ws.session === session && applyRebrief(session, list)) ws.onChange?.();
  }).catch((e) => console.warn('[llm] rebrief failed:', e.message));
}

export async function runTool(ws, name, args = {}) {
  const t = tools.find((x) => x.name === name);
  if (!t) return null;
  const out = await t.run(ws, args || {});
  if (out.error) return { isError: true, say: out.error };
  if (out.needsSession) return { say: out.say, state: view(ws) };
  const now = ws.now();
  const before = ws.lastNoticedMode;
  const a = snapshot(ws.session, now);
  let say = out.override || (out.prefix || '') + a.message.say;
  // sound: a brand-new mode gets that mode's own sound; otherwise the sound of the event itself
  let sound = out.sound || 'info';
  if (a.mode !== before && before !== null && name !== 'get_briefing') sound = a.mode;
  if (a.mode === 'done') { sound = 'done'; ws.session.flags.completeFired = true; }
  ws.lastNoticedMode = a.mode;
  notify(ws, { kind: name, sound, say, mode: a.mode, speak: false, source: 'tool' });
  return { say, state: view(ws) };
}

export function view(ws) {
  if (!ws.session) return { session: null, now: ws.now(), lastVoice: ws.lastVoice || null, notice: ws.notice || null, ai: provider() };
  const now = ws.now();
  const a = assess(ws.session, now);
  const s = ws.session;
  return {
    now, deadline: s.deadline, createdAt: s.createdAt,
    session: { goal: s.goal, label: s.label, category: s.category, steps: s.steps, banked: s.banked, timeline: s.timeline, goalHistory: s.goalHistory, interruptions: s.interruptions },
    assessment: a, lastVoice: ws.lastVoice || null, notice: ws.notice || null, ai: provider(), demoSkewMin: Math.round((ws.skewMs || 0) / 60000),
  };
}
