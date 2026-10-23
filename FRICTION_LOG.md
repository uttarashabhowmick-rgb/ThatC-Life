Friction Log

Task attempted: Build a self-hosted MCP server for Alexa+ (spec 2025-11-25, Streamable HTTP) and test it with an Alexa+ style client.

Steps taken: Read the MCP spec and hackathon rules; hand-wrote a dependency-free Node.js server (JSON-RPC 2.0, version negotiation, Mcp-Session-Id, MCP-Protocol-Version, 202 for notifications, DELETE, Origin validation); built a simulated Alexa+ client that calls it like a real MCP client.

Expected vs. actual:

Expected an installable MCP SDK and a working server in minutes. Actual: my build environment blocked the package registry, so I implemented the transport by hand from the spec.
Expected to test against real Alexa+. Actual: only the simulated Alexa+ path was available to me; I did not test on a real Alexa+ device.
Expected to add an AI planner with a live model for richer, task-specific guidance. Actual: I could not afford an AI API key, so I built a built-in planner that works for any task without one. An optional AI planner exists in the code (off by default) but was not tested against a live model.

Severity: Medium (cost hours; real-device behavior and live AI planning unverified).

Workaround: Spec-compliant hand-written server, a built-in planner that needs no key, 16 automated tests, and a smoke-test script.