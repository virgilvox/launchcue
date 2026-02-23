<template>
  <div ref="bellRef" class="relative">
    <!-- Bell Button -->
    <button
      @click="toggleDropdown"
      class="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
      aria-label="Notifications"
    >
      <BellIcon class="h-6 w-6" />
      <!-- Unread badge -->
      <span
        v-if="notificationStore.unreadCount > 0"
        class="absolute top-0.5 right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px]"
      >
        {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
      </span>
    </button>

    <!-- Dropdown Panel -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-96 max-h-[480px] bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50 flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
          <button
            v-if="notificationStore.unreadCount > 0"
            @click="handleMarkAllAsRead"
            class="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            Mark all as read
          </button>
        </div>

        <!-- Notification List -->
        <div class="flex-1 overflow-y-auto">
          <!-- Loading state -->
          <div v-if="notificationStore.isLoading && notificationStore.notifications.length === 0" class="p-4 text-center">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading...</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="notificationStore.notifications.length === 0" class="p-8 text-center">
            <BellSlashIcon class="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p class="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
          </div>

          <!-- Notification items -->
          <div v-else>
            <button
              v-for="notification in notificationStore.notifications"
              :key="notification.id"
              @click="handleNotificationClick(notification)"
              class="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
              :class="{ 'bg-primary-50/50 dark:bg-primary-900/10': !notification.read }"
            >
              <div class="flex items-start gap-3">
                <!-- Type icon -->
                <div class="flex-shrink-0 mt-0.5">
                  <component
                    :is="getTypeIcon(notification.type)"
                    class="h-5 w-5"
                    :class="getTypeIconClass(notification.type)"
                  />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {{ notification.title }}
                    </p>
                    <!-- Unread dot -->
                    <span
                      v-if="!notification.read"
                      class="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500"
                    ></span>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {{ notification.message }}
                  </p>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {{ formatRelativeTime(notification.createdAt) }}
                  </p>
                </div>

                <!-- Delete button -->
                <button
                  @click.stop="handleDelete(notification.id)"
                  class="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                  aria-label="Delete notification"
                >
                  <XMarkIcon class="h-4 w-4" />
                </button>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { useNotificationStore } from '../../stores/notification'
import {
  BellIcon,
  BellSlashIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  UserGroupIcon,
  AtSymbolIcon,
  ChatBubbleLeftIcon
} from '@heroicons/vue/24/outline'
import { formatDistanceToNow } from 'date-fns'

const router = useRouter()
const notificationStore = useNotificationStore()

const isOpen = ref(false)
const bellRef = ref(null)
let pollInterval = null

// Close dropdown when clicking outside
onClickOutside(bellRef, () => {
  isOpen.value = false
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

// Map notification type to icon component
const getTypeIcon = (type) => {
  const iconMap = {
    task_assigned: ClipboardDocumentCheckIcon,
    deadline_approaching: ClockIcon,
    team_invite: UserGroupIcon,
    mention: AtSymbolIcon,
    comment: ChatBubbleLeftIcon
  }
  return iconMap[type] || BellIcon
}

// Map notification type to icon color class
const getTypeIconClass = (type) => {
  const classMap = {
    task_assigned: 'text-blue-500',
    deadline_approaching: 'text-amber-500',
    team_invite: 'text-green-500',
    mention: 'text-purple-500',
    comment: 'text-gray-500'
  }
  return classMap[type] || 'text-gray-400'
}

// Map resourceType to a route name for navigation
const resourceRouteMap = {
  task: 'task-detail',
  project: 'project-detail',
  client: 'client-detail',
  campaign: 'campaign-detail'
}

const handleNotificationClick = async (notification) => {
  // Mark as read
  if (!notification.read) {
    await notificationStore.markAsRead(notification.id)
  }

  // Navigate to resource if applicable
  if (notification.resourceType && notification.resourceId) {
    const routeName = resourceRouteMap[notification.resourceType]
    if (routeName) {
      router.push({ name: routeName, params: { id: notification.resourceId } })
    }
  }

  isOpen.value = false
}

const handleMarkAllAsRead = async () => {
  await notificationStore.markAllAsRead()
}

const handleDelete = async (id) => {
  await notificationStore.deleteNotification(id)
}

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

onMounted(() => {
  notificationStore.fetchNotifications()

  // Poll every 60 seconds
  pollInterval = setInterval(() => {
    notificationStore.fetchNotifications()
  }, 60000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>
