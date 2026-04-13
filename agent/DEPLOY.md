# Excite Days Swag Agent - Deployment Guide

## Prerequisites
- Power Platform environment with Copilot Studio enabled
- PAC CLI v2.1+ (`pac install latest`)
- `az` CLI authenticated to the target tenant
- Dataverse connection owner with create/read/write on all swag_ tables

## Step 1: Provision Dataverse Tables

Create tables in the target environment using the definitions in `agent/tables/`.
Each JSON file defines columns, types, and relationships.

```bash
# Generate Dataverse solution from table definitions
# (manual step: create tables via make.powerapps.com or pac CLI)
```

Key setup:
- `swag_swagitems.swag_quantityavailable`: configure as Dataverse **calculated field** (formula: quantitytotal - quantityreserved)
- `swag_budgettrackers.swag_remainingavailable`: configure as Dataverse **calculated field** (formula: programtotal - totalspent - totalreserved)
- `swag_allocations.swag_eventid`: configure as **Parental** relationship to swag_events (cascade delete)
- `swag_allocations.swag_itemid`: configure as **Referential** relationship to swag_swagitems

## Step 2: Import Power Automate Flows

Import the three flow definitions from `agent/flows/`:

1. **Context Loader** (`context-loader.json`): Triggered at conversation start. Loads budget + inventory + rules + recent events.
2. **Calculate Allocation** (`calculate-allocation.json`): Pure math flow. Item quantities in, costs out.
3. **Finalize Allocation** (`finalize-allocation.json`): Changeset flow. Budget re-check, inventory re-check, create event + allocations, reserve inventory, update budget.

Each flow needs a Dataverse connection. Use the service account connection for all three.

## Step 3: Create Copilot Studio Agent

1. Go to copilotstudio.microsoft.com
2. Create a new agent in the target environment
3. Paste the GPT instructions from `agent/botcomponents/swagAgent.gpt.default/data`
4. Connect the three Power Automate flows as actions:
   - `LoadContext` -> context-loader flow (called at conversation start topic)
   - `CalculateAllocation` -> calculate-allocation flow
   - `FinalizeAllocation` -> finalize-allocation flow
5. Create a conversation start topic that:
   - Calls LoadContext flow
   - Stores the result in a `SessionContext` topic variable
   - Passes SessionContext to the GPT instructions
6. Publish the agent to the target channel (Teams and/or SharePoint)

## Step 4: Deploy Admin Code App

```bash
cd event-swag
npm run build
pac code push
```

The Code App deploys to the Power Platform environment. Embed it in a model-driven app or a canvas app page for Adrea's team.

## Step 5: Seed Data

1. **Budget**: Create one row in swag_budgettrackers for the current quarter
2. **Inventory**: Import swag items into swag_swagitems (from Adrea's existing spreadsheet)
3. **Rules**: Use the admin Code App's Rules Editor to configure per-tier packs

## Step 6: Test

Use the evaluation suite (120+ historical orders, split 80/40 train/eval):
1. Feed 40 holdout event parameters to the agent
2. Compare agent proposals to historical allocations
3. Target: 80%+ within +/-15% of historical cost
4. Adrea blind review: 10-15 new events

## Architecture

```
SELLER --> COPILOT STUDIO AGENT --> POWER AUTOMATE FLOWS --> DATAVERSE <-- ADMIN CODE APP
                |                         |                                      |
                | (conversation)          | (read/write)                         | (read/write)
                |                         |                                      |
                +- Intake                 +- Context Loader                      +- Rules Editor
                +- Propose                +- Calculator                          +- Budget Dashboard
                +- Negotiate              +- Finalizer (changeset)              +- Inventory
                +- Finalize               |                                      +- Orders
                                          +- Budget re-check at finalization
```

## Known Constraints

- System prompt limit: 8,000 chars (current: 5,837)
- Topic variable payload: 28 KB (current estimate: ~10 KB)
- Flow call latency: 3-5 seconds (agent shows "One moment..." during calls)
- No Azure AD app registration (enterprise policy)
- Copilot Studio User.ID is the identity provider subject claim, not AAD Object ID
