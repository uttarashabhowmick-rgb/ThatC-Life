"""Exercise the ThatC Life MCP server with the *official* MCP Python client.

    pip install mcp
    python scripts/verify_with_official_client.py http://localhost:8787/mcp

Runs both handshake modes: 'auto' (probes the newest spec, falls back) and 'legacy' (2025-11-25 initialize).
"""
import asyncio, json, sys
from mcp import Client

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8787/mcp"

def text(result):
    return "\n".join(c.text for c in result.content if getattr(c, "type", "") == "text")

async def run(mode):
    print(f"\n===== mode={mode} =====")
    async with Client(URL, mode=mode) as client:
        print("protocol:", client.protocol_version, "| server:", client.server_info.name, client.server_info.version)
        print("instructions:", (client.instructions or "")[:80], "...")
        tools = await client.list_tools()
        names = [t.name for t in tools.tools]
        print("tools:", names)
        assert {"start_session", "get_status", "report_blocker", "set_time_remaining", "change_goal"} <= set(names)

        r = await client.call_tool("reset_session", {})
        r = await client.call_tool("start_session", {"goal": "Finish my investor presentation", "minutes": 120})
        assert not r.is_error, text(r)
        sc = r.structured_content
        print("start ->", sc["mode"], "|", sc["say"][:90])
        assert sc["mode"] == "explore"

        r = await client.call_tool("simulate_time", {"minutes": 28})
        sc = r.structured_content
        print("after 28 idle min ->", sc["mode"], "| ask:", sc["ask"] and sc["ask"]["options"])
        assert sc["mode"] == "recover" and sc["ask"]

        r = await client.call_tool("report_blocker", {"kind": "hard"})
        print("hard ->", r.structured_content["now"]["title"])

        r = await client.call_tool("set_time_remaining", {"minutes": 12})
        sc = r.structured_content
        print("12 min left ->", sc["mode"], "| cut:", sc["cut"])
        assert sc["mode"] in ("triage", "sprint")

        r = await client.call_tool("change_goal", {"goal": "Three minute elevator pitch for investors", "minutes": 20})
        print("change goal ->", r.structured_content["mode"], "| kept:", r.structured_content["reassessment"]["kept"])

        # validation errors must be tool errors (SEP-1303), not protocol errors
        r = await client.call_tool("set_time_remaining", {"minutes": "soon"})
        print("bad args -> is_error =", r.is_error, "|", text(r)[:70])
        assert r.is_error

        res = await client.list_resources()
        print("resources:", [x.uri for x in res.resources])
        body = await client.read_resource("thatc://session/current")
        print("resource mode:", json.loads(body.contents[0].text)["mode"])
        prompts = await client.list_prompts()
        print("prompts:", [p.name for p in prompts.prompts])
    print(f"mode={mode} OK")

async def main():
    await run("legacy")
    await run("auto")
    print("\nALL OFFICIAL-CLIENT CHECKS PASSED")

asyncio.run(main())
