import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiService from '../services/api.service'
import { TASK_ENDPOINT } from '../services/api.service'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const fetchTasks = async (filter = {}) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiService.get(TASK_ENDPOINT, filter)
      tasks.value = response || []
      return tasks.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch tasks'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createTask = async (taskData) => {
    try {
      let formattedData = { ...taskData }

      if (formattedData.dueDate && !formattedData.dueDate.includes('T')) {
        formattedData.dueDate = new Date(formattedData.dueDate).toISOString()
      }

      if (!formattedData.checklist) {
        formattedData.checklist = []
      }

      const createdTask = await apiService.post(TASK_ENDPOINT, formattedData)

      if (createdTask && createdTask.id) {
        tasks.value.push(createdTask)
      }
      return createdTask
    } catch (err) {
      throw err
    }
  }

  const updateTask = async (taskData) => {
    if (!taskData.id) {
      throw new Error('Task ID is required for updates')
    }
    try {
      let formattedData = { ...taskData }

      if (formattedData.dueDate && !formattedData.dueDate.includes('T')) {
        formattedData.dueDate = new Date(formattedData.dueDate).toISOString()
      }

      if (!formattedData.checklist) {
        formattedData.checklist = []
      }

      const updatedTask = await apiService.put(`${TASK_ENDPOINT}/${taskData.id}`, formattedData)

      const index = tasks.value.findIndex(t => t.id === taskData.id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
      return updatedTask
    } catch (err) {
      throw err
    }
  }

  const deleteTask = async (id) => {
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

  const getTaskById = async (taskId) => {
    const existingTask = tasks.value.find(t => t.id === taskId)
    if (existingTask) {
      return existingTask
    }

    isLoading.value = true
    error.value = null
    try {
      const task = await apiService.get(`${TASK_ENDPOINT}/${taskId}`)
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = task
      } else {
        tasks.value.push(task)
      }
      return task
    } catch (err) {
      error.value = err.message || `Failed to fetch task ${taskId}`
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
