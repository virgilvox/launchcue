-- Migration: Allow client role to approve/request-revision on scopes
-- The existing scopes_update policy requires auth.can_write() which only allows
-- owner/admin/member roles. Clients need to update scope status from 'sent'
-- to 'approved' or 'revised' (and optionally set revision_notes).
--
-- Strategy:
-- 1. Add revision_notes column to scopes table
-- 2. Add a second UPDATE policy specifically for client role that only allows
--    transitions from 'sent' to 'approved' or 'revised'.

-- Add revision_notes column
ALTER TABLE scopes ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Client-specific scope approval policy
CREATE POLICY scopes_client_approve ON scopes FOR UPDATE
  USING (
    team_id = auth.current_team_id()
    AND auth.current_team_role() = 'client'
    AND status = 'sent'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    team_id = auth.current_team_id()
    AND auth.current_team_role() = 'client'
    AND status IN ('approved', 'revised')
    AND deleted_at IS NULL
  );
