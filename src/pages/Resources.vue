<template>
  <PageContainer>
    <PageHeader title="Resources">
      <template #actions>
        <button class="btn btn-primary" @click="openResourceDialog()">
          Add Resource
        </button>
      </template>
    </PageHeader>

    <!-- Search/Filter Input -->
    <div class="mb-4">
      <input
        v-model="filterText"
        type="text"
        placeholder="Search resources..."
        class="input"
      />
    </div>

    <!-- Category Filter Tabs -->
    <div class="mb-6 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
      <button
        v-for="tab in categoryTabs"
        :key="tab.value"
        @click="activeCategory = tab.value"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors -mb-px',
          activeCategory === tab.value
            ? 'border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--surface-elevated)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
        ]"
      >
        {{ tab.label }}
        <span
          v-if="getCategoryCount(tab.value) > 0"
          class="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs bg-[var(--surface)] text-[var(--text-secondary)]"
        >
          {{ getCategoryCount(tab.value) }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="resourceStore.isLoading" class="flex justify-center py-12">
      <LoadingSpinner text="Loading resources..." />
    </div>

    <!-- Error State -->
    <div v-else-if="resourceStore.error" class="p-6 text-center bg-[var(--danger)]/10">
      <p class="text-[var(--danger)]">{{ resourceStore.error }}</p>
      <button class="btn btn-primary mt-4" @click="resourceStore.fetchResources()">
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!resourceStore.resources.length"
      :icon="BookOpenIcon"
      title="No resources yet"
      description="Add resources like links, documents, or references for your team."
      actionLabel="Add Your First Resource"
      @action="openResourceDialog()"
    />

    <!-- No results for filter -->
    <div v-else-if="sortedResources.length === 0" class="p-12 text-center bg-[var(--surface)]">
      <p class="text-[var(--text-secondary)]">No resources match your search or filter criteria.</p>
      <button
        @click="filterText = ''; activeCategory = 'All'"
        class="text-[var(--accent-primary)] hover:underline mt-2"
      >
        Clear Filters
      </button>
    </div>

    <!-- Resource Grid -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="resource in sortedResources"
        :key="resource.id"
        class="p-4 bg-[var(--surface-elevated)] border-2 border-[var(--border-light)]"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <!-- Type Icon / Favicon -->
            <div class="flex-shrink-0 mt-0.5">
              <img
                v-if="resource.url && getUrlDomain(resource.url)"
                :src="`https://www.google.com/s2/favicons?domain=${getUrlDomain(resource.url)}&sz=32`"
                :alt="resource.name"
                class="w-6 h-6 rounded"
                @error="$event.target.style.display='none'; $event.target.nextElementSibling.style.display='flex'"
              />
              <div
                :class="[
                  'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                  resourceTypeColor(resource.type)
                ]"
                :style="resource.url && getUrlDomain(resource.url) ? 'display:none' : ''"
              >
                {{ resourceTypeIcon(resource.type) }}
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold text-[var(--text-primary)] truncate">{{ resource.name }}</h3>
              <p v-if="resource.description" class="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">
                {{ resource.description }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1 flex-shrink-0">
            <!-- Favorite button -->
            <button
              @click="toggleFavorite(resource.id)"
              :title="isFavorite(resource.id) ? 'Remove from favorites' : 'Add to favorites'"
              class="p-1 transition-colors hover:bg-[var(--surface)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                :class="isFavorite(resource.id) ? 'text-[var(--warning)] fill-[var(--warning)]' : 'text-[var(--text-secondary)]'"
                :fill="isFavorite(resource.id) ? 'currentColor' : 'none'"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            <!-- Edit -->
            <button
              @click="openResourceDialog(resource)"
              class="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--surface)] transition-colors"
              title="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <!-- Delete -->
            <button
              @click="deleteResource(resource)"
              class="p-1 text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--surface)] transition-colors"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <!-- URL -->
        <div v-if="resource.url" class="flex items-center mt-3">
          <a
            :href="resource.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-[var(--accent-primary)] hover:underline truncate max-w-full"
            :title="resource.url"
          >
            {{ truncateUrl(resource.url) }}
          </a>
        </div>

        <!-- Type badge + Tags -->
        <div class="flex flex-wrap items-center gap-2 mt-3">
          <span
            v-if="resource.type"
            :class="['badge', resourceTypeBadge(resource.type)]"
          >
            {{ resource.type }}
          </span>
          <span
            v-for="tag in (resource.tags || [])"
            :key="tag"
            class="badge badge-gray"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- Resource Dialog -->
    <ResourceDialog
      v-if="showDialog"
      v-model:show="showDialog"
      :resource="editResource"
      @save="saveResource"
    />
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, computed, defineAsyncComponent } from 'vue';
import { useResourceStore } from '@/stores/resource';
import { useToast } from 'vue-toastification';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { BookOpenIcon } from '@heroicons/vue/24/outline';

// Import ResourceDialog using defineAsyncComponent for better error handling
const ResourceDialog = defineAsyncComponent({
  loader: () => import('@/components/resource/ResourceDialog.vue'),
  errorComponent: {
    template: '<div class="p-4 bg-[var(--surface)] text-[var(--danger)] border-2 border-[var(--danger)]">Failed to load resource dialog component</div>'
  },
  onError(error, retry, fail) {
    fail();
  }
});

const toast = useToast();
const resourceStore = useResourceStore();
const showDialog = ref(false);
const editResource = ref(null);
const filterText = ref('');
const activeCategory = ref('All');

