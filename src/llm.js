// Optional LLM planner. Any task -> a time-scaled plan with real, task-specific knowledge per step.
// Providers (first one configured wins):
//   Amazon Bedrock (Converse API, API-key auth) : AWS_BEARER_TOKEN_BEDROCK  [+ AWS_REGION, THATC_BEDROCK_MODEL]
//   Anthropic API                               : ANTHROPIC_API_KEY         [+ THATC_MODEL]
// Without a key (or on any failure/timeout) the engine falls back to its built-in planner, so the app never breaks.

const env = (k, d) => process.env[k] || d;
export function provider() {
  if (process.env.AWS_BEARER_TOKEN_BEDROCK) return 'bedrock';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

async function complete(system, user, { maxTokens = 3000, timeoutMs = Number(env('THATC_LLM_TIMEOUT_MS', 15000)) } = {}) {
  const prov = provider(); if (!prov) throw new Error('no LLM provider configured');
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let res, data;
    if (prov === 'bedrock') {
      const region = env('AWS_REGION', 'us-east-1');
      const base = env('BEDROCK_BASE_URL', `https://bedrock-runtime.${region}.amazonaws.com`);
      const model = env('THATC_BEDROCK_MODEL', 'us.amazon.nova-pro-v1:0');
      res = await fetch(`${base}/model/${encodeURIComponent(model)}/converse`, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}` },
        body: JSON.stringify({ system: [{ text: system }], messages: [{ role: 'user', content: [{ text: user }] }], inferenceConfig: { maxTokens, temperature: 0.4 } }),
      });
      data = await res.json(); if (!res.ok) throw new Error(`bedrock ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
      return data.output?.message?.content?.map((c) => c.text || '').join('') || '';
    }
    const base = env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com');
    res = await fetch(`${base}/v1/messages`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env('THATC_MODEL', 'claude-sonnet-5-5'), max_tokens: maxTokens, temperature: 0.4, system, messages: [{ role: 'user', content: user }] }),
    });
    data = await res.json(); if (!res.ok) throw new Error(`anthropic ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
    return data.content?.map((c) => c.text || '').join('') || '';
  } finally { clearTimeout(timer); }
}

const SYSTEM = `You are the planning engine of ThatC Life, an adaptive AI that works with time, progress and changing circumstances.
Given ANY task (school, work, cooking, travel, fitness, coding, chores — anything) and the exact time available, produce a plan sized to that time, with the real knowledge needed.
Rules:
- Output ONLY one JSON object. No prose, no markdown fences.
- "points" must contain REAL, SPECIFIC, task-relevant information (key facts, formulas, commands, ingredients, quantities, steps, definitions, pitfalls) — never generic productivity advice like "stay focused".
- Scale scope to the time: with little time, cover only the highest-value material and say what to skip.
- Order points most-important-first. Each point is one clear sentence, max 28 words.
- Be correct. If you are not sure of a fact, leave it out.`;

const SCHEMA = `{
 "label": "short category name, max 18 chars",
 "primer": "2 sentences: the game plan for THIS amount of time — what to focus on and what to skip",
 "alternatives": ["3 different ways to approach the work if the current approach is not working"],
 "steps": [ { "key":"snake_case_id", "title":"imperative step title, max 80 chars", "weight":0.0-1.0 (share of the time),
   "essential": true|false (false = first to drop if time runs short),
   "explain":"1-2 sentences on why/how", "do":"the single smallest action to take right now, max 25 words",
   "points":["3-6 specific pieces of knowledge needed for this step, most important first"],
   "express":"one sentence: what to do if only 1-2 minutes remain for this step" } ] }`;

function extractJson(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON in response');
  return JSON.parse(text.slice(a, b + 1));
}
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export function normalizePlan(raw, goal) {
  const steps = (Array.isArray(raw.steps) ? raw.steps : []).slice(0, 9).map((s, i) => {
    const points = (Array.isArray(s.points) ? s.points : []).map((p) => str(p, 260)).filter(Boolean).slice(0, 7);
    const title = str(s.title, 100); if (!title) return null;
    return {
      key: str(s.key, 30).replace(/[^a-z0-9_]/gi, '_').toLowerCase() || `step_${i + 1}`,
      title, w: Math.max(0.03, Number(s.weight) || 1 / 5), essential: s.essential !== false,
      explain: str(s.explain, 320) || title, do: str(s.do, 200) || title,
      points: points.length ? points : [str(s.explain, 260) || title], express: str(s.express, 200) || str(s.do, 200) || title,
    };
  }).filter(Boolean);
  if (steps.length < 3) throw new Error('plan too short');
  if (!steps.some((s) => s.essential)) steps[0].essential = true;
  const seen = new Set(); steps.forEach((s) => { while (seen.has(s.key)) s.key += '_'; seen.add(s.key); });
  return {
    label: str(raw.label, 18) || 'Task', category: 'ai', source: 'ai', primer: str(raw.primer, 420),
    alts: (Array.isArray(raw.alternatives) ? raw.alternatives : []).map((a) => str(a, 200)).filter(Boolean).slice(0, 3),
    steps,
  };
}

export async function llmPlan(goal, minutes, { bankedTitles = [] } = {}) {
  if (!provider()) return null;
  const user = `Task: ${JSON.stringify(goal)}\nTime available: ${Math.round(minutes)} minutes\n` +
    (bankedTitles.length ? `Already finished (do NOT repeat): ${bankedTitles.join('; ')}\n` : '') +
    `Produce 4-8 steps whose weights sum to about 1.\nReturn JSON exactly in this shape:\n${SCHEMA}`;
  const text = await complete(SYSTEM, user);
  return normalizePlan(extractJson(text), goal);
}

// Re-size the knowledge for the time that is left (e.g. after "I only have 25 minutes now").
export async function llmRebrief(goal, steps, minutesLeft) {
  if (!provider()) return null;
  const user = `Task: ${JSON.stringify(goal)}\nTime LEFT: ${Math.round(minutesLeft)} minutes (it just got shorter).\n` +
    `Remaining steps: ${JSON.stringify(steps.map((s) => ({ id: s.id, title: s.title })))}\n` +
    `For each step give the tightest possible "points" (2-4, most important first) and "express" for this much time.\n` +
    `Return JSON: {"steps":[{"id":"...","points":["..."],"express":"..."}]}`;
  const raw = extractJson(await complete(SYSTEM, user, { maxTokens: 1800 }));
  return (Array.isArray(raw.steps) ? raw.steps : []).map((s) => ({ id: str(s.id, 20), points: (s.points || []).map((p) => str(p, 260)).filter(Boolean).slice(0, 5), express: str(s.express, 200) })).filter((s) => s.id && s.points.length);
}

// Plan with graceful fallback: never throws, never blocks longer than the timeout.
export async function planWithFallback(goal, minutes, builtin, opts) {
  try { const p = await llmPlan(goal, minutes, opts); if (p) return p; }
  catch (e) { console.warn('[llm] falling back to built-in plan:', e.message); }
  return builtin;
}

export { complete as llmComplete };
