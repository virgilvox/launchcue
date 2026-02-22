import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import teamService from '../services/team.service';
import { useAuthStore } from './auth';
import { useToast } from 'vue-toastification';

export const useTeamStore = defineStore('team', () => {
  const authStore = useAuthStore();
  const toast = useToast();

  const teams = ref([]);
  const teamMembers = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const pendingInvites = ref([]);
  const isLoadingInvites = ref(false);

  // Computed property for current team
  const currentTeam = computed(() => {
    return authStore.currentTeam;
  });

  // Computed property for valid team members (non-null)
  const validTeamMembers = computed(() => {
    return teamMembers.value.filter(member => 
      member && member.id && (member.email || member.displayName)
    );
  });

  // Fetch all teams for the current user
  async function fetchTeams() {
    if (!authStore.user) {
      return { success: false, error: 'User not authenticated' };
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await teamService.getTeams();
      if (result.success) {
        teams.value = result.teams;
        return { success: true, teams: result.teams };
      } else {
        error.value = result.error || 'Failed to fetch teams';
        toast.error(error.value);
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      error.value = err.message || 'Failed to fetch teams';
      toast.error(error.value);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Fetch team members for the current team
  async function fetchTeamMembers() {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await teamService.getTeamMembers(authStore.currentTeam.id);
      if (result.success) {
        // Filter out any null or invalid members
        teamMembers.value = result.members.filter(member => 
          member && member.id && (member.email || member.displayName)
        );
        return { success: true, members: teamMembers.value };
      } else {
        error.value = result.error || 'Failed to fetch team members';
        toast.error(error.value);
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
      error.value = err.message || 'Failed to fetch team members';
      toast.error(error.value);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Create a new team
  async function createTeam(teamData) {
    if (!authStore.user) {
      return { success: false, error: 'User not authenticated' };
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await teamService.createTeam(teamData);
      if (result.success) {
        teams.value.push(result.team);
        // Optionally switch to the new team
        await authStore.switchTeam(result.team.id);
        toast.success('Team created successfully');
        return { success: true, team: result.team };
      } else {
        error.value = result.error || 'Failed to create team';
        toast.error(error.value);
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error creating team:', err);
      error.value = err.message || 'Failed to create team';
      toast.error(error.value);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Invite a user to the current team
  async function inviteUser(email) {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await teamService.inviteUser(authStore.currentTeam.id, email);
      if (result.success) {
        toast.success(`Invitation sent to ${email}`);
        return { success: true };
      } else {
        error.value = result.error || 'Failed to send invitation';
        toast.error(error.value);
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      error.value = err.message || 'Failed to send invitation';
      toast.error(error.value);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Get pending invites for the current team
  async function fetchPendingInvites() {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }

    isLoadingInvites.value = true;
    error.value = null;

    try {
      const result = await teamService.getPendingInvites(authStore.currentTeam.id);
      if (result.success) {
        pendingInvites.value = result.invites;
        return { success: true, invites: result.invites };
      } else {
        error.value = result.error || 'Failed to fetch pending invites';
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error fetching pending invites:', err);
      error.value = err.message || 'Failed to fetch pending invites';
      return { success: false, error: error.value };
    } finally {
      isLoadingInvites.value = false;
    }
  }

  // Remove a member from the current team
  async function removeMember(memberId) {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await teamService.removeMember(authStore.currentTeam.id, memberId);
      if (result.success) {
        // Update the local state
        teamMembers.value = teamMembers.value.filter(member => member.id !== memberId);
        toast.success('Team member removed successfully');
        return { success: true };
      } else {
        error.value = result.error || 'Failed to remove team member';
        toast.error(error.value);
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error removing team member:', err);
      error.value = err.message || 'Failed to remove team member';
      toast.error(error.value);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Get user initials for display
  function getUserInitials(user) {
    if (!user) return '?';
    
    if (user.displayName) {
      const names = user.displayName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.displayName[0].toUpperCase();
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return '?';
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
  };
}); 