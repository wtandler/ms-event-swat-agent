# Changelog

All notable changes to this project will be documented in this file.

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
