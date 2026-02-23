<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Recent Activity</h3>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="animate-pulse flex space-x-3">
        <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <!-- Activity list -->
    <ul v-else-if="activities.length > 0" class="space-y-3">
      <li
        v-for="activity in activities"
        :key="activity.id"
        class="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
               cursor-pointer transition-colors duration-150"
        @click="navigateToResource(activity)"
      >
        <!-- Resource type icon -->
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          :class="getResourceIconClass(activity.resourceType)"
        >
          <ClipboardDocumentCheckIcon v-if="activity.resourceType === 'task'" class="w-4 h-4" />
          <FolderIcon v-else-if="activity.resourceType === 'project'" class="w-4 h-4" />
          <UserGroupIcon v-else-if="activity.resourceType === 'client'" class="w-4 h-4" />
          <DocumentTextIcon v-else-if="activity.resourceType === 'note'" class="w-4 h-4" />
          <ChatBubbleLeftIcon v-else class="w-4 h-4" />
        </div>

        <!-- Activity content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800 dark:text-gray-200">
            <span class="font-medium">{{ activity.userName }}</span>
            <span class="text-gray-500 dark:text-gray-400"> commented on </span>
            <span class="font-medium capitalize">{{ activity.resourceType }}</span>
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {{ truncateContent(activity.content) }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {{ formatTime(activity.createdAt) }}
          </p>
        </div>
      </li>
    </ul>

    <!-- Empty state -->
    <div v-else class="text-center py-8">
      <ChatBubbleLeftIcon class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
      <p class="text-sm text-gray-500 dark:text-gray-400">No recent activity yet.</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Comments on tasks, projects, and notes will appear here.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'
import {
  ClipboardDocumentCheckIcon,
  FolderIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/vue/24/outline'
import commentService from '../../services/comment.service'

const router = useRouter()

const activities = ref([])
const isLoading = ref(false)

function getResourceIconClass(resourceType) {
  const classes = {
    task: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
    project: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
    client: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
    note: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  }
  return classes[resourceType] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

function truncateContent(content) {
  if (!content) return ''
  return content.length > 80 ? content.substring(0, 80) + '...' : content
}

function navigateToResource(activity) {
  const routes = {
    task: `/tasks/${activity.resourceId}`,
    project: `/projects/${activity.resourceId}`,
    client: `/clients/${activity.resourceId}`,
    note: '/notes',
  }
  const path = routes[activity.resourceType]
  if (path) {
    router.push(path)
  }
}

async function fetchActivity() {
  isLoading.value = true
  try {
    const data = await commentService.getRecentComments()
    activities.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Failed to fetch activity feed:', error)
    activities.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchActivity()
})
</script>
