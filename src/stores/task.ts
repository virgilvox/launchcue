import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiService from '../services/api.service'
import { TASK_ENDPOINT } from '../services/api.service'
import type { Task } from '../types/models'
import type { TaskCreateRequest, TaskUpdateRequest, TaskFilter } from '../types/api'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const fetchTasks = async (filter: TaskFilter = {}): Promise<Task[]> => {
    isLoading.value = true
    error.value = null
    try {
      const response: Task[] = await apiService.get(TASK_ENDPOINT, filter)
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
    try {
      const formattedData: TaskCreateRequest = { ...taskData }

      if (formattedData.dueDate && !formattedData.dueDate.includes('T')) {
        formattedData.dueDate = new Date(formattedData.dueDate).toISOString()
      }

      if (!formattedData.checklist) {
        formattedData.checklist = []
      }

      const createdTask: Task = await apiService.post(TASK_ENDPOINT, formattedData)

      if (createdTask && createdTask.id) {
        tasks.value.push(createdTask)
      }
      return createdTask
    } catch (err) {
      throw err
    }
  }

  const updateTask = async (taskData: TaskUpdateRequest): Promise<Task> => {
    if (!taskData.id) {
      throw new Error('Task ID is required for updates')
    }
    try {
      const formattedData: TaskUpdateRequest = { ...taskData }

      if (formattedData.dueDate && !formattedData.dueDate.includes('T')) {
        formattedData.dueDate = new Date(formattedData.dueDate).toISOString()
      }

      if (!formattedData.checklist) {
        formattedData.checklist = []
      }

      const updatedTask: Task = await apiService.put(`${TASK_ENDPOINT}/${taskData.id}`, formattedData)

      const index = tasks.value.findIndex(t => t.id === taskData.id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
      return updatedTask
    } catch (err) {
      throw err
    }
  }

  const deleteTask = async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('Task ID is required for deletion')
    }
    try {
      await apiService.delete(`${TASK_ENDPOINT}/${id}`)
      tasks.value = tasks.value.filter(t => t.id !== id)
    } catch (err) {
      throw err
    }
  }

  const getTaskById = async (taskId: string): Promise<Task | null> => {
    const existingTask = tasks.value.find(t => t.id === taskId)
    if (existingTask) {
      return existingTask
    }

    isLoading.value = true
    error.value = null
    try {
      const task: Task = await apiService.get(`${TASK_ENDPOINT}/${taskId}`)
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
