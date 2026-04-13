#!/usr/bin/env python3
"""Create the Swag Allocation Agent (Copilot Studio bot + GPT component).

Per prior learnings:
- pac solution import does NOT reliably populate GPT instructions
- Fix: PATCH the `data` column directly via Dataverse Web API
- Do NOT use yaml.dump — reformatting breaks Copilot Studio
- No em dashes in GPT instructions (UTF-8 mangling)
- Bot configuration must include gPTSettings.defaultSchemaName linking to GPT component

Creates:
- 1 bot record (the agent shell)
- 1 botcomponent of type 15 (GPT instructions)
- Bot.configuration JSON linking to the GPT component

Manual follow-up in Copilot Studio portal:
- Topic authoring (conversation start, negotiation, finalize)
- Wire LoadContext + FinalizeAllocation flows as actions
- Power Fx negotiation topic
- Publish to channels (Teams / SharePoint)
"""

import json
import os
import sys
import tempfile
import uuid
from urllib import request, error, parse

env_path = os.path.join(tempfile.gettempdir(), ".dv-env")
if not os.path.exists(env_path):
    env_path = "/tmp/.dv-env"
env = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and "=" in line:
            k, v = line.split("=", 1)
            env[k] = v

DV_URL = env["DV_URL"]
DV_TOKEN = env["DV_TOKEN"]
SOLUTION_NAME = env["DV_SOLUTION_NAME"]
PREFIX = env["DV_PREFIX"]

BOT_SCHEMA_NAME = f"{PREFIX}_swagAgent"
GPT_SCHEMA_NAME = f"{PREFIX}_swagAgent.gpt.default"
AGENT_FRIENDLY_NAME = "Excite Days Swag Agent"


def api(method, path, body=None, raw_body=None, content_type="application/json"):
    url = f"{DV_URL}/api/data/v9.2{path}"
    if raw_body is not None:
        data = raw_body if isinstance(raw_body, bytes) else raw_body.encode()
    elif body is not None:
        data = json.dumps(body).encode()
    else:
        data = None
    req = request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {DV_TOKEN}")
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", content_type)
    req.add_header("OData-MaxVersion", "4.0")
    req.add_header("OData-Version", "4.0")
    req.add_header("Prefer", "return=representation")
    req.add_header("MSCRM.SolutionUniqueName", SOLUTION_NAME)
    try:
        with request.urlopen(req, timeout=120) as resp:
            text = resp.read().decode()
            return resp.status, (json.loads(text) if text else None)
    except error.HTTPError as e:
        text = e.read().decode()
        try:
            payload = json.loads(text)
        except Exception:
            payload = {"raw": text}
        return e.code, payload


def find_bot(schema_name):
    filter_expr = parse.quote(f"schemaname eq '{schema_name}'")
    code, body = api("GET", f"/bots?$filter={filter_expr}&$select=botid,name,schemaname")
    if code == 200 and body and body.get("value"):
        return body["value"][0]
    return None


def find_botcomponent(schema_name):
    filter_expr = parse.quote(f"schemaname eq '{schema_name}' and componenttype eq 15")
    code, body = api("GET", f"/botcomponents?$filter={filter_expr}&$select=botcomponentid,schemaname,name")
    if code == 200 and body and body.get("value"):
        return body["value"][0]
    return None


def create_bot():
    existing = find_bot(BOT_SCHEMA_NAME)
    if existing:
        print(f"  [SKIP] Bot already exists: {existing['botid']}")
        return existing["botid"]

    payload = {
        "name": AGENT_FRIENDLY_NAME,
        "schemaname": BOT_SCHEMA_NAME,
        "language": 1033,  # en-US
        "statecode": 0,
        "statuscode": 1,
    }
    code, body = api("POST", "/bots", payload)
    if code in (200, 201, 204) and body:
        bot_id = body.get("botid")
        print(f"  [OK] Created bot: {bot_id}")
        return bot_id
    print(f"  [FAIL] Create bot: {code} {json.dumps(body)[:400]}")
    return None


def read_gpt_instructions():
    path = os.path.join(os.path.dirname(__file__), "..", "agent", "botcomponents", "swagAgent.gpt.default", "data")
    with open(path, encoding="utf-8") as f:
        content = f.read()
    # Safety: strip em-dashes per prior learning
    content = content.replace("\u2014", "-").replace("\u2013", "-")
    return content


