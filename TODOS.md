# TODOS

Deferred work items tracked by `/review` and downstream skills.

## Pre-Deployment (blocking for production use)

### agent-flow-finalize-implementation
**What:** Implement the three placeholder sections in `agent/flows/finalize-allocation.json`:
- Step2 `_comment`: inventory re-check via Apply to Each with condition per line item
- Step4 `_comment`: changeset batch for allocation creates + inventory reserve increments
- Compensation scope `_comment`: reverse writes on changeset failure

**Why:** The flow is scaffolded with correct shape but three critical sections are prose placeholders, not Power Automate actions. Not deployable as-is.

**How to apply:** Open in Power Automate designer after `pac solution import`. Use the prose in each `_comment` as the spec for what to build. Changesets give atomicity; compensation handles the rare double-failure case flagged by the outside voice in `/plan-eng-review`.

**Context:** Eng review run 2 + outside voice identified both the need for changeset atomicity and the orphan reservation risk from compensation failure. Related TODO: orphan-reservation-detection-flow (separate scheduled flow).

### code-app-create-budget-period-dialog
**What:** Implement the "Create Budget Period" dialog triggered from `BudgetDashboard.tsx:131`.
**Why:** When no active budget period exists, the empty state shows a button with a `/* TODO */` handler. Adrea can't create the first period without it.
**How to apply:** Fluent UI `Dialog` with form fields for ProgramName, ProgramTotal, QuarterStart, QuarterEnd. Writes to `swag_budgettrackers` via Power Apps SDK.

### code-app-inventory-add-item-dialog
**What:** Implement "Add Item" dialog triggered from `InventoryManagement.tsx` toolbar and empty state.
**Why:** No way to add a new swag item when a new shipment has a new product. Currently only QuantityTotal is editable inline.
**How to apply:** Fluent UI `Dialog` with Name, SizeCategory, UnitCost, QuantityTotal, TierEligibility fields. Writes to `swag_swagitems` via SDK.

### code-app-rules-editor-persistence
**What:** Wire up `RulesEditor.handleSave` in `src/pages/RulesEditor.tsx:183` to write `AllocationRuleSchema` JSON to the `swag_allocationrules` Dataverse table.
**Why:** Currently the save button shows a success toast but doesn't persist. `void totalCost;` exists only to satisfy TypeScript unused-var check.
**How to apply:** Construct `const rule: AllocationRuleSchema = { tierName, eventType, packItems, totalPackCost: totalCost }`. Upsert into `swag_allocationrules` where `swag_tiername = tierName AND swag_eventtype = eventType`. Use `@odata.bind` if adding any FK relationships.

### code-app-swap-mock-data-for-sdk
**What:** Replace `MOCK_*` imports in all 4 pages with Power Apps SDK calls.
**Why:** Pages currently read from `src/utils/mockData.ts`. Production needs `@microsoft/power-apps/app` SDK calls. `IS_DEV` constant exists but isn't used yet.
**How to apply:** `pac code add-data-source -a dataverse -t <tablename>` for each of 5 tables. Creates generated services in `src/generated/`. Replace each `MOCK_X` import with the generated service call. Cast types via `as unknown as YourType` per prior learning (SDK types are `string | undefined`).

## Post-Deployment (nice-to-have, from outside voice findings)

### orphan-reservation-detection-flow
**What:** Scheduled Power Automate flow (weekly) that reconciles `swag_quantityreserved` against sum of confirmed allocations.
**Why:** If finalize-allocation changeset partially fails AND compensation also fails, you get phantom reservations with no detection.
**How to apply:** Weekly trigger, query all SwagItems, compare `QuantityReserved` to sum of allocations.Status IN (confirmed, ordered). Flag mismatches via email to Adrea.

### error-notification-and-weekly-summary-flows
**What:** Two flows: (1) error notification — email Adrea on any swag flow failure; (2) weekly summary — Adrea gets allocations confirmed + budget spent + % remaining.
**Why:** Currently silent failures go unnoticed. Power Automate run history exists but no proactive alerting.
**How to apply:** Flow 1: trigger on flow failure. Flow 2: weekly schedule, aggregate from swag_events + swag_budgettrackers.

### dataverse-table-explicit-primary-keys
**What:** Add explicit primary key column declarations to the 5 table JSON definitions in `agent/tables/`.
**Why:** Dataverse infers PK as `{entityName}id` but the table JSONs don't make this explicit. Flows reference `swag_budgettrackerid` and `swag_swagitemid` which rely on convention.
**How to apply:** Add `primaryKeyAttribute` field to each table JSON matching the Dataverse convention.

### code-app-allocation-schema-runtime-validation
**What:** Add runtime validation in `RulesEditor.handleSave` that the constructed JSON matches `AllocationRuleSchema` before writing.
**Why:** The type is a compile-time contract. Runtime validation prevents writing malformed JSON that the agent then fails to parse.
**How to apply:** Small validator function or zod schema in `src/types/`. Check packItems non-empty, quantities > 0, totalPackCost matches sum.
