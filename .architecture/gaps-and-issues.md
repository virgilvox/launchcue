# Gaps, Broken Flows & Issues

## Critical Gaps (P0)

### 1. Webhooks Not Wired
- `dispatchWebhooks()` exists in `utils/webhookDispatcher.js` but is NOT called from any CRUD function
- Users can create webhooks via Settings but they never fire
- **Impact**: Feature is completely non-functional

### 2. No Email Sending
- Password reset tokens generated → nowhere to send them
- Email verification tokens generated → nowhere to send them
- Client invitations generated → nowhere to send them
- **Impact**: These features are unusable without manual token delivery

### 3. No Tests Beyond 13 Utility Tests
- Zero component tests
- Zero integration tests
- Zero API/endpoint tests
- **Impact**: Regressions go undetected

### 4. No Pagination (Frontend)
- All stores fetch ALL records at once (no limit/offset/cursor)
- Backend supports pagination but frontend ignores it
- **Impact**: Performance degrades with data growth

## Significant Gaps (P1)

### 5. Notification Creation Never Called
- `notifications.js` exports `createNotification()` for other functions to call
- No other function imports or calls it
- Notifications collection stays empty → NotificationBell always shows 0
- **Impact**: Notification system is completely dead

### 6. Brain Dump AI Not Connected
- `brain-dump-create-items.js` references AI processing but no AI provider configured
- No API key/config for Claude or any LLM
- **Impact**: Brain Dump feature likely non-functional

### 7. Recurring Events Incomplete
- Schema supports `recurrence: { frequency, interval, endDate }`
- Calendar view expands occurrences for display
- BUT: No UI to create/edit recurrence rules
- **Impact**: Recurrence only works if set via API directly

### 8. Search Results Not Clickable for All Types
- GlobalSearch handles navigation for some result types
- May not cover all 5 searchable collections properly

### 9. Scope-to-Invoice Flow Fragile
- `scopeStore` depends on `invoiceStore` for `createFromScope`
- No error recovery if invoice creation fails after scope status change
- **Impact**: Potential data inconsistency

## UI/UX Issues (P2)

### 10. No Loading States on Some Delete Operations
- Confirm dialog has `isProcessing` but not all pages wire it correctly
- Some deletions show no feedback until completion

### 11. Calendar Color Map Fragile
- Uses lookup objects for Tailwind class → hex mapping
- If a new event color is added, must update maps in multiple files

### 12. Form Validation Inconsistent
- Tasks: title required
- Clients: name required
- Projects: name required + date range
- Campaigns, Notes, Scopes, Invoices: validation varies, some missing

### 13. Mobile Sidebar State Leak
- Sidebar open/close state persisted to localStorage
- Mobile drawer might start open if desktop state was saved

## Architecture Debt (P3)

### 14. 80+ Components Not `<script setup lang="ts">`
- Most use Options API or Composition API without setup syntax
- Inconsistent patterns across files

### 15. 4 Services Still in JavaScript
- `comment.service.js`, `notification.service.js`, `auditLog.service.js`, `webhook.service.js`
- Type safety gap

### 16. notification.js Store is JavaScript
- Only non-TS store, inconsistent with other 10 stores

### 17. Duplicate Route: CampaignsList → Campaigns
- Both exist, one is essentially an alias/redirect
- Confusing route structure

### 18. Console Error in main.ts Global Handler
- Only remaining console.error — acceptable for production error boundary

### 19. Settings Service Has No Backend
- `settings.service.ts` exports get/update but no corresponding Netlify function
- Dead code or planned feature

### 20. No Request Deduplication
- Multiple components mounting simultaneously can trigger duplicate API calls
- No AbortController usage for cancelled navigations

## Security Gaps

### 21. CORS Allow-All in Development
- `ALLOWED_ORIGINS` empty in dev → allows any origin
- Fine for dev but could leak to staging/production

### 22. Rate Limit Bypass via Header Spoofing
- Identifier falls back to x-forwarded-for header
- Attackers can rotate this header to bypass rate limits
- **Mitigation**: Use Netlify's actual client IP when available

### 23. JWT 24h Expiry Without Refresh
- No refresh token mechanism
- Users must re-login every 24 hours
- **Impact**: Poor UX for long sessions

### 24. API Key Scopes Not Enforced in All Functions
- Some functions check `requireRole()` but API key auth passes through
- Scope validation depends on correct scope mapping in `authHandler.js`
