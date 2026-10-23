// Task knowledge: templates, tips and category detection (offline planner).
const T = (key, title, w, essential, explain, doIt) => ({ key, title, w, essential, explain, do: doIt });
export const TEMPLATES = {
  presentation: {
    label: 'Presentation',
    steps: [
      T('outline', 'Lock your one-sentence message and 3 key points', .12, true,
        'Everything else hangs off this. If the audience remembers one sentence, what is it? Then pick the three points that prove it.',
        'Write your one-sentence message. Then three bullets that prove it.'),
      T('core', 'Draft one slide per key point', .30, true,
        'One idea per slide, a headline that states the takeaway, and only the evidence that supports it. Ugly is fine — we polish later.',
        'Make three slides. Headline + one piece of evidence each.'),
      T('openclose', 'Write the opening and the closing', .12, true,
        'Open with the problem or a surprising fact, close by repeating your one sentence and the single action you want.',
        'Write a one-line opener and a one-line close.'),
      T('visuals', 'Add visuals and data', .18, false,
        'Replace text with a chart, image or diagram wherever a picture is faster than a sentence.',
        'Add one chart or image to your strongest slide.'),
      T('polish', 'Polish layout and consistency', .13, false,
        'Consistent fonts, alignment, contrast. Cut anything that doesn\'t serve the message.',
        'Fix fonts and alignment on every slide.'),
      T('rehearse', 'Rehearse out loud once', .15, true,
        'Say it out loud against a timer. Your mouth finds problems your eyes miss.',
        'Say it out loud once, start to finish.'),
    ],
    alt: [
      'Start from the ending: write your closing slide first, then work backwards.',
      'Talk it through into your phone\'s voice memo, then turn the transcript into slides.',
      'Use a template with a fixed structure (problem, solution, proof, ask) and just fill it in.',
    ],
  },
  writing: {
    label: 'Writing',
    steps: [
      T('brief', 'Pin down the question you are answering', .10, true,
        'Restate the brief in your own words in one sentence. Know what a good answer must contain.',
        'Write the question as one sentence.'),
      T('outline', 'Outline the argument', .15, true,
        'Three to five headings, each with one claim. This is the skeleton the draft grows on.',
        'List 3 headings, one claim each.'),
      T('draft', 'Draft the body', .35, true,
        'Write badly and fast. Do not edit while drafting. One paragraph per claim.',
        'Write one rough paragraph per heading.'),
      T('framing', 'Write the introduction and conclusion', .12, true,
        'Now that you know what you said, say what you\'ll say and what it meant.',
        'Write a 2-sentence intro and a 2-sentence conclusion.'),
      T('edit', 'Edit for clarity and cut', .16, false,
        'Cut a quarter of the words. Make every paragraph earn its place.',
        'Delete the weakest paragraph.'),
      T('proof', 'Proofread', .12, false,
        'Read it aloud. Check names, numbers and references.',
        'Read the first and last paragraphs aloud.'),
    ],
    alt: [
      'Explain it out loud to someone (or to me), then write down what you said.',
      'Write the conclusion first, then the paragraph that earns it.',
      'Switch to bullet fragments and expand only the strongest three.',
    ],
  },
  study: {
    label: 'Study',
    steps: [
      T('map', 'Map the topics and rank them by weight', .10, true,
        'List every topic, then mark which ones are worth the most marks or are weakest.',
        'List the topics. Star the three that matter most.'),
      T('concepts', 'Learn the core concepts of the top topics', .30, true,
        'Explain each concept in your own words in two sentences. If you can\'t, you haven\'t got it yet.',
        'Explain the top concept out loud in two sentences.'),
      T('practice', 'Do practice questions', .30, true,
        'Retrieval beats re-reading. Attempt first, check second.',
        'Do three practice questions without notes.'),
      T('weak', 'Revisit your weak spots', .18, false,
        'Go back to exactly what you got wrong and fix the gap.',
        'Redo the question you got wrong.'),
      T('recall', 'Closed-book recall test', .12, true,
        'Close everything. Write down what you remember. The gaps are your final targets.',
        'Close the book and write what you remember.'),
    ],
    alt: [
      'Switch from reading to past-paper questions; learn only what each question demands.',
      'Teach the topic to an imaginary friend in 60 seconds.',
      'Make a one-page cheat sheet from memory, then check it.',
    ],
  },
  build: {
    label: 'Build',
    steps: [
      T('define', 'Define what "done" looks like', .08, true,
        'Write the smallest version that would count as finished. Everything else is optional.',
        'Write one sentence: "It\'s done when…"'),
      T('scaffold', 'Scaffold the skeleton', .17, true,
        'Get something running end-to-end, however crude.',
        'Get a hello-world of the whole thing running.'),
      T('core', 'Build the core feature', .35, true,
        'Only the thing that makes this worth building. Resist side quests.',
        'Build the one feature that matters.'),
      T('edges', 'Handle edge cases and test', .15, false,
        'Try to break it. Fix what breaks in the main path.',
        'Test the main path once and fix the first bug.'),
      T('polish', 'Polish and document', .10, false,
        'Clean the rough edges and write down how to run it.',
        'Write 3 lines on how to run it.'),
      T('demo', 'Run the full demo once', .15, true,
        'Do the exact walkthrough someone else will see, start to finish.',
        'Run the whole demo once, start to finish.'),
    ],
    alt: [
      'Fake the hard part with hard-coded data, get the flow working, then replace it.',
      'Cut the feature in half and ship the half that demos best.',
      'Start from the demo script and build only what it touches.',
    ],
  },
  workout: {
    label: 'Workout',
    steps: [
      T('warmup', 'Warm up and mobilise', .15, true,
        'Raise your heart rate and take joints through their range. It prevents injury and improves the main work.',
        'Easy movement to get warm.'),
      T('main', 'Main compound lifts / main set', .40, true,
        'The big movements that give most of the benefit. Quality reps beat extra reps.',
        'Do your main set.'),
      T('accessory', 'Accessory work', .25, false,
        'Smaller targeted exercises that round out the session.',
        'Two accessory exercises.'),
      T('finisher', 'Finisher', .10, false,
        'A short hard push to end on.',
        'One hard finishing set.'),
      T('cooldown', 'Cool down and stretch', .10, true,
        'Bring your heart rate down and stretch what you worked.',
        'Walk and stretch for a few minutes.'),
    ],
    alt: [
      'Swap to a circuit: shorter rests, fewer exercises.',
      'Drop to a bodyweight version of the main set.',
      'Cut accessory work and double the main set quality.',
    ],
  },
  general: {
    label: 'Task',
    steps: [
      T('clarify', 'Clarify exactly what finished looks like', .10, true,
        'Write down the result you need. A clear target halves the work.',
        'Write down what "finished" means in one line.'),
      T('plan', 'Break it into the three biggest pieces', .15, true,
        'Name the three chunks. The biggest unknown goes first.',
        'List three chunks.'),
      T('core', 'Do the core piece', .40, true,
        'Start with the piece that carries the most value.',
        'Do the single most important piece.'),
      T('rest', 'Do the remaining pieces', .20, false,
        'Work through the rest in order of value.',
        'Do the next-most important piece.'),
      T('check', 'Review and finish', .15, true,
        'Check the result against your definition of finished.',
        'Check against your definition of finished.'),
    ],
    alt: [
      'Do the ugliest, smallest version of the whole thing first.',
      'Switch to the part you\'re most confident about to rebuild momentum.',
      'Ask what a stranger would do next, then do that.',
    ],
  },
};

