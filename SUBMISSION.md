# Build, Ship, Shape — submission kit (copy/paste into Devpost)

**Deadline: Fri Oct 23, 2026, 12:00 pm PDT = Sat Oct 24, 12:30 am IST.** Submit early.

## Tracks / challenges to select
* Track: **Alexa+** only (simulated Alexa+ + self-hosted MCP server). Do not select Fire TV — it was not run on a device or simulator.
* Mini challenge: **AWS Builder** — only if you actually ran the Amazon Bedrock planner (AWS_BEARER_TOKEN_BEDROCK). Don't claim it otherwise.

## Project name
ThatC Life

## Tagline
When time, progress or circumstances change, the way AI helps you should change too.

## Text description  (paste)
**What it does.** ThatC Life is an adaptive AI that works with time, progress and changing circumstances. Tell Alexa+ what you need to do and how long you have — anything: a presentation, an exam, packing, a workout. ThatC Life builds a plan sized to that time, gives you the specific information you need for the step in front of you, and then keeps watching. Nobody has to say "I'm falling behind": a monitor notices pace, time-boxes and milestones by itself, speaks up on Alexa+, and your Fire TV reshapes its whole screen — Explore (rich, explanatory), Flow, Recover (it asks whether the step is hard, you were interrupted, or the approach isn't working — it never assumes you're slacking), Triage (parks optional work), and Sprint (one instruction, the single key fact). Every kind of change has its own sound, and an alarm plays when you finish or time runs out. If the deadline moves or the goal changes, it re-plans around what you've already done.

**How we built it.** A dependency-free Node engine (time awareness + progress awareness + adaptive interaction + continuous reassessment) sits behind a **self-hosted MCP server (Streamable HTTP, spec 2025-11-25)** exposing seven tools (`start_session`, `get_guidance`, `get_briefing`, `complete_step`, `report_blocker`, `update_time`, `change_goal`). The Alexa+ experience is a simulated Alexa+ web client that is a real MCP client (live JSON-RPC trace on screen). The **Fire TV app** is a 10-foot, D-pad-driven UI packaged as a native Fire OS app (Kotlin WebView) and updated live over SSE. An optional planner uses **Amazon Bedrock** (or Anthropic) to write task-specific plans and facts; a built-in planner makes it work offline and instantly, and the AI plan swaps in when ready.

**Challenges.** Making "automatic" trustworthy: slow progress ≠ failure, so evidence comes first, interruption time is excluded from pace, and the AI asks before concluding. Keeping voice responses snappy while an LLM plans (instant built-in plan, AI upgrade in place).

**What's next.** Account linking so Alexa+ and Fire TV share one workspace per customer; camera-based progress signals on Fire TV; family/shared-screen sessions.

**Built with.** Node.js, MCP (Streamable HTTP, 2025-11-25), Alexa+ (simulated), Fire OS / Android TV (Kotlin WebView), Server-Sent Events, WebAudio, Amazon Bedrock (optional).

## What was built during the submission window (pre-existing-project question)
Everything in this repository was created after Aug 31, 2026 (first commit Oct 21–22, 2026). No pre-existing code.

## Product Feedback (answer per tool — fill with YOUR real experience; examples of the format)
**MCP (Streamable HTTP, spec 2025-11-25)** — *Used for:* the Alexa+ integration (hand-written server). *Worked:* the spec is short and clear; session id + protocol-version header model is easy to implement. *Needs work:* an official reference for how Alexa+ discovers/links a self-hosted server and how it handles auth would save hours. *Onboarding:* …  *Would build again:* yes.
**Fire OS / Fire TV** — *Used for:* hosting the 10-foot web UI in a native shell. *Worked:* …  *Needs work:* …
**Amazon Bedrock (if used)** — *Used for:* tailoring plans per task. *Worked:* …  *Needs work:* …
> Be honest and specific — judges read these, and a friction log is worth up to +10%.

## Friction log (optional, up to +10%) — keep notes as you go
* e.g. "Couldn't find which Fire TV emulator/simulator counts for the video requirement (Android TV AVD vs Vega Virtual Device)."
* e.g. "Alexa+ proactive notifications for a self-hosted MCP server — unclear how to trigger."

## Submission checklist
- [ ] Public GitHub repo, **LICENSE file present** (edit the name in LICENSE), README explains how to run
- [ ] Repo really calls MCP in code (`src/mcp.js`, `alexa/sim.js`) ✔
- [ ] Demo video **< 3:00**, public on **YouTube or Vimeo**, English, **no copyrighted music**
- [ ] Video shows the app **on a real Fire TV device or the Fire TV/Vega simulator**, and the MCP server in action
- [ ] Text description, product feedback, track(s) selected
- [ ] If repo is private: add reviewers knmeiss, giolaq, anishamalde, mosesroth, emersonsklar (invites expire in 7 days)
- [ ] Verify India eligibility in the Official Rules (the page didn't mention India explicitly)
