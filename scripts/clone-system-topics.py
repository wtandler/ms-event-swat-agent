#!/usr/bin/env python3
"""DO NOT USE. Clone system topics from CSS Atlas V3 to the Swag Agent.

WARNING - THIS SCRIPT IS WRONG. Keeping it as a cautionary reference.

Per Microsoft docs: "System topics are automatically generated and shouldn't be
manually cloned. Manual cloning can corrupt the bot component hierarchy. Portal
UI fails to render components due to schema conflicts."

The correct path is to create the bot via the Copilot Studio portal (which
auto-generates system topics), then hydrate it with custom content using
hydrate-agent.py.

Original docstring below for reference.


Every Copilot Studio bot needs built-in topics (Greeting, Fallback, OnError, etc.)
for the validator to pass. The UI doesn't provide an API to generate these, so we
clone them from a working agent, rewriting the schema name prefix.
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

SOURCE_BOT_ID = "bede77b9-821d-4b5e-9a46-8e0929112fef"  # CSS Atlas V3
SOURCE_PREFIX = "cr02a_cssAtlasV3"
TARGET_PREFIX = "swag_swagAgent"

# System topics every bot needs. NOT: ConversationStart (we have our own),
# not Search (knowledge-source specific), not Signin (auth-specific).
SYSTEM_TOPICS = [
    "Conversationalboosting",
    "EndofConversation",
    "Escalate",
    "Fallback",
    "Goodbye",
    "Greeting",
    "MultipleTopicsMatched",
    "OnError",
    "ResetConversation",
    "StartOver",
    "ThankYou",
    "WhatCanYouDo",
]


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


def get_source_topic(topic_name):
    schema = f"{SOURCE_PREFIX}.topic.{topic_name}"
    filter_expr = parse.quote(f"schemaname eq '{schema}' and componenttype eq 9")
    code, body = api("GET", f"/botcomponents?$filter={filter_expr}&$select=name,data,content,componentstate")
    if code == 200 and body and body.get("value"):
        return body["value"][0]
    return None


def find_target(schema):
    filter_expr = parse.quote(f"schemaname eq '{schema}' and componenttype eq 9")
    code, body = api("GET", f"/botcomponents?$filter={filter_expr}&$select=botcomponentid")
    if code == 200 and body and body.get("value"):
        return body["value"][0]["botcomponentid"]
    return None


def create_topic(schema, name):
    existing = find_target(schema)
    if existing:
        return existing
    payload = {
        "name": name,
        "schemaname": schema,
        "componenttype": 9,
        "statecode": 0,
        "statuscode": 1,
    }
    code, body = api("POST", "/botcomponents", payload)
    if code in (200, 201, 204) and body:
        return body.get("botcomponentid")
    print(f"    [FAIL create] {code}: {json.dumps(body)[:200]}")
    return None


def link_to_bot(comp_id):
    payload = {"@odata.id": f"{DV_URL}/api/data/v9.2/botcomponents({comp_id})"}
    code, body = api("POST", f"/bots({BOT_ID})/bot_botcomponent/$ref", payload)
    return code in (200, 204)


def patch_data(comp_id, data_str):
    payload = {"data": data_str}
    code, body = api("PATCH", f"/botcomponents({comp_id})", payload)
    return code in (200, 204)


def main():
    print(f"Cloning {len(SYSTEM_TOPICS)} system topics from Atlas V3 to Swag Agent...\n")
    cloned = 0
    for topic in SYSTEM_TOPICS:
        source = get_source_topic(topic)
        if not source:
            print(f"  [SKIP] {topic}: not found in source")
            continue
        target_schema = f"{TARGET_PREFIX}.topic.{topic}"
        comp_id = create_topic(target_schema, topic)
        if not comp_id:
            print(f"  [FAIL] {topic}: could not create target")
            continue
        link_to_bot(comp_id)
        data = source.get("data", "") or source.get("content", "")
        # Rewrite any self-references (schema prefix) from source to target
        data = data.replace(SOURCE_PREFIX, TARGET_PREFIX)
        # Strip em-dashes per prior learning
        data = data.replace("\u2014", "-").replace("\u2013", "-")
        if patch_data(comp_id, data):
            print(f"  [OK] {topic}: cloned ({len(data)} chars)")
            cloned += 1
        else:
            print(f"  [FAIL PATCH] {topic}")

    print(f"\nCloned {cloned}/{len(SYSTEM_TOPICS)} system topics.")

    # Re-publish
    print("\nRe-publishing bot...")
    code, body = api("POST", f"/bots({BOT_ID})/Microsoft.Dynamics.CRM.PvaPublish", {})
    print(f"  Publish: {code}")


if __name__ == "__main__":
    main()