function detectCategoryOld(goal) {
  const g = ' ' + goal.toLowerCase() + ' ';
  const has = (re) => re.test(g);
  if (has(/\b(presentation|slides?|slide deck|deck|pitch|keynote|speech)\b/)) return 'presentation';
  if (has(/\b(exam|exams|test|quiz|revise|revision|study|studying|homework|syllabus|midterm|finals?)\b/)) return 'study';
  if (has(/\b(workout|gym|exercise|yoga|cardio|lifting|fitness|training session|jog|stretching)\b/)) return 'workout';
  if (has(/\b(essay|report|paper|article|blog|cover letter|email|letter|thesis|assignment|write|writing)\b/)) return 'writing';
  if (has(/\b(build|code|coding|app|hackathon|ship|feature|prototype|website|bug|deploy|program)\b/)) return 'build';
  return 'general';
}



// ---- more task types, so common requests get real, specific guidance even with no AI key ----
Object.assign(TEMPLATES, {
  cooking: { label: 'Cooking', steps: [
    T('read', 'Read the whole recipe and check ingredients', .10, true, 'Read to the end before you start. Check you have everything and note what needs time (oven preheat, marinating, boiling).', 'Read the recipe once, start the oven or water.'),
    T('prep', 'Prep everything first (mise en place)', .25, true, 'Chop, measure and lay out ingredients in the order you\'ll use them. Cooking goes smoothly when prep is done.', 'Chop and measure everything now.'),
    T('cook', 'Cook the main component', .35, true, 'Heat control matters most: get the pan hot before the food goes in, and don\'t crowd it.', 'Start the main cooking step.'),
    T('side', 'Finish the sides and sauce', .15, false, 'Time sides to finish with the main. Taste and adjust salt and acid.', 'Taste and adjust the seasoning.'),
    T('plate', 'Plate and clean as you go', .15, true, 'Rest meat or let it settle, plate it simply, and wash what you used while it rests.', 'Plate it up.'),
  ], tips: ['Preheat first — ovens and pans take longer than you think.', 'Salt in layers and taste before serving.', 'Start the longest-cooking item first.', 'Keep a bowl for scraps and wash as you go.'], alt: ['Pick a simpler version of the dish.', 'Use pre-cut or frozen ingredients for the slow parts.', 'Cook one main thing well and keep the rest simple.'] },
  interview: { label: 'Interview prep', steps: [
    T('role', 'Re-read the role and the company', .15, true, 'Pull out the 3 things the role cares about most. Your answers should keep returning to them.', 'List the 3 things this role cares about.'),
    T('stories', 'Prepare 3 stories (situation → action → result)', .30, true, 'Pick three real examples you can bend to most questions: a win, a problem, a conflict or failure. Use numbers where you can.', 'Write 3 stories in 3 lines each.'),
    T('why', 'Nail "tell me about yourself" and "why this company"', .20, true, 'A 60-second present → past → future story, ending on why this role.', 'Write your 60-second intro.'),
    T('questions', 'Prepare 3 questions to ask them', .10, false, 'Good questions show you think like someone already doing the job.', 'Write 3 questions.'),
    T('mock', 'Say your answers out loud once', .25, true, 'Practice out loud against a timer. Answers should be 1–2 minutes.', 'Answer one question out loud.'),
  ], tips: ['Answer in situation → action → result.', 'Have one number per story.', 'Prepare for "what\'s your weakness" honestly with a fix.', 'Test your camera, mic and link early.'], alt: ['Ask a friend to throw random questions at you.', 'Record yourself and listen back.', 'Write answers first, then cut to bullet points.'] },
  language: { label: 'Language learning', steps: [
    T('target', 'Pick one small target', .08, true, 'Choose ~10 words or 1 pattern, not "the language". Small and specific sticks.', 'Choose 10 words or 1 sentence pattern.'),
    T('input', 'Learn the target with audio', .30, true, 'Hear it spoken, then say it. Pronunciation first saves relearning.', 'Listen, then repeat each item aloud.'),
    T('recall', 'Test yourself from memory', .30, true, 'Cover the answers and recall. Struggling to remember is what makes it stick.', 'Cover and recall each one.'),
    T('use', 'Use it in sentences', .22, false, 'Make 3 sentences about your own life using the target.', 'Write 3 sentences using it.'),
    T('review', 'Quick final review of what you missed', .10, true, 'Go back only to the ones you got wrong.', 'Redo the ones you missed.'),
  ], tips: ['Speak out loud even if it feels silly.', 'Recall beats re-reading.', 'Group words by situation, not alphabet.', 'Short daily repeats beat one long session.'], alt: ['Learn from a short dialogue instead of a word list.', 'Shadow a native speaker clip.', 'Label things around you.'] },
  music: { label: 'Music practice', steps: [
    T('warm', 'Warm up slowly', .12, true, 'Easy scales or simple patterns to get your hands and ear ready.', 'Play something easy and slow.'),
    T('hard', 'Isolate the hardest 4 bars', .38, true, 'Practise only the hard part. Slow down until it\'s clean, then speed up in small steps.', 'Loop the hardest 4 bars slowly.'),
    T('link', 'Link sections together', .25, true, 'Join the practised part to what comes before and after it.', 'Play the section plus the bar before and after.'),
    T('run', 'Play the whole thing through once', .15, true, 'Don\'t stop for mistakes. This is a performance rehearsal.', 'Play it through without stopping.'),
    T('record', 'Record and listen back', .10, false, 'Recording shows what you can\'t hear while playing.', 'Record one take and listen.'),
  ], tips: ['Slow is fast: clean at half speed beats messy at full.', 'Use a metronome.', 'Practise the hard bars, not the easy ones.', 'Stop when your hands get tense.'], alt: ['Practise hands separately.', 'Change the rhythm to break patterns.', 'Sing or tap the line first.'] },
  cleaning: { label: 'Cleaning / home', steps: [
    T('clear', 'Clear the clutter first', .25, true, 'Bin, relocate, and put away. You can\'t clean what you can\'t reach.', 'Clear the surfaces.'),
    T('top', 'Top to bottom: dust and wipe', .30, true, 'Work top to bottom so dust falls onto what you haven\'t cleaned yet.', 'Wipe the highest surfaces first.'),
    T('wet', 'Kitchen and bathroom', .25, true, 'Spray, let it sit, then wipe. The wait does the work.', 'Spray, wait, wipe.'),
    T('floor', 'Floors last', .20, true, 'Vacuum or sweep, then mop, ending at the door.', 'Vacuum or sweep, then mop.'),
  ], tips: ['Top to bottom, back to front.', 'Spray and wait — let the product work.', 'Do the one room people see first.', 'Put on a playlist; it speeds things up.'], alt: ['Set a 10-minute timer per room.', 'Do the most visible areas only.', 'Do it in loops: one task across all rooms.'] },
  travel: { label: 'Packing / travel', steps: [
    T('docs', 'Documents, money and phone first', .20, true, 'ID/passport, tickets, cards, cash, chargers. Check them twice.', 'Put documents, cards and charger together.'),
    T('list', 'Make a list by day and weather', .15, true, 'Outfits per day plus the weather forecast. Pack for the plan, not for "just in case".', 'Write what you need per day.'),
    T('pack', 'Pack in categories', .40, true, 'Clothes, toiletries, tech, medicine — each in its own pouch.', 'Pack one category at a time.'),
    T('house', 'Close up the house', .15, false, 'Windows, plugs, bins, keys, plants.', 'Do a lap of the house.'),
    T('check', 'Final check at the door', .10, true, 'Phone, wallet, keys, documents. Say them out loud.', 'Say: phone, wallet, keys, documents.'),
  ], tips: ['Wear your bulkiest items.', 'Phone, wallet, keys, documents — every time.', 'Roll clothes to save space.', 'Pack medicine in your hand luggage.'], alt: ['Pack a capsule set of 3 outfits that mix.', 'Pack for the first day only, buy later.', 'Lay it all out on the bed first.'] },
  event: { label: 'Planning', steps: [
    T('goal', 'Decide what success looks like', .12, true, 'One sentence on what the event or plan must achieve, and for whom.', 'Write the one-sentence goal.'),
    T('must', 'List the must-haves and the budget', .18, true, 'Separate must-haves from nice-to-haves. Fix the budget early.', 'List must-haves and set the budget.'),
    T('decide', 'Make the big decisions', .30, true, 'Date, place, people, main cost. Decide the biggest ones first; everything else follows.', 'Decide the biggest open question.'),
    T('book', 'Book or message the people involved', .25, true, 'Send the messages and bookings now; waiting is the main risk.', 'Send the key messages.'),
    T('detail', 'Fill in the details', .15, false, 'Timeline, reminders and backup plan.', 'Write a simple timeline.'),
  ], tips: ['Decide the biggest thing first.', 'Write a backup for the one thing that can fail.', 'Confirm in writing.', 'Share one plan in one place.'], alt: ['Copy a plan that worked for something similar.', 'Cut the scope in half.', 'Delegate one whole piece.'] },
  research: { label: 'Research', steps: [
    T('q', 'Write the exact question you need answered', .10, true, 'A precise question stops you reading everything. Add what a good answer must include.', 'Write the question in one sentence.'),
    T('gather', 'Gather 3–5 good sources', .30, true, 'Prefer primary or authoritative sources. Skim, don\'t read everything.', 'Open 3 good sources.'),
    T('extract', 'Pull out the facts that answer it', .30, true, 'Write each finding in your own words with its source.', 'Write 5 findings with sources.'),
    T('check', 'Cross-check the important claims', .15, false, 'Verify anything surprising or important with a second source.', 'Verify the single most important claim.'),
    T('answer', 'Write the answer', .15, true, 'Lead with the answer, then the support.', 'Write the answer in 3 sentences.'),
  ], tips: ['Time-box reading — set a limit per source.', 'Note the source as you go.', 'Look for disagreement, not just confirmation.', 'Lead with the answer.'], alt: ['Start from a good summary or review article.', 'Ask a specific person who knows.', 'Search for the opposing view.'] },
  creative: { label: 'Creative work', steps: [
    T('brief', 'Set the constraint and the goal', .10, true, 'Constraints create creativity: size, palette, theme, audience. Choose them.', 'Write 3 constraints.'),
    T('rough', 'Make rough versions fast', .30, true, 'Make several ugly versions quickly. Choose the strongest instead of perfecting the first.', 'Make 3 rough sketches.'),
    T('develop', 'Develop the best one', .35, true, 'Spend your time on the direction that has energy.', 'Develop your favourite.'),
    T('refine', 'Refine details', .15, false, 'Contrast, balance, alignment, finishing touches.', 'Fix the biggest visual problem.'),
    T('share', 'Step back and finish', .10, true, 'Look with fresh eyes, fix the biggest thing, call it done.', 'Step back and fix one thing.'),
  ], tips: ['Make 3 bad versions before 1 good one.', 'Squint to check contrast and balance.', 'Done is better than perfect.', 'Take a 2-minute break and look again.'], alt: ['Copy a style, then change one thing.', 'Work in black and white first.', 'Set a hard 10-minute limit for the first version.'] },
  admin: { label: 'Admin / inbox', steps: [
    T('dump', 'List everything that needs doing', .12, true, 'Get it all out of your head onto one list.', 'List every item.'),
    T('rank', 'Mark the 3 that actually matter', .10, true, 'Which ones have a deadline or a person waiting? Do those first.', 'Star the top 3.'),
    T('hit', 'Do the top 3', .50, true, 'One at a time, to finished. Don\'t switch.', 'Do number 1.'),
    T('batch', 'Batch the small stuff', .20, false, 'Two-minute tasks go together in one run.', 'Clear the 2-minute tasks.'),
    T('close', 'Close the loop', .08, true, 'Reply, note what\'s waiting on others, and write tomorrow\'s first task.', 'Write tomorrow\'s first task.'),
  ], tips: ['If it takes under 2 minutes, do it now.', 'Do the one person-is-waiting item first.', 'Batch similar tasks.', 'Write tomorrow\'s first task before you stop.'], alt: ['Do the hardest one first.', 'Unsubscribe or delete before you reply.', 'Ask what to drop.'] },
});

