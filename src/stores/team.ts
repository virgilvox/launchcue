import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useToast } from 'vue-toastification'
import { getEventBus } from '@/core/event-bus'
import type { Team, TeamMember, TeamInvite } from '../types/models'

// Team service has a non-standard response wrapper — keep direct import
import teamService from '../services/team.service'

interface TeamServiceResult<T = undefined> {
  success: boolean
  error?: string
  teams?: Team[]
  team?: Team
  members?: TeamMember[]
  invites?: TeamInvite[]
}

interface UserLike {
  displayName?: string
  email?: string
}

export const useTeamStore = defineStore('team', () => {
  const authStore = useAuthStore()
  const toast = useToast()

  const teams = ref<Team[]>([])
  const teamMembers = ref<TeamMember[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const pendingInvites = ref<TeamInvite[]>([])
  const isLoadingInvites = ref<boolean>(false)

  const currentTeam = computed(() => {
    return authStore.currentTeam
  })

  const validTeamMembers = computed<TeamMember[]>(() => {
    return teamMembers.value.filter(member =>
      member && member.userId && (member.email || member.name)
    )
  })

  async function fetchTeams(): Promise<TeamServiceResult> {
    if (!authStore.user) {
      return { success: false, error: 'User not authenticated' }
    }

    isLoading.value = true
    error.value = null

    try {
      const result: TeamServiceResult = await teamService.getTeams()
      if (result.success) {
        teams.value = result.teams || []
        return { success: true, teams: result.teams }
      } else {
        error.value = result.error || 'Failed to fetch teams'
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch teams'
      error.value = message
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTeamMembers(): Promise<TeamServiceResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoading.value = true
    error.value = null

    try {
      const result: TeamServiceResult = await teamService.getTeamMembers(authStore.currentTeam.id)
      if (result.success) {
        teamMembers.value = (result.members || []).filter(member =>
          member && member.userId && (member.email || member.name)
        )
        return { success: true, members: teamMembers.value }
      } else {
        error.value = result.error || 'Failed to fetch team members'
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch team members'
      error.value = message
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function createTeam(teamData: { name: string }): Promise<TeamServiceResult> {
    if (!authStore.user) {
      return { success: false, error: 'User not authenticated' }
    }

    isLoading.value = true
    error.value = null

    try {
      const result: TeamServiceResult = await teamService.createTeam(teamData)
      if (result.success && result.team) {
        teams.value.push(result.team)
        await authStore.switchTeam(result.team.id)
        getEventBus().emit('team.created', { team: result.team })
        toast.success('Team created successfully')
        return { success: true, team: result.team }
      } else {
        error.value = result.error || 'Failed to create team'
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create team'
      error.value = message
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function inviteUser(email: string): Promise<TeamServiceResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoading.value = true
    error.value = null

    try {
      const result: TeamServiceResult = await teamService.inviteUser(authStore.currentTeam.id, email)
      if (result.success) {
        getEventBus().emit('team.member-invited', { email })
        toast.success(`Invitation sent to ${email}`)
        return { success: true }
      } else {
        error.value = result.error || 'Failed to send invitation'
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation'
      error.value = message
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPendingInvites(): Promise<TeamServiceResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoadingInvites.value = true
    error.value = null

    try {
      const result: TeamServiceResult = await teamService.getPendingInvites(authStore.currentTeam.id)
      if (result.success) {
        pendingInvites.value = result.invites || []
        return { success: true, invites: result.invites }
      } else {
        error.value = result.error || 'Failed to fetch pending invites'
        return { success: false, error: error.value }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pending invites'
      error.value = message
      return { success: false, error: error.value }
    } finally {
      isLoadingInvites.value = false
    }
  }

  async function removeMember(memberId: string): Promise<TeamServiceResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoading.value = true
    error.value = null

    try {
      const result: TeamServiceResult = await teamService.removeMember(authStore.currentTeam.id, memberId)
      if (result.success) {
        teamMembers.value = teamMembers.value.filter(member => member.userId !== memberId)
        getEventBus().emit('team.member-removed', { memberId })
        toast.success('Team member removed successfully')
        return { success: true }
      } else {
        error.value = result.error || 'Failed to remove team member'
        toast.error(error.value)
        return { success: false, error: error.value }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove team member'
      error.value = message
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
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
    removeMember,
    getUserInitials
  }
})
