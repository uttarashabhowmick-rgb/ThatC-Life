# ThatC Life

> **When time, progress, or circumstances change, the way AI helps you should change too.**

ThatC Life is an adaptive AI workspace. Most assistants answer the same way whether you have two hours or twenty
minutes. ThatC Life continuously reads **time**, **progress** and **goal** and changes *how it helps* — tone, level of
detail, priorities, and even the shape of the screen.

Built for **Build, Ship, Shape — Amazon Developer Hackathon**, **Alexa+ track**.

| Part | What it is |
|---|---|
| **Alexa+ MCP server** | A self-hosted **MCP server** (Streamable HTTP, spec **2025-11-25**) — `src/mcp.js`, tools in `src/actions.js`. |
| **Simulated Alexa+** | A web client that is a real MCP client, with a live JSON-RPC trace — `alexa/`. Source included, as the simulated path requires. |
| **Companion screen** | A web screen that reshapes itself live when you talk to Alexa+ — `tv/`. It runs in a browser; it has **not** been run on Fire TV/Vega. |

Say something to the simulated Alexa+ → an MCP tool call changes shared state → the companion screen reshapes itself, live.

## The adaptive loop

```
 time awareness ─┐
 progress awareness ─┼─► assess() ─► mode ─► voice + screen + next action ─┐
 goal / constraints ─┘        ▲                                             │
                              └──────────── reassess on every event ◄───────┘
```

| Mode | Triggered when | Experience |
|---|---|---|
| **Explore** | Lots of time, healthy pace | Rich explanations, full plan, room to learn |
| **Flow** | On pace | Brisk, balanced, momentum |
| **Recover** | Behind plan or a step is stalling | **Asks** whether it's *hard*, *interrupted*, or the *approach* — never assumes you're distracted |
| **Triage** | The full plan no longer fits | Parks optional work (reversible — it returns if time frees up) |
| **Sprint** | Essentials barely fit / <12 min | One instruction at a time; honest about what's realistic; offers to re-scope |

Key behaviours (all covered in `test/e2e.test.js`):

* **Evidence before conclusions.** Slow ≠ failing. Interruption time is excluded from the pace calculation; "hard" splits the step; "approach" switches strategy.
* **Deferral is derived, not stored.** Every reassessment recomputes what fits, so nothing is lost and parked work returns automatically.
* **Goal changes carry work forward** instead of starting over.
* **Honest infeasibility.** If the plan can't finish in the time left, it says so and offers a smaller goal.

## What it does automatically

* **Notices by itself.** A server-side monitor reassesses every live session every 2 s. Falling behind, a step's
  time-box running out, halfway, ten minutes left, the deadline — it raises a notice (sound + words + Alexa+ proactive
  message) *without anyone saying "I'm behind"*. Progress is inferred from time-boxes and step completion; one tap
  answers its question when it needs to ask.
* **Information sized to your time.** Each step carries task-specific points; with 4 hours you get depth, with 8 minutes
  you get the single most important fact (`get_briefing` tool / "Know this" panel).
* **Works for any task.** Ten task families are built in (presentation, writing, study, coding, workout, cooking,
  interview, language, music, cleaning, travel, planning, research, creative, admin, general). With an LLM key
  (Amazon Bedrock or Anthropic — see `.env.example`) **every** task gets a plan and facts written for that exact task and time.
  If the AI is slow or fails, the built-in plan answers instantly and the AI plan swaps in when it arrives.
* **A different sound for every change** (16 synthesized sounds — no audio files, no copyright) and an alarm when
  you finish or time runs out. See `tv/sounds.json`.

## Run it (no dependencies, Node 22.9+)

```bash
npm start                      # http://localhost:8787   (optional: cp .env.example .env and add an AI key)
```

* Companion UI → http://localhost:8787/tv/
* Alexa+ sim  → http://localhost:8787/alexa/   (mic works in Chrome; or type)
* MCP         → `POST http://localhost:8787/mcp` (see `mcp.config.json`, `scripts/mcp-smoke.sh`)

Open `/tv/` and `/alexa/` side by side and talk to the simulator.

```bash
npm test                       # MCP protocol + full adaptive arc, over real HTTP
```

### MCP surface

Tools: `start_session`, `get_guidance`, `complete_step`, `report_blocker`, `update_time`, `change_goal`.
Every result is voice-ready text plus `structuredContent` (`mode`, `remainingMinutes`, `currentStep`, `reason`).
Implements: `initialize` version negotiation, `Mcp-Session-Id`, `MCP-Protocol-Version`, `202` for notifications,
`DELETE` session teardown, Origin validation (DNS-rebinding guard), optional bearer auth (`MCP_AUTH_TOKEN`),
tool annotations, JSON-Schema inputs, and `isError` tool-execution errors.

> The official `@modelcontextprotocol/sdk` can't be installed in the build sandbox this was authored in, so the
> transport is hand-written on Node's `http` module. It's ~120 lines (`src/mcp.js`) and swappable for the SDK
> without touching `src/actions.js`.

## Companion screen / Fire OS shell (experimental)

The companion screen is plain web tech (`tv/`), designed for a 10-foot, D-pad experience. `android/` contains a small Kotlin
WebView shell intended for Fire OS. **It has not been built or run on a device or simulator**, so this project does not claim Fire TV support.

## Layout

```
src/engine.js    adaptive brain: time + progress + goal → mode, messages, replanning
src/actions.js   the tool registry shared by MCP and the TV remote
src/mcp.js       MCP Streamable HTTP server (2025-11-25)
src/server.js    HTTP: /mcp, /api/*, SSE, static
tv/              companion screen (web, 10-foot style)
alexa/           simulated Alexa+ (real MCP client + trace panel)
android/         experimental Fire OS shell (untested)
test/            end-to-end tests
```

## Roadmap

LLM-backed planner behind the same `buildSteps` shape · Alexa+ account linking (OAuth) for per-user workspaces ·
a tested Fire OS / Vega build and camera-based progress signals · family / shared-screen sessions.

## Demo video

`demo/record_demo.py` re-records the captioned walkthrough (needs Python + Playwright + ffmpeg, server running);
`demo/VOICEOVER.md` is the narration script. For the hackathon, add real Fire TV device/emulator footage to the cut.
