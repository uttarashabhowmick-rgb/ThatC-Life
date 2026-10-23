// Runs the demo storyline against the engine with a fake clock and prints each moment.
import { newState, applyAction } from '../shared/actions.js';
const state = newState();
let t = Date.parse('2026-10-21T10:00:00Z');
const MIN = 60000;
const show = (label, r) => {
  if (!r.ok) return console.log(`\n[${label}] ERROR ${r.error}`);
  const d = r.directive;
  console.log(`\n[${label}] mode=${d.mode} remaining=${d.clock.remainingMin}m proj=${d.clock.projectedMin}m slack=${d.clock.slackMin} done=${d.progress.donePct}% exp=${d.progress.expectedPct}% pace=${d.progress.pace} stalled=${d.flags.stalled}`);
  console.log('  active:', d.active && `${d.active.title} (${d.active.est}m)`, '| cut:', d.plan.cutTitles.join(', ') || '-');
  console.log('  voice:', r.voice);
};
const A = (n, a) => applyAction(state, n, a, t);
show('start', A('start_session', { goal: 'Finish my investor presentation', minutes: 120 }));
console.log(state.session.steps.map(s => `${s.id}:${s.est}${s.essential?'':'*'}`).join(' '));
t += 7 * MIN; show('step1 done', A('complete_step'));
t += 12 * MIN; show('step2 done', A('complete_step'));
t += 28 * MIN; show('28m idle on step3 (stall)', A('get_status'));
show('hard', A('report_blocker', { kind: 'hard' }));
t += 5 * MIN; show('slice done', A('complete_step'));
t += 10 * MIN; show('rest done', A('complete_step'));
t += 18 * MIN; show('+18m working on build', A('update_progress', { percent: 70 }));
show('25 min left', A('set_time_remaining', { minutes: 25 }));
t += 12 * MIN; show('build done (13 left)', A('complete_step'));
t += 6 * MIN; show('+6m (7 left)', A('get_status'));
show('change goal', A('change_goal', { goal: 'Three minute elevator pitch for investors', minutes: 15 }));
