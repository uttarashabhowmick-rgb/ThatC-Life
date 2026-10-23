// Proactive monitor: ThatC Life notices things by itself — no one has to say "I'm behind".
// Every tick it reassesses each live session and raises a notice (sound + words) when something meaningful changed:
// the mode drifted with time, a step's time-box ran out, a milestone passed, or the deadline hit.
import { snapshot, fmt } from './engine.js';
import { notify } from './actions.js';

export function tick(ws) {
  const s = ws.session; if (!s) return null;
  const now = ws.now(), a = snapshot(s, now), f = s.flags || (s.flags = { warned: [], checkedStep: null, deadlineFired: false, completeFired: false });
  if (a.mode === 'done') { ws.lastNoticedMode = 'done'; return null; }
  if (ws.lastNoticedMode == null) { ws.lastNoticedMode = a.mode; return null; } // first look after start: nothing to announce

  let n = null;
  if (a.remainingMin <= 0 && !f.deadlineFired) {
    f.deadlineFired = true;
    n = { kind: 'deadline', sound: 'deadline', say: `Time's up. You finished ${s.steps.filter((x) => x.done).length} of ${s.steps.length} steps. ${a.current ? `Next would have been: ${a.current.title}.` : ''}` };
  } else if (a.mode !== ws.lastNoticedMode) {
    n = { kind: 'mode', sound: a.mode, say: modeSay(a), mode: a.mode };
  } else if (a.current?.overdue && f.checkedStep !== a.current.id && a.mode !== 'recover') {
    f.checkedStep = a.current.id;
    n = { kind: 'timebox', sound: 'timebox', say: `The time-box for "${a.current.title}" is up. Is it done, or do you need more time?` };
  } else {
    const done = s.steps.filter((x) => x.done).length, win = (s.deadline - s.baseline.t) / 60000; // measured from the last (re)plan, so shortening a deadline doesn't instantly trigger 'halfway'
    if (win >= 20 && a.remainingMin / win <= 0.5 && !f.warned.includes('half')) {
      f.warned.push('half');
      n = { kind: 'milestone', sound: 'milestone', say: `Halfway — ${fmt(a.remainingMin)} left, ${done} of ${s.steps.length} steps done. ${a.brief?.points?.[0] ? 'Remember: ' + a.brief.points[0] : ''}` };
    } else if (win >= 30 && a.remainingMin <= 10 && !f.warned.includes('ten')) {
      f.warned.push('ten');
      n = { kind: 'milestone', sound: 'milestone', say: `Ten minutes left. Just this: ${a.current?.brief?.express || a.brief?.express || a.current?.do || 'wrap up'}` };
    } else if (win >= 15 && a.remainingMin <= 3 && !f.warned.includes('three')) {
      f.warned.push('three');
      n = { kind: 'milestone', sound: 'milestone', say: `Three minutes left. Finish what is in front of you.` };
    }
  }
  if (!n) return null;
  ws.lastNoticedMode = a.mode;
  return notify(ws, { mode: a.mode, speak: true, source: 'auto', ...n });
}

function modeSay(a) {
  const lead = { recover: 'Heads up — ', triage: 'Time check — ', sprint: 'Crunch time — ', explore: '', flow: '' }[a.mode] || '';
  return lead + a.message.say;
}

export function startMonitor(list, onChange, ms = 2000) {
  return setInterval(() => { for (const ws of list()) { try { if (tick(ws)) onChange(ws); } catch (e) { console.warn('[monitor]', e.message); } } }, ms);
}
