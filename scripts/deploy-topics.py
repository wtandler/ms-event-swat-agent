#!/usr/bin/env python3
"""Deploy the Copilot Studio topics and actions (botcomponent records of type 9).

Pattern per prior learning:
1. Create botcomponent shell (no data, minimal fields to avoid 400 errors)
2. Link to parent bot via bot_botcomponent association
3. PATCH the YAML into the `data` column
4. Publish the bot

Strips em-dashes from YAML (UTF-8 mangling by Dataverse API, per prior learning).
"""

import json
import os
import sys
import tempfile
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
BOT_ID = env.get("DV_BOT_ID", "65586df5-4f37-f111-88b5-000d3a597585")


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
        text = e.read().decode()
        try:
            payload = json.loads(text)
        except Exception:
            payload = {"raw": text}
        return e.code, payload


def find_component(schema_name):
    filter_expr = parse.quote(f"schemaname eq '{schema_name}' and componenttype eq 9")
    code, body = api("GET", f"/botcomponents?$filter={filter_expr}&$select=botcomponentid,schemaname,name")
    if code == 200 and body and body.get("value"):
        return body["value"][0]
    return None


def create_component(name, schema_name):
    existing = find_component(schema_name)
    if existing:
        print(f"  [SKIP] Component {schema_name} already exists: {existing['botcomponentid']}")
        return existing["botcomponentid"]
    payload = {
        "name": name,
        "schemaname": schema_name,
        "componenttype": 9,
        "statecode": 0,
        "statuscode": 1,
    }
    code, body = api("POST", "/botcomponents", payload)
    if code in (200, 201, 204) and body:
        comp_id = body.get("botcomponentid")
        print(f"  [OK] Created {schema_name}: {comp_id}")
        return comp_id
    print(f"  [FAIL] {schema_name}: {code} {json.dumps(body)[:300]}")
    return None


def link_to_bot(comp_id):
    payload = {"@odata.id": f"{DV_URL}/api/data/v9.2/botcomponents({comp_id})"}
    code, body = api("POST", f"/bots({BOT_ID})/bot_botcomponent/$ref", payload)
    if code in (200, 204):
        return True
    if code == 412 or (body and "Duplicate" in json.dumps(body)):
        print(f"       [SKIP] already linked")
        return True
    print(f"       [FAIL] link: {code} {json.dumps(body)[:200]}")
    return False


def patch_yaml(comp_id, yaml_path):
    with open(yaml_path, encoding="utf-8") as f:
        content = f.read()
    content = content.replace("\u2014", "-").replace("\u2013", "-")
    payload = {"data": content}
    code, body = api("PATCH", f"/botcomponents({comp_id})", payload)
    if code in (200, 204):
        print(f"       [OK] Patched data ({len(content)} chars)")
        return True
    print(f"       [FAIL] patch: {code} {json.dumps(body)[:300]}")
    return False


COMPONENTS = [
    {
        "name": "Conversation Start",
        "schema": "swag_swagAgent.topic.ConversationStart",
        "path": os.path.join(os.path.dirname(__file__), "..", "agent", "botcomponents", "swagAgent.topic.ConversationStart", "data"),
    },
    {
        "name": "Finalize Allocation Topic",
        "schema": "swag_swagAgent.topic.Finalize",
        "path": os.path.join(os.path.dirname(__file__), "..", "agent", "botcomponents", "swagAgent.topic.Finalize", "data"),
    },
    {
        "name": "Load Context Action",
        "schema": "swag_swagAgent.action.LoadContext",
        "path": os.path.join(os.path.dirname(__file__), "..", "agent", "botcomponents", "swagAgent.action.LoadContext", "data"),
    },
    {
        "name": "Finalize Allocation Action",
        "schema": "swag_swagAgent.action.FinalizeAllocation",
        "path": os.path.join(os.path.dirname(__file__), "..", "agent", "botcomponents", "swagAgent.action.FinalizeAllocation", "data"),
    },
]


def publish_bot():
    code, body = api("POST", f"/bots({BOT_ID})/Microsoft.Dynamics.CRM.PvaPublish", {})
    if code in (200, 202, 204):
        print("  [OK] Publish triggered")
        return True
    print(f"  [WARN] Publish returned {code}: {json.dumps(body)[:400] if body else ''}")
    return False


def main():
    print(f"Deploying {len(COMPONENTS)} botcomponents to bot {BOT_ID}...\n")
    created_ids = []
    for comp in COMPONENTS:
        print(f"Component: {comp['schema']}")
        comp_id = create_component(comp["name"], comp["schema"])
        if not comp_id:
            continue
        link_to_bot(comp_id)
        patch_yaml(comp_id, comp["path"])
        created_ids.append(comp_id)

    print(f"\nDeployed {len(created_ids)}/{len(COMPONENTS)} components.")
    print("\nTriggering publish...")
    publish_bot()

    print("\nDone.")


if __name__ == "__main__":
    main()
