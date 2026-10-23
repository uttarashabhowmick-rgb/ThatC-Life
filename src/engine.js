// ThatC Life — adaptive engine.
// Time awareness + progress awareness + adaptive interaction + continuous reassessment.
// Pure functions, zero dependencies. The engine never *assumes* the user is failing:
// it gathers evidence, asks when it matters, and distinguishes hard / interrupted / wrong approach.

import { BRIEFS } from './briefs.js';

const MIN = 60000;
export const BUDGET = 0.7; // plan work fills 70% of the window, leaving real slack

export const MODES = {
  explore: { label: 'Explore', color: '#7c5cff', tagline: 'Plenty of time. Let\'s understand it properly.' },
  flow:    { label: 'Flow',    color: '#18d6b4', tagline: 'On pace. Keep the momentum.' },
  recover: { label: 'Recover', color: '#ffb020', tagline: 'Behind plan. Finding the real bottleneck.' },
  triage:  { label: 'Triage',  color: '#ff7a3d', tagline: 'Not everything fits. Protecting what matters.' },
  sprint:  { label: 'Sprint',  color: '#ff3d5a', tagline: 'Crunch time. One move at a time.' },
  done:    { label: 'Done',    color: '#4ade80', tagline: 'Finished. Nicely done.' },
};

import { TEMPLATES, detectCategory, tierOf, TIERS } from './templates.js';
export { TEMPLATES, detectCategory, tierOf, TIERS };

const kw = (s) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) || []);

const shortGoal = (g) => (g.length > 44 ? g.slice(0, 41).trim() + '…' : g);

// A "plan" is the unit both planners produce (built-in templates or an LLM):
// { label, category, primer, alts[], source, steps:[{key,title,w,essential,explain,do,points[],express}] }
export function builtinPlan(goal, minutes = 60) {
  const category = detectCategory(goal);
  const tpl = TEMPLATES[category];
  const g = shortGoal(goal);
  const steps = tpl.steps.map((s, i) => {
    const tips = tpl.tips || [];
    const rot = tips.length ? [0, 1, 2].map((j) => tips[(i + j) % tips.length]).filter((v, k, arr) => arr.indexOf(v) === k) : [s.explain]; // different tips per step, never repeating the step's own text
    const b = BRIEFS[`${category}.${s.key}`] || { p: rot, x: s.do };
    const title = category === 'general' ? ({
      clarify: `Define what "${g}" looks like when it's finished`,
      plan: `Break "${g}" into its three biggest pieces`,
      core: `Do the most important piece of "${g}"`,
      rest: `Finish the remaining pieces`,
      check: `Check the result and finish`,
    }[s.key] || s.title) : s.title;
    return { key: s.key, title, w: s.w, essential: s.essential, explain: s.explain, do: s.do, points: b.p, express: b.x };
  });
  const musts = steps.filter((x) => x.essential).map((x) => x.title.toLowerCase());
  const opts = steps.filter((x) => !x.essential).map((x) => x.title.toLowerCase());
  return {
    label: tpl.label, category, alts: tpl.alt, source: 'builtin',
    primer: `${TIERS[tierOf(minutes)].realistic(Math.round(minutes))} ${TIERS[tierOf(minutes)].rhythm} ${steps.length} steps. Must-do: ${musts.join('; ')}.` + (opts.length ? ` Dropped first if time gets short: ${opts.join('; ')}.` : ''),
    steps,
  };
}

export function stepsFromPlan(plan, minutes, skipKeys = new Set(), idStart = 1) {
  let picked = plan.steps.filter((s) => !skipKeys.has(s.key));
  if (minutes <= 20) { const ess = picked.filter((s) => s.essential); if (ess.length >= 2) picked = ess; } // tiny window: essentials only
  const wsum = picked.reduce((a, s) => a + s.w, 0) || 1;
  const budget = Math.max(6, minutes * BUDGET);
  return picked.map((s, i) => ({
    id: `s${idStart + i}`, key: s.key, title: s.title, essential: !!s.essential,
    est: Math.max(2, Math.round((s.w / wsum) * budget)),
    explain: s.explain, do: s.do, points: s.points || [], express: s.express || s.do,
    done: false, doneAt: null, startedAt: null, approach: 0,
  }));
}

