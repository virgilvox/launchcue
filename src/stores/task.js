import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiService from '../services/api.service'
import { TASK_ENDPOINT } from '../services/api.service'

export const useTaskStore = defineStore('task', () => {
  // State
  const tasks = ref([])
  const isLoading = ref(false)
  
  // Actions
  const fetchTasks = async () => {
    isLoading.value = true
    try {
      const response = await apiService.get(TASK_ENDPOINT) // Use the constant from api.service.js
      tasks.value = response || [] // Assuming API returns array directly
      return tasks.value
    } catch (error) {
      console.error('Error fetching tasks:', error)
      // Throw the error so the component can catch it
      throw error; 
    } finally {
      isLoading.value = false
    }
  }
  
  // Note: fetchProjectTasks might be redundant if fetchTasks handles filtering
  // Kept for now if specific logic is needed
  const fetchProjectTasks = async (projectId) => {
    if (!projectId) {
        // Return empty or throw? Throwing might be better for consistency
        throw new Error('Project ID is required to fetch project tasks.');
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
    if (!id) throw new Error('Task ID is required');
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
      let formattedData = { ...taskData };
      
      // Convert dueDate to ISO format if it exists and is not already in ISO format
      if (formattedData.dueDate && !formattedData.dueDate.includes('T')) {
        formattedData.dueDate = new Date(formattedData.dueDate).toISOString();
      }
      
      // Initialize checklist if it doesn't exist
      if (!formattedData.checklist) {
        formattedData.checklist = [];
      }
      
      // Server should return the created task with its new ID
      const createdTask = await apiService.post(TASK_ENDPOINT, formattedData);
      
      if (createdTask && createdTask.id) {
        tasks.value.push(createdTask); // Add to local state
      }
      return createdTask; // Return for component use
    } catch (error) {
      console.error('Error creating task:', error);
      throw error; // Re-throw for component handling
    }
  }
  
  const updateTask = async (taskData) => {
    if (!taskData.id) {
      throw new Error('Task ID is required for updates');
    }
    // isLoading handled by component
    try {
      // Format data for backend validation
      let formattedData = { ...taskData };
      
      // Convert dueDate to ISO format if it exists and is not already in ISO format
      if (formattedData.dueDate && !formattedData.dueDate.includes('T')) {
        formattedData.dueDate = new Date(formattedData.dueDate).toISOString();
      }
      
      // Initialize checklist if undefined
      if (!formattedData.checklist) {
        formattedData.checklist = [];
      }
      
      const updatedTask = await apiService.put(`${TASK_ENDPOINT}/${taskData.id}`, formattedData);
      
      // Update local task list
      const index = tasks.value.findIndex(t => t.id === taskData.id);
      if (index !== -1) {
        tasks.value[index] = updatedTask; // Replace with updated task from server
      }
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error; // Re-throw
    }
  }
  
  const deleteTask = async (id) => {
    if (!id) {
      throw new Error('Task ID is required for deletion');
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
  
  // Return state and actions
  return {
    tasks,
    isLoading,
    fetchTasks,
    fetchProjectTasks, // Keep or remove based on actual usage
    getTask,
    createTask,
    updateTask,
    deleteTask
  }
}) 