// tips for the original categories
const TIPS = {
  presentation: ['One idea per slide; the headline is the takeaway.', 'Open with the problem, not your name.', 'Fewer words, bigger visuals.', 'Rehearse out loud — once is enough to find problems.'],
  writing: ['Draft first, edit later — don\'t mix them.', 'Lead with your main point.', 'Cut a quarter of the words.', 'Read it aloud to catch problems.'],
  study: ['Test yourself instead of re-reading.', 'Start with the highest-weight topics.', 'Do past questions under time.', 'Sleep beats a late-night cram.'],
  build: ['Define "done" before coding.', 'Get something running end-to-end first.', 'Hard-code what you can; replace later.', 'Run the whole demo once before you stop.'],
  workout: ['Warm up — it prevents injury.', 'Main lifts first while you\'re fresh.', 'Quality reps beat extra reps.', 'Drink water and stretch after.'],
  general: ['Define finished in one line.', 'Do the biggest piece first.', 'Don\'t polish early.', 'Check against your definition of finished.'],
};
for (const [k, v] of Object.entries(TIPS)) TEMPLATES[k].tips = v;

export function detectCategory(goal) {
  const g = goal.toLowerCase();
  const rules = [
    ['cooking', /(cook|bake|dinner|lunch|breakfast|recipe|meal prep|\bmeal\b)/],
    ['interview', /(interview|job application|resume|cv\b|cover letter)/],
    ['language', /(spanish|french|german|hindi|japanese|korean|mandarin|italian|language|vocab|vocabulary|duolingo)/],
    ['music', /(guitar|piano|violin|drum|sing|song|chord|instrument|practi[sc]e music)/],
    ['workout', /(workout|gym|run\b|running|exercise|lift|yoga|train|fitness|cardio|stretch)/],
    ['cleaning', /(clean|tidy|declutter|laundry|organi[sz]e (my|the) (room|house|desk|home))/],
    ['travel', /(pack|packing|trip|travel|luggage|airport|flight)/],
    ['event', /(party|wedding|event|plan (my|the|a)|birthday|schedule|itinerary|budget)/],
    ['presentation', /(present|slide|deck|pitch|talk|keynote)/],
    ['writing', /(essay|report|paper|write|article|blog|email|letter|thesis|assignment|story|post)/],
    ['study', /(study|exam|test|revise|revision|quiz|learn|homework|course|lecture)/],
    ['build', /(build|code|coding|app|hackathon|ship|feature|prototype|website|bug|deploy|program)/],
    ['research', /(research|investigate|compare|find out|look into|analy[sz]e)/],
    ['creative', /(design|draw|paint|sketch|logo|poster|edit (a|my) video|photo|illustrat|animate|compose)/],
    ['admin', /(inbox|emails|admin|paperwork|taxes|invoice|errands|to-?do|catch up)/],
  ];
  for (const [c, re] of rules) if (re.test(g)) return c;
  return 'general';
}