// ---------- session lifecycle ----------
export function createSession(goal, minutes, now, plan = null) {
  plan = plan || builtinPlan(goal, minutes);
  const steps = stepsFromPlan(plan, minutes);
  steps[0].startedAt = now;
  const s = {
    goal, category: plan.category, label: plan.label, primer: plan.primer, alts: plan.alts, planSource: plan.source,
    createdAt: now, deadline: now + minutes * MIN, steps,
    banked: [], pausedMin: 0, blocker: null, nextId: steps.length + 1,
    baseline: null, timeline: [], goalHistory: [], lastMode: null, interruptions: [],
    // notification bookkeeping used by the proactive monitor (each fires once)
    flags: { warned: [], checkedStep: null, deadlineFired: false, completeFired: false },
  };
  rebase(s, now);
  return s;
}

function rebase(s, now) {
  s.baseline = { t: now, work: undoneWork(s), pausedMin: s.pausedMin };
}
const undone = (s) => s.steps.filter((x) => !x.done);
const undoneWork = (s) => undone(s).reduce((a, x) => a + x.est, 0);

export function fmt(min) {
  min = Math.max(0, Math.round(min));
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'}`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} hour${h > 1 ? 's' : ''} ${m} minutes` : `${h} hour${h > 1 ? 's' : ''}`;
}
export function fmtShort(min) {
  min = Math.max(0, Math.round(min));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ---------- assessment: the brain ----------
export function assess(s, now) {
  const remaining = Math.max(0, (s.deadline - now) / MIN);
  const windowMin = (s.deadline - s.createdAt) / MIN;
  const todo = undone(s);
  const remainWork = todo.reduce((a, x) => a + x.est, 0);
  const essentials = todo.filter((x) => x.essential);
  const essentialWork = essentials.reduce((a, x) => a + x.est, 0);

  // pace since the last (re)plan, ignoring time lost to reported interruptions
  const b = s.baseline;
  const paused = s.pausedMin - b.pausedMin;
  const elapsedEff = Math.max(0, (now - b.t) / MIN - paused);
  const winEff = Math.max(1, (s.deadline - b.t) / MIN - paused);
  const planned = b.work * Math.min(1, elapsedEff / (winEff * BUDGET / 1)) * 1; // planned work burn
  const actual = b.work - remainWork;
  const gap = actual - planned; // minutes of work (negative = behind)
  const pace = planned > 3 ? actual / planned : 1;
  const behind = planned > 3 && pace < 0.8 && gap < -3;

  // current step + stall evidence (evidence only — we ask before concluding anything)
  const cur0 = todo[0] || null;
  const stepElapsed = cur0?.startedAt ? Math.max(0, (now - cur0.startedAt) / MIN) : 0;
  const stalled = !!cur0 && stepElapsed > Math.max(6, cur0.est * 1.5) && !s.blocker;

  // which steps fit? (reassessed every time — deferral is derived, never stored, so nothing is lost)
  const room = remaining * 0.9;
  let used = 0;
  const status = new Map();
  for (const x of todo) if (x.essential) used += x.est;
  const optRoom = room - used;
  let optUsed = 0;
  for (const x of todo) {
    if (x.essential) status.set(x.id, 'keep');
    else if (optUsed + x.est <= optRoom) { optUsed += x.est; status.set(x.id, 'keep'); }
    else status.set(x.id, 'deferred');
  }
  const deferred = todo.filter((x) => status.get(x.id) === 'deferred');
  const kept = todo.filter((x) => status.get(x.id) === 'keep');
  const keptWork = kept.reduce((a, x) => a + x.est, 0);

  // compression when even the essentials don't fit
  const scale = essentialWork > room ? Math.max(0.15, room / Math.max(1, essentialWork)) : 1;
  const compressed = scale < 1;
  const infeasible = scale < 0.3 && !!todo.length;
  const cur = kept[0] || null;
  const curEst = cur ? Math.max(1, Math.round(cur.est * (compressed ? scale : 1))) : 0;

  // ---- mode selection ----
  let mode, reason = [];
  if (!todo.length) { mode = 'done'; reason.push('Every step is complete.'); }
  else if (remaining <= 0) { mode = 'sprint'; reason.push('The deadline has passed — finish what you can.'); }
  else if (remaining <= 12 || compressed) {
    mode = 'sprint';
    reason.push(compressed ? `Essentials need ${fmtShort(essentialWork)} but only ${fmtShort(remaining)} remain.` : `Only ${fmtShort(remaining)} left.`);
  } else if (deferred.length) {
    mode = 'triage';
    reason.push(`Full plan needs ${fmtShort(remainWork)}; ${fmtShort(remaining)} left.`);
  } else if (behind || stalled || s.blocker?.open) {
    mode = 'recover';
    if (behind) reason.push(`Pace is ${Math.round(pace * 100)}% of plan.`);
    if (stalled) reason.push(`"${cur0.title}" has run ${fmtShort(stepElapsed)} vs ${fmtShort(cur0.est)} planned.`);
    if (s.blocker?.open) reason.push(`You reported: ${s.blocker.kind}.`);
  } else if (remaining / windowMin >= 0.6 && pace >= 0.95) {
    mode = 'explore'; reason.push(`${fmtShort(remaining)} left and the pace is healthy.`);
  } else { mode = 'flow'; reason.push(`On pace with ${fmtShort(remaining)} left.`); }

  const realistic = infeasible ? 0 : essentials.filter((x, i) => essentials.slice(0, i + 1).reduce((a, y) => a + y.est * scale, 0) <= room).length;

  const plan = s.steps.map((x) => ({
    id: x.id,
    status: x.done ? 'done' : x.id === cur?.id ? 'current' : status.get(x.id) === 'deferred' ? 'deferred' : 'next',
    est: Math.max(1, Math.round(x.est * (!x.done && compressed ? scale : 1))),
  }));

  const a = {
    now, remainingMin: remaining, windowMin, remainWork, essentialWork, keptWork,
    pace, gap, behind, stalled, stepElapsed, compressed, infeasible, scale,
    mode, ...MODES[mode], reason, plan, realistic,
    essentialsLeft: essentials.length,
    current: cur ? { id: cur.id, title: cur.title, est: curEst, overdue: stepElapsed >= Math.max(3, cur.est) && !compressed, elapsed: stepElapsed, explain: cur.explain, do: cur.do, essential: cur.essential, approach: cur.approach } : null,
    brief: cur ? briefFor(cur, mode, remaining) : null,
    primer: s.primer || null, planSource: s.planSource || 'builtin',
    tier: { id: tierOf(remaining), label: TIERS[tierOf(remaining)].label, realistic: TIERS[tierOf(remaining)].realistic(Math.max(1, Math.round(remaining))), skip: TIERS[tierOf(remaining)].skip, rhythm: TIERS[tierOf(remaining)].rhythm },
    deferred: deferred.map((x) => ({ id: x.id, title: x.title })),
    progress: { baselineT: b.t, baselineWork: b.work, planned, actual, bufferMin: remaining - keptWork },
    evidence: [
      `${fmtShort(remaining)} left`,
      `${fmtShort(keptWork)} of work needed`,
      `pace ${Math.round(pace * 100)}%`,
      ...(paused > 0 ? [`${fmtShort(paused)} interruption excluded`] : []),
    ],
  };
  a.message = compose(s, a);
  a.style = styleFor(mode);
  return a;
}

// The information you need, sized to the time you have: fewer, sharper points as time shrinks.
const BRIEF_COUNT = { explore: 4, flow: 3, recover: 2, triage: 3, sprint: 1, done: 0 };
function briefFor(step, mode, remaining) {
  const pts = step.points || [];
  const n = remaining <= 12 ? 1 : BRIEF_COUNT[mode] ?? 3;
  return { points: pts.slice(0, n), total: pts.length, express: step.express || step.do, forMinutes: Math.round(remaining) };
}

function styleFor(mode) {
  return {
    explore: { density: 'full', voice: 'warm, explanatory', detail: 'rich' },
    flow: { density: 'balanced', voice: 'brisk, encouraging', detail: 'balanced' },
    recover: { density: 'diagnostic', voice: 'curious, calm, asks before assuming', detail: 'questions' },
    triage: { density: 'essentials', voice: 'decisive, honest about trade-offs', detail: 'minimal' },
    sprint: { density: 'single', voice: 'direct, one instruction at a time', detail: 'single' },
    done: { density: 'celebrate', voice: 'proud, brief', detail: 'minimal' },
  }[mode];
}

// ---------- messages: the adaptive voice ----------
function compose(s, a) {
  const rem = fmt(a.remainingMin);
  const cur = a.current;
  const m = { headline: '', say: '', bullets: [], next: cur ? cur.title : null, question: null, options: null };
  switch (a.mode) {
    case 'explore':
      m.headline = `You have time. Start here: ${cur.title}.`;
      m.say = `You've got ${rem}. ${a.tier.realistic} Up first: ${cur.title}. ${cur.explain}`;
      m.bullets = [cur.explain, `Budget about ${cur.est} minutes.`, 'Ask me to explain anything — we have room to understand it.'];
      break;
    case 'flow':
      m.headline = `On pace. Keep going: ${cur.title}.`;
      m.say = `You're on pace with ${rem} left. Next up: ${cur.title}. About ${cur.est} minutes.`;
      m.bullets = [`About ${cur.est} minutes for this step.`, `${a.essentialsLeft} essential step${a.essentialsLeft === 1 ? '' : 's'} left.`];
      break;
    case 'recover': {
      const gapMin = Math.max(1, Math.round(-a.gap));
      const why = s.blocker?.open ? s.blocker : null;
      if (why) {
        const fix = {
          hard: `That step is hard, so I've split it. Start with the smallest version: ${cur.title}.`,
          interrupted: `Interruptions happen. I've taken that time out of the pace calculation so it doesn't count against you. Back to: ${cur.title}.`,
          approach: `Then the approach is wrong, not you. New approach: ${s.altApproach || cur.do}`,
        }[why.kind] || '';
        m.headline = { hard: 'Made it smaller.', interrupted: 'Interruption noted.', approach: 'Switching approach.' }[why.kind] || 'Adjusting.';
        m.say = fix;
        m.bullets = [fix, `Next: ${cur.do}`];
      } else {
        m.headline = a.stalled ? `This step is taking longer than planned.` : `About ${gapMin} minutes behind plan.`;
        m.say = `${a.stalled ? `"${cur.title}" is taking longer than planned.` : `You're about ${gapMin} minutes behind where we planned.`} Before I change anything: is the step hard, did something interrupt you, or is the approach not working?`;
        m.question = 'Is it the step itself, an interruption, or the approach?';
        m.options = [
          { id: 'hard', label: 'The step is hard', sub: 'Split it smaller' },
          { id: 'interrupted', label: 'I got interrupted', sub: 'Don\'t count that time' },
          { id: 'approach', label: 'Approach isn\'t working', sub: 'Try another way in' },
          { id: 'ontrack', label: 'Actually, I\'m fine', sub: 'Keep going' },
        ];
        m.bullets = a.reason;
      }
      break;
    }
    case 'triage': {
      const names = a.deferred.map((d) => d.title.replace(/^(Add|Polish|Do|Handle|Write|Revisit|Edit for|Proofread)\s*/i, '')).slice(0, 3);
      m.headline = `Parked ${a.deferred.length} nice-to-have${a.deferred.length > 1 ? 's' : ''} to protect what matters.`;
      m.say = `You have ${rem}, and the full plan needs ${fmt(a.remainWork)}. I've parked ${a.deferred.length} optional step${a.deferred.length > 1 ? 's' : ''} so the essentials get done properly. Focus: ${cur.title}.`;
      m.bullets = [`Parked: ${names.join(', ')}`, `If time frees up, they come back automatically.`, `Now: ${cur.do}`];
      break;
    }
    case 'sprint':
      if (a.infeasible) {
        m.headline = `As planned, this can't finish in ${fmtShort(a.remainingMin)}.`;
        m.say = `I'll be straight with you: the full plan can't finish in ${rem}. Here's what's realistic — ${cur.do} Want me to change the goal to a smaller version?`;
        m.question = 'Re-scope the goal to something that fits?';
        m.options = [{ id: 'rescope', label: 'Yes, shrink the goal', sub: 'Keep what\'s done' }, { id: 'push', label: 'No, push on', sub: 'Express mode' }];
      } else if (a.compressed) {
        m.headline = cur.do;
        m.say = `${rem} left. Express mode. Just this: ${cur.do}`;
      } else {
        m.headline = cur ? cur.do : 'Finish what you can.';
        m.say = `${rem}. Just this: ${cur ? cur.do : 'finish what you can.'}`;
      }
      m.bullets = [`${Math.max(1, Math.round(cur?.est || 1))} min budget`, `${a.essentialsLeft} essential step${a.essentialsLeft === 1 ? '' : 's'} left`];
      break;
    case 'done':
      m.headline = 'All done.';
      m.say = `That's everything — and you have ${rem} to spare. Nicely done.`;
      m.bullets = [`${s.steps.length} steps complete`, `${rem} to spare`];
      break;
  }
  return m;
}

// ---------- events (each returns {say?}) and always triggers reassessment ----------
export function completeStep(s, query, now) {
  const todo = undone(s);
  if (!todo.length) return { ok: false, text: 'Everything is already complete.' };
  let step = todo[0];
  if (query && query !== 'current' && query !== 'next') {
    const q = kw(query);
    const hit = todo.find((x) => x.id === query) ||
      todo.map((x) => ({ x, n: [...kw(x.title + ' ' + x.key)].filter((w) => q.has(w) || [...q].some((z) => w.startsWith(z.slice(0, 5)))).length }))
        .sort((p, q2) => q2.n - p.n)[0];
    if (hit?.x) step = hit.x; else if (hit?.n > 0) step = hit.x;
  }
  step.done = true; step.doneAt = now;
  const next = undone(s)[0];
  if (next && !next.startedAt) next.startedAt = now;
  s.blocker = null;
  return { ok: true, step };
}

export function reportBlocker(s, kind, now, { minutes = 0, detail = '' } = {}) {
  const cur = undone(s)[0];
  if (!cur) return { ok: false };
  if (kind === 'ontrack') { s.blocker = null; cur.startedAt = now; return { ok: true, kind }; }
  s.blocker = { kind, detail, at: now, open: true };
  if (kind === 'hard' && !cur.split) {
    const small = Math.max(1, Math.round(cur.est * 0.4));
    const rest = Math.max(1, cur.est - small);
    const idx = s.steps.indexOf(cur);
    const first = { ...cur, id: `s${s.nextId++}`, title: `Smallest version of: ${cur.title}`, est: small, do: `Smallest piece only: ${cur.do}`, split: true, startedAt: now, approach: 0, points: (cur.points || []).slice(0, 2) };
    const second = { ...cur, id: cur.id, est: rest, title: `Finish: ${cur.title}`, split: true, startedAt: null };
    s.steps.splice(idx, 1, first, second);
  } else if (kind === 'interrupted') {
    const lost = Math.max(1, minutes || 10);
    s.pausedMin += lost; s.interruptions.push({ at: now, minutes: lost });
    cur.startedAt = now;
  } else if (kind === 'approach') {
    const alts = (s.alts && s.alts.length) ? s.alts : TEMPLATES[s.category]?.alt || TEMPLATES.general.alt;
    s.altApproach = alts[cur.approach % alts.length];
    cur.approach += 1; cur.startedAt = now;
  } else if (kind === 'hard') { cur.startedAt = now; }
  return { ok: true, kind };
}

export function updateTime(s, minutesRemaining, now) {
  const old = (s.deadline - now) / MIN;
  s.deadline = now + minutesRemaining * MIN;
  s.blocker = null;
  const cur = undone(s)[0]; if (cur) cur.startedAt = now;
  if (s.flags) { s.flags.warned = []; s.flags.deadlineFired = false; s.flags.checkedStep = null; } // new deadline, fresh milestones
  rebase(s, now);
  return { ok: true, old, now: minutesRemaining };
}

export function changeGoal(s, newGoal, now, minutesRemaining, planner) {
  const done = s.steps.filter((x) => x.done);
  s.banked.push(...done.map((x) => ({ title: x.title, key: x.key, from: s.goal })));
  const skip = new Set(s.banked.map((b) => b.key));
  s.goalHistory.push({ at: now, from: s.goal, to: newGoal });
  s.goal = newGoal;
  if (minutesRemaining) s.deadline = now + minutesRemaining * MIN;
  const rem = Math.max(3, (s.deadline - now) / MIN);
  const plan = planner || builtinPlan(newGoal, rem);
  s.category = plan.category; s.label = plan.label; s.primer = plan.primer; s.alts = plan.alts; s.planSource = plan.source;
  s.steps = stepsFromPlan(plan, rem, skip, s.nextId);
  if (!s.steps.length) s.steps = stepsFromPlan(plan, rem, new Set(), s.nextId);
  s.nextId += s.steps.length;
  s.steps[0].startedAt = now; s.blocker = null; s.altApproach = null;
  s.flags = { warned: [], checkedStep: null, deadlineFired: false, completeFired: false };
  rebase(s, now);
  return { ok: true, kept: done.map((x) => x.title) };
}

// Record mode changes so the UI can show the story of how the AI reassessed.
export function snapshot(s, now) {
  const a = assess(s, now);
  if (s.lastMode !== a.mode) {
    s.timeline.push({ t: now, from: s.lastMode, mode: a.mode, headline: a.message.headline, reason: a.reason[0] });
    s.timeline = s.timeline.slice(-30);
    s.lastMode = a.mode;
  }
  return a;
}

// Swap in a better plan (e.g. the AI plan arrived after the instant built-in one) without losing the clock.
export function swapPlan(s, plan, now) {
  if (s.steps.some((x) => x.done)) return false; // never disturb work already done
  const rem = Math.max(3, (s.deadline - now) / MIN);
  const steps = stepsFromPlan(plan, rem);
  if (!steps.length) return false;
  steps[0].startedAt = s.steps[0]?.startedAt || now;
  s.steps = steps; s.nextId = steps.length + 1;
  s.label = plan.label; s.category = plan.category; s.primer = plan.primer; s.alts = plan.alts; s.planSource = plan.source;
  rebase(s, now);
  return true;
}

// Apply re-sized knowledge (llmRebrief) to the steps still to do.
export function applyRebrief(s, list) {
  let n = 0;
  for (const r of list || []) {
    const st = s.steps.find((x) => x.id === r.id && !x.done);
    if (st && r.points?.length) { st.points = r.points; if (r.express) st.express = r.express; n++; }
  }
  return n;
}
