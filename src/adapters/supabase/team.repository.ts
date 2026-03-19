import type { Team, TeamMember, TeamInvite } from '@/types/models'
import type { TeamCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import { getSupabase } from './client'

/**
 * Team repository — non-standard because Team includes members from a join table.
 */
export class SupabaseTeamRepository implements Repository<Team, TeamCreateRequest, Partial<Team>> {
  async findAll(filter: QueryFilter = {}): Promise<Team[]> {
    const sb = getSupabase()
    let query = sb.from('active_teams').select('*, team_members(*, users(id, name, email))')

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null) continue
      query = query.eq(key, value)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row))
  }

  async findById(id: string): Promise<Team> {
    const { data, error } = await getSupabase()
      .from('active_teams')
      .select('*, team_members(*, users(id, name, email))')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(data as Record<string, unknown>)
  }

  async create(dto: TeamCreateRequest): Promise<Team> {
    const sb = getSupabase()

    // Resolve the current user's app ID for owner_id (required by RLS)
    const { data: { session } } = await sb.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const { data: appUser, error: userError } = await sb
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()
    if (userError) throw new Error(userError.message)

    // Insert team with owner_id
    const { data, error } = await sb
      .from('teams')
      .insert({ name: dto.name, owner_id: appUser.id })
      .select('*, team_members(*, users(id, name, email))')
      .single()
    if (error) throw new Error(error.message)

    const teamId = (data as Record<string, unknown>).id as string

    // Add the creator as an owner in team_members
    const { error: memberError } = await sb
      .from('team_members')
      .insert({ team_id: teamId, user_id: appUser.id, role: 'owner' })
    if (memberError) throw new Error(memberError.message)

    // Update the user's metadata to include this team
    const currentMeta = session.user.user_metadata || {}
    const currentTeamIds: string[] = currentMeta.team_ids || []
    if (!currentTeamIds.includes(teamId)) {
      await sb.auth.updateUser({
        data: {
          ...currentMeta,
          team_ids: [...currentTeamIds, teamId],
          current_team_id: teamId,
        },
      })
    }

    // Re-fetch the team to include the new member
    return this.findById(teamId)
  }

  async update(id: string, dto: Partial<Team>): Promise<Team> {
    const { data, error } = await getSupabase()
      .from('teams')
      .update({ name: dto.name })
      .eq('id', id)
      .select('*, team_members(*, users(id, name, email))')
      .single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(data as Record<string, unknown>)
  }

  async delete(id: string): Promise<void> {
    // Soft delete — triggers cascade via database trigger
    const { error } = await getSupabase()
      .from('teams')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Extended team operations

  async getMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await getSupabase()
      .from('team_members')
      .select('*, users(id, name, email)')
      .eq('team_id', teamId)
    if (error) throw new Error(error.message)
    return (data || []).map((m: Record<string, unknown>) => {
      const user = m.users as Record<string, unknown>
      return {
        userId: m.user_id as string,
        email: user?.email as string || '',
        name: user?.name as string || '',
        role: m.role as string,
        joinedAt: m.joined_at as string,
      } as TeamMember
    })
  }

  async inviteUser(teamId: string, email: string): Promise<unknown> {
    const sb = getSupabase()

    // Resolve the current user's app ID for invited_by (NOT NULL)
    const { data: { session } } = await sb.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const { data: appUser, error: userError } = await sb
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()
    if (userError) throw new Error(userError.message)

    // expires_at: 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await sb
      .from('team_invites')
      .insert({
        team_id: teamId,
        email,
        invited_by: appUser.id,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  async getPendingInvites(teamId: string): Promise<TeamInvite[]> {
    const { data, error } = await getSupabase()
      .from('team_invites')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
    if (error) throw new Error(error.message)
    return (data || []).map((inv: Record<string, unknown>) => ({
      id: inv.id as string,
      email: inv.email as string,
      teamId: inv.team_id as string,
      invitedBy: inv.invited_by as string,
      status: inv.status as string,
      role: inv.role as string,
      expiresAt: inv.expires_at as string,
      createdAt: inv.created_at as string,
      updatedAt: inv.updated_at as string,
    } as TeamInvite))
  }

  async cancelInvite(inviteId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('team_invites')
      .delete()
      .eq('id', inviteId)
    if (error) throw new Error(error.message)
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId)
    if (error) throw new Error(error.message)
  }

  async leaveTeam(teamId: string): Promise<void> {
    const sb = getSupabase()
    const { data: { session } } = await sb.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    // Look up the app user ID from the auth ID
    const { data: appUser, error: userError } = await sb
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()
    if (userError) throw new Error(userError.message)

    await this.removeMember(teamId, appUser.id)
  }

  async updateMemberRole(teamId: string, memberId: string, newRole: string): Promise<unknown> {
    const { data, error } = await getSupabase()
      .from('team_members')
      .update({ role: newRole })
      .eq('team_id', teamId)
      .eq('user_id', memberId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  private mapFromDb(row: Record<string, unknown>): Team {
    const membersRaw = (row.team_members as Record<string, unknown>[]) || []
    return {
      id: row.id as string,
      name: row.name as string,
      owner: row.owner_id as string,
      members: membersRaw.map((m) => {
        const user = m.users as Record<string, unknown>
        return {
          userId: m.user_id as string,
          email: user?.email as string || '',
          name: user?.name as string || '',
          role: m.role as Team['members'][0]['role'],
          joinedAt: m.joined_at as string,
        }
      }),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
