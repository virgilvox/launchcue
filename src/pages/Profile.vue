<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">User Profile</h2>
      <button @click="saveProfile" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>
    
    <!-- Profile Form -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div v-if="loading" class="text-center py-4">
        <p class="text-gray-500 dark:text-gray-400">Loading profile...</p>
      </div>
      
      <div v-else-if="error" class="text-center py-4">
        <p class="text-red-500">{{ error }}</p>
      </div>
      
      <div v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div class="mb-4">
              <label for="name" class="label">Full Name</label>
              <input 
                id="name"
                v-model="profileForm.name"
                type="text"
                class="input"
                placeholder="Your full name"
                required
              />
            </div>
            
            <div class="mb-4">
              <label for="email" class="label">Email Address</label>
              <input 
                id="email"
                v-model="profileForm.email"
                type="email"
                class="input"
                placeholder="Your email address"
                readonly
              />
              <p class="text-xs text-gray-500 mt-1">Email address cannot be changed</p>
            </div>
            
            <div class="mb-4">
              <label for="jobTitle" class="label">Job Title</label>
              <input 
                id="jobTitle"
                v-model="profileForm.jobTitle"
                type="text"
                class="input"
                placeholder="Your job title"
              />
            </div>
          </div>
          
          <div>
            <div class="mb-4">
              <label class="label">Profile Picture</label>
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-bold overflow-hidden">
                  <img v-if="profileForm.avatarUrl" :src="profileForm.avatarUrl" alt="Profile" class="w-full h-full object-cover" />
                  <span v-else>{{ getUserInitials(profileForm.name) }}</span>
                </div>
                <button type="button" class="btn btn-secondary">Upload Image</button>
              </div>
            </div>
            
            <div class="mb-4">
              <label for="bio" class="label">Bio</label>
              <textarea 
                id="bio"
                v-model="profileForm.bio"
                class="input"
                placeholder="A short bio about yourself"
                rows="4"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Password Change -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Change Password</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div class="mb-4">
            <label for="currentPassword" class="label">Current Password</label>
            <input 
              id="currentPassword"
              v-model="passwordForm.currentPassword"
              type="password"
              class="input"
              placeholder="Current password"
            />
          </div>
          
          <div class="mb-4">
            <label for="newPassword" class="label">New Password</label>
            <input 
              id="newPassword"
              v-model="passwordForm.newPassword"
              type="password"
              class="input"
              placeholder="New password"
            />
          </div>
          
          <div class="mb-4">
            <label for="confirmPassword" class="label">Confirm New Password</label>
            <input 
              id="confirmPassword"
              v-model="passwordForm.confirmPassword"
              type="password"
              class="input"
              placeholder="Confirm new password"
            />
          </div>
          
          <div>
            <button 
              @click="changePassword" 
              class="btn btn-secondary"
              :disabled="changingPassword || !canChangePassword"
            >
              {{ changingPassword ? 'Changing...' : 'Change Password' }}
            </button>
          </div>
        </div>
        
        <div class="self-start">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Password requirements:</p>
          <ul class="text-xs text-gray-500 dark:text-gray-400 list-disc pl-5 space-y-1">
            <li>At least 8 characters long</li>
            <li>Contains at least one uppercase letter</li>
            <li>Contains at least one lowercase letter</li>
            <li>Contains at least one number</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from '../composables/useToast';
import { useAuthStore } from '../stores/auth';
import userService from '../services/user.service';

const toast = useToast();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref(null);
const saving = ref(false);
const changingPassword = ref(false);

const profileForm = ref({
  name: '',
  email: '',
  jobTitle: '',
  bio: '',
  avatarUrl: ''
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const canChangePassword = computed(() => {
  return (
    passwordForm.value.currentPassword && 
    passwordForm.value.newPassword && 
    passwordForm.value.confirmPassword && 
    passwordForm.value.newPassword === passwordForm.value.confirmPassword &&
    passwordForm.value.newPassword.length >= 8
  );
});

function getUserInitials(name) {
  if (!name) return '';
  
  const parts = name.split(' ');
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

async function loadProfile() {
  loading.value = true;
  error.value = null;
  
  try {
    const profileData = await userService.getUserProfile();
    
    profileForm.value = {
      name: profileData.name || '',
      email: profileData.email || '',
      jobTitle: profileData.jobTitle || '',
      bio: profileData.bio || '',
      avatarUrl: profileData.avatarUrl || ''
    };
  } catch (err) {
    console.error('Error loading profile:', err);
    error.value = 'Failed to load profile. Please try again.';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  saving.value = true;
  error.value = null;
  
  try {
    const updatedUser = await userService.updateUserProfile(profileForm.value);
    
    authStore.updateUserState(updatedUser);
    
    toast.success('Profile updated successfully');
  } catch (err) {
    console.error('Error saving profile:', err);
    error.value = 'Failed to save profile. Please try again.';
    toast.error('Failed to save profile');
  } finally {
    saving.value = false;
  }
}

async function changePassword() {
  if (!canChangePassword.value) return;
  
  changingPassword.value = true;
  
  try {
    await userService.updatePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    });
    
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    
    toast.success('Password changed successfully');
  } catch (err) {
    console.error('Error changing password:', err);
    const errorMessage = err.response?.data?.message || 'Failed to change password';
    toast.error(errorMessage);
  } finally {
    changingPassword.value = false;
  }
}

onMounted(() => {
  loadProfile();
});
</script> 