# TODOS

Deferred work items tracked by `/review` and downstream skills.

## Pre-Deployment (blocking for production use)

### code-app-swap-mock-data-for-sdk
**What:** Wire `src/hooks/useDataverse.ts` to real Power Apps SDK calls instead of in-memory mocks.

**Why:** All 4 pages now read/write through the hooks abstraction (no more direct `MOCK_*` imports), but the hook implementations still mutate in-process arrays. Production needs `@microsoft/power-apps/app` SDK calls. **Blocked on:** Dataverse environment must exist before `pac code add-data-source` can generate typed services.

**How to apply:**
1. Provision the 5 Dataverse tables in the target environment (per `agent/tables/*.json`).
2. Run `pac code add-data-source -a dataverse -t swag_swagitems` (and the other 4 tables). Creates generated services in `src/generated/`.
3. In each hook (`useSwagItems`, `useEvents`, etc.), replace the mock array reads with calls to the generated service (`SwagItemsService.getAll()`, etc.).
4. Replace mutation array pushes with SDK creates/updates. Use `@odata.bind` for FK lookups (per prior learning `dataverse-fk-odata-bind`).
5. Cast types via `as unknown as YourType` (SDK types are `string | undefined`).
6. Delete `src/utils/mockData.ts` once all hooks are swapped.

**Context:** The hooks abstraction was designed so this swap is mechanical - signatures and call sites stay identical. Pages don't change at all.

## Post-Deployment (nice-to-have, from outside voice findings)

### orphan-reservation-detection-flow
**What:** Scheduled Power Automate flow (weekly) that reconciles `swag_quantityreserved` against sum of confirmed allocations.

**Why:** Even with the now-implemented compensation scope in `finalize-allocation.json`, a double-failure (compensation itself fails) leaves phantom reservations with no detection.

**How to apply:** Weekly trigger, query all SwagItems, compare `QuantityReserved` to sum of allocations where Status IN (confirmed, ordered). Flag mismatches via email to Adrea.

### error-notification-and-weekly-summary-flows
**What:** Two flows: (1) error notification — email Adrea on any swag flow failure; (2) weekly summary — Adrea gets allocations confirmed + budget spent + % remaining.

**Why:** Currently silent failures go unnoticed. Power Automate run history exists but no proactive alerting.

**How to apply:** Flow 1: trigger on flow failure. Flow 2: weekly schedule, aggregate from swag_events + swag_budgettrackers.

### dataverse-table-explicit-primary-keys
**What:** Add explicit primary key column declarations to the 5 table JSON definitions in `agent/tables/`.

**Why:** The finalize flow references `swag_budgettrackerid`, `swag_swagitemid`, `swag_eventsid`, and `swag_allocationsid` - all rely on Dataverse's implicit naming convention. Explicit declaration prevents drift.

**How to apply:** Add `primaryKeyAttribute` field to each table JSON.

### code-app-allocation-schema-runtime-validation
**What:** Add runtime validation in `RulesEditor.handleSave` that the constructed JSON matches `AllocationRuleSchema` before writing.

**Why:** The type is a compile-time contract. Runtime validation prevents writing malformed JSON that the agent then fails to parse.

**How to apply:** Small validator function or zod schema in `src/types/`. Check packItems non-empty, quantities > 0, totalPackCost matches sum.

### needs-from-adrea
**What:** Open questions that block real-data deployment (not code work):
- **Item catalog:** What are the actual ~20 swag items? Names, sizes, costs, tier eligibility? (Currently 12 placeholder items in mockData.ts.)
- **Tier rules:** What does each tier (Exec, Champ, Tier3, Tier4) actually receive in-person and virtual? (Adrea's Excel formulas → AllocationRules JSON.)
- **Historical orders:** The 120 historical allocations Adrea mentioned. Need the file/export to feed the evaluation suite.
- **Deployment channel:** Where do sellers actually receive allocation proposals today? Determines Teams vs SharePoint deployment.
- **Real budget numbers:** Actual ProgramTotal for the current quarter (Dana decides).

**Why:** The Code App's Setup screen (Budget dialog, Add Item dialog, Rules Editor) gives Adrea a place to enter all of this without code changes. But the SOW evaluation against historical orders can't run without the export.

**How to apply:** 30-minute call with Adrea. Bring the design doc and the deployed Code App. Walk through the 3-step Setup checklist together.

## Completed

### agent-flow-finalize-implementation
**Completed:** v0.2.0.0 (2026-04-13). Three placeholder sections in `agent/flows/finalize-allocation.json` replaced with real Power Automate action specs: inventory re-check via Foreach + Get/If/Terminate, sequential allocation creates + inventory reserves with @odata.bind tracking, Compensation_Scope that reverses tracked writes on failure.

### code-app-create-budget-period-dialog
**Completed:** v0.2.0.0 (2026-04-13). `src/components/CreateBudgetPeriodDialog.tsx`. Form for ProgramName, ProgramTotal, QuarterStart, QuarterEnd. Triggered from Budget Dashboard empty state and Setup checklist. Persists via `useCreateBudgetPeriod` hook.

### code-app-inventory-add-item-dialog
**Completed:** v0.2.0.0 (2026-04-13). `src/components/AddSwagItemDialog.tsx`. Form for Name, SizeCategory, UnitCost, QuantityTotal, TierEligibility (multi-select checkboxes). Triggered from Inventory toolbar and empty state. Persists via `useCreateSwagItem` hook.

### code-app-rules-editor-persistence
**Completed:** v0.2.0.0 (2026-04-13). `RulesEditor.handleSave` now constructs `AllocationRuleSchema` and persists via `useUpsertAllocationRule` hook. Toast confirms success or failure.
