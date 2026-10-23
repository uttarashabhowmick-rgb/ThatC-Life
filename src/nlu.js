// Utterance -> tool call. With an LLM provider it understands anything; without one, a robust rule set does.
import { provider, llmComplete } from './llm.js';

const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45, fifty: 50, sixty: 60, ninety: 90 };
const DUR = /(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty-five|forty|fifty|sixty|ninety)\s*(?:and a half\s*)?(hours?|hrs?|h|minutes?|mins?|m)\b/i;

export function parseMinutes(u) {
  u = u.toLowerCase();
  if (/half an hour|half hour/.test(u)) return 30;
  if (/quarter of an hour|quarter hour/.test(u)) return 15;
  const m = u.match(DUR); if (!m) return null;
  const n = isNaN(m[1]) ? NUM[m[1]] : parseFloat(m[1]);
  let v = /^h/.test(m[2]) ? n * 60 : n;
  if (/and a half/.test(m[0]) && /^h/.test(m[2])) v += 30;
  return Math.max(1, Math.round(v));
}

function cleanGoal(l) {
  return l
    .replace(DUR, ' ')
    .replace(/\b(alexa|hey alexa|ask thatc life( to)?|please|thatc life)\b[, ]*/g, '')
    .replace(/^(i need to|i have to|i've got to|i have|i want to|i wanna|help me( to)?|let's|can you help me( to)?|i'm going to|i am going to|i must|i should|got)\s+/g, '')
    .replace(/\b(in|within|for|by|over|about|around|only|just|next|the next|i have|i've got|i got)\b\s*$/g, '')
    .replace(/\b(in|within|for|by|over|about|around)\s*$/g, '')
    .replace(/\s+/g, ' ').replace(/[,.]\s*$/, '').trim();
}

export function rules(text, ctx = {}) {
  const raw = text.trim(), l = raw.toLowerCase().replace(/^(alexa|hey alexa)[, ]*(ask thatc life (to )?)?/, '').trim();
  const t = parseMinutes(l);
  const has = !!ctx.hasSession;

  // answering "how long do you have?" for a goal we already heard
  if (!has && ctx.pendingGoal && t) return { tool: 'start_session', args: { goal: ctx.pendingGoal, minutes: t } };

  if (has) {
    // a fresh task with its own duration (no 'left/only/now') starts a new session, replacing the current one
    if (t && /^(i need to|i want to|i have to|i wanna|i'd like to|help me|i've got to)\b/.test(l) && !/\b(left|only|remaining|now|moved|shorter)\b/.test(l)) return { tool: 'start_session', args: { goal: cleanGoal(l) || l, minutes: t } };
    if (t && /(only|just|now|left|remaining|moved|moves|deadline|due|shorter|cut)/.test(l) && !/\b(pitch|speech|video|call|meeting)\b.*\b(minute|min)\b/.test(l.replace(/(left|only|now).*/, '')))
      return { tool: 'update_time', args: { minutes_remaining: t } };
    if (/(change|switch|actually|instead|new goal|different)\b/.test(l) && !/approach/.test(l)) {
      const g = l.replace(/^(actually|instead|okay|ok|so)[, ]+/, '').replace(/^(change|switch)( my)?( goal| plan| task)?( over)?( to)?\s*/, '').replace(/^(i want to|let's|make it)\s*/, '').trim() || 'a smaller version';
      return { tool: 'change_goal', args: { new_goal: g, ...(t && /\b(have|left|only|remaining)\b/.test(l) ? { minutes_remaining: t } : {}) } };
    }
    if (/(interrupt|got a call|got pulled|someone came|step away|stepped away|phone call|meeting ran|distract)/.test(l)) return { tool: 'report_blocker', args: { reason: 'interrupted', ...(t ? { minutes_lost: t } : {}) } };
    if (/(not working|different approach|another way|wrong approach|isn't working|try something else)/.test(l)) return { tool: 'report_blocker', args: { reason: 'approach' } };
    if (/(too hard|so hard|difficult|stuck|don't get it|confus|struggl|can't do)/.test(l)) return { tool: 'report_blocker', args: { reason: 'hard' } };
    if (/(i'm fine|im fine|on track|all good|no problem)/.test(l)) return { tool: 'report_blocker', args: { reason: 'ontrack' } };
    if (/(what do i need to know|tips|help me with this|explain|how do i|what should i know|give me info|information)/.test(l)) return { tool: 'get_briefing', args: {} };
    if (/(finished|done|completed|did it|i did|that's done|got it done|next)/.test(l)) {
      const st = l.replace(/^(i'?ve |i |just )?(finished|completed|did|done with|done|got)( with)?( the| my| it)?\s*/, '').trim();
      return { tool: 'complete_step', args: st && !/^(done|it|next|that)$/.test(st) && st.length > 2 ? { step: st } : {} };
    }
    return { tool: 'get_guidance', args: {} };
  }
  // no session yet
  if (t) return { tool: 'start_session', args: { goal: cleanGoal(l) || l, minutes: t } };
  const g = cleanGoal(l);
  if (g.length > 2) return { ask: `Got it — ${g}. How much time do you have?`, pendingGoal: g };
  return { ask: 'Tell me what you need to get done and how long you have.' };
}

const SYS = `You route a spoken request to ONE tool of "ThatC Life", an adaptive time-and-progress coach. Output ONLY JSON.
Tools: start_session{goal,minutes} | get_guidance{} | get_briefing{} | complete_step{step?} | report_blocker{reason: hard|interrupted|approach|ontrack, minutes_lost?} | update_time{minutes_remaining} | change_goal{new_goal,minutes_remaining?}
If there is no active session and the user states a task but no duration, return {"ask":"<short question asking how long they have>","pendingGoal":"<task>"}.
If there is no active session and they give a task AND time, use start_session (goal in their words, minutes as a number).
Return {"tool":"...","args":{...}} or the ask form.`;

export async function route(text, ctx = {}) {
  if (provider()) {
    try {
      const out = await llmComplete(SYS, `Active session: ${ctx.hasSession ? 'yes, goal = ' + JSON.stringify(ctx.goal) : 'no'}${ctx.pendingGoal ? '\nPending goal awaiting a duration: ' + JSON.stringify(ctx.pendingGoal) : ''}\nUser said: ${JSON.stringify(text)}`, { maxTokens: 300, timeoutMs: 6000 });
      const a = out.indexOf('{'), b = out.lastIndexOf('}'); const j = JSON.parse(out.slice(a, b + 1));
      if (j.tool || j.ask) return j;
    } catch (e) { /* fall through to rules */ }
  }
  return rules(text, ctx);
}
