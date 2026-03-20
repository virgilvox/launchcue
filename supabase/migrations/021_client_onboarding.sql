-- ============================================================================
-- 021_client_onboarding.sql — Complete client invitation acceptance flow
--
-- 1. Add client_id to users table (links app user to client record)
-- 2. Create accept_client_invitation() RPC
-- 3. Create create_client_invitation() RPC (generates token + hash server-side)
-- 4. Add client-scoped RLS so clients only see their own data
-- ============================================================================

-- Enable pgcrypto for token generation and hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Link users to client records ───
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id) WHERE client_id IS NOT NULL;

-- ─── 2. Create client invitation (server-side token generation) ───
-- Called by team admins. Generates a secure random token, stores bcrypt hash,
-- returns the plaintext token for the invite URL.

CREATE OR REPLACE FUNCTION public.create_client_invitation(
  p_client_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_project_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_invitation_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify caller is admin/owner
  v_team_id := auth.current_team_id();
  v_user_id := auth.app_user_id();

  IF v_team_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or no team context';
  END IF;

  IF NOT auth.is_admin() THEN
    RAISE EXCEPTION 'Admin access required to create invitations';
  END IF;

  -- Verify client belongs to this team
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id AND team_id = v_team_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Client not found in this team';
  END IF;

  -- Check for existing pending invitation with same email for this client
  IF EXISTS (
    SELECT 1 FROM client_invitations
    WHERE client_id = p_client_id
      AND email = p_email
      AND status = 'pending'
      AND expires_at > NOW()
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email';
  END IF;

  -- Generate secure random token (32 bytes, hex encoded = 64 chars)
  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := crypt(v_token, gen_salt('bf'));
  v_expires_at := NOW() + INTERVAL '7 days';

  INSERT INTO client_invitations (
    team_id, client_id, email, name, role, invited_by,
    token, token_hash, project_ids, status, expires_at
  )
  VALUES (
    v_team_id, p_client_id, p_email, p_name, 'client', v_user_id,
    NULL, v_token_hash, p_project_ids, 'pending', v_expires_at
  )
  RETURNING id INTO v_invitation_id;

  -- Return token (plaintext) so frontend can build the invite URL
  -- Token is NOT stored in DB — only the hash is kept
  RETURN jsonb_build_object(
    'id', v_invitation_id,
    'token', v_token,
    'email', p_email,
    'name', p_name,
    'expiresAt', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_invitation(UUID, TEXT, TEXT, UUID[]) TO authenticated;

-- ─── 3. Accept client invitation ───
-- Called from the public /invite/:token page. Creates auth user + app user,
-- links to client, creates team membership with 'client' role.
-- Uses service_role via SECURITY DEFINER since the caller is unauthenticated.

CREATE OR REPLACE FUNCTION public.accept_client_invitation(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_has_auth_user BOOLEAN;
BEGIN
  -- Find matching pending invitation by checking hash
  SELECT * INTO v_invitation
  FROM client_invitations
  WHERE status = 'pending'
    AND expires_at > NOW()
    AND deleted_at IS NULL
    AND token_hash = crypt(p_token, token_hash)
  LIMIT 1;

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Check if email already has an auth user
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_invitation.email
  ) INTO v_has_auth_user;

  -- Return invitation details + whether signup is needed
  -- Actual user/team creation is handled by finalize_client_invitation
  -- after the frontend completes auth signup or login
  RETURN jsonb_build_object(
    'email', v_invitation.email,
    'name', v_invitation.name,
    'teamId', v_invitation.team_id,
    'clientId', v_invitation.client_id,
    'projectIds', v_invitation.project_ids,
    'hasExistingAccount', v_has_auth_user
  );
END;
$$;

-- Grant to anon (unauthenticated users validating invite tokens)
GRANT EXECUTE ON FUNCTION public.accept_client_invitation(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.accept_client_invitation(TEXT) TO authenticated;

-- ─── 4. Post-signup link for client invitation ───
-- After the client signs up via supabase.auth.signUp(), this finalizes the link.

CREATE OR REPLACE FUNCTION public.finalize_client_invitation(
  p_token TEXT,
  p_auth_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_app_user_id UUID;
BEGIN
  -- Verify caller is finalizing their own account (prevent auth_id spoofing)
  IF p_auth_id != auth.uid() THEN
    RAISE EXCEPTION 'Auth ID mismatch — cannot finalize for another user';
  END IF;

  -- Find matching pending invitation
  SELECT * INTO v_invitation
  FROM client_invitations
  WHERE status = 'pending'
    AND expires_at > NOW()
    AND deleted_at IS NULL
    AND token_hash = crypt(p_token, token_hash)
  LIMIT 1;

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Verify the caller's email matches the invitation email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_auth_id AND email = v_invitation.email
  ) THEN
    RAISE EXCEPTION 'Email mismatch — this invitation is for a different email address';
  END IF;

  -- Create app user
  INSERT INTO users (auth_id, name, email, client_id, email_verified)
  VALUES (p_auth_id, v_invitation.name, v_invitation.email, v_invitation.client_id, TRUE)
  ON CONFLICT (auth_id) DO UPDATE SET client_id = v_invitation.client_id
  RETURNING id INTO v_app_user_id;

  -- Create team membership with client role
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_invitation.team_id, v_app_user_id, 'client')
  ON CONFLICT (team_id, user_id) DO UPDATE SET role = 'client';

  -- Mark invitation as accepted
  UPDATE client_invitations
  SET status = 'accepted', updated_at = NOW()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'userId', v_app_user_id,
    'teamId', v_invitation.team_id,
    'clientId', v_invitation.client_id,
    'projectIds', v_invitation.project_ids,
    'name', v_invitation.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_client_invitation(TEXT, UUID) TO authenticated;

-- ─── 5. Client-scoped RLS policies ───
-- Clients should only see data associated with their client_id.

-- Helper: get current user's client_id (NULL for non-client users)
CREATE OR REPLACE FUNCTION auth.current_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop and recreate the existing projects_select with client filtering
DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects FOR SELECT
  USING (
    team_id = auth.current_team_id()
    AND deleted_at IS NULL
    AND (
      auth.current_team_role() != 'client'
      OR client_id = auth.current_client_id()
    )
  );

-- Scopes: clients can only see scopes for their projects
DROP POLICY IF EXISTS scopes_select ON scopes;
CREATE POLICY scopes_select ON scopes FOR SELECT
  USING (
    team_id = auth.current_team_id()
    AND deleted_at IS NULL
    AND (
      auth.current_team_role() != 'client'
      OR client_id = auth.current_client_id()
    )
  );

-- Onboarding checklists: clients see only their own
DROP POLICY IF EXISTS onboarding_checklists_select ON onboarding_checklists;
CREATE POLICY onboarding_checklists_select ON onboarding_checklists FOR SELECT
  USING (
    team_id = auth.current_team_id()
    AND deleted_at IS NULL
    AND (
      auth.current_team_role() != 'client'
      OR client_id = auth.current_client_id()
    )
  );

-- Client invitations: clients can see their own invitations (read-only)
DROP POLICY IF EXISTS client_invitations_select ON client_invitations;
CREATE POLICY client_invitations_select ON client_invitations FOR SELECT
  USING (
    team_id = auth.current_team_id()
    AND deleted_at IS NULL
    AND (
      auth.current_team_role() != 'client'
      OR client_id = auth.current_client_id()
    )
  );

-- Clients table: client-role users can only see their own client record
DROP POLICY IF EXISTS clients_select ON clients;
CREATE POLICY clients_select ON clients FOR SELECT
  USING (
    team_id = auth.current_team_id()
    AND deleted_at IS NULL
    AND (
      auth.current_team_role() != 'client'
      OR id = auth.current_client_id()
    )
  );
