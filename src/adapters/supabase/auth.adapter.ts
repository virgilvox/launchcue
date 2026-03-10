import type { User } from '@/types/models'
import type { AuthResponse, ChangePasswordRequest } from '@/types/api'
import type { AuthAdapter, TeamSummary } from '../types'
import { getSupabase } from './client'

/**
 * Supabase auth adapter — uses Supabase Auth SDK.
 * Uses Supabase Auth (GoTrue) for all authentication operations.
 */
export class SupabaseAuthAdapter implements AuthAdapter {
  private unauthorizedCallback: (() => void) | null = null
  private authListenerCleanup: (() => void) | null = null

  async login(email: string, password: string): Promise<AuthResponse> {
    const sb = getSupabase()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    const user = await this.getAppUser(data.user.id)
    const teams = await this.getUserTeams(user.id)

    // Read current_team_id from user metadata for team context
    let currentTeamId = data.user.user_metadata?.current_team_id as string | undefined
    const currentTeam = currentTeamId
      ? teams.find(t => t.id === currentTeamId)
      : teams[0]

    // Ensure current_team_id is set in metadata — if missing, set it and refresh JWT
    let accessToken = data.session.access_token
    if (!currentTeamId && currentTeam) {
      await sb.auth.updateUser({ data: { current_team_id: currentTeam.id } })
      const { data: refreshed, error: refreshErr } = await sb.auth.refreshSession()
      if (!refreshErr && refreshed.session) {
        accessToken = refreshed.session.access_token
      }
    }

    return {
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        ...(currentTeam?.role && { role: currentTeam.role }),
      },
      teams,
      currentTeamId: currentTeam?.id,
    }
  }

  async register(regData: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const sb = getSupabase()
    const { data, error } = await sb.auth.signUp({
      email: regData.email,
      password: regData.password,
      options: {
        data: { name: regData.name },
      },
    })
    if (error) throw new Error(error.message)
    if (!data.session) throw new Error('Registration successful — please verify your email')

    try {
      // Call the register_user RPC to create app user, team, and membership atomically
      const { data: result, error: rpcError } = await sb.rpc('register_user', {
        p_auth_id: data.user!.id,
        p_name: regData.name,
        p_email: regData.email,
      })
      if (rpcError) throw new Error(rpcError.message)

      const { user_id, team_id, team_name } = result as { user_id: string; team_id: string; team_name: string }

      // Set current team in user metadata and refresh JWT to include it
      await sb.auth.updateUser({
        data: { current_team_id: team_id },
      })
      const { data: refreshed, error: refreshErr } = await sb.auth.refreshSession()
      const accessToken = (!refreshErr && refreshed.session)
        ? refreshed.session.access_token
        : data.session!.access_token

      return {
        token: accessToken,
        user: { id: user_id, name: regData.name, email: regData.email },
        teams: [{ id: team_id, name: team_name, role: 'owner' }],
        currentTeamId: team_id,
      }
    } catch (appError) {
      // App-level setup failed — delete the auth user to allow re-registration
      await sb.auth.admin.deleteUser(data.user!.id).catch(() => {
        // Admin delete may fail from client (no service_role key).
        // The auth user will exist but have no app data — support can clean up.
      })
      throw appError
    }
  }

  async logout(): Promise<void> {
    const { error } = await getSupabase().auth.signOut()
    if (error) throw new Error(error.message)
  }

  async switchTeam(teamId: string): Promise<AuthResponse> {
    const sb = getSupabase()

    // Update current_team_id in user metadata
    const { error } = await sb.auth.updateUser({
      data: { current_team_id: teamId },
    })
    if (error) throw new Error(error.message)

    // Refresh session to get updated JWT claims
    const { data: refreshData, error: refreshError } = await sb.auth.refreshSession()
    if (refreshError) throw new Error(refreshError.message)

    const user = await this.getAppUser(refreshData.session!.user.id)
    const teams = await this.getUserTeams(user.id)

    return {
      token: refreshData.session!.access_token,
      user: { id: user.id, name: user.name, email: user.email },
      teams,
    }
  }

  async changePassword(data: ChangePasswordRequest): Promise<unknown> {
    // Supabase Auth doesn't require current password for authenticated updates
    // Verify current password first by re-authenticating
    const sb = getSupabase()
    const { data: session } = await sb.auth.getSession()
    if (!session.session) throw new Error('Not authenticated')

    // Verify current password
    const { error: verifyError } = await sb.auth.signInWithPassword({
      email: session.session.user.email!,
      password: data.currentPassword,
    })
    if (verifyError) throw new Error('Current password is incorrect')

    // Update to new password
    const { error } = await sb.auth.updateUser({
      password: data.newPassword,
    })
    if (error) throw new Error(error.message)

    return { message: 'Password updated successfully' }
  }

  async getProfile(): Promise<User> {
    const sb = getSupabase()
    const { data: session } = await sb.auth.getSession()
    if (!session.session) throw new Error('Not authenticated')

    return this.getAppUser(session.session.user.id)
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const sb = getSupabase()
    const { data: session } = await sb.auth.getSession()
    if (!session.session) throw new Error('Not authenticated')

    const user = await this.getAppUser(session.session.user.id)

    const { data, error } = await sb
      .from('users')
      .update({
        name: profileData.name,
        job_title: profileData.jobTitle,
        bio: profileData.bio,
        avatar_url: profileData.avatarUrl,
        timezone: profileData.timezone,
        preferences: profileData.preferences,
      })
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    return this.mapUser(data)
  }

  setToken(_token: string | null): void {
    // Supabase manages tokens internally — no-op
  }

  getToken(): string | null {
    return sessionStorage.getItem('token')
  }

  onUnauthorized(callback: () => void): void {
    // Clean up previous listener to prevent leaks
    if (this.authListenerCleanup) {
      this.authListenerCleanup()
      this.authListenerCleanup = null
    }

    this.unauthorizedCallback = callback

    // Listen for auth state changes
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && this.unauthorizedCallback) {
        this.unauthorizedCallback()
      }
    })

    this.authListenerCleanup = () => subscription.unsubscribe()
  }

  async getTeams(): Promise<TeamSummary[]> {
    const sb = getSupabase()
    const { data: session } = await sb.auth.getSession()
    if (!session.session) throw new Error('Not authenticated')

    const user = await this.getAppUser(session.session.user.id)
    const teams = await this.getUserTeams(user.id)
    return teams
  }

  async forgotPassword(email: string): Promise<void> {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email)
    if (error) throw new Error(error.message)
  }

  async resetPassword(_token: string, password: string): Promise<void> {
    // Supabase handles the token via the redirect URL — the user arrives already authenticated
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) throw new Error(error.message)
  }

  async verifyEmail(_token: string): Promise<void> {
    // Supabase handles email verification automatically via redirect URL
    // When the user clicks the link, Supabase verifies the email
    // This is a no-op in the Supabase adapter
  }

  // ─── Private helpers ───

  private async getAppUser(authId: string): Promise<User> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single()
    if (error) throw new Error(`User not found: ${error.message}`)
    return this.mapUser(data)
  }

  private async getUserTeams(userId: string): Promise<Array<{ id: string; name: string; role: string }>> {
    const { data, error } = await getSupabase()
      .from('team_members')
      .select('team_id, role, teams(id, name)')
      .eq('user_id', userId)
    if (error) throw new Error(error.message)

    return (data || []).map((tm: Record<string, unknown>) => {
      const team = tm.teams as Record<string, unknown>
      return {
        id: team.id as string,
        name: team.name as string,
        role: tm.role as string,
      }
    })
  }

  private mapUser(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      jobTitle: row.job_title as string | undefined,
      bio: row.bio as string | undefined,
      avatarUrl: row.avatar_url as string | undefined,
      emailVerified: row.email_verified as boolean | undefined,
      timezone: row.timezone as string | undefined,
      preferences: row.preferences as User['preferences'],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
