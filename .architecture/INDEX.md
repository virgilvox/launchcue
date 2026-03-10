# LaunchCue Architecture Index

> Architecture map for the Supabase + Express + Vue 3 stack.

## Documents

| File | Purpose |
|------|---------|
| [state-flows.md](./state-flows.md) | Data flow diagrams, store relationships, DI resolution |
| [file-manifest.md](./file-manifest.md) | Every file in the project with purpose and dependencies |
| [gaps-and-issues.md](./gaps-and-issues.md) | Open gaps, resolved items, remaining work |
| [rules.md](./rules.md) | AI coding rules, self-prompting guidelines, safety checks |
| [rearchitecture-plan.md](./rearchitecture-plan.md) | Netlify→Supabase migration plan (historical) |

## Quick Stats

- **Frontend**: 107 Vue files, 15 feature modules, 18 Pinia stores, 25 Supabase adapter files, 6 composables
- **Backend**: Supabase (PostgreSQL + GoTrue + PostgREST), Express API (3 route modules)
- **Core**: ServiceContainer (symbol-keyed DI), EventBus, PluginRegistry (topological sort)
- **Auth**: Supabase Auth (sessionStorage persistence) + RBAC (5 roles) + RLS policies
- **Notifications**: Polling (60s interval), not Realtime
- **Tests**: 52 tests across 4 files (core + stores)
- **Design**: Brutalist (0 border-radius, 2px borders, hard shadows)
- **Deploy**: DigitalOcean App Platform + self-hosted Supabase Droplet
