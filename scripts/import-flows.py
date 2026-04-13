#!/usr/bin/env python3
"""Import the 2 Power Automate flows into the ExciteDaysSwag solution.

Creates workflow records in Dataverse (category=5, statecode=0=Draft).
After import, the user must open each flow in the Power Automate portal
to configure the Dataverse connection (OAuth is interactive), then turn it on.
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


def flow_exists(name):
    filter_expr = parse.quote(f"name eq '{name}' and category eq 5")
    code, body = api("GET", f"/workflows?$filter={filter_expr}&$select=workflowid,name,statecode")
    if code == 200 and body and body.get("value"):
        return body["value"][0]
    return None


def create_flow(name, definition_path, description):
    existing = flow_exists(name)
    if existing:
        print(f"  [SKIP] Flow '{name}' already exists (id: {existing['workflowid']})")
        return existing["workflowid"]

    with open(definition_path) as f:
        definition = json.load(f)

    client_data = {
        "properties": {
            "connectionReferences": {},
            "definition": definition.get("definition", definition),
        },
        "schemaVersion": "1.0.0.0",
    }

    payload = {
        "name": name,
        "description": description,
        "category": 5,
        "type": 1,
        "primaryentity": "none",
        "statecode": 0,
        "statuscode": 1,
        "clientdata": json.dumps(client_data),
    }
    code, body = api("POST", "/workflows", payload)
    if code in (200, 201, 204) and body:
        wfid = body.get("workflowid", "?")
        print(f"  [OK] Created flow '{name}' (id: {wfid})")
        return wfid
    print(f"  [FAIL] {name}: {code} {json.dumps(body)[:400]}")
    return None


def main():
    print(f"Importing flows into solution {SOLUTION_NAME}...\n")

    flows = [
        {
            "name": "SwagAgent - Context Loader",
            "path": os.path.join(os.path.dirname(__file__), "..", "agent", "flows", "context-loader.json"),
            "description": "Loads budget + inventory + rules + recent allocations at conversation start. Injected as SessionContext topic variable.",
        },
        {
            "name": "SwagAgent - Finalize Allocation",
            "path": os.path.join(os.path.dirname(__file__), "..", "agent", "flows", "finalize-allocation.json"),
            "description": "Budget re-check, inventory re-check, create event + allocations, reserve inventory, update budget. Compensation scope on failure.",
        },
    ]

    created = []
    for flow in flows:
        print(f"Flow: {flow['name']}")
        wfid = create_flow(flow["name"], flow["path"], flow["description"])
        if wfid:
            created.append({"name": flow["name"], "id": wfid})

    print("\nDone.")


if __name__ == "__main__":
    main()
