-- Migration 013: Secure current_team_id against user_metadata tampering
--
-- VULNERABILITY: auth.current_team_id() reads from user_metadata which is
-- user-writable via Supabase SDK (supabase.auth.updateUser). A malicious user
-- could set current_team_id to another team's ID and bypass SELECT RLS policies.
--
-- FIX: Cross-check that the user is actually a member of the claimed team.
-- Write operations were already protected (can_write/is_admin check team_members),
-- but SELECT policies trusted current_team_id blindly.

CREATE OR REPLACE FUNCTION auth.current_team_id()
RETURNS UUID AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = (auth.jwt() -> 'user_metadata' ->> 'current_team_id')::uuid
        AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
    THEN (auth.jwt() -> 'user_metadata' ->> 'current_team_id')::uuid
    ELSE NULL
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
