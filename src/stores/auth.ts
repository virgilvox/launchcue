import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import router from '../router'
import apiService, { TEAM_ENDPOINT } from '../services/api.service'
// Import other stores needed for data reloading
import { useTaskStore } from './task'
import { useProjectStore } from './project'
import { useClientStore } from './client'
import type { User, Team, TeamMember } from '../types/models'
import type { TeamRole } from '../types/enums'

// Extended user type that includes role from the current team context
interface AuthUser extends User {
  role?: TeamRole
}

// Team summary as returned by auth/team endpoints
interface TeamSummary {
  id: string
  name: string
  role?: string
}

// Login/register response shape from apiService
interface AuthResponse {
  token: string
  user: AuthUser
  currentTeamId?: string
  message?: string
}

// Switch team response shape
interface SwitchTeamResponse {
  token: string
  currentTeam: TeamSummary & { role?: TeamRole }
  message?: string
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
      apiService.setAuthToken(null)
      return false
    }

    // Sync token to apiService (memory + sessionStorage)
    apiService.setAuthToken(token.value)

    // Register 401 handler so apiService can trigger logout without circular imports
    apiService.onUnauthorized(() => {
      logout()
    })

    return isAuthenticated.value
  }

  // Register
  const register = async (email: string, password: string, name: string): Promise<AuthUser> => {
    isLoading.value = true
    try {
      // Use apiService for registration
      const response: AuthResponse = await apiService.register({ email, password, name })

      if (response && response.token && response.user) {
        // Set user data and token
        setUserData(response.user, response.token)
        // Set current team from registration response
        await loadUserTeams() // Fetch teams after registration
        // The register function on backend now creates a default team
        if (response.currentTeamId) {
          const team = userTeams.value.find(t => t.id === response.currentTeamId)
          if (team) setCurrentTeam(team)
        }
        return response.user
      } else {
        throw new Error(response.message || 'Registration failed')
      }
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Login
  const login = async (email: string, password: string): Promise<AuthUser> => {
    isLoading.value = true
    try {
      // Use apiService for login
      const response: AuthResponse = await apiService.login(email, password)

      if (response && response.token && response.user) {
        // Include role from login response in user data
        const userData: AuthUser = { ...response.user }
        if (response.user.role) {
          userData.role = response.user.role
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
            // Fallback if currentTeamId is invalid but teams exist
            setCurrentTeam(userTeams.value[0])
          }
        } else if (userTeams.value.length > 0) {
          // Fallback if no currentTeamId sent but teams exist
          setCurrentTeam(userTeams.value[0])
        }
        return userData
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Logout
  const logout = async (): Promise<void> => {
    try {
      // Call apiService logout (clears token in service/sessionStorage)
      await apiService.logout()

      // Clear local state
      user.value = null
      token.value = null
      userTeams.value = []
      currentTeam.value = null

      // Clear local storage explicitly (redundant with apiService.logout but safe)
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('teams')
      sessionStorage.removeItem('currentTeam')

      // Redirect to landing page
      router.push('/')
    } catch (error) {
      // Logout errors are non-critical; state is already cleared
    }
  }

  // Save user data to state and sessionStorage
  const setUserData = (userData: AuthUser, accessToken: string): void => {
    user.value = userData
    token.value = accessToken
    apiService.setAuthToken(accessToken) // Update token in axios instance

    sessionStorage.setItem('user', JSON.stringify(userData))
    sessionStorage.setItem('token', accessToken)
  }

  // Action to update user info in the store (e.g., after profile save)
  const updateUserState = (updatedUserData: Partial<AuthUser>): void => {
    if (user.value && updatedUserData) {
      // Merge new data, ensuring ID and email aren't overwritten if not present
      user.value = {
        ...user.value,
        ...updatedUserData,
        id: user.value.id, // Keep original ID
        email: user.value.email // Keep original email
      }
      sessionStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  // Load user teams
  const loadUserTeams = async (): Promise<void> => {
    if (!isAuthenticated.value) return // Need to be authenticated

    isLoading.value = true
    try {
      // Use TEAM_ENDPOINT constant
      const teams: TeamSummary[] = await apiService.get(TEAM_ENDPOINT)

      if (teams && Array.isArray(teams)) {
        userTeams.value = teams
        sessionStorage.setItem('teams', JSON.stringify(teams))

        // Set current team if not already set or invalid
        const storedTeamId = currentTeam.value?.id
        const currentTeamIsValid = storedTeamId && teams.some(t => t.id === storedTeamId)

        if (!currentTeamIsValid && teams.length > 0) {
          setCurrentTeam(teams[0])
        } else if (!currentTeamIsValid && teams.length === 0) {
          currentTeam.value = null // Ensure currentTeam is null if no teams exist
          sessionStorage.removeItem('currentTeam')
        }
        // If currentTeamIsValid, keep the existing currentTeam

      } else {
        userTeams.value = []
        currentTeam.value = null
        sessionStorage.setItem('teams', JSON.stringify([]))
        sessionStorage.removeItem('currentTeam')
      }
    } catch (error) {
      userTeams.value = []
      currentTeam.value = null
      sessionStorage.removeItem('teams')
      sessionStorage.removeItem('currentTeam')
      throw error // Re-throw
    } finally {
      isLoading.value = false
    }
  }

  // Create team
  const createTeam = async (teamName: string): Promise<TeamSummary> => {
    if (!isAuthenticated.value) throw new Error('User not authenticated')
    try {
      const newTeamData = { name: teamName }
      // Use TEAM_ENDPOINT constant from import
      const createdTeam: TeamSummary = await apiService.post(TEAM_ENDPOINT, newTeamData)

      if (createdTeam && createdTeam.id) {
        userTeams.value.push(createdTeam)
        sessionStorage.setItem('teams', JSON.stringify(userTeams.value))

        // Set as current team if it's the first one
        if (userTeams.value.length === 1) {
          setCurrentTeam(createdTeam)
        }
        return createdTeam
      } else {
        throw new Error('Failed to create team')
      }
    } catch (error) {
      throw error
    }
  }

  // Switch team
  const switchTeam = async (targetTeamId: string): Promise<TeamSummary> => {
    if (!isAuthenticated.value) throw new Error('User not authenticated')
    if (!targetTeamId) throw new Error('Target team ID is required')

    // Optimistically update local state (optional, improves perceived speed)
    const targetTeam = userTeams.value.find(t => t.id === targetTeamId)
    if (!targetTeam) throw new Error('Target team not found in user\'s list')
    // Store previous team/token for potential rollback
    const previousTeam = currentTeam.value
    const previousToken = token.value
    setCurrentTeam(targetTeam)

    try {
      // Call the backend endpoint using the apiService.switchTeam method
      const response: SwitchTeamResponse = await apiService.switchTeam(targetTeamId)

      if (response && response.token && response.currentTeam) {
        // Update token and current team info from the response
        // Include the new role from the team switch response
        const updatedUser: AuthUser = { ...user.value! }
        if (response.currentTeam.role) {
          updatedUser.role = response.currentTeam.role
        }
        // setUserData handles setting token ref, sessionStorage, and apiService headers
        setUserData(updatedUser, response.token) // Update token and user role
        setCurrentTeam(response.currentTeam)    // Update team info from response

        // --- Trigger data reload ---
        await triggerDataReloadForNewTeam()
        // ---------------------------

        return response.currentTeam
      } else {
        throw new Error(response?.message || 'Failed to switch team context on backend')
      }
    } catch (error) {
      // Rollback optimistic update on failure
      setCurrentTeam(previousTeam) // Restore previous team state
      setUserData(user.value!, previousToken!) // Restore previous token
      throw error // Re-throw for component handling
    }
  }

  // Function to trigger data reloads across stores
  const triggerDataReloadForNewTeam = async (): Promise<void> => {
    const taskStore = useTaskStore()
    const projectStore = useProjectStore()
    const clientStore = useClientStore()
    // Add other stores here...

    // Trigger fetch actions in parallel (or sequentially if needed)
    // These fetches will now use the new token containing the correct teamId
    try {
      await Promise.all([
        taskStore.fetchTasks(), // Assumes fetchTasks uses current auth context
        projectStore.fetchProjects(), // Assumes fetchProjects uses current auth context
        clientStore.fetchClients(), // Assumes fetchClients uses current auth context
        // Add fetches for other relevant stores (campaigns, notes, etc.)
      ])
    } catch (error) {
      // Data reload failure is non-fatal; user can manually refresh
    }
  }

  // Set current team (internal helper)
  const setCurrentTeam = (team: TeamSummary | null): void => {
    currentTeam.value = team
    sessionStorage.setItem('currentTeam', JSON.stringify(team))
    // No longer need token update here, handled by switchTeam response
  }

  // Set session from external auth flow (e.g., client invitation acceptance)
  const setSession = (userData: AuthUser, accessToken: string): void => {
    setUserData(userData, accessToken)
  }

  // Return store methods and state
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
