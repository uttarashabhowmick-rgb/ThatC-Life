# 3-minute demo — shot list

**Setup (once):** `npm start`. Fire TV emulator/stick running the app (full-screen). Alexa+ simulator
(`/alexa/`) on a laptop/phone in frame, mic on. In the TV's Menu panel hit **Reset**. Record at 1080p.
Use the mic for at least the first two lines — real voice sells it.

| Time | On screen | Say / do |
|---|---|---|
| **0:00–0:15** | Black → TV aurora glows | VO: *"Every AI gives you the same answer whether you have two hours or twenty minutes. That's broken."* |
| **0:15–0:30** | Title card, then both screens | VO: *"ThatC Life changes how AI helps as time and progress change. One brain — Alexa+ for voice, Fire TV for the room."* |
| **0:30–0:55** | Alexa sim + TV (purple **Explore**) | Voice: **"Alexa, ask ThatC Life to help me finish my investor presentation in two hours."** TV lights up, rich explanation. |
| **0:55–1:10** | TV | Voice: **"I finished the outline."** Plan ticks, chart updates. |
| **1:10–1:35** | TV turns amber **Recover** | Menu → **Fast-forward 30 min** (label: *Demo clock*). TV *asks* what's wrong. VO: *"It doesn't assume I'm slacking."* Voice: **"I got interrupted for twenty minutes."** → *"doesn't count against you."* |
| **1:35–1:50** | TV | Voice: **"This is too hard."** Step splits into a smallest version. |
| **1:50–2:20** | TV flips **Triage → Sprint** (orange→red), UI collapses to ONE instruction | Voice: **"I only have 25 minutes now."** VO: *"Same app. Completely different experience."* |
| **2:20–2:40** | TV | Voice: **"Actually, change my goal to a two minute elevator pitch."** Finished work carries forward. |
| **2:40–2:55** | Split: MCP trace panel + terminal `npm test` green + Fire TV device | VO: *"Self-hosted MCP server, Streamable HTTP, spec 2025-11-25. Running on a real Fire TV."* Show the TV in-hand / emulator frame. |
| **2:55–3:00** | Tagline | *"When time changes, the way AI helps you should change too."* |

**Must be visible for the rules:** (1) the Fire TV app running on a device/emulator, (2) the MCP calls in the trace panel.