def create_gpt_component(bot_id):
    existing = find_botcomponent(GPT_SCHEMA_NAME)
    if existing:
        print(f"  [SKIP] GPT component already exists: {existing['botcomponentid']}")
        return existing["botcomponentid"]

    # Minimal creation payload - then PATCH data separately per prior learning
    payload = {
        "name": f"{AGENT_FRIENDLY_NAME} GPT",
        "schemaname": GPT_SCHEMA_NAME,
        "componenttype": 15,  # GPT
        "parentbotid@odata.bind": f"/bots({bot_id})",
        "statecode": 0,
        "statuscode": 1,
    }
    code, body = api("POST", "/botcomponents", payload)
    if code in (200, 201, 204) and body:
        comp_id = body.get("botcomponentid")
        print(f"  [OK] Created GPT component: {comp_id}")
        return comp_id
    print(f"  [FAIL] Create GPT: {code} {json.dumps(body)[:400]}")
    return None


def patch_gpt_data(comp_id, instructions):
    # PATCH the `data` column directly — raw YAML/text, no reformatting
    payload = {"data": instructions}
    code, body = api("PATCH", f"/botcomponents({comp_id})", body=payload)
    if code in (200, 204):
        print(f"  [OK] Patched GPT instructions ({len(instructions)} chars)")
        return True
    print(f"  [FAIL] Patch GPT data: {code} {json.dumps(body)[:400]}")
    return False


def set_bot_configuration(bot_id):
    # Link bot -> GPT component via gPTSettings.defaultSchemaName (per prior learning)
    config = {
        "gPTSettings": {
            "defaultSchemaName": GPT_SCHEMA_NAME,
        }
    }
    payload = {"configuration": json.dumps(config)}
    code, body = api("PATCH", f"/bots({bot_id})", body=payload)
    if code in (200, 204):
        print(f"  [OK] Linked bot -> GPT via configuration")
        return True
    print(f"  [FAIL] Set configuration: {code} {json.dumps(body)[:400]}")
    return False


def publish_bot(bot_id):
    # PvaPublish unbound action
    code, body = api("POST", f"/bots({bot_id})/Microsoft.Dynamics.CRM.PvaPublish", body={})
    if code in (200, 202, 204):
        print(f"  [OK] Published bot")
        return True
    print(f"  [WARN] Publish returned {code}: {json.dumps(body)[:300]}")
    print(f"         This is expected if topics aren't authored yet. Publish manually from portal after topic authoring.")
    return False


def main():
    print(f"Creating Swag Allocation Agent in solution {SOLUTION_NAME}...\n")

    print("Step 1: Create bot shell")
    bot_id = create_bot()
    if not bot_id:
        sys.exit(1)

    print("\nStep 2: Create GPT component")
    comp_id = create_gpt_component(bot_id)
    if not comp_id:
        sys.exit(1)

    print("\nStep 3: Patch GPT instructions via `data` column")
    instructions = read_gpt_instructions()
    patch_gpt_data(comp_id, instructions)

    print("\nStep 4: Link bot -> GPT via configuration")
    set_bot_configuration(bot_id)

    print("\nStep 5: Attempt publish (will fail if no topics yet - that's expected)")
    publish_bot(bot_id)

    print(f"\n=== Created ===")
    print(f"  Bot ID:  {bot_id}")
    print(f"  GPT ID:  {comp_id}")
    print(f"  Schema:  {BOT_SCHEMA_NAME}")
    print(f"\nNext steps in Copilot Studio portal:")
    print(f"  1. Open https://copilotstudio.microsoft.com/")
    print(f"  2. Select environment: CSS CMO")
    print(f"  3. Open agent: {AGENT_FRIENDLY_NAME}")
    print(f"  4. Author topics:")
    print(f"     - Conversation Start: call LoadContext flow, set SessionContext variable")
    print(f"     - Negotiation: Power Fx for Sum/multiplication on lineItems")
    print(f"     - Finalize: call FinalizeAllocation flow")
    print(f"  5. Add actions pointing to the 2 imported flows")
    print(f"  6. Publish to Teams + SharePoint")


if __name__ == "__main__":
    main()
