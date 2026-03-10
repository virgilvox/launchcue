import { ref, computed } from 'vue'
import { defineStore, getActivePinia } from 'pinia'
import router from '../router'
import { getContainer } from '@/core/service-container'
import { AUTH_ADAPTER, TEAM_REPO } from '@/adapters/repository-keys'
import type { AuthAdapter, Repository, TeamSummary } from '@/adapters/types'
import type { User } from '../types/models'
import type { TeamRole } from '../types/enums'

// Extended user type that includes role from the current team context
interface AuthUser extends User {
  role?: TeamRole | 'client'
}

function getAuth(): AuthAdapter {
  return getContainer().resolve<AuthAdapter>(AUTH_ADAPTER)
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<AuthUser | null>(JSON.parse(sessionStorage.getItem('user') || 'null'))
  const token = ref<string | null>(sessionStorage.getItem('token') || null)
  const userTeams = ref<TeamSummary[]>(JSON.parse(sessionStorage.getItem('teams') || '[]'))
  const currentTeam = ref<TeamSummary | null>(JSON.parse(sessionStorage.getItem('currentTeam') || 'null'))
  const isLoading = ref<boolean>(false)

  // Computed
  const isAuthenticated = computed<boolean>(() => !!user.value && !!token.value)

  // Role-based access control computed properties
  const userRole = computed<string | null>(() => user.value?.role || null)
  const isOwner = computed<boolean>(() => userRole.value === 'owner')
  const isAdmin = computed<boolean>(() => userRole.value === 'admin')
  const canManageTeam = computed<boolean>(() => ['owner', 'admin'].includes(userRole.value as string))
  const canEdit = computed<boolean>(() => ['owner', 'admin', 'member'].includes(userRole.value as string))
  const isViewer = computed<boolean>(() => userRole.value === 'viewer')

  // Check if a JWT token has expired by decoding the payload
  const isTokenExpired = (jwt: string): boolean => {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      return payload.exp ? (payload.exp * 1000) < Date.now() : false
    } catch {
      return true // Treat malformed tokens as expired
    }
  }

  // Initialize auth state from session storage (checks if user/token exist)
  const initAuth = (): boolean => {
    user.value = JSON.parse(sessionStorage.getItem('user') || 'null')
    token.value = sessionStorage.getItem('token') || null
    userTeams.value = JSON.parse(sessionStorage.getItem('teams') || '[]')
    currentTeam.value = JSON.parse(sessionStorage.getItem('currentTeam') || 'null')

    const auth = getAuth()

    // Check token expiry before accepting it
    if (token.value && isTokenExpired(token.value)) {
      user.value = null
      token.value = null
      userTeams.value = []
      currentTeam.value = null
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('teams')
      sessionStorage.removeItem('currentTeam')
      auth.setToken(null)
      return false
    }

    // Sync token to adapter
    auth.setToken(token.value)

    // Register 401 handler so adapter can trigger logout without circular imports
    auth.onUnauthorized(() => {
      logout()
    })

    return isAuthenticated.value
  }

  // Register
  const register = async (email: string, password: string, name: string): Promise<AuthUser> => {
    isLoading.value = true
    try {
      const response = await getAuth().register({ email, password, name })

      if (response && response.token && response.user) {
        // Set user data and token
        setUserData(response.user as AuthUser, response.token)
        // Load teams after registration
        await loadUserTeams()
        // Set current team from registration response
        if (response.currentTeamId) {
          const team = userTeams.value.find(t => t.id === response.currentTeamId)
          if (team) setCurrentTeam(team)
        }
        return response.user as AuthUser
      } else {
        throw new Error(response.message || 'Registration failed')
      }
    } finally {
      isLoading.value = false
    }
  }

  // Login
  const login = async (email: string, password: string): Promise<AuthUser> => {
    isLoading.value = true
    try {
      const response = await getAuth().login(email, password)

      if (response && response.token && response.user) {
        // Include role from login response in user data
        const userData: AuthUser = { ...response.user } as AuthUser
        if (response.user.role) {
          userData.role = response.user.role as TeamRole | 'client'
        }
        // Set user data and token
        setUserData(userData, response.token)
        // Load user teams and set current team from login response
        await loadUserTeams()
        if (response.currentTeamId) {
          const team = userTeams.value.find(t => t.id === response.currentTeamId)
          if (team) {
            setCurrentTeam(team)
          } else if (userTeams.value.length > 0) {
            setCurrentTeam(userTeams.value[0])
          }
        } else if (userTeams.value.length > 0) {
          setCurrentTeam(userTeams.value[0])
        }
        return userData
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } finally {
      isLoading.value = false
    }
  }

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await getAuth().logout()

      // Clear local state
      user.value = null
      token.value = null
      userTeams.value = []
      currentTeam.value = null

      // Clear session storage
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('teams')
      sessionStorage.removeItem('currentTeam')

      // Reset all other Pinia stores to clear stale data
      const pinia = getActivePinia()
      if (pinia) {
        (pinia as any)._s.forEach((store: any, id: string) => {
          if (id !== 'auth') store.$dispose()
        })
        ;(pinia as any)._s.forEach((_: any, id: string) => {
          if (id !== 'auth') (pinia as any)._s.delete(id)
        })
      }

      // Redirect to landing page
      router.push('/')
    } catch {
      // Logout errors are non-critical; state is already cleared
    }
  }

  // Save user data to state and sessionStorage
  const setUserData = (userData: AuthUser, accessToken: string): void => {
    user.value = userData
    token.value = accessToken
    getAuth().setToken(accessToken)

    sessionStorage.setItem('user', JSON.stringify(userData))
    sessionStorage.setItem('token', accessToken)
  }

  // Action to update user info in the store (e.g., after profile save)
  const updateUserState = (updatedUserData: Partial<AuthUser>): void => {
    if (user.value && updatedUserData) {
      user.value = {
        ...user.value,
        ...updatedUserData,
        id: user.value.id,
        email: user.value.email
      }
      sessionStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  // Load user teams
  const loadUserTeams = async (): Promise<void> => {
    if (!isAuthenticated.value) return

    isLoading.value = true
    try {
      const teams = await getAuth().getTeams()

      if (teams && Array.isArray(teams)) {
        userTeams.value = teams
        sessionStorage.setItem('teams', JSON.stringify(teams))

        // Set current team if not already set or invalid
        const storedTeamId = currentTeam.value?.id
        const currentTeamIsValid = storedTeamId && teams.some(t => t.id === storedTeamId)

        if (!currentTeamIsValid && teams.length > 0) {
          setCurrentTeam(teams[0])
        } else if (!currentTeamIsValid && teams.length === 0) {
          currentTeam.value = null
          sessionStorage.removeItem('currentTeam')
        }
      } else {
        userTeams.value = []
        currentTeam.value = null
        sessionStorage.setItem('teams', JSON.stringify([]))
        sessionStorage.removeItem('currentTeam')
      }
    } catch {
      userTeams.value = []
      currentTeam.value = null
      sessionStorage.removeItem('teams')
      sessionStorage.removeItem('currentTeam')
    } finally {
      isLoading.value = false
    }
  }

  // Create team — creates via TEAM_REPO and refreshes teams list
  const createTeam = async (teamName: string): Promise<TeamSummary> => {
    if (!isAuthenticated.value) throw new Error('User not authenticated')

    const repo = getContainer().resolve<Repository<any>>(TEAM_REPO)
    const createdTeam = await repo.create({ name: teamName })

    if (createdTeam && createdTeam.id) {
      const teamSummary: TeamSummary = {
        id: createdTeam.id,
        name: createdTeam.name,
        role: 'owner'
      }
      userTeams.value.push(teamSummary)
      sessionStorage.setItem('teams', JSON.stringify(userTeams.value))

      if (userTeams.value.length === 1) {
        setCurrentTeam(teamSummary)
      }
      return teamSummary
    } else {
      throw new Error('Failed to create team')
    }
  }

  // Switch team
  const switchTeam = async (targetTeamId: string): Promise<TeamSummary> => {
    if (!isAuthenticated.value) throw new Error('User not authenticated')
    if (!targetTeamId) throw new Error('Target team ID is required')

    const targetTeam = userTeams.value.find(t => t.id === targetTeamId)
    if (!targetTeam) throw new Error('Target team not found in user\'s list')

    // Store previous state for rollback
    const previousTeam = currentTeam.value
    const previousToken = token.value
    setCurrentTeam(targetTeam)

    try {
      const response = await getAuth().switchTeam(targetTeamId)

      if (response && response.token) {
        // Update user role from switch response
        const updatedUser: AuthUser = { ...user.value! }
        const teamInfo = response.teams?.find(t => t.id === targetTeamId)
        if (teamInfo?.role) {
          updatedUser.role = teamInfo.role as TeamRole | 'client'
        } else if (response.user?.role) {
          updatedUser.role = response.user.role as TeamRole | 'client'
        }
        setUserData(updatedUser, response.token)

        // Data reload is handled by DefaultLayout's window.location.reload()
        return targetTeam
      } else {
        throw new Error(response?.message || 'Failed to switch team context on backend')
      }
    } catch (error) {
      // Rollback optimistic update on failure
      setCurrentTeam(previousTeam)
      setUserData(user.value!, previousToken!)
      throw error
    }
  }

  // Set current team (internal helper)
  const setCurrentTeam = (team: TeamSummary | null): void => {
    currentTeam.value = team
    sessionStorage.setItem('currentTeam', JSON.stringify(team))
  }

  // Set session from external auth flow (e.g., client invitation acceptance)
  const setSession = (userData: AuthUser, accessToken: string): void => {
    setUserData(userData, accessToken)
  }

  return {
    user,
    token,
    userTeams,
    currentTeam,
    isLoading,
    isAuthenticated,
    userRole,
    isOwner,
    isAdmin,
    canManageTeam,
    canEdit,
    isViewer,
    initAuth,
    login,
    register,
    logout,
    updateUserState,
    loadUserTeams,
    createTeam,
    switchTeam,
    setSession
  }
})
