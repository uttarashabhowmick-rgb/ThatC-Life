# Testing ThatC Life (Alexa+ track)

No accounts, API keys or credentials are needed. The optional AI planner is off by default.

**Requirements:** Node.js 22.9 or newer.

## Run it
git clone https://github.com/uttarashabhowmick-rgb/ThatC-Life.git
cd ThatC-Life
npm start

The server starts on http://localhost:8787

## Try it
1. Open http://localhost:8787/alexa/ (simulated Alexa+ client; the side panel shows every MCP call live).
2. Say or type: "I have 45 minutes to prepare a presentation."
3. Open http://localhost:8787/tv/ in a second tab (companion screen: plan, time left, sounds).
4. Try any other task, e.g. "cook dinner in 30 minutes" or "study for an exam in 2 hours".
5. Say "I only have 20 minutes now" and watch the plan shrink to the essentials.
6. Leave a step running past its time-box: the guide notices you are behind by itself and replans.

## MCP endpoint
POST http://localhost:8787/mcp (Streamable HTTP, spec 2025-11-25).
Tools: start_session, get_guidance, get_briefing, complete_step, report_blocker, update_time, change_goal.

## Automated tests
npm test (16 tests, including an end-to-end MCP flow).
