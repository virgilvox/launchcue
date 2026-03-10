-- Fix RLS policies for user registration and onboarding flow

-- Allow authenticated users to insert their own user profile
CREATE POLICY users_insert ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth_id = auth.uid());

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
