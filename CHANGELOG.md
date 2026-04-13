# Changelog

All notable changes to this project will be documented in this file.

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
