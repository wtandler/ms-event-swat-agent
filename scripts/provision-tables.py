#!/usr/bin/env python3
"""
Provisions the 5 Excite Days Swag tables in Dataverse via Web API.

Reads token from /tmp/.dv-env. Uses MSCRM.SolutionUniqueName header so all
created components are automatically added to the ExciteDaysSwag solution.

Idempotent: checks for existing tables and skips creation if they exist.
"""

import json
import os
import sys
import tempfile
import time
from urllib import request, error

# Load env (works on Windows where /tmp doesn't exist via Python)
env_path = os.path.join(tempfile.gettempdir(), ".dv-env")
if not os.path.exists(env_path):
    env_path = "/tmp/.dv-env"  # fallback for Linux/macOS
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


def api(method: str, path: str, body=None, prefer="return=representation"):
    url = f"{DV_URL}/api/data/v9.2{path}"
    data = json.dumps(body).encode() if body else None
    req = request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {DV_TOKEN}")
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    req.add_header("OData-MaxVersion", "4.0")
    req.add_header("OData-Version", "4.0")
    if prefer:
        req.add_header("Prefer", prefer)
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


def table_exists(logical_name: str) -> bool:
    code, body = api("GET", f"/EntityDefinitions(LogicalName='{logical_name}')?$select=LogicalName")
    return code == 200


def create_table(spec: dict) -> bool:
    if table_exists(spec["LogicalName"]):
        print(f"  [SKIP] Table {spec['LogicalName']} already exists")
        return True
    code, body = api("POST", "/EntityDefinitions", spec)
    if code in (200, 201, 204):
        print(f"  [OK] Created table {spec['LogicalName']}")
        return True
    print(f"  [FAIL] Create {spec['LogicalName']}: {code} {json.dumps(body)[:300]}")
    return False


def add_column(table_logical: str, column_spec: dict) -> bool:
    col_name = column_spec["LogicalName"]
    # Check existence
    code, _ = api("GET", f"/EntityDefinitions(LogicalName='{table_logical}')/Attributes(LogicalName='{col_name}')?$select=LogicalName")
    if code == 200:
        print(f"    [SKIP] Column {col_name} already exists")
        return True
    code, body = api("POST", f"/EntityDefinitions(LogicalName='{table_logical}')/Attributes", column_spec)
    if code in (200, 201, 204):
        print(f"    [OK] Added column {col_name}")
        return True
    print(f"    [FAIL] Add column {col_name}: {code} {json.dumps(body)[:300]}")
    return False


# Common column type builders
def text_col(name, display, max_len=200, required=False):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "AttributeType": "String",
        "AttributeTypeName": {"Value": "StringType"},
        "MaxLength": max_len,
        "FormatName": {"Value": "Text"},
        "SchemaName": name,
        "LogicalName": name.lower(),
        "RequiredLevel": {"Value": "ApplicationRequired" if required else "None"},
        "DisplayName": {"LocalizedLabels": [{"Label": display, "LanguageCode": 1033}]},
    }


def memo_col(name, display, max_len=10000):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        "AttributeType": "Memo",
        "AttributeTypeName": {"Value": "MemoType"},
        "MaxLength": max_len,
        "Format": "TextArea",
        "ImeMode": "Auto",
        "SchemaName": name,
        "LogicalName": name.lower(),
        "RequiredLevel": {"Value": "None"},
        "DisplayName": {"LocalizedLabels": [{"Label": display, "LanguageCode": 1033}]},
    }


def int_col(name, display, required=False, default=None):
    spec = {
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        "AttributeType": "Integer",
        "AttributeTypeName": {"Value": "IntegerType"},
        "MinValue": -2147483648,
        "MaxValue": 2147483647,
        "Format": "None",
        "SchemaName": name,
        "LogicalName": name.lower(),
        "RequiredLevel": {"Value": "ApplicationRequired" if required else "None"},
        "DisplayName": {"LocalizedLabels": [{"Label": display, "LanguageCode": 1033}]},
    }
    return spec


