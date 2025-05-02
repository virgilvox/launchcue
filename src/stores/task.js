import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiService from '../services/api.service'
import { TASK_ENDPOINT } from '../services/api.service'

export const useTaskStore = defineStore('task', () => {
  // State
  const tasks = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  
  // Actions
  const fetchTasks = async (filter = {}) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiService.get(TASK_ENDPOINT, filter)
      tasks.value = response || [] // Assuming API returns array directly
      return tasks.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch tasks'
      console.error('Error fetching tasks:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // Note: fetchProjectTasks might be redundant if fetchTasks handles filtering
  // Kept for now if specific logic is needed
  const fetchProjectTasks = async (projectId) => {
    if (!projectId) {
        // Return empty or throw? Throwing might be better for consistency
        throw new Error('Project ID is required to fetch project tasks.')
    }
    isLoading.value = true
    try {
      // Use query parameter for filtering
      const response = await apiService.get(`${TASK_ENDPOINT}?projectId=${projectId}`)
      // This might overwrite the main tasks list if not handled carefully
      // Decide if this should populate `tasks.value` or return directly
      return response || [] 
    } catch (error) {
      console.error('Error fetching project tasks:', error)
      throw error // Re-throw
    } finally {
      isLoading.value = false
    }
  }
  
  const getTask = async (id) => {
    if (!id) throw new Error('Task ID is required')
    // isLoading not typically set for single item fetch unless slow
    try {
      const response = await apiService.get(`${TASK_ENDPOINT}/${id}`)
      return response
    } catch (error) {
      console.error('Error fetching task:', error)
      throw error // Re-throw
    }
  }
  
  const createTask = async (taskData) => {
    // isLoading handled by component via isSavingTask prop usually
    try {
      // Format dueDate correctly for the backend validation
      let formattedData = { ...taskData }
      
      // Convert dueDate to ISO format if it exists and is not already in ISO format
      if (formattedData.dueDate && !formattedData.dueDate.includes('T')) {
        formattedData.dueDate = new Date(formattedData.dueDate).toISOString()
      }
      
      // Initialize checklist if it doesn't exist
      if (!formattedData.checklist) {
        formattedData.checklist = []
      }
      
      // Server should return the created task with its new ID
      const createdTask = await apiService.post(TASK_ENDPOINT, formattedData)
      
      if (createdTask && createdTask.id) {
        tasks.value.push(createdTask) // Add to local state
      }
      return createdTask // Return for component use
    } catch (error) {
      console.error('Error creating task:', error)
      throw error // Re-throw for component handling
    }
  }
  
  const updateTask = async (taskData) => {
    if (!taskData.id) {
      throw new Error('Task ID is required for updates')
    }
    // isLoading handled by component
    try {
      // Format data for backend validation
      let formattedData = { ...taskData }
      
      // Convert dueDate to ISO format if it exists and is not already in ISO format
      if (formattedData.dueDate && !formattedData.dueDate.includes('T')) {
        formattedData.dueDate = new Date(formattedData.dueDate).toISOString()
      }
      
      // Initialize checklist if undefined
      if (!formattedData.checklist) {
        formattedData.checklist = []
      }
      
      const updatedTask = await apiService.put(`${TASK_ENDPOINT}/${taskData.id}`, formattedData)
      
      // Update local task list
      const index = tasks.value.findIndex(t => t.id === taskData.id)
      if (index !== -1) {
        tasks.value[index] = updatedTask // Replace with updated task from server
      }
      return updatedTask
    } catch (error) {
      console.error('Error updating task:', error)
      throw error // Re-throw
    }
  }
  
  const deleteTask = async (id) => {
    if (!id) {
      throw new Error('Task ID is required for deletion')
    }
    // isLoading handled by component
    try {
      await apiService.delete(`${TASK_ENDPOINT}/${id}`)
      
      // Remove from local task list
      tasks.value = tasks.value.filter(t => t.id !== id)
      // No return value needed, success implied if no error thrown
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error // Re-throw
    }
  }
  
  // *** ADDED: Get a single task by ID ***
  const getTaskById = async (taskId) => {
    // 1. Check if task is already in the store
    const existingTask = tasks.value.find(t => t.id === taskId)
    if (existingTask) {
      return existingTask
    }

    // 2. If not found, fetch from API
    isLoading.value = true // Optionally set loading specific to this fetch
    error.value = null
    try {
      const task = await apiService.get(`${TASK_ENDPOINT}/${taskId}`)
      // Optional: Add/update task in the local store if fetched
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = task
      } else {
        tasks.value.push(task) // Or just return without adding
      }
      return task
    } catch (err) {
      error.value = err.message || `Failed to fetch task ${taskId}`
      console.error(`Error fetching task ${taskId}:`, err)
      return null // Return null or throw error on failure
    } finally {
       isLoading.value = false // Reset loading state
    }
  }
  
  // Return state and actions
  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    fetchProjectTasks, // Keep or remove based on actual usage
    getTask,
    createTask,
    updateTask,
    deleteTask,
    getTaskById // Expose the new function
  }
}) 