// Category tabs
const categoryTabs = [
  { label: 'All', value: 'All' },
  { label: 'Docs', value: 'Docs' },
  { label: 'Tools', value: 'Tools' },
  { label: 'Repos', value: 'Repos' },
  { label: 'Designs', value: 'Designs' },
  { label: 'Other', value: 'Other' }
];

// Category mapping: map existing resource types to tab categories
const categoryMap = {
  'Documentation': 'Docs',
  'Docs': 'Docs',
  'Tutorial': 'Docs',
  'Article': 'Docs',
  'Book': 'Docs',
  'Course': 'Docs',
  'Reference': 'Docs',
  'Tool': 'Tools',
  'Tools': 'Tools',
  'API': 'Tools',
  'Repository': 'Repos',
  'Repos': 'Repos',
  'Template': 'Repos',
  'Designs': 'Designs',
  'Video': 'Other',
  'Podcast': 'Other',
  'Other': 'Other'
};

// Favorites stored in localStorage
const FAVORITES_KEY = 'launchcue_resource_favorites';
const favorites = ref(loadFavorites());

function loadFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value));
}

function isFavorite(resourceId) {
  return favorites.value.includes(resourceId);
}

function toggleFavorite(resourceId) {
  const idx = favorites.value.indexOf(resourceId);
  if (idx >= 0) {
    favorites.value.splice(idx, 1);
  } else {
    favorites.value.push(resourceId);
  }
  saveFavorites();
}

// Get the tab category for a resource type
function getResourceCategory(type) {
  if (!type) return 'Other';
  return categoryMap[type] || 'Other';
}

// Count resources per category (based on search-filtered results)
function getCategoryCount(tabValue) {
  if (tabValue === 'All') return searchFilteredResources.value.length;
  return searchFilteredResources.value.filter(r => getResourceCategory(r.type) === tabValue).length;
}

// Load resources on component mount
onMounted(async () => {
  try {
    await resourceStore.fetchResources();
  } catch (error) {
    // silently handled
  }
});

// Step 1: Filter by search text
const searchFilteredResources = computed(() => {
  const searchTerm = filterText.value.toLowerCase();
  if (!searchTerm) return resourceStore.resources;
  return resourceStore.resources.filter(resource =>
    resource.name.toLowerCase().includes(searchTerm) ||
    resource.description?.toLowerCase().includes(searchTerm) ||
    resource.type?.toLowerCase().includes(searchTerm) ||
    resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  );
});

// Step 2: Filter by active category tab
const categoryFilteredResources = computed(() => {
  if (activeCategory.value === 'All') return searchFilteredResources.value;
  return searchFilteredResources.value.filter(r => getResourceCategory(r.type) === activeCategory.value);
});

// Step 3: Sort favorites first
const sortedResources = computed(() => {
  return [...categoryFilteredResources.value].sort((a, b) => {
    const aFav = isFavorite(a.id) ? 0 : 1;
    const bFav = isFavorite(b.id) ? 0 : 1;
    return aFav - bFav;
  });
});

// URL helpers
function getUrlDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function truncateUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    const display = parsed.hostname + path;
    return display.length > 50 ? display.substring(0, 47) + '...' : display;
  } catch {
    return url.length > 50 ? url.substring(0, 47) + '...' : url;
  }
}

// Resource type display helpers
function resourceTypeIcon(type) {
  const cat = getResourceCategory(type);
  switch (cat) {
    case 'Docs': return 'D';
    case 'Tools': return 'T';
    case 'Repos': return 'R';
    case 'Designs': return 'P';
    default: return 'O';
  }
}

function resourceTypeColor(type) {
  const cat = getResourceCategory(type);
  switch (cat) {
    case 'Docs': return 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]';
    case 'Tools': return 'bg-[var(--success)]/10 text-[var(--success)]';
    case 'Repos': return 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]';
    case 'Designs': return 'bg-[var(--accent-hot)]/10 text-[var(--accent-hot)]';
    default: return 'bg-[var(--surface)] text-[var(--text-secondary)]';
  }
}

function resourceTypeBadge(type) {
  const cat = getResourceCategory(type);
  switch (cat) {
    case 'Docs': return 'badge-blue';
    case 'Tools': return 'badge-green';
    case 'Repos': return 'badge-purple';
    case 'Designs': return 'badge-red';
    default: return 'badge-gray';
  }
}

// Handle opening the dialog for creating or editing
function openResourceDialog(resource = null) {
  editResource.value = resource;
  showDialog.value = true;
}

// Handle saving a resource (create or update)
async function saveResource(resourceData) {
  try {
    if (resourceData.id) {
      // Update existing resource
      await resourceStore.updateResource(resourceData.id, resourceData);
      toast.success('Resource updated successfully');
    } else {
      // Create new resource
      await resourceStore.createResource(resourceData);
      toast.success('Resource created successfully');
    }

    showDialog.value = false;
    editResource.value = null;
  } catch (error) {
    toast.error(`Failed to save resource: ${error.message}`);
  }
}

// Handle deleting a resource
async function deleteResource(resource) {
  if (!confirm(`Are you sure you want to delete "${resource.name}"?`)) {
    return;
  }

  try {
    await resourceStore.deleteResource(resource.id);
    // Also remove from favorites if present
    const favIdx = favorites.value.indexOf(resource.id);
    if (favIdx >= 0) {
      favorites.value.splice(favIdx, 1);
      saveFavorites();
    }
    toast.success('Resource deleted successfully');
  } catch (error) {
    toast.error(`Failed to delete resource: ${error.message}`);
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
