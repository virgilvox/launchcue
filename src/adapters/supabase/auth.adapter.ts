import type { User } from '@/types/models'
import type { AuthResponse, ChangePasswordRequest } from '@/types/api'
import type { AuthAdapter } from '../types'
import { getSupabase } from './client'

/**
 * Supabase auth adapter — uses Supabase Auth SDK.
 * Replaces 8 Netlify auth functions entirely.
 */
export class SupabaseAuthAdapter implements AuthAdapter {
  private unauthorizedCallback: (() => void) | null = null

  async login(email: string, password: string): Promise<AuthResponse> {
    const sb = getSupabase()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    const user = await this.getAppUser(data.user.id)
    const teams = await this.getUserTeams(user.id)

    return {
      token: data.session.access_token,
      user: { id: user.id, name: user.name, email: user.email },
      teams,
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

    // Create app-level user
    const { data: appUser, error: userError } = await sb
      .from('users')
      .insert({
        auth_id: data.user!.id,
        name: regData.name,
        email: regData.email,
        email_verified: false,
      })
      .select()
      .single()
    if (userError) throw new Error(userError.message)

    // Create default team
    const { data: team, error: teamError } = await sb
      .from('teams')
      .insert({ name: `${regData.name}'s Team`, owner_id: appUser.id })
      .select()
      .single()
    if (teamError) throw new Error(teamError.message)

    // Add user as team owner
    await sb.from('team_members').insert({
      team_id: team.id,
      user_id: appUser.id,
      role: 'owner',
    })

    // Set current team in user metadata
    await sb.auth.updateUser({
      data: { current_team_id: team.id },
    })

    return {
      token: data.session.access_token,
      user: { id: appUser.id, name: appUser.name, email: appUser.email },
      teams: [{ id: team.id, name: team.name, role: 'owner' }],
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
    // Supabase manages tokens internally
    // Return the access token from the current session if available
    return null // Session is managed by Supabase client
  }

  onUnauthorized(callback: () => void): void {
    this.unauthorizedCallback = callback

    // Listen for auth state changes
    getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // TOKEN_REFRESHED failure would result in SIGNED_OUT
      }
      if (event === 'SIGNED_OUT' && this.unauthorizedCallback) {
        this.unauthorizedCallback()
      }
    })
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
