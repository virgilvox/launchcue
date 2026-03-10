-- Fix RLS policies for user registration and onboarding flow
-- Problem: INSERT ... RETURNING requires the SELECT policy to also pass.
-- During registration, the user has no team_members yet, so team-based
-- SELECT policies block the RETURNING clause and cause false RLS errors.

-- Fix users SELECT: allow selecting own row by auth_id (not just app_user_id)
-- This is critical because app_user_id() queries users table which triggers RLS recursion
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (
    auth_id = auth.uid()
    OR id = auth.app_user_id()
    OR id IN (SELECT team_members.user_id FROM team_members WHERE team_members.team_id = auth.current_team_id())
  );

-- Allow authenticated users to insert their own user profile
CREATE POLICY users_insert ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- Fix teams SELECT: allow owner to see their team even before team_members row exists
DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.app_user_id()
    OR id IN (SELECT team_members.team_id FROM team_members WHERE team_members.user_id = auth.app_user_id())
  );

-- Allow team owners to insert themselves as the first team member
CREATE POLICY team_members_owner_insert ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.app_user_id()
    AND role = 'owner'
    AND EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.app_user_id())
  );

-- Allow users to see their own team memberships (not just current team)
DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members
  FOR SELECT TO authenticated
  USING (team_id = auth.current_team_id() OR user_id = auth.app_user_id());
