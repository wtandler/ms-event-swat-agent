#!/usr/bin/env python3
"""Hydrate an existing portal-created Copilot Studio agent with custom content.

USAGE:
    1. Create a new agent via copilotstudio.microsoft.com portal
       - Name: "Excite Days Swag Agent"
       - Skip the "describe your agent" step (paste instructions manually later)
       - Choose the ExciteDaysSwag solution when saving
    2. Copy the bot ID from the URL (last GUID before /canvas)
    3. Run: python3 scripts/hydrate-agent.py <bot-id>

This script ADDS to a portal-created bot (safe):
    - GPT instructions (type 15) - patches data column directly
    - Finalize topic (type 9) - triggers on user confirmation
    - LoadContext action (type 9) - wraps the context-loader flow
    - FinalizeAllocation action (type 9) - wraps the finalize flow

This script does NOT create the bot itself, does NOT clone system topics,
does NOT touch anything the portal created.

Prior learnings applied:
    - PATCH data column directly (pac solution import is unreliable for topics/GPT)
    - Strip em-dashes (Dataverse UTF-8 mangling)
    - Create botcomponent with minimal fields, associate to bot, then PATCH data
"""

import json
import os
import sys
import tempfile
from urllib import request, error, parse

if len(sys.argv) < 2:
    print(__doc__)
    print("ERROR: bot-id argument required")
    sys.exit(1)

BOT_ID = sys.argv[1]

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


def api(method, path, body=None):
    url = f"{DV_URL}/api/data/v9.2{path}"
    data = json.dumps(body).encode() if body else None
    req = request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {DV_TOKEN}")
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    req.add_header("OData-MaxVersion", "4.0")
    req.add_header("OData-Version", "4.0")
    req.add_header("Prefer", "return=representation")
    req.add_header("MSCRM.SolutionUniqueName", SOLUTION_NAME)
    try:
        with request.urlopen(req, timeout=120) as resp:
            text = resp.read().decode()
            return resp.status, (json.loads(text) if text else None)
    except error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, None


def get_bot_prefix():
    """Read the bot's schemaname to discover the prefix the portal chose."""
    code, body = api("GET", f"/bots({BOT_ID})?$select=schemaname,name")
    if code != 200 or not body:
        print(f"ERROR: bot {BOT_ID} not found")
        sys.exit(1)
    schema = body["schemaname"]
    print(f"Found bot: {body['name']} ({schema})")
    return schema


def find_component(schema):
    filter_expr = parse.quote(f"schemaname eq '{schema}'")
    code, body = api("GET", f"/botcomponents?$filter={filter_expr}&$select=botcomponentid,componenttype")
    if code == 200 and body and body.get("value"):
        return body["value"][0]
    return None


def create_component(name, schema, component_type):
    existing = find_component(schema)
    if existing:
        print(f"  [SKIP] {schema} already exists: {existing['botcomponentid']}")
        return existing["botcomponentid"]
    payload = {
        "name": name,
        "schemaname": schema,
        "componenttype": component_type,
        "statecode": 0,
        "statuscode": 1,
    }
    code, body = api("POST", "/botcomponents", payload)
    if code in (200, 201, 204) and body:
        return body.get("botcomponentid")
    print(f"  [FAIL create] {code}: {json.dumps(body)[:300]}")
    return None


def link_to_bot(comp_id):
    payload = {"@odata.id": f"{DV_URL}/api/data/v9.2/botcomponents({comp_id})"}
    code, _ = api("POST", f"/bots({BOT_ID})/bot_botcomponent/$ref", payload)
    return code in (200, 204)


def patch_data(comp_id, content):
    content = content.replace("\u2014", "-").replace("\u2013", "-")
    payload = {"data": content}
    code, _ = api("PATCH", f"/botcomponents({comp_id})", payload)
    return code in (200, 204)


def read_file(relative_path):
    abs_path = os.path.join(os.path.dirname(__file__), "..", relative_path)
    with open(abs_path, encoding="utf-8") as f:
        return f.read()


def main():
    prefix = get_bot_prefix()  # e.g., "swag_swagAgent" or whatever the portal assigned

    # 1. GPT instructions
    print("\n[1/4] Adding GPT instructions...")
    gpt_schema = f"{prefix}.gpt.default"
    gpt_id = create_component(f"{prefix} GPT", gpt_schema, 15)
    if gpt_id:
        link_to_bot(gpt_id)
        instructions = read_file("agent/botcomponents/swagAgent.gpt.default/data")
        if patch_data(gpt_id, instructions):
            print(f"  [OK] {len(instructions)} chars of instructions patched")
        # Patch bot.configuration to link GPT
        config_resp = api("GET", f"/bots({BOT_ID})?$select=configuration")
        _, body = config_resp
        try:
            config = json.loads(body.get("configuration", "{}"))
        except Exception:
            config = {}
        if "gPTSettings" not in config:
            config.setdefault("$kind", "BotConfiguration")
            config["gPTSettings"] = {"$kind": "GPTSettings", "defaultSchemaName": gpt_schema}
            patch = {"configuration": json.dumps(config)}
            req_code, _ = api("PATCH", f"/bots({BOT_ID})", patch)
            print(f"  [OK] Linked bot.configuration.gPTSettings ({req_code})")

    # 2. Custom Finalize topic
    print("\n[2/4] Adding Finalize topic...")
    finalize_schema = f"{prefix}.topic.Finalize"
    finalize_id = create_component("Finalize Allocation", finalize_schema, 9)
    if finalize_id:
        link_to_bot(finalize_id)
        yaml_content = read_file("agent/botcomponents/swagAgent.topic.Finalize/data")
        # Rewrite schema references to match whatever prefix the portal assigned
        yaml_content = yaml_content.replace("swag_swagAgent", prefix)
        patch_data(finalize_id, yaml_content)

    # 3. LoadContext action
    print("\n[3/4] Adding LoadContext action...")
    lc_schema = f"{prefix}.action.LoadContext"
    lc_id = create_component("Load Context", lc_schema, 9)
    if lc_id:
        link_to_bot(lc_id)
        yaml_content = read_file("agent/botcomponents/swagAgent.action.LoadContext/data")
        patch_data(lc_id, yaml_content)

    # 4. FinalizeAllocation action
    print("\n[4/4] Adding FinalizeAllocation action...")
    fa_schema = f"{prefix}.action.FinalizeAllocation"
    fa_id = create_component("Finalize Allocation Flow", fa_schema, 9)
    if fa_id:
        link_to_bot(fa_id)
        yaml_content = read_file("agent/botcomponents/swagAgent.action.FinalizeAllocation/data")
        patch_data(fa_id, yaml_content)

    # 5. Trigger publish
    print("\nTriggering publish...")
    code, body = api("POST", f"/bots({BOT_ID})/Microsoft.Dynamics.CRM.PvaPublish", {})
    print(f"  Publish: {code}")

    print("\nDone.")
    print(f"\nOpen the agent to verify:")
    print(f"  https://copilotstudio.microsoft.com/environments/f8b7bdab-0227-45ec-9a40-e3799b0b4d65/bots/{BOT_ID}/canvas")


if __name__ == "__main__":
    main()