// ---- time tiers: what's realistic and how to work depends on how long you have ----
export function tierOf(min) { return min <= 15 ? 'micro' : min <= 45 ? 'short' : min <= 120 ? 'standard' : min <= 300 ? 'long' : 'marathon'; }
export const TIERS = {
  micro: { label: 'Micro-sprint', realistic: (m) => `In ${m} minutes, aim for one small, finished outcome — not a perfect one.`, skip: ['Research rabbit holes', 'Polish and formatting', 'Anything that needs a second pass'], rhythm: 'One unbroken push. Silence notifications.' },
  short: { label: 'Focused block', realistic: (m) => `${m} minutes is one focused block: one main outcome plus a quick check.`, skip: ['Extra features or sections', 'Perfecting details', 'Switching between tasks'], rhythm: 'One block. Stand up for 30 seconds at the halfway mark.' },
  standard: { label: 'Working session', realistic: (m) => `${m} minutes is enough for a full pass: understand it, do it, check it.`, skip: ['Gold-plating', 'Side quests'], rhythm: 'Two focus blocks with a 5-minute break in the middle.' },
  long: { label: 'Deep-work session', realistic: (m) => `${m} minutes allows real depth. Do the hardest part first while you\'re fresh.`, skip: ['Starting with the easy stuff'], rhythm: 'Work in ~50-minute blocks with 10-minute breaks. Eat and drink before the second block.' },
  marathon: { label: 'Marathon', realistic: (m) => `${m} minutes is a long haul. Plan it in blocks, not as one stretch.`, skip: ['Working without breaks', 'Leaving the hard part until late'], rhythm: '90-minute blocks, a real meal break, and a firm stop time. Hardest block first.' },
};

export function offlineBriefing(category, minutes) {
  const tpl = TEMPLATES[category] || TEMPLATES.general, tier = tierOf(minutes), T2 = TIERS[tier];
  return {
    source: 'offline', tier, tierLabel: T2.label,
    headline: `${minutes >= 60 ? Math.round(minutes / 6) / 10 + ' h' : minutes + ' min'} for ${tpl.label.toLowerCase()} — ${T2.label.toLowerCase()}`,
    realistic: T2.realistic(Math.round(minutes)), facts: (tpl.tips || []).slice(0, minutes <= 15 ? 2 : minutes <= 45 ? 3 : 4),
    skip: T2.skip, rhythm: T2.rhythm,
  };
}
