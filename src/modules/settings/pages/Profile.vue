<template>
  <PageContainer>
    <PageHeader title="Profile">
      <template #actions>
        <button @click="saveProfile" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </template>
    </PageHeader>

    <!-- Profile Form -->
    <div class="card p-6 mb-6">
      <div v-if="loading" class="text-center py-4">
        <LoadingSpinner text="Loading profile..." />
      </div>

      <div v-else-if="error" class="text-center py-4">
        <p class="text-[var(--danger)]">{{ error }}</p>
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
              <p class="text-xs text-[var(--text-secondary)] mt-1">Email address cannot be changed</p>
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
                <div class="w-16 h-16 bg-[var(--accent-primary-wash)] flex items-center justify-center text-[var(--accent-primary)] text-xl font-bold overflow-hidden border-2 border-[var(--border)]">
                  <img v-if="avatarPreview || profileForm.avatarUrl" :src="avatarPreview || profileForm.avatarUrl" alt="Profile" class="w-full h-full object-cover" />
                  <span v-else>{{ getUserInitials(profileForm.name) }}</span>
                </div>
                <div class="flex flex-col gap-2">
                  <button
                    type="button"
                    class="btn btn-secondary"
                    :disabled="uploading"
                    @click="triggerFileInput"
                  >
                    {{ uploading ? 'Uploading...' : 'Upload Image' }}
                  </button>
                  <button
                    v-if="profileForm.avatarUrl"
                    type="button"
                    class="text-xs text-[var(--danger)] hover:underline text-left"
                    :disabled="uploading"
                    @click="removeAvatar"
                  >
                    Remove photo
                  </button>
                  <p class="text-xs text-[var(--text-secondary)]">JPG, PNG or WebP. Max 2MB.</p>
                </div>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="handleFileSelect"
                />
              </div>
              <p v-if="uploadError" class="text-xs text-[var(--danger)] mt-2">{{ uploadError }}</p>
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
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Change Password</h3>

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
          <p class="text-sm text-[var(--text-secondary)] mb-2">Password requirements:</p>
          <ul class="text-xs text-[var(--text-secondary)] list-disc pl-5 space-y-1">
            <li>At least 8 characters long</li>
            <li>Contains at least one uppercase letter</li>
            <li>Contains at least one lowercase letter</li>
            <li>Contains at least one number</li>
          </ul>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/auth';
import { getContainer } from '@/core/service-container';
import { AUTH_ADAPTER } from '@/adapters/repository-keys';
import { getSupabase } from '@/adapters/supabase/client';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const toast = useToast();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref(null);
const saving = ref(false);
const changingPassword = ref(false);
const uploading = ref(false);
const uploadError = ref(null);
const avatarPreview = ref(null);
const fileInput = ref(null);

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

function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Reset previous errors
  uploadError.value = null;

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    uploadError.value = 'Invalid file type. Please upload a JPG, PNG, or WebP image.';
    resetFileInput();
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    uploadError.value = `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 2MB.`;
    resetFileInput();
    return;
  }

  // Show local preview immediately
  avatarPreview.value = URL.createObjectURL(file);

  await uploadAvatar(file);
}

async function uploadAvatar(file) {
  uploading.value = true;
  uploadError.value = null;

  try {
    const sb = getSupabase();

    // Get the auth user ID (needed for storage path)
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session) throw new Error('Not authenticated');
    const authUserId = sessionData.session.user.id;

    // Build a clean filename: {timestamp}.{ext}
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${authUserId}/${fileName}`;

    // Upload to Supabase Storage (upsert to overwrite previous)
    const { error: uploadErr } = await sb.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadErr) throw new Error(uploadErr.message);

    // Get the public URL
    const { data: urlData } = sb.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update profile with the new avatar URL
    const auth = getContainer().resolve(AUTH_ADAPTER);
    const updatedUser = await auth.updateProfile({
      ...profileForm.value,
      avatarUrl: publicUrl,
    });

    profileForm.value.avatarUrl = publicUrl;
    avatarPreview.value = null; // Clear preview, use actual URL now
    authStore.updateUserState(updatedUser);

    toast.success('Profile picture updated');
  } catch (err) {
    uploadError.value = `Upload failed: ${err.message}`;
    avatarPreview.value = null; // Revert preview on failure
    toast.error('Failed to upload profile picture');
  } finally {
    uploading.value = false;
    resetFileInput();
  }
}

async function removeAvatar() {
  uploading.value = true;
  uploadError.value = null;

  try {
    const auth = getContainer().resolve(AUTH_ADAPTER);
    const updatedUser = await auth.updateProfile({
      ...profileForm.value,
      avatarUrl: null,
    });

    profileForm.value.avatarUrl = '';
    avatarPreview.value = null;
    authStore.updateUserState(updatedUser);

    toast.success('Profile picture removed');
  } catch (err) {
    toast.error('Failed to remove profile picture');
  } finally {
    uploading.value = false;
  }
}

function resetFileInput() {
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

async function loadProfile() {
  loading.value = true;
  error.value = null;

  try {
    const auth = getContainer().resolve(AUTH_ADAPTER);
    const profileData = await auth.getProfile();

    profileForm.value = {
      name: profileData.name || '',
      email: profileData.email || '',
      jobTitle: profileData.jobTitle || '',
      bio: profileData.bio || '',
      avatarUrl: profileData.avatarUrl || ''
    };
  } catch (err) {
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
    const auth = getContainer().resolve(AUTH_ADAPTER);
    const updatedUser = await auth.updateProfile(profileForm.value);

    authStore.updateUserState(updatedUser);

    toast.success('Profile updated successfully');
  } catch (err) {
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
    const auth = getContainer().resolve(AUTH_ADAPTER);
    await auth.changePassword({
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
