# Gaps, Broken Flows & Issues

> Updated after Netlify→Supabase migration. Items marked RESOLVED were fixed during the rearchitecture.

## Status Summary

| Status | Count |
|--------|-------|
| RESOLVED | 13 |
| OPEN | 8 |
| CLARIFIED | 1 |
| ACCEPTABLE | 2 |

---

## Resolved

### 1. Webhooks Not Wired — RESOLVED
PostgreSQL trigger dispatches webhook events. Express server processes the webhook queue every 30 seconds via `webhook-processor.ts`.

### 2. No Email Sending — RESOLVED
GoTrue handles auth emails (verification, password reset) natively. Express `email.ts` route handles client invitations and notifications via nodemailer + SMTP.

### 4. No Pagination (Frontend) — RESOLVED
`findPaginated()` method on repository interface. `Pagination.vue` component wired in list views.

### 5. Dead Notifications — RESOLVED
Notification store polls via NOTIFICATION_REPO every 60 seconds (`startPolling(60000)` with `setInterval`). DefaultLayout starts polling on mount.

### 6. Brain Dump AI Not Connected — RESOLVED
Express `/api/ai/process` endpoint uses Anthropic SDK (Claude). Brain dump page calls via Vite proxy.

### 10. Delete Loading States — RESOLVED
Properly wired in Tasks, Clients, and other CRUD views with `isProcessing` state.

### 15. 4 Services Still in JavaScript — RESOLVED
All service files deleted. Stores now use repository pattern via DI container — no service layer.

### 16. notification.js Store is JavaScript — RESOLVED
Notification store rewritten in TypeScript with repository pattern.

### 17. Duplicate CampaignsList Route — RESOLVED
Not actually duplicates — `CampaignsList.vue` is the list view, `Campaigns.vue` is the builder. Dead `CampaignDetail.vue` deleted (was not imported by any module).

### 19. Settings Service Has No Backend — RESOLVED
Settings service deleted along with all services. Settings managed via Supabase directly.

### 22. Rate Limit Bypass via Header Spoofing — RESOLVED
Rate limiting now behind Supabase RLS + Kong gateway. Express uses express-rate-limit by IP.

### 23. JWT 24h Expiry Without Refresh — RESOLVED
Supabase Auth auto-refreshes sessions. No manual token management needed.

### 9. Scope-to-Invoice Flow — CLARIFIED
`createFromScope()` only creates an invoice from scope data. Scope status changes happen separately in `ScopeBuilder.vue` via `updateScope()` as a distinct user action. The two-step flow means a failed invoice creation does not leave scope status inconsistent.

---

## Open

### 3. No Tests Beyond Core (P0)
52 tests across 4 files (service-container, event-bus, plugin-registry, auth store). No component tests, no integration tests, no E2E tests.

### 7. Recurring Events No UI (P1)
Schema supports `recurrence: { frequency, interval, endDate }`. Calendar view expands occurrences for display. But no UI to create/edit recurrence rules.

### 8. Search Note Navigation (P2) — IMPROVED
Added `highlight` query param to note search results. Notes page scrolls to and highlights the matching note. Full inline expansion not yet implemented.

### 11. Calendar Color Map Fragile (P2)
Uses lookup objects for Tailwind class → hex mapping. Adding a new event color requires updating maps in multiple files.

### 12. Form Validation Inconsistent (P2)
Validation varies by entity. Tasks: title required. Clients: name required. Others: inconsistent or missing validation rules.

### 13. Mobile Sidebar State Leak (P2)
Sidebar open/close state persisted to localStorage. Mobile drawer might start open if desktop state was saved.

### 14. 80+ Components Not `<script setup lang="ts">` (P3)
Most components use `<script setup>` without `lang="ts"`. Large effort to migrate, not blocking functionality.

### 18. Console Error in main.ts Global Handler — ACCEPTABLE
Only remaining `console.error` — acceptable for production error boundary.

### 20. No Request Deduplication (P3)
Multiple components mounting simultaneously can trigger duplicate API calls. No AbortController usage for cancelled navigations.

### 21. CORS Allow-All in Development — ACCEPTABLE
Express CORS allows `localhost:5173` in dev. Fine for local development, production uses `ALLOWED_ORIGINS` env var.

### 24. API Key Scopes Not Fully Enforced (P3)
Scope validation depends on correct mapping. Some edge cases may not check scopes thoroughly.
