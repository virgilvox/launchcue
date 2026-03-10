import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { TASK_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Task } from '../types/models'
import type { TaskCreateRequest, TaskUpdateRequest, TaskFilter } from '../types/api'
import { useAuthStore } from './auth'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  function getRepo() {
    return getContainer().resolve<Repository<Task, TaskCreateRequest, TaskUpdateRequest>>(TASK_REPO)
  }

  const fetchTasks = async (filter: TaskFilter = {}): Promise<Task[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    error.value = null
    try {
      const response = await getRepo().findAll(filter as Record<string, unknown>)
      tasks.value = response || []
      return tasks.value
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks'
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createTask = async (taskData: TaskCreateRequest): Promise<Task> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      const formattedData: TaskCreateRequest = { ...taskData }

      if (!formattedData.checklist) {
        formattedData.checklist = []
      }

      const createdTask = await getRepo().create(formattedData)

      if (createdTask && createdTask.id) {
        tasks.value.push(createdTask)
        getEventBus().emit('task.created', { task: createdTask })
      }
      return createdTask
    } catch (err) {
      throw err
    }
  }

  const updateTask = async (taskData: TaskUpdateRequest): Promise<Task> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    if (!taskData.id) {
      throw new Error('Task ID is required for updates')
    }
    try {
      const formattedData: TaskUpdateRequest = { ...taskData }

      if (!formattedData.checklist) {
        formattedData.checklist = []
      }

      const updatedTask = await getRepo().update(taskData.id, formattedData)

      const index = tasks.value.findIndex(t => t.id === taskData.id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
      getEventBus().emit('task.updated', { task: updatedTask })
      return updatedTask
    } catch (err) {
      throw err
    }
  }

  const deleteTask = async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('Task ID is required for deletion')
    }
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      await getRepo().delete(id)
      tasks.value = tasks.value.filter(t => t.id !== id)
      getEventBus().emit('task.deleted', { id })
    } catch (err) {
      throw err
    }
  }

  const getTaskById = async (taskId: string): Promise<Task | null> => {
    if (!useAuthStore().currentTeam) return null
    const existingTask = tasks.value.find(t => t.id === taskId)
    if (existingTask) {
      return existingTask
    }

    isLoading.value = true
    error.value = null
    try {
      const task = await getRepo().findById(taskId)
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = task
      } else {
        tasks.value.push(task)
      }
      return task
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to fetch task ${taskId}`
      error.value = message
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskById
  }
})
