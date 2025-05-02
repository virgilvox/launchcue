<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Team Management</h2>
      <div class="flex space-x-2">
        <button @click="openInviteModal" class="btn btn-secondary">
          Invite Member
        </button>
        <button @click="openCreateTeamModal" class="btn btn-primary">
          Create New Team
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Loading team members...</p>
    </div>
    
    <div v-else>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-medium text-gray-800 dark:text-white mb-4">Current Team</h3>
        
        <div v-if="!authStore.currentTeam" class="text-center py-6">
          <p class="text-gray-500 dark:text-gray-400">No team selected</p>
        </div>
        
        <div v-else>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center">
                  {{ getTeamInitials(authStore.currentTeam.name) }}
                </div>
              </div>
              <div class="ml-4">
                <h4 class="text-lg font-semibold text-gray-800 dark:text-white">{{ authStore.currentTeam.name }}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Team Members</h3>
        </div>
        
        <div class="team-members-list mt-6 space-y-4">
          <div v-if="isLoadingMembers" class="flex justify-center py-8">
            <Spinner class="w-8 h-8 text-blue-500" />
          </div>
          <div v-else-if="!teamMembers || teamMembers.length === 0" class="p-6 text-center bg-white rounded-lg shadow">
            <p class="text-gray-500">No team members found. Invite someone to join your team!</p>
          </div>
          <div v-else v-for="member in validTeamMembers" :key="member.id" class="p-4 bg-white rounded-lg shadow flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div v-if="member.photoURL" class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                <img :src="member.photoURL" alt="Profile photo" class="h-full w-full object-cover" />
              </div>
              <div v-else class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span class="text-blue-500 font-medium">
                  {{ getUserInitials(member) }}
                </span>
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{{ member.displayName || member.email }}</h3>
                <p class="text-sm text-gray-500">{{ member.email }}</p>
              </div>
            </div>
            <div>
              <span v-if="isCurrentUserCreator && member.id !== userId" class="inline-flex items-center mr-2">
                <button
                  @click="openRemoveMemberModal(member)"
                  class="text-red-500 hover:text-red-700 focus:outline-none"
                >
                  Remove
                </button>
              </span>
              <span v-if="member.id === userId" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                You
              </span>
              <span v-if="member.isCreator" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Creator
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Your Teams</h3>
        </div>
        
        <div v-if="!authStore.userTeams || authStore.userTeams.length === 0" class="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p class="text-gray-500 dark:text-gray-400">You are not part of any teams yet.</p>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="team in authStore.userTeams" 
            :key="team.id"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center">
                    {{ getTeamInitials(team.name) }}
                  </div>
                </div>
                <div class="ml-4">
                  <h4 class="text-lg font-semibold text-gray-800 dark:text-white">{{ team.name }}</h4>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end">
              <button 
                v-if="team.id !== authStore.currentTeam?.id"
                @click="switchTeam(team.id)"
                class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Switch to this team
              </button>
              <span 
                v-else
                class="text-sm text-gray-500 dark:text-gray-400"
              >
                Current team
              </span>
              
              <button 
                v-if="canLeaveTeam(team)"
                @click="confirmLeaveTeam(team)"
                class="ml-4 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Leave team
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Invite Member Modal -->
    <div v-if="showInviteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Invite Team Member
        </h3>
        
        <form @submit.prevent="sendInvite">
          <div class="mb-4">
            <label for="inviteEmail" class="label">Email Address <span class="text-red-500">*</span></label>
            <input 
              id="inviteEmail"
              v-model="inviteEmail"
              type="email"
              class="input"
              placeholder="colleague@example.com"
              required
            />
          </div>

          <div v-if="inviteError" class="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {{ inviteError }}
          </div>
          
          <div class="flex justify-end space-x-3">
            <button 
              type="button"
              @click="showInviteModal = false"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="sendingInvite"
            >
              {{ sendingInvite ? 'Sending...' : 'Send Invitation' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Create Team Modal -->
    <div v-if="showCreateTeamModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Create New Team
        </h3>
        
        <form @submit.prevent="createTeam">
          <div class="mb-4">
            <label for="teamName" class="label">Team Name</label>
            <input 
              id="teamName"
              v-model="teamName"
              type="text"
              class="input"
              placeholder="My Amazing Team"
              required
            />
          </div>
          
          <div class="flex justify-end space-x-3">
            <button 
              type="button"
              @click="showCreateTeamModal = false"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="creatingTeam"
            >
              {{ creatingTeam ? 'Creating...' : 'Create Team' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Leave Team Confirmation Modal -->
    <div v-if="showLeaveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Leave Team
        </h3>
        
        <p class="text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to leave this team? You will no longer have access to its projects, tasks, and other content.</p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showLeaveModal = false"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            @click="leaveTeam"
            class="btn btn-danger"
            :disabled="leavingTeam"
          >
            {{ leavingTeam ? 'Leaving...' : 'Leave Team' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import teamService from '@/services/team.service';
import { useToast } from 'vue-toastification';

const authStore = useAuthStore();
const loading = ref(false);
const members = ref([]);
const error = ref(null);
const showInviteModal = ref(false);
const showCreateTeamModal = ref(false);
const showLeaveModal = ref(false);
const teamName = ref('');
const creatingTeam = ref(false);
const inviteEmail = ref('');
const sendingInvite = ref(false);
const leavingTeam = ref(false);
const teamToLeave = ref(null);
const inviteError = ref(null);
const toast = useToast();
const teamMembers = ref([]);
const isLoadingMembers = ref(false);

const userInitials = computed(() => {
  if (!authStore.user) return '';
  
  const name = authStore.user.name || '';
  return getInitials(name);
});

function getInitials(name) {
  if (!name) return '';
  
  const parts = name.split(' ');
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function handleImageError(event, member) {
  // Replace broken image with initials
  event.target.style.display = 'none';
  member.photoUrl = null;
}

function getTeamInitials(name) {
  if (!name) return '';
  
  const parts = name.split(' ');
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function openInviteModal() {
  inviteEmail.value = '';
  showInviteModal.value = true;
}

function openCreateTeamModal() {
  teamName.value = '';
  showCreateTeamModal.value = true;
}

async function createTeam() {
  if (!teamName.value) return;
  
  creatingTeam.value = true;
  error.value = null;
  
  try {
    const newTeam = await authStore.createTeam(teamName.value);
    
    showCreateTeamModal.value = false;
    teamName.value = '';
    toast.success(`Team "${newTeam.name}" created successfully!`);

  } catch (err) {
    console.error('Error creating team:', err);
    error.value = err.message || 'Failed to create team. Please try again.';
    toast.error(error.value);
  } finally {
    creatingTeam.value = false;
  }
}

async function switchTeam(teamId) {
  loading.value = true;
  
  try {
    await authStore.switchTeam(teamId);
    await loadTeamMembers();
    // Reload the page after switching teams to ensure all data is refreshed
    window.location.reload();
  } catch (err) {
    console.error('Error switching team:', err);
    error.value = 'Failed to switch team. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function loadTeamMembers() {
  if (!authStore.currentTeam?.id) return;
  
  isLoadingMembers.value = true;
  
  try {
    const result = await teamService.getTeamMembers(authStore.currentTeam.id);
    if (result.success) {
      // Filter out any null or invalid members
      teamMembers.value = result.members.filter(member => 
        member && member.id && (member.email || member.displayName)
      );
    } else {
      toast.error(result.error || 'Failed to load team members');
    }
  } catch (error) {
    console.error('Error loading team members:', error);
    toast.error('Failed to load team members');
  } finally {
    isLoadingMembers.value = false;
  }
}

async function sendInvite() {
  if (!inviteEmail.value || !authStore.currentTeam?.id) return;
  
  sendingInvite.value = true;
  error.value = null;
  inviteError.value = null;
  
  try {
    await teamService.inviteTeamMember(authStore.currentTeam.id, inviteEmail.value);
    showInviteModal.value = false;
    inviteEmail.value = '';
  } catch (err) {
    console.error('Error sending invite:', err);
    error.value = 'Failed to send invite. Please try again.';
    inviteError.value = err.message || 'Failed to send invite. Please try again.';
  } finally {
    sendingInvite.value = false;
  }
}

function canLeaveTeam(team) {
  // Users cannot leave a team if they are the owner
  return team.owner !== authStore.user?.id;
}

function confirmLeaveTeam(team) {
  teamToLeave.value = team;
  showLeaveModal.value = true;
}

async function leaveTeam() {
  if (!teamToLeave.value) return;
  
  leavingTeam.value = true;
  
  try {
    await teamService.leaveTeam(teamToLeave.value.id);
    
    // If this is the current team, we need to switch to another team
    if (teamToLeave.value.id === authStore.currentTeam?.id) {
      // Find the first available other team
      const otherTeam = authStore.userTeams.find(t => t.id !== teamToLeave.value.id);
      if (otherTeam) {
        await authStore.switchTeam(otherTeam.id);
      }
    }
    
    // Refresh the user's teams
    await authStore.loadUserTeams();
    
    toast.success('You have left the team successfully');
    showLeaveModal.value = false;
  } catch (err) {
    console.error('Error leaving team:', err);
    toast.error('Failed to leave team: ' + (err.message || 'Unknown error'));
  } finally {
    leavingTeam.value = false;
  }
}

// Computed property to filter out null or invalid members
const validTeamMembers = computed(() => {
  return teamMembers.value.filter(member => 
    member && member.id && (member.email || member.displayName)
  );
});

// Get user initials from display name or email
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

onMounted(async () => {
  loading.value = true;
  error.value = null;
  
  try {
    if (!authStore.userTeams?.length) {
      await authStore.loadUserTeams();
    }
    
    if (authStore.currentTeam?.id) {
      await loadTeamMembers();
    }
  } catch (err) {
    console.error('Error initializing team page:', err);
    error.value = 'Failed to load team data.';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
});
</script> 