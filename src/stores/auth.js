import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import router from '../router'
import apiService, { TEAM_ENDPOINT } from '../services/api.service'
// Import other stores needed for data reloading
import { useTaskStore } from './task'
import { useProjectStore } from './project'
import { useClientStore } from './client'
// Import other stores as needed (campaigns, notes, etc.)

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const token = ref(localStorage.getItem('token') || null)
  const userTeams = ref(JSON.parse(localStorage.getItem('teams')) || [])
  const currentTeam = ref(JSON.parse(localStorage.getItem('currentTeam')) || null)
  const isLoading = ref(false)
  
  // Computed
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  
  // Initialize auth state from local storage (checks if user/token exist)
  const initAuth = () => {
    user.value = JSON.parse(localStorage.getItem('user')) || null;
    token.value = localStorage.getItem('token') || null;
    userTeams.value = JSON.parse(localStorage.getItem('teams')) || [];
    currentTeam.value = JSON.parse(localStorage.getItem('currentTeam')) || null;

    // Sync token to apiService (memory + localStorage)
    apiService.setAuthToken(token.value);

    // Register 401 handler so apiService can trigger logout without circular imports
    apiService.onUnauthorized(() => {
      logout();
    });

    return isAuthenticated.value;
  }
  
  // Register
  const register = async (email, password, name) => {
    isLoading.value = true
    try {
      // Use apiService for registration
      const response = await apiService.register({ email, password, name });
      
      if (response && response.token && response.user) {
        // Set user data and token
        setUserData(response.user, response.token);
        // Set current team from registration response
        await loadUserTeams(); // Fetch teams after registration
        // The register function on backend now creates a default team
        if(response.currentTeamId) {
          const team = userTeams.value.find(t => t.id === response.currentTeamId);
          if (team) setCurrentTeam(team);
        }
        return response.user;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    } finally {
      isLoading.value = false
    }
  }
  
  // Login
  const login = async (email, password) => {
    isLoading.value = true
    try {
      // Use apiService for login
      const response = await apiService.login(email, password);
      
      if (response && response.token && response.user) {
        // Set user data and token
        setUserData(response.user, response.token);
        // Load user teams and set current team from login response
        await loadUserTeams();
        if(response.currentTeamId) {
          const team = userTeams.value.find(t => t.id === response.currentTeamId);
          if (team) {
            setCurrentTeam(team);
          } else if (userTeams.value.length > 0) {
            // Fallback if currentTeamId is invalid but teams exist
            setCurrentTeam(userTeams.value[0]);
          }
        } else if (userTeams.value.length > 0) {
          // Fallback if no currentTeamId sent but teams exist
          setCurrentTeam(userTeams.value[0]);
        }
        return response.user;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    } finally {
      isLoading.value = false
    }
  }
  
  // Logout
  const logout = async () => {
    try {
      // Call apiService logout (clears token in service/localStorage)
      await apiService.logout();
      
      // Clear local state
      user.value = null
      token.value = null
      userTeams.value = []
      currentTeam.value = null
      
      // Clear local storage explicitly (redundant with apiService.logout but safe)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('teams')
      localStorage.removeItem('currentTeam')
      
      // Redirect to login
      router.push('/login')
    } catch (error) {
      // Logout errors are non-critical; state is already cleared
    }
  }
  
  // Save user data to state and localStorage
  const setUserData = (userData, accessToken) => {
    user.value = userData
    token.value = accessToken
    apiService.setAuthToken(accessToken); // Update token in axios instance
    
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', accessToken)
  }

  // Action to update user info in the store (e.g., after profile save)
  const updateUserState = (updatedUserData) => {
      if (user.value && updatedUserData) {
          // Merge new data, ensuring ID and email aren't overwritten if not present
          user.value = { 
              ...user.value, 
              ...updatedUserData, 
              id: user.value.id, // Keep original ID
              email: user.value.email // Keep original email
          };
          localStorage.setItem('user', JSON.stringify(user.value));
      }
  }
  
  // Load user teams
  const loadUserTeams = async () => {
    if (!isAuthenticated.value) return; // Need to be authenticated

    isLoading.value = true
    try {
      // Use TEAM_ENDPOINT constant
      const teams = await apiService.get(TEAM_ENDPOINT);
      
      if (teams && Array.isArray(teams)) {
        userTeams.value = teams;
        localStorage.setItem('teams', JSON.stringify(teams));
        
        // Set current team if not already set or invalid
        const storedTeamId = currentTeam.value?.id;
        const currentTeamIsValid = storedTeamId && teams.some(t => t.id === storedTeamId);

        if (!currentTeamIsValid && teams.length > 0) {
          setCurrentTeam(teams[0]);
        } else if (!currentTeamIsValid && teams.length === 0) {
          currentTeam.value = null; // Ensure currentTeam is null if no teams exist
          localStorage.removeItem('currentTeam');
        }
        // If currentTeamIsValid, keep the existing currentTeam

      } else {
        userTeams.value = [];
        currentTeam.value = null;
        localStorage.setItem('teams', JSON.stringify([]));
        localStorage.removeItem('currentTeam');
      }
    } catch (error) {
      userTeams.value = [];
      currentTeam.value = null;
      localStorage.removeItem('teams');
      localStorage.removeItem('currentTeam');
      throw error // Re-throw
    } finally {
      isLoading.value = false
    }
  }
  
  // Create team
  const createTeam = async (teamName) => {
    if (!isAuthenticated.value) throw new Error('User not authenticated');
    try {
      const newTeamData = { name: teamName };
      // Use TEAM_ENDPOINT constant from import
      const createdTeam = await apiService.post(TEAM_ENDPOINT, newTeamData);
      
      if (createdTeam && createdTeam.id) {
        userTeams.value.push(createdTeam);
        localStorage.setItem('teams', JSON.stringify(userTeams.value));
        
        // Set as current team if it's the first one
        if (userTeams.value.length === 1) {
          setCurrentTeam(createdTeam);
        }
        return createdTeam;
      } else {
        throw new Error(createdTeam.message || 'Failed to create team');
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Switch team
  const switchTeam = async (targetTeamId) => {
    if (!isAuthenticated.value) throw new Error('User not authenticated');
    if (!targetTeamId) throw new Error('Target team ID is required');

    const currentToken = token.value; // Store current token in case of failure
    const currentLocalTeam = currentTeam.value; // Store current team state

    // Optimistically update local state (optional, improves perceived speed)
    const targetTeam = userTeams.value.find(t => t.id === targetTeamId);
    if (!targetTeam) throw new Error('Target team not found in user\'s list');
    // Store previous team/token for potential rollback
    const previousTeam = currentTeam.value;
    const previousToken = token.value;
    setCurrentTeam(targetTeam);

    try {
      // Call the backend endpoint using the apiService.switchTeam method
      const response = await apiService.switchTeam(targetTeamId);

      if (response && response.token && response.currentTeam) {
        // Update token and current team info from the response
        // setUserData handles setting token ref, localStorage, and apiService headers
        setUserData(user.value, response.token); // Update token (user info remains same)
        setCurrentTeam(response.currentTeam);    // Update team info from response
        
        // --- Trigger data reload --- 
        await triggerDataReloadForNewTeam();
        // ---------------------------
        
        return response.currentTeam;
      } else {
        throw new Error(response?.message || 'Failed to switch team context on backend');
      }
    } catch (error) {
      // Rollback optimistic update on failure
      setCurrentTeam(previousTeam); // Restore previous team state
      setUserData(user.value, previousToken); // Restore previous token
      throw error; // Re-throw for component handling
    }
  }
  
  // Function to trigger data reloads across stores
  const triggerDataReloadForNewTeam = async () => {
      const taskStore = useTaskStore();
      const projectStore = useProjectStore();
      const clientStore = useClientStore();
      // Add other stores here...

      // Trigger fetch actions in parallel (or sequentially if needed)
      // These fetches will now use the new token containing the correct teamId
      try {
          await Promise.all([
              taskStore.fetchTasks(), // Assumes fetchTasks uses current auth context
              projectStore.fetchProjects(), // Assumes fetchProjects uses current auth context
              clientStore.fetchClients(), // Assumes fetchClients uses current auth context
              // Add fetches for other relevant stores (campaigns, notes, etc.)
          ]);
      } catch (error) {
          // Data reload failure is non-fatal; user can manually refresh
      }
  }

  // Set current team (internal helper)
  const setCurrentTeam = (team) => {
    currentTeam.value = team;
    localStorage.setItem('currentTeam', JSON.stringify(team));
    // No longer need token update here, handled by switchTeam response
  }
  
  // Return store methods and state
  return {
    user,
    token,
    userTeams,
    currentTeam,
    isLoading,
    isAuthenticated,
    initAuth,
    login,
    register,
    logout,
    updateUserState,
    loadUserTeams,
    createTeam,
    switchTeam
    // Avoid exposing setCurrentTeam directly now
  }
}) 