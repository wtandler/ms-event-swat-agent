# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0.0] - 2026-04-13

### Added
- Full deployment to the CSS CMO Power Platform environment:
  - Dataverse Solution `ExciteDaysSwag` with publisher prefix `swag_`
  - 5 Dataverse tables with all columns, calculated client-side: `swag_budgettracker`, `swag_swagitem`, `swag_event`, `swag_allocation`, `swag_allocationrule`
  - FK relationships: `swag_event -> swag_allocation` (Parental), `swag_swagitem -> swag_allocation` (Referential)
  - Both Power Automate flows imported as Draft workflows
  - Copilot Studio agent shell with GPT instructions persisted to `botcomponent.data` column, linked via `bot.configuration.gPTSettings.defaultSchemaName`
  - Code App deployed via `pac code push`; live at https://apps.powerapps.com/play/e/f8b7bdab-0227-45ec-9a40-e3799b0b4d65/app/de327c56-31ad-4e05-89d0-3cda10eca4f8
- Hooks in `src/hooks/useDataverse.ts` now call real Dataverse via generated SDK services in `src/generated/`
- Mappers translate SDK shapes (all-string types, numeric option set values) to app types
- Provisioning scripts in `scripts/` for reproducibility:
  - `provision-tables.py`: creates all 5 tables + columns
  - `provision-relationships.py`: creates FK relationships
  - `import-flows.py`: creates workflow records for both flows
  - `create-agent.py`: creates bot shell + GPT component + links configuration
- `agent/DEPLOY-STATE.md`: deployment artifacts, IDs, and remaining manual portal steps

### Changed
- `src/hooks/useDataverse.ts`: replaced in-memory mock arrays with calls to `Swag_*Service` classes. Signatures unchanged; pages untouched.

## [0.2.0.0] - 2026-04-13

### Added
- **Setup Checklist** (`src/components/SetupChecklist.tsx`) — Replaces the bare Budget Dashboard empty state. Shows configuration status for budget period, inventory, and rules with one-click setup buttons. Adrea's first-time landing experience.
- **Create Budget Period dialog** — Lets Adrea set up a new quarterly budget without touching Dataverse. Default values pulled from current calendar quarter; Dana fills in the real ProgramTotal.
- **Add Swag Item dialog** — Lets Adrea/Chris add new SKUs with size, cost, and tier eligibility. No Dataverse direct editing required.
- **Data layer abstraction** (`src/hooks/useDataverse.ts`) — Hooks (`useSwagItems`, `useEvents`, `useAllocations`, `useAllocationRules`, `useActiveBudget`, `useSetupStatus`, plus mutations) that all 4 pages now use. Mock implementation today; production swap to Power Apps SDK is mechanical (signatures stay identical).
- **Rules Editor persistence** — Save button now actually writes `AllocationRuleSchema` JSON to Dataverse via the hook. Was previously a no-op toast.
- **Finalize allocation flow implementation** — Replaced 3 placeholder `_comment` sections with real Power Automate action specs: inventory re-check (Foreach + Terminate on insufficient stock), sequential allocation creates with `@odata.bind` FK refs, write tracking via array variables, full compensation scope that reverses created allocations + reserved inventory + event on any failure.

### Changed
- All 4 pages (Budget Dashboard, Rules Editor, Inventory Management, Orders) refactored to use the data layer hooks. No page imports `mockData.ts` directly anymore.
- Inventory Management edit/save now uses staged-edits-over-persisted-items pattern that survives mock data mutations.
- `agent/flows/finalize-allocation.json` is now deployable (no more prose placeholders).

## [0.1.1.0] - 2026-04-13

### Changed
- Eliminated the `calculate-allocation` Power Automate flow. Negotiation math now runs as Power Fx expressions inline in the Copilot Studio negotiation topic. Saves ~1-2 seconds per negotiation turn and removes one flow from the deployment.
- Updated agent GPT instructions, deploy guide, and architecture diagram to reflect the 3-flow → 2-flow change.

### Removed
- `agent/flows/calculate-allocation.json` — replaced by Power Fx in the negotiation topic.

## [0.1.0.0] - 2026-04-13

### Added
- Admin Code App (Vite + React + TypeScript + Fluent UI v9) with four screens:
  - **Budget Dashboard:** KPI bar showing program total, spent, reserved, available; weekly spend chart (recharts AreaChart); upcoming events table that links to the Orders view.
  - **Rules Editor:** Tier and event-type selector (TabList + ToggleButton); pack builder with Combobox + SpinButton; structured JSON output for the AllocationRules Dataverse table.
  - **Inventory Management:** DataGrid of swag items with stock-level icon indicators (green/yellow/red); inline-editable QuantityTotal with staged save and discard.
  - **Orders:** Status filter, batch checkbox selection, "Mark as Ordered" bulk action with state-machine guard (only confirmed events transition to ordered), Drawer side panel showing allocation line items.
- Copilot Studio agent definition:
  - GPT instructions encoding the seller-facing conversation flow (intake, allocation proposal, negotiation, finalization, amendment).
  - Three Power Automate flow definitions: context-loader, calculate-allocation, finalize-allocation (with budget re-check, changeset, and compensation scope).
  - Five Dataverse table definitions: SwagItems, Events, Allocations, AllocationRules, BudgetTracker.
  - Deployment guide (`agent/DEPLOY.md`).
- Shared `AllocationRuleSchema` TypeScript type as the contract between the Code App's Rules Editor and the agent's context-loader.
- Fixed left navigation, HashRouter, FluentProvider with webLight theme.
- Reusable components: PageHeader, EmptyState, StatusBadge, StockIndicator.
- TODOS.md tracking eight pre-deployment and post-deployment work items.
