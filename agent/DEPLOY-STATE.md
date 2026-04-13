# Deployment State — CSS CMO Environment

**Deployed:** 2026-04-13
**Environment:** CSS CMO (`https://csscmo.crm.dynamics.com`)
**Environment ID:** `f8b7bdab-0227-45ec-9a40-e3799b0b4d65`

## What's Deployed (via API)

### Solution
- **Name:** Excite Days Swag Allocation
- **Unique Name:** `ExciteDaysSwag`
- **Version:** 1.0.0.0
- **ID:** `45b758e7-4a37-f111-88b5-6045bd0069b1`
- **Publisher Prefix:** `swag_`
- **Publisher ID:** `78359adc-4a37-f111-88b5-6045bd00f798`

### Dataverse Tables (5)
| Logical Name | Purpose | Status |
|---|---|---|
| `swag_budgettracker` | Per-quarter budget | ✅ |
| `swag_swagitem` | Inventory master | ✅ |
| `swag_event` | Seller event registry | ✅ |
| `swag_allocation` | Line-item allocations (FK -> event, FK -> item) | ✅ |
| `swag_allocationrule` | Per-tier allocation rules (JSON column) | ✅ |

Relationships:
- `swag_event -> swag_allocation` (Parental, cascade delete)
- `swag_swagitem -> swag_allocation` (Referential, restrict delete)

### Power Automate Flows (2)
Both created as **Draft** state in Dataverse. Need to be opened in the Power Automate portal to configure the Dataverse connection (OAuth is interactive and cannot be automated) and turned ON.

| Flow Name | Workflow ID | State | Purpose |
|---|---|---|---|
| `SwagAgent - Context Loader` | `d2d8f0ba-4f37-f111-88b5-000d3a3760f1` | Draft | Load budget + inventory + rules + recent allocations at conversation start |
| `SwagAgent - Finalize Allocation` | `3f03ecbd-4f37-f111-88b5-6045bd0a8549` | Draft | Re-check budget + inventory, create event + allocations, reserve inventory, update budget, compensate on failure |

### Copilot Studio Agent
- **Name:** Excite Days Swag Agent
- **Bot ID:** `65586df5-4f37-f111-88b5-000d3a597585`
- **Schema:** `swag_swagAgent`
- **GPT Component ID:** `da42ff1c-5037-f111-88b5-000d3a5a76dd`
- **Config:** Linked via `gPTSettings.defaultSchemaName`
- **Instructions:** 6,017 chars (under 8K limit), persisted in `botcomponent.data` column

### Admin Code App
- **Name:** Excite Days Swag Admin
- **App ID:** `de327c56-31ad-4e05-89d0-3cda10eca4f8`
- **Play URL:** https://apps.powerapps.com/play/e/f8b7bdab-0227-45ec-9a40-e3799b0b4d65/app/de327c56-31ad-4e05-89d0-3cda10eca4f8
- **Status:** Live, reads/writes all 5 tables via Power Apps SDK

---

## Manual Steps Remaining (Portal-Only — Cannot Be Automated)

### 1. Activate the Power Automate Flows (5 min)

Open: https://make.powerautomate.com/environments/f8b7bdab-0227-45ec-9a40-e3799b0b4d65/solutions/45b758e7-4a37-f111-88b5-6045bd0069b1

For each of the 2 flows (`SwagAgent - Context Loader`, `SwagAgent - Finalize Allocation`):
1. Click the flow name
2. Click **Edit**
3. When prompted to configure connections, sign in to **Dataverse** with your account
4. Click **Save**
5. Toggle the flow to **ON** (top-right)
6. Note the HTTP POST trigger URL from the "When an HTTP request is received" step — you'll paste these into Copilot Studio

### 2. Wire Up the Copilot Studio Agent Topics (15-30 min)

Open: https://copilotstudio.microsoft.com/environments/f8b7bdab-0227-45ec-9a40-e3799b0b4d65/bots/65586df5-4f37-f111-88b5-000d3a597585

Author 3 topics:

#### Conversation Start Topic
- Trigger: On conversation start
- Action: Call flow `SwagAgent - Context Loader` (no inputs)
- Set variable: `SessionContext` = flow response
- Invoke the agent's default behavior (uses GPT instructions + SessionContext)

#### Negotiation Math (Power Fx, no flow)
When the seller adjusts quantities:
- Set `lineItems[i].lineTotal` = `lineItems[i].quantity * lineItems[i].unitCost` (ForAll)
- Set `totalCost` = `Sum(lineItems, lineTotal)`
- Set `budgetRemaining` = `SessionContext.budget.remainingAvailable - totalCost`
- Set `overBudget` = `budgetRemaining < 0`

#### Finalize Topic
When seller confirms:
- Action: Call flow `SwagAgent - Finalize Allocation`
  - Pass: `eventDetails`, `lineItems`, `totalCost`
- Branch on response status:
  - `confirmed` → "Allocation confirmed. Chris will place the order."
  - `budget_conflict` → return to negotiation with new numbers
  - `inventory_conflict` → re-propose with current inventory
  - `finalization_failed` → "Something went wrong. Please retry."

### 3. Publish to Channels (5 min)

In Copilot Studio, click **Publish** (top-right):
- Teams (requires Teams channel enabled)
- SharePoint (paste the site URL)

### 4. Seed Initial Data via the Code App (Adrea, 30 min)

Open: https://apps.powerapps.com/play/e/f8b7bdab-0227-45ec-9a40-e3799b0b4d65/app/de327c56-31ad-4e05-89d0-3cda10eca4f8

Adrea walks through the **Setup Checklist** on first load:
1. **Create Budget Period** — Dana provides the real ProgramTotal for Q1
2. **Add Swag Items** — Adrea/Chris enter the actual ~20 SKUs from the manufacturer
3. **Configure Rules** — Adrea defines what each of 4 tiers (Exec, Champ, Tier3, Tier4) receives in-person and virtual

### 5. End-to-End Test (Adrea + a test seller, 30 min)

1. Adrea has at least 1 budget period + 5 items + 2 rules configured
2. Open the agent in Teams or SharePoint
3. Describe a test event: "50 attendees, 3 execs, 10 champs, 15 tier 3, 22 tier 4, in-person, May 20"
4. Verify agent proposes an allocation within budget
5. Negotiate an adjustment ("add more stickers")
6. Confirm the allocation
7. Open the admin app, verify the event + allocation appear in Orders
8. Click "Mark as Ordered" in the Orders page
9. Re-verify the status changed

---

## What Was Not Automated (And Why)

- **Flow connections**: Power Automate requires interactive OAuth to create a Dataverse connection. Cannot be scripted.
- **Topic authoring**: Copilot Studio topics are visually authored in the portal. No public API for creating them programmatically.
- **Channel publishing**: Teams and SharePoint channel setup requires permissions and per-channel config in the Copilot Studio portal.
- **Real data seeding**: Adrea and Chris need to enter their own catalog + budget. The Code App's Setup Checklist is designed for this.

Everything that could be automated was automated.
