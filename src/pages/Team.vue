<template>
  <div>
    <PageHeader title="Team Management">
      <template #actions>
        <button v-if="authStore.canManageTeam" @click="openInviteModal" class="btn btn-secondary">
          Invite Member
        </button>
        <button @click="openCreateTeamModal" class="btn btn-primary">
          Create New Team
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-10">
      <LoadingSpinner text="Loading team members..." />
    </div>

    <div v-else>
      <!-- Current Team Card -->
      <div class="card mb-6">
        <h3 class="heading-card mb-4">Current Team</h3>

        <div v-if="!authStore.currentTeam" class="text-center py-6">
          <p class="text-body">No team selected</p>
        </div>

        <div v-else>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style="background-color: var(--accent-primary);">
                  {{ getTeamInitials(authStore.currentTeam.name) }}
                </div>
              </div>
              <div class="ml-4">
                <h4 class="heading-section">{{ authStore.currentTeam.name }}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Team Members Card -->
      <div class="card mb-6">
        <div class="pb-4 mb-4" style="border-bottom: 2px solid var(--border);">
          <h3 class="heading-card">Team Members</h3>
        </div>

        <div class="space-y-4">
          <div v-if="isLoadingMembers" class="flex justify-center py-8">
            <LoadingSpinner text="Loading members..." />
          </div>

          <div v-else-if="!teamMembers || teamMembers.length === 0" class="text-center py-6">
            <p class="text-body">No team members found. Invite someone to join your team!</p>
          </div>

          <div
            v-else
            v-for="member in validTeamMembers"
            :key="member.id"
            class="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div class="flex items-center space-x-3">
              <div v-if="member.photoURL" class="h-10 w-10 rounded-full overflow-hidden flex-shrink-0" style="border: 2px solid var(--border);">
                <img :src="member.photoURL" alt="Profile photo" class="h-full w-full object-cover" />
              </div>
              <div v-else class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: var(--accent-primary-wash); border: 2px solid var(--border);">
                <span class="font-bold text-sm" style="color: var(--accent-primary);">
                  {{ getUserInitials(member) }}
                </span>
              </div>
              <div class="min-w-0">
                <h3 class="heading-card truncate">{{ member.displayName || member.name || member.email }}</h3>
                <p class="text-caption truncate">{{ member.email }}</p>
              </div>
              <!-- Role Badge -->
              <span :class="getRoleBadgeClass(member.role)" class="badge">
                {{ formatRole(member.role) }}
              </span>
              <span v-if="member.id === authStore.user?.id" class="badge badge-blue">
                You
              </span>
            </div>
            <div class="flex items-center space-x-2 flex-shrink-0">
              <!-- Role Dropdown (visible to owners/admins, not for self) -->
              <select
                v-if="authStore.canManageTeam && member.id !== authStore.user?.id"
                :value="member.role"
                @change="confirmRoleChange(member, $event.target.value)"
                class="input text-sm"
                style="width: auto; min-height: 2.25rem;"
              >
                <option value="owner" :disabled="!authStore.isOwner">Owner</option>
                <option value="admin" :disabled="!authStore.isOwner">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                v-if="authStore.canManageTeam && member.id !== authStore.user?.id"
                @click="openRemoveMemberModal(member)"
                class="btn btn-danger btn-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Your Teams Section -->
      <div class="mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="heading-section">Your Teams</h3>
        </div>

        <div v-if="!authStore.userTeams || authStore.userTeams.length === 0" class="card text-center py-6">
          <p class="text-body">You are not part of any teams yet.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="team in authStore.userTeams"
            :key="team.id"
            class="card card-interactive"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style="background-color: var(--accent-primary);">
                    {{ getTeamInitials(team.name) }}
                  </div>
                </div>
                <div class="ml-4">
                  <h4 class="heading-card">{{ team.name }}</h4>
                </div>
              </div>
            </div>

            <div class="flex justify-end items-center gap-3">
              <button
                v-if="team.id !== authStore.currentTeam?.id"
                @click="switchTeam(team.id)"
                class="btn btn-outline btn-sm"
              >
                Switch to this team
              </button>
              <span
                v-else
                class="badge badge-green"
              >
                Current team
              </span>

              <button
                v-if="canLeaveTeam(team)"
                @click="confirmLeaveTeam(team)"
                class="btn btn-danger btn-sm"
              >
                Leave team
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Member Modal -->
    <Modal v-model="showInviteModal" title="Invite Team Member">
      <form @submit.prevent="sendInvite">
        <div class="form-group">
          <label for="inviteEmail" class="label">Email Address <span style="color: var(--danger);">*</span></label>
          <input
            id="inviteEmail"
            v-model="inviteEmail"
            type="email"
            class="input"
            placeholder="colleague@example.com"
            required
          />
        </div>

        <div v-if="inviteError" class="mb-4 p-3 badge-red" style="border: 2px solid var(--danger); color: var(--danger);">
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
    </Modal>

    <!-- Create Team Modal -->
    <Modal v-model="showCreateTeamModal" title="Create New Team">
      <form @submit.prevent="createTeam">
        <div class="form-group">
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
    </Modal>

    <!-- Leave Team Confirmation Modal -->
    <Modal v-model="showLeaveModal" title="Leave Team">
      <p class="text-body mb-4">Are you sure you want to leave this team? You will no longer have access to its projects, tasks, and other content.</p>

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
    </Modal>

    <!-- Role Change Confirmation Modal -->
    <Modal v-model="showRoleChangeModal" title="Change Member Role">
      <p class="text-body mb-4">
        Are you sure you want to change <strong>{{ roleChangeTarget?.name || roleChangeTarget?.email }}</strong>'s role from <strong>{{ formatRole(roleChangeTarget?.role) }}</strong> to <strong>{{ formatRole(roleChangeNewRole) }}</strong>?
      </p>

      <div class="flex justify-end space-x-3">
        <button
          @click="cancelRoleChange"
          class="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          @click="executeRoleChange"
          class="btn btn-primary"
          :disabled="changingRole"
        >
          {{ changingRole ? 'Updating...' : 'Confirm Change' }}
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import teamService from '@/services/team.service';
import { useToast } from 'vue-toastification';
import { getInitials } from '@/utils/formatters';
import Modal from '../components/Modal.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

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
const showRoleChangeModal = ref(false);
const roleChangeTarget = ref(null);
const roleChangeNewRole = ref('');
const changingRole = ref(false);