def money_col(name, display, required=False):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.MoneyAttributeMetadata",
        "AttributeType": "Money",
        "AttributeTypeName": {"Value": "MoneyType"},
        "MinValue": 0,
        "MaxValue": 100000000000,
        "Precision": 2,
        "PrecisionSource": 2,
        "ImeMode": "Disabled",
        "SchemaName": name,
        "LogicalName": name.lower(),
        "RequiredLevel": {"Value": "ApplicationRequired" if required else "None"},
        "DisplayName": {"LocalizedLabels": [{"Label": display, "LanguageCode": 1033}]},
    }


def date_col(name, display, required=False):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        "AttributeType": "DateTime",
        "AttributeTypeName": {"Value": "DateTimeType"},
        "Format": "DateOnly",
        "DateTimeBehavior": {"Value": "DateOnly"},
        "ImeMode": "Disabled",
        "SchemaName": name,
        "LogicalName": name.lower(),
        "RequiredLevel": {"Value": "ApplicationRequired" if required else "None"},
        "DisplayName": {"LocalizedLabels": [{"Label": display, "LanguageCode": 1033}]},
    }


def bool_col(name, display, default=False):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        "AttributeType": "Boolean",
        "AttributeTypeName": {"Value": "BooleanType"},
        "DefaultValue": default,
        "OptionSet": {
            "TrueOption": {"Value": 1, "Label": {"LocalizedLabels": [{"Label": "Yes", "LanguageCode": 1033}]}},
            "FalseOption": {"Value": 0, "Label": {"LocalizedLabels": [{"Label": "No", "LanguageCode": 1033}]}},
            "OptionSetType": "Boolean",
        },
        "SchemaName": name,
        "LogicalName": name.lower(),
        "RequiredLevel": {"Value": "ApplicationRequired"},
        "DisplayName": {"LocalizedLabels": [{"Label": display, "LanguageCode": 1033}]},
    }


def choice_col(name, display, options: list[str], required=False, default_value=None):
    """options is a list of string labels. Values are auto-assigned starting at 100000000."""
    base = 100000000
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        "AttributeType": "Picklist",
        "AttributeTypeName": {"Value": "PicklistType"},
        "DefaultFormValue": default_value if default_value is not None else -1,
        "OptionSet": {
            "Options": [
                {
                    "Value": base + i,
                    "Label": {"LocalizedLabels": [{"Label": opt, "LanguageCode": 1033}]},
                }
                for i, opt in enumerate(options)
            ],
            "IsGlobal": False,
            "OptionSetType": "Picklist",
        },
        "SchemaName": name,
        "LogicalName": name.lower(),
        "RequiredLevel": {"Value": "ApplicationRequired" if required else "None"},
        "DisplayName": {"LocalizedLabels": [{"Label": display, "LanguageCode": 1033}]},
    }


# Table specs

