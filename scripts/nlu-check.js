import { interpret, DEMO_UTTERANCES } from '../shared/nlu.js';
const cases = [
  [DEMO_UTTERANCES.start, false], ["I need to write my history essay in 90 minutes", false], ['study for my chemistry exam in an hour and a half', false],
  [DEMO_UTTERANCES.stuck, true], [DEMO_UTTERANCES.time, true], [DEMO_UTTERANCES.goal, true],
  ["I got interrupted for 15 minutes", true], ["this approach isn't working", true], ["I'm falling behind", true], ["done with this step", true],
  ["I'm about 60 percent through", true], ["what's next", true], ["I have two hours left", true], ["Alexa, how am I doing", true],
];
for (const [u, h] of cases) console.log(JSON.stringify(interpret(u, { hasSession: h })), '\n   <-', u);
