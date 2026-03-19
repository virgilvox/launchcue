import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useToast } from 'vue-toastification'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { TEAM_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Team, TeamMember, TeamInvite } from '../types/models'
import type { TeamRole } from '../types/enums'
import type { TeamCreateRequest } from '../types/api'
import { useLoadingCounter } from '@/composables/useLoadingCounter'

// Extended repository interface for team-specific operations
interface TeamRepository extends Repository<Team, TeamCreateRequest, Partial<TeamCreateRequest>> {
  getMembers(teamId: string): Promise<TeamMember[]>
  inviteUser(teamId: string, email: string): Promise<unknown>
  getPendingInvites(teamId: string): Promise<TeamInvite[]>
  cancelInvite(inviteId: string): Promise<void>
  removeMember(teamId: string, memberId: string): Promise<void>
  updateMemberRole(teamId: string, memberId: string, role: string): Promise<unknown>
  leaveTeam(teamId: string): Promise<void>
}

interface UserLike {
  displayName?: string
  email?: string
}

export const useTeamStore = defineStore('team', () => {
  const authStore = useAuthStore()
  const toast = useToast()
  const { isLoading, wrap } = useLoadingCounter()

  const teams = ref<Team[]>([])
  const teamMembers = ref<TeamMember[]>([])
  const error = ref<string | null>(null)
  const pendingInvites = ref<TeamInvite[]>([])
  const isLoadingInvites = ref<boolean>(false)

  function getRepo(): TeamRepository {
    return getContainer().resolve<TeamRepository>(TEAM_REPO)
  }

  const currentTeam = computed(() => {
    return authStore.currentTeam
  })

  const validTeamMembers = computed<TeamMember[]>(() => {
    return teamMembers.value.filter(member =>
      member && member.userId && (member.email || member.name)
    )
  })

  async function fetchTeams(): Promise<{ success: boolean; error?: string; teams?: Team[] }> {
    if (!authStore.user) {
      return { success: false, error: 'User not authenticated' }
    }

    return wrap(async () => {
      error.value = null
      try {
        const result = await getRepo().findAll()
        teams.value = result || []
        return { success: true, teams: teams.value }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch teams'
        error.value = message
        return { success: false, error: error.value }
      }
    })
  }

  async function fetchTeamMembers(): Promise<{ success: boolean; error?: string; members?: TeamMember[] }> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        const members = await getRepo().getMembers(authStore.currentTeam!.id)

        teamMembers.value = (members || []).filter((member: TeamMember) =>
          member && member.userId && (member.email || member.name)
        )
        return { success: true, members: teamMembers.value }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch team members'
        error.value = message
        return { success: false, error: error.value }
      }
    })
  }

  async function createTeam(teamData: { name: string }): Promise<{ success: boolean; error?: string; team?: Team }> {
    if (!authStore.user) {
      return { success: false, error: 'User not authenticated' }
    }

    return wrap(async () => {
      error.value = null
      try {
        const createdTeam = await getRepo().create(teamData)
        if (createdTeam && createdTeam.id) {
          teams.value.push(createdTeam)
          await authStore.switchTeam(createdTeam.id)
          getEventBus().emit('team.created', { team: createdTeam })
          toast.success('Team created successfully')
          return { success: true, team: createdTeam }
        } else {
          error.value = 'Failed to create team'
          toast.error(error.value)
          return { success: false, error: error.value }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create team'
        error.value = message
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    })
  }

  async function inviteUser(email: string): Promise<{ success: boolean; error?: string }> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        await getRepo().inviteUser(authStore.currentTeam!.id, email)
        getEventBus().emit('team.member-invited', { email })
        toast.success(`Invitation sent to ${email}`)
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to send invitation'
        error.value = message
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    })
  }

  async function fetchPendingInvites(): Promise<{ success: boolean; error?: string; invites?: TeamInvite[] }> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoadingInvites.value = true
    error.value = null

    try {
      const invites = await getRepo().getPendingInvites(authStore.currentTeam.id)
      pendingInvites.value = invites || []
      return { success: true, invites: pendingInvites.value }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pending invites'
      error.value = message
      return { success: false, error: error.value }
    } finally {
      isLoadingInvites.value = false
    }
  }

  async function cancelInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    return wrap(async () => {
      error.value = null
      try {
        await getRepo().cancelInvite(inviteId)
        pendingInvites.value = pendingInvites.value.filter(inv => inv.id !== inviteId)
        toast.success('Invitation cancelled')
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to cancel invitation'
        error.value = message
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    })
  }

  async function removeMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        await getRepo().removeMember(authStore.currentTeam!.id, memberId)
        teamMembers.value = teamMembers.value.filter(member => member.userId !== memberId)
        getEventBus().emit('team.member-removed', { memberId })
        toast.success('Team member removed successfully')
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove team member'
        error.value = message
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    })
  }

  async function updateMemberRole(memberId: string, newRole: string): Promise<{ success: boolean; error?: string }> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        await getRepo().updateMemberRole(authStore.currentTeam!.id, memberId, newRole)
        const member = teamMembers.value.find(m => m.userId === memberId || (m as any).id === memberId)
        if (member) {
          member.role = newRole as TeamRole
        }
        getEventBus().emit('team.member-role-changed', { memberId, role: newRole })
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update member role'
        error.value = message
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    })
  }

  async function leaveTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    return wrap(async () => {
      error.value = null
      try {
        await getRepo().leaveTeam(teamId)
        teams.value = teams.value.filter(t => t.id !== teamId)
        getEventBus().emit('team.left', { teamId })
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to leave team'
        error.value = message
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    })
  }

  function getUserInitials(user: UserLike | null | undefined): string {
    if (!user) return '?'

    if (user.displayName) {
      const names = user.displayName.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      }
      return user.displayName[0].toUpperCase()
    }

    if (user.email) {
      return user.email[0].toUpperCase()
    }

    return '?'
  }

  return {
    teams,
    teamMembers,
    validTeamMembers,
    isLoading,
    error,
    pendingInvites,
    isLoadingInvites,
    currentTeam,
    fetchTeams,
    fetchTeamMembers,
    createTeam,
    inviteUser,
    fetchPendingInvites,
    cancelInvite,
    removeMember,
    updateMemberRole,
    leaveTeam,
    getUserInitials
  }
})
