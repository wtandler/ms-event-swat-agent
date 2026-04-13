#!/usr/bin/env python3
"""Provision FK relationships for swag tables.

- Allocation -> Event (Parental: delete cascades)
- Allocation -> SwagItem (Referential: lookup only, no cascade)
"""

import json
import os
import sys
import tempfile
from urllib import request, error

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
        with request.urlopen(req, timeout=180) as resp:
            text = resp.read().decode()
            return resp.status, (json.loads(text) if text else None)
    except error.HTTPError as e:
        text = e.read().decode()
        try:
            payload = json.loads(text)
        except Exception:
            payload = {"raw": text}
        return e.code, payload


def relationship_exists(schema_name):
    code, _ = api("GET", f"/RelationshipDefinitions(SchemaName='{schema_name}')?$select=SchemaName")
    return code == 200


def create_relationship(spec, name):
    if relationship_exists(spec["SchemaName"]):
        print(f"  [SKIP] Relationship {name} already exists")
        return
    code, body = api("POST", "/RelationshipDefinitions", spec)
    if code in (200, 201, 204):
        print(f"  [OK] Created relationship {name}")
    else:
        print(f"  [FAIL] {name}: {code} {json.dumps(body)[:400]}")


# Allocation -> Event (Parental: delete cascades, so deleting an event removes its allocations)
# Note: Don't set ReferencingAttribute at top level - Lookup.LogicalName drives it
alloc_to_event = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    "SchemaName": "swag_event_swag_allocation",
    "ReferencedEntity": "swag_event",
    "ReferencedAttribute": "swag_eventid",
    "ReferencingEntity": "swag_allocation",
    "CascadeConfiguration": {
        "Assign": "NoCascade",
        "Delete": "Cascade",
        "Merge": "NoCascade",
        "Reparent": "NoCascade",
        "Share": "NoCascade",
        "Unshare": "NoCascade",
        "RollupView": "NoCascade",
    },
    "Lookup": {
        "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
        "AttributeType": "Lookup",
        "AttributeTypeName": {"Value": "LookupType"},
        "SchemaName": "swag_EventId",
        "LogicalName": "swag_eventid",
        "RequiredLevel": {"Value": "ApplicationRequired"},
        "DisplayName": {"LocalizedLabels": [{"Label": "Event", "LanguageCode": 1033}]},
    },
    "AssociatedMenuConfiguration": {
        "Behavior": "UseCollectionName",
        "Group": "Details",
        "Label": {"LocalizedLabels": [{"Label": "Allocations", "LanguageCode": 1033}]},
        "Order": 10000,
    },
}

# Allocation -> SwagItem (Referential: lookup only, deleting an item doesn't cascade)
alloc_to_item = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    "SchemaName": "swag_swagitem_swag_allocation",
    "ReferencedEntity": "swag_swagitem",
    "ReferencedAttribute": "swag_swagitemid",
    "ReferencingEntity": "swag_allocation",
    "CascadeConfiguration": {
        "Assign": "NoCascade",
        "Delete": "Restrict",
        "Merge": "NoCascade",
        "Reparent": "NoCascade",
        "Share": "NoCascade",
        "Unshare": "NoCascade",
        "RollupView": "NoCascade",
    },
    "Lookup": {
        "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
        "AttributeType": "Lookup",
        "AttributeTypeName": {"Value": "LookupType"},
        "SchemaName": "swag_ItemId",
        "LogicalName": "swag_itemid",
        "RequiredLevel": {"Value": "ApplicationRequired"},
        "DisplayName": {"LocalizedLabels": [{"Label": "Swag Item", "LanguageCode": 1033}]},
    },
    "AssociatedMenuConfiguration": {
        "Behavior": "UseCollectionName",
        "Group": "Details",
        "Label": {"LocalizedLabels": [{"Label": "Allocations", "LanguageCode": 1033}]},
        "Order": 10000,
    },
}


def main():
    print("Provisioning FK relationships...\n")
    print("Allocation -> Event (Parental, cascade on delete):")
    create_relationship(alloc_to_event, "swag_event -> swag_allocation")
    print("\nAllocation -> Swag Item (Referential, restrict on delete):")
    create_relationship(alloc_to_item, "swag_swagitem -> swag_allocation")
    print("\nDone.")


if __name__ == "__main__":
    main()
