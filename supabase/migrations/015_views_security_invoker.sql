-- Migration 015: Add security_invoker to all active_* views
--
-- Views without security_invoker run with the view OWNER's privileges.
-- Since migrations run as postgres (superuser), these views bypass RLS.
-- Adding security_invoker = true ensures RLS is enforced against the
-- calling user, not the view owner. Requires PostgreSQL 15+.

ALTER VIEW active_clients SET (security_invoker = true);
ALTER VIEW active_projects SET (security_invoker = true);
ALTER VIEW active_tasks SET (security_invoker = true);
ALTER VIEW active_campaigns SET (security_invoker = true);
ALTER VIEW active_notes SET (security_invoker = true);
ALTER VIEW active_calendar_events SET (security_invoker = true);
ALTER VIEW active_resources SET (security_invoker = true);
ALTER VIEW active_scope_templates SET (security_invoker = true);
ALTER VIEW active_scopes SET (security_invoker = true);
ALTER VIEW active_invoices SET (security_invoker = true);
ALTER VIEW active_api_keys SET (security_invoker = true);
ALTER VIEW active_webhooks SET (security_invoker = true);
ALTER VIEW active_client_invitations SET (security_invoker = true);
ALTER VIEW active_onboarding_checklists SET (security_invoker = true);
ALTER VIEW active_teams SET (security_invoker = true);
