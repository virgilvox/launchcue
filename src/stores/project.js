import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiService, { PROJECT_ENDPOINT } from '../services/api.service'

export const useProjectStore = defineStore('project', () => {
  // State
  const projects = ref([])
  const isLoading = ref(false)
  
  // Actions
  const fetchProjects = async () => {
    isLoading.value = true
    try {
      const response = await apiService.get(PROJECT_ENDPOINT)
      // Ensure projects.value is always an array to prevent filter errors
      projects.value = Array.isArray(response) ? response : []
      return projects.value
    } catch (error) {
      console.error('Error fetching projects:', error)
      // Ensure projects.value is reset to an empty array on error
      projects.value = [] 
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchClientProjects = async (clientId) => {
    if (!clientId) {
        throw new Error('Client ID is required to fetch client projects.')
    }
    isLoading.value = true
    try {
      const response = await apiService.get(`${PROJECT_ENDPOINT}?clientId=${clientId}`)
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error('Error fetching client projects:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  const getProject = async (id) => {
    if (!id) throw new Error('Project ID is required')
    try {
      const response = await apiService.get(`${PROJECT_ENDPOINT}/${id}`)
      return response
    } catch (error) {
      console.error('Error fetching project:', error)
      throw error
    }
  }
  
  const createProject = async (projectData) => {
    try {
      const createdProject = await apiService.post(PROJECT_ENDPOINT, projectData)
      if (createdProject && createdProject.id) {
        projects.value.push(createdProject)
      }
      return createdProject
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }
  
  const updateProject = async (id, projectData) => {
    if (!id) {
      throw new Error('Project ID is required for updates')
    }
    isLoading.value = true
    try {
      const updatedProject = await apiService.put(`${PROJECT_ENDPOINT}/${id}`, projectData)
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = updatedProject
      }
      return updatedProject
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  const deleteProject = async (id) => {
    if (!id) {
      throw new Error('Project ID is required for deletion')
    }
    isLoading.value = true
    try {
      await apiService.delete(`${PROJECT_ENDPOINT}/${id}`)
      projects.value = projects.value.filter(p => p.id !== id)
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  // Return state and actions
  return {
    projects,
    isLoading,
    fetchProjects,
    fetchClientProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    
    // Add a project directly to the store without an API call
    // Useful when we've fetched a project from another component
    addProject(project) {
      if (!project || !project.id) {
        console.warn('Cannot add invalid project to store');
        return;
      }
      
      // Check if project already exists in store
      const existingIndex = projects.value.findIndex(p => p.id === project.id);
      if (existingIndex !== -1) {
        // Update existing project
        projects.value[existingIndex] = {...projects.value[existingIndex], ...project};
        return projects.value[existingIndex];
      } else {
        // Add new project
        projects.value.push(project);
        return project;
      }
    }
  }
}) 