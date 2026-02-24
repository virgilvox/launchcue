<template>
  <section id="webhooks" class="card">
    <h3 class="text-lg font-semibold mb-4">Webhooks</h3>
    <p class="text-sm text-[var(--text-secondary)] mb-4">
      Configure webhook endpoints to receive real-time notifications when events occur in your workspace.
    </p>

    <!-- Existing Webhooks -->
    <div v-if="loadingWebhooks" class="text-center py-4">
      <LoadingSpinner size="small" text="Loading webhooks..." />
    </div>
    <div v-else-if="webhooks.length === 0" class="text-center py-6 border border-[var(--border-light)]">
      <p class="text-[var(--text-secondary)]">No webhooks configured yet.</p>
    </div>
    <ul v-else class="space-y-4 mb-6 border border-[var(--border-light)] p-4">
      <li v-for="webhook in webhooks" :key="webhook.id" class="flex items-start justify-between group">
        <div class="flex-1 mr-4">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-medium text-[var(--text-primary)] font-mono text-sm break-all">{{ webhook.url }}</p>
            <span
              :class="webhook.active ? 'badge badge-green' : 'badge'"
              class="text-xs font-medium flex-shrink-0"
            >
              {{ webhook.active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <p class="text-xs text-[var(--text-secondary)] mt-1">
            Events: <span class="font-medium">{{ webhook.events.join(', ') }}</span>
          </p>
          <div class="flex items-center gap-2 mt-1">
            <p class="text-xs text-[var(--text-secondary)]">
              Secret: <span class="font-mono">{{ webhook.secretMask || '********' }}</span>
            </p>
          </div>
          <p class="text-xs text-[var(--text-secondary)] mt-1">Created: {{ formatDate(webhook.createdAt) || 'N/A' }}</p>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            @click="openEditModal(webhook)"
            class="btn-icon text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
            title="Edit Webhook"
          >
            <PencilSquareIcon class="h-4 w-4" />
          </button>
          <button
            @click="confirmDeleteWebhook(webhook)"
            class="btn-icon text-[var(--text-secondary)] hover:text-[var(--danger)]"
            title="Delete Webhook"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </li>
    </ul>

    <!-- Create New Webhook -->
    <div class="border-t border-[var(--border-light)] pt-6 mt-6">
      <h4 class="text-md font-semibold mb-3 text-[var(--text-primary)]">Add New Webhook</h4>

      <div class="space-y-4">
        <!-- URL Input -->
        <div>
          <label for="webhookUrl" class="label text-xs">Endpoint URL *</label>
          <input
            id="webhookUrl"
            v-model="newWebhook.url"
            type="url"
            class="input text-sm"
            placeholder="https://example.com/webhook"
            :disabled="isCreating"
            required
          />
        </div>

        <!-- Events Selection -->
        <div>
          <label class="label text-xs mb-2">Events *</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
            <div v-for="evt in availableEvents" :key="evt" class="flex items-center">
              <input
                :id="`event-${evt}`"
                type="checkbox"
                :value="evt"
                v-model="newWebhook.events"
                class="form-checkbox"
              />
              <label
                :for="`event-${evt}`"
                class="ml-2 text-xs text-[var(--text-primary)] cursor-pointer"
              >
                {{ evt }}
              </label>
            </div>
          </div>
        </div>

        <!-- Active Toggle -->
        <div class="flex items-center gap-2">
          <input
            id="webhookActive"
            type="checkbox"
            v-model="newWebhook.active"
            class="form-checkbox"
          />
          <label for="webhookActive" class="text-sm text-[var(--text-primary)] cursor-pointer">Active</label>
        </div>

        <button
          @click="createWebhook"
          class="btn btn-secondary"
          :disabled="isCreating || !newWebhook.url.trim() || newWebhook.events.length === 0"
        >
          {{ isCreating ? 'Creating...' : 'Create Webhook' }}
        </button>
      </div>
    </div>

    <!-- Display Newly Created Webhook Secret -->
    <div v-if="newlyCreatedSecret" class="mt-6 p-4 border-2 border-[var(--success)] bg-[var(--success)]/10">
      <p class="text-sm font-semibold text-[var(--success)] mb-2">Webhook Secret (Copy & Save Now!):</p>
      <div class="flex items-center bg-[var(--surface-elevated)] p-2 border border-[var(--border-light)]">
        <input
          type="text"
          :value="newlyCreatedSecret"
          readonly
          class="input text-sm font-mono flex-grow break-all bg-transparent border-none p-0"
        />
        <button @click="copySecret" class="btn-icon text-[var(--text-secondary)] hover:text-[var(--accent-primary)] ml-2 flex-shrink-0" title="Copy Secret">
          <ClipboardDocumentIcon class="h-5 w-5" />
        </button>
      </div>
      <p class="text-xs text-[var(--success)] mt-2">This secret will not be shown again. Use it to verify webhook signatures.</p>
    </div>

    <!-- Edit Modal -->
    <Modal v-model="showEditModal" title="Edit Webhook">
      <div v-if="editingWebhook" class="space-y-4">
        <div>
          <label for="editWebhookUrl" class="label text-xs">Endpoint URL *</label>
          <input
            id="editWebhookUrl"
            v-model="editingWebhook.url"
            type="url"
            class="input text-sm"
            placeholder="https://example.com/webhook"
          />
        </div>

        <div>
          <label class="label text-xs mb-2">Events *</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            <div v-for="evt in availableEvents" :key="evt" class="flex items-center">
              <input
                :id="`edit-event-${evt}`"
                type="checkbox"
                :value="evt"
                v-model="editingWebhook.events"
                class="form-checkbox"
              />
              <label
                :for="`edit-event-${evt}`"
                class="ml-2 text-xs text-[var(--text-primary)] cursor-pointer"
              >
                {{ evt }}
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="editWebhookActive"
            type="checkbox"
            v-model="editingWebhook.active"
            class="form-checkbox"
          />
          <label for="editWebhookActive" class="text-sm text-[var(--text-primary)] cursor-pointer">Active</label>
        </div>

        <div class="form-actions">
          <button type="button" @click="showEditModal = false" class="btn btn-outline">Cancel</button>
          <button
            type="button"
            @click="updateWebhook"
            class="btn btn-primary"
            :disabled="isUpdating || !editingWebhook.url.trim() || editingWebhook.events.length === 0"
          >
            {{ isUpdating ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteModal" title="Confirm Delete Webhook">
      <div v-if="webhookToDelete" class="space-y-4">
        <p class="text-[var(--text-primary)]">Are you sure you want to delete the webhook for:</p>
        <p class="font-mono text-sm text-[var(--text-primary)] break-all">{{ webhookToDelete.url }}</p>
        <p class="text-sm text-[var(--danger)]">This action cannot be undone.</p>
        <div class="form-actions">
          <button type="button" @click="showDeleteModal = false" class="btn btn-outline">Cancel</button>
          <button
            type="button"
            @click="deleteWebhook"
            class="btn btn-danger"
            :disabled="isDeleting"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete Webhook' }}
          </button>
        </div>
      </div>
    </Modal>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import webhookService from '../../services/webhook.service';
import { useToast } from 'vue-toastification';
import { formatDate } from '@/utils/dateFormatter';
import Modal from '../Modal.vue';
import LoadingSpinner from '../LoadingSpinner.vue';
import { TrashIcon, PencilSquareIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline';

const toast = useToast();

const webhooks = ref([]);
const loadingWebhooks = ref(false);
const isCreating = ref(false);
const isUpdating = ref(false);
const isDeleting = ref(false);
const newlyCreatedSecret = ref(null);

const showEditModal = ref(false);
const editingWebhook = ref(null);
const showDeleteModal = ref(false);
const webhookToDelete = ref(null);

const availableEvents = [
  'task.created', 'task.updated', 'task.deleted',
  'project.created', 'project.updated', 'project.deleted',
  'client.created', 'client.updated', 'client.deleted',
  'campaign.created', 'campaign.updated',
];

const newWebhook = ref({
  url: '',
  events: [],
  active: true,
});

async function loadWebhooks() {
  loadingWebhooks.value = true;
  try {
    webhooks.value = await webhookService.getWebhooks();
  } catch (error) {
    toast.error('Failed to load webhooks.');
  } finally {
    loadingWebhooks.value = false;
  }
}

async function createWebhook() {
  if (!newWebhook.value.url.trim()) {
    toast.warning('Please enter a webhook URL.');
    return;
  }
  if (newWebhook.value.events.length === 0) {
    toast.warning('Please select at least one event.');
    return;
  }

  isCreating.value = true;
  newlyCreatedSecret.value = null;
  try {
    const result = await webhookService.createWebhook({
      url: newWebhook.value.url.trim(),
      events: newWebhook.value.events,
      active: newWebhook.value.active,
    });

    if (result && result.secret) {
      newlyCreatedSecret.value = result.secret;
    }

    toast.success('Webhook created successfully!');
    newWebhook.value = { url: '', events: [], active: true };
    await loadWebhooks();
  } catch (error) {
    toast.error(`Failed to create webhook: ${error.message || 'Unknown error'}`);
  } finally {
    isCreating.value = false;
  }
}

function openEditModal(webhook) {
  editingWebhook.value = {
    id: webhook.id,
    url: webhook.url,
    events: [...webhook.events],
    active: webhook.active,
  };
  showEditModal.value = true;
}

async function updateWebhook() {
  if (!editingWebhook.value) return;

  isUpdating.value = true;
  try {
    await webhookService.updateWebhook(editingWebhook.value.id, {
      url: editingWebhook.value.url,
      events: editingWebhook.value.events,
      active: editingWebhook.value.active,
    });
    toast.success('Webhook updated successfully!');
    showEditModal.value = false;
    editingWebhook.value = null;
    await loadWebhooks();
  } catch (error) {
    toast.error(`Failed to update webhook: ${error.message || 'Unknown error'}`);
  } finally {
    isUpdating.value = false;
  }
}

function confirmDeleteWebhook(webhook) {
  webhookToDelete.value = webhook;
  showDeleteModal.value = true;
}

async function deleteWebhook() {
  if (!webhookToDelete.value) return;

  isDeleting.value = true;
  try {
    await webhookService.deleteWebhook(webhookToDelete.value.id);
    toast.success('Webhook deleted.');
    showDeleteModal.value = false;
    webhookToDelete.value = null;
    await loadWebhooks();
  } catch (error) {
    toast.error(`Failed to delete webhook: ${error.message || 'Unknown error'}`);
  } finally {
    isDeleting.value = false;
  }
}

async function copySecret() {
  if (!newlyCreatedSecret.value) return;
  try {
    await navigator.clipboard.writeText(newlyCreatedSecret.value);
    toast.success('Webhook secret copied!');
  } catch (error) {
    toast.error('Could not copy secret to clipboard.');
  }
}

onMounted(() => {
  loadWebhooks();
});
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