const userInitials = computed(() => {
  if (!authStore.user) return '';
  
  const name = authStore.user.name || '';
  return getInitials(name);
});


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
  if (!inviteEmail.value || !authStore.currentTeam?.id) {
    inviteError.value = "Email and team ID are required";
    return;
  }
  
  sendingInvite.value = true;
  error.value = null;
  inviteError.value = null;
  
  console.log(`Attempting to invite ${inviteEmail.value} to team ${authStore.currentTeam.id}`);
  
  try {
    const result = await teamService.inviteUser(authStore.currentTeam.id, inviteEmail.value);
    
    if (result.success) {
      console.log('Invitation successful:', result);
      showInviteModal.value = false;
      inviteEmail.value = '';
      toast.success('Invitation sent successfully');
    } else {
      console.error('Invitation failed with error:', result.error);
      inviteError.value = result.error || 'Failed to send invite. Please try again.';
      toast.error(inviteError.value);
    }
  } catch (err) {
    console.error('Error sending invite:', err);
    error.value = 'Failed to send invite. Please try again.';
    inviteError.value = err.message || 'Failed to send invite. Please try again.';
    toast.error(inviteError.value);
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

// FIX: Define isCurrentUserOwner computed property
const isCurrentUserOwner = computed(() => {
  return authStore.currentTeam?.owner === authStore.user?.id;
});

// Role badge styling
function getRoleBadgeClass(role) {
  switch (role) {
    case 'owner':
      return 'badge-purple';
    case 'admin':
      return 'badge-blue';
    case 'member':
      return 'badge-green';
    case 'viewer':
      return 'badge-gray';
    default:
      return 'badge-gray';
  }
}

function formatRole(role) {
  if (!role) return 'Member';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function confirmRoleChange(member, newRole) {
  if (newRole === member.role) return;
  roleChangeTarget.value = member;
  roleChangeNewRole.value = newRole;
  showRoleChangeModal.value = true;
}

function cancelRoleChange() {
  showRoleChangeModal.value = false;
  roleChangeTarget.value = null;
  roleChangeNewRole.value = '';
}

async function executeRoleChange() {
  if (!roleChangeTarget.value || !roleChangeNewRole.value) return;

  changingRole.value = true;

  try {
    const result = await teamService.updateMemberRole(
      authStore.currentTeam.id,
      roleChangeTarget.value.id,
      roleChangeNewRole.value
    );

    if (result.success) {
      toast.success(`Role updated to ${formatRole(roleChangeNewRole.value)}`);
      // Refresh team members to reflect the change
      await loadTeamMembers();
    } else {
      toast.error(result.error || 'Failed to update role');
    }
  } catch (err) {
    console.error('Error changing role:', err);
    toast.error('Failed to update member role');
  } finally {
    changingRole.value = false;
    showRoleChangeModal.value = false;
    roleChangeTarget.value = null;
    roleChangeNewRole.value = '';
  }
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
