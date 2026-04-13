# MS Event Swag Agent

AI-powered swag allocation system for Microsoft seller events.

Two systems sharing a Dataverse backend:

1. **Copilot Studio agent** (`agent/`) — Sellers describe events, agent proposes swag packages, negotiates, finalizes. Portfolio-aware budget optimization across ~90 events/quarter.
2. **Admin Code App** (`src/`) — Vite + React + TypeScript + Fluent UI v9. For Adrea's team and Chris: budget dashboard, rules editor, inventory management, orders.

## Stack

- **Agent:** Copilot Studio + Power Automate flows + Dataverse (5 tables)
- **Admin app:** Vite, React 18, TypeScript (strict), Fluent UI v9, recharts, react-router HashRouter
- **Deployment:** `pac solution import` (agent) + `npm run build && pac code push` (Code App)

## Development

```bash
npm install
npm run dev       # dev server at localhost:5173
npm run build     # production build -> dist/
```

## Deploy

See `agent/DEPLOY.md` for step-by-step deployment of the agent, flows, and tables.
