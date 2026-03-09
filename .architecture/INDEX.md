# LaunchCue Architecture Index

> Auto-generated architecture map. Source of truth for all state flows, file purposes, and system diagrams.

## Documents

| File | Purpose |
|------|---------|
| [state-flows.md](./state-flows.md) | Data flow diagrams, store relationships, API call chains |
| [file-manifest.md](./file-manifest.md) | Every file in the project with purpose and dependencies |
| [backend-map.md](./backend-map.md) | All 33 Netlify functions, collections, auth flow, RBAC |
| [frontend-map.md](./frontend-map.md) | All components, pages, stores, services, composables |
| [gaps-and-issues.md](./gaps-and-issues.md) | Broken flows, missing features, inconsistencies |
| [migration-plan.md](./migration-plan.md) | Convex + Digital Ocean migration strategy |
| [rules.md](./rules.md) | AI coding rules, self-prompting guidelines, safety checks |

## Quick Stats

- **Frontend**: 72 Vue components, 21 pages, 10 stores, 20 services, 6 composables
- **Backend**: 33 Netlify Functions, 19 MongoDB collections, 13 utility modules
- **Auth**: JWT (24h) + API keys (bcrypt+prefix) + RBAC (5 roles)
- **Design**: Brutalist (0 border-radius, 2px borders, hard shadows)
- **Stack**: Vue 3 + Pinia + Tailwind + Vite | Node.js + MongoDB + Netlify Functions