TABLES = [
    {
        "spec": {
            "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
            "SchemaName": f"{PREFIX}_BudgetTracker",
            "LogicalName": f"{PREFIX}_budgettracker",
            "DisplayName": {"LocalizedLabels": [{"Label": "Budget Tracker", "LanguageCode": 1033}]},
            "DisplayCollectionName": {"LocalizedLabels": [{"Label": "Budget Trackers", "LanguageCode": 1033}]},
            "Description": {"LocalizedLabels": [{"Label": "One row per budget period (quarter). Tracks total/spent/reserved/remaining.", "LanguageCode": 1033}]},
            "OwnershipType": "OrganizationOwned",
            "HasActivities": False,
            "HasNotes": False,
            "PrimaryNameAttribute": f"{PREFIX}_programname",
            "Attributes": [
                {
                    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                    "AttributeType": "String",
                    "AttributeTypeName": {"Value": "StringType"},
                    "MaxLength": 200,
                    "IsPrimaryName": True,
                    "FormatName": {"Value": "Text"},
                    "SchemaName": f"{PREFIX}_ProgramName",
                    "LogicalName": f"{PREFIX}_programname",
                    "RequiredLevel": {"Value": "ApplicationRequired"},
                    "DisplayName": {"LocalizedLabels": [{"Label": "Program Name", "LanguageCode": 1033}]},
                }
            ],
        },
        "extra_columns": [
            money_col(f"{PREFIX}_ProgramTotal", "Program Total", required=True),
            money_col(f"{PREFIX}_TotalSpent", "Total Spent", required=True),
            money_col(f"{PREFIX}_TotalReserved", "Total Reserved", required=True),
            date_col(f"{PREFIX}_QuarterStart", "Quarter Start", required=True),
            date_col(f"{PREFIX}_QuarterEnd", "Quarter End", required=True),
        ],
    },
    {
        "spec": {
            "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
            "SchemaName": f"{PREFIX}_SwagItem",
            "LogicalName": f"{PREFIX}_swagitem",
            "DisplayName": {"LocalizedLabels": [{"Label": "Swag Item", "LanguageCode": 1033}]},
            "DisplayCollectionName": {"LocalizedLabels": [{"Label": "Swag Items", "LanguageCode": 1033}]},
            "Description": {"LocalizedLabels": [{"Label": "Inventory master for swag items.", "LanguageCode": 1033}]},
            "OwnershipType": "OrganizationOwned",
            "HasActivities": False,
            "HasNotes": False,
            "PrimaryNameAttribute": f"{PREFIX}_name",
            "Attributes": [
                {
                    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                    "AttributeType": "String",
                    "AttributeTypeName": {"Value": "StringType"},
                    "MaxLength": 200,
                    "IsPrimaryName": True,
                    "FormatName": {"Value": "Text"},
                    "SchemaName": f"{PREFIX}_Name",
                    "LogicalName": f"{PREFIX}_name",
                    "RequiredLevel": {"Value": "ApplicationRequired"},
                    "DisplayName": {"LocalizedLabels": [{"Label": "Item Name", "LanguageCode": 1033}]},
                }
            ],
        },
        "extra_columns": [
            choice_col(f"{PREFIX}_SizeCategory", "Size Category", ["S", "M", "L"], required=True),
            money_col(f"{PREFIX}_UnitCost", "Unit Cost", required=True),
            int_col(f"{PREFIX}_QuantityTotal", "Quantity Total", required=True),
            int_col(f"{PREFIX}_QuantityReserved", "Quantity Reserved", required=True),
            text_col(f"{PREFIX}_TierEligibility", "Tier Eligibility (comma-separated)", max_len=200),
        ],
    },
    {
        "spec": {
            "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
            "SchemaName": f"{PREFIX}_Event",
            "LogicalName": f"{PREFIX}_event",
            "DisplayName": {"LocalizedLabels": [{"Label": "Event", "LanguageCode": 1033}]},
            "DisplayCollectionName": {"LocalizedLabels": [{"Label": "Events", "LanguageCode": 1033}]},
            "Description": {"LocalizedLabels": [{"Label": "Seller event request with attendee breakdown and status.", "LanguageCode": 1033}]},
            "OwnershipType": "OrganizationOwned",
            "HasActivities": False,
            "HasNotes": False,
            "PrimaryNameAttribute": f"{PREFIX}_sellername",
            "Attributes": [
                {
                    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                    "AttributeType": "String",
                    "AttributeTypeName": {"Value": "StringType"},
                    "MaxLength": 200,
                    "IsPrimaryName": True,
                    "FormatName": {"Value": "Text"},
                    "SchemaName": f"{PREFIX}_SellerName",
                    "LogicalName": f"{PREFIX}_sellername",
                    "RequiredLevel": {"Value": "ApplicationRequired"},
                    "DisplayName": {"LocalizedLabels": [{"Label": "Seller Name", "LanguageCode": 1033}]},
                }
            ],
        },
        "extra_columns": [
            date_col(f"{PREFIX}_EventDate", "Event Date", required=True),
            int_col(f"{PREFIX}_AttendeeCount", "Attendee Count", required=True),
            int_col(f"{PREFIX}_ExecCount", "Exec Count", required=True),
            int_col(f"{PREFIX}_ChampCount", "Champ Count", required=True),
            int_col(f"{PREFIX}_Tier3Count", "Tier 3 Count", required=True),
            int_col(f"{PREFIX}_Tier4Count", "Tier 4 Count", required=True),
            bool_col(f"{PREFIX}_InPerson", "In-Person"),
            text_col(f"{PREFIX}_SellerUserId", "Seller User ID", max_len=200),
            text_col(f"{PREFIX}_TPID", "TPID (Customer Account ID)", max_len=50),
            choice_col(f"{PREFIX}_Status", "Status", ["draft", "confirmed", "amended", "ordered", "cancelled"], required=True),
            money_col(f"{PREFIX}_TotalCost", "Total Cost"),
        ],
    },
    {
        "spec": {
            "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
            "SchemaName": f"{PREFIX}_Allocation",
            "LogicalName": f"{PREFIX}_allocation",
            "DisplayName": {"LocalizedLabels": [{"Label": "Allocation", "LanguageCode": 1033}]},
            "DisplayCollectionName": {"LocalizedLabels": [{"Label": "Allocations", "LanguageCode": 1033}]},
            "Description": {"LocalizedLabels": [{"Label": "Line-item allocation linking an event to a swag item.", "LanguageCode": 1033}]},
            "OwnershipType": "OrganizationOwned",
            "HasActivities": False,
            "HasNotes": False,
            "PrimaryNameAttribute": f"{PREFIX}_itemname",
            "Attributes": [
                {
                    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                    "AttributeType": "String",
                    "AttributeTypeName": {"Value": "StringType"},
                    "MaxLength": 200,
                    "IsPrimaryName": True,
                    "FormatName": {"Value": "Text"},
                    "SchemaName": f"{PREFIX}_ItemName",
                    "LogicalName": f"{PREFIX}_itemname",
                    "RequiredLevel": {"Value": "ApplicationRequired"},
                    "DisplayName": {"LocalizedLabels": [{"Label": "Item Name", "LanguageCode": 1033}]},
                }
            ],
        },
        "extra_columns": [
            int_col(f"{PREFIX}_Quantity", "Quantity", required=True),
            money_col(f"{PREFIX}_TotalCost", "Total Cost"),
            choice_col(f"{PREFIX}_Status", "Status", ["proposed", "confirmed", "ordered", "cancelled"]),
        ],
    },
    {
        "spec": {
            "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
            "SchemaName": f"{PREFIX}_AllocationRule",
            "LogicalName": f"{PREFIX}_allocationrule",
            "DisplayName": {"LocalizedLabels": [{"Label": "Allocation Rule", "LanguageCode": 1033}]},
            "DisplayCollectionName": {"LocalizedLabels": [{"Label": "Allocation Rules", "LanguageCode": 1033}]},
            "Description": {"LocalizedLabels": [{"Label": "Tier-specific allocation rules. JSON column conforming to AllocationRuleSchema TS type.", "LanguageCode": 1033}]},
            "OwnershipType": "OrganizationOwned",
            "HasActivities": False,
            "HasNotes": False,
            "PrimaryNameAttribute": f"{PREFIX}_tiername",
            "Attributes": [
                {
                    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                    "AttributeType": "String",
                    "AttributeTypeName": {"Value": "StringType"},
                    "MaxLength": 50,
                    "IsPrimaryName": True,
                    "FormatName": {"Value": "Text"},
                    "SchemaName": f"{PREFIX}_TierName",
                    "LogicalName": f"{PREFIX}_tiername",
                    "RequiredLevel": {"Value": "ApplicationRequired"},
                    "DisplayName": {"LocalizedLabels": [{"Label": "Tier Name", "LanguageCode": 1033}]},
                }
            ],
        },
        "extra_columns": [
            choice_col(f"{PREFIX}_EventType", "Event Type", ["in-person", "virtual"], required=True),
            memo_col(f"{PREFIX}_RulesJSON", "Rules JSON", max_len=10000),
        ],
    },
]


def main():
    print(f"Provisioning {len(TABLES)} tables in solution {SOLUTION_NAME}...")
    print(f"Target: {DV_URL}\n")

    for table in TABLES:
        spec = table["spec"]
        logical = spec["LogicalName"]
        print(f"Table: {logical}")
        if not create_table(spec):
            print(f"  Stopping after failure on {logical}")
            sys.exit(1)
        # Wait briefly for entity to be queryable
        time.sleep(1)
        for col in table["extra_columns"]:
            if not add_column(logical, col):
                print(f"  Continuing despite column failure...")

    print("\nDone.")


if __name__ == "__main__":
    main()
