import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { PROJECT_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Project } from '../types/models'
import type { ProjectCreateRequest } from '../types/api'
import { useAuthStore } from './auth'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const isLoading = ref<boolean>(false)

  function getRepo() {
    return getContainer().resolve<Repository<Project, ProjectCreateRequest, Partial<ProjectCreateRequest>>>(PROJECT_REPO)
  }

  const fetchProjects = async (): Promise<Project[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getRepo().findAll()
      projects.value = Array.isArray(response) ? response : []
      return projects.value
    } catch (error) {
      projects.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const fetchClientProjects = async (clientId: string): Promise<Project[]> => {
    if (!clientId) {
      throw new Error('Client ID is required to fetch client projects.')
    }
    isLoading.value = true
    try {
      const response = await getRepo().findAll({ clientId })
      return Array.isArray(response) ? response : []
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const getProject = async (id: string): Promise<Project> => {
    if (!id) throw new Error('Project ID is required')
    return getRepo().findById(id)
  }

  const createProject = async (projectData: ProjectCreateRequest): Promise<Project> => {
    try {
      const createdProject = await getRepo().create(projectData)
      if (createdProject && createdProject.id) {
        projects.value.push(createdProject)
        getEventBus().emit('project.created', { project: createdProject })
      }
      return createdProject
    } catch (error) {
      throw error
    }
  }

  const updateProject = async (id: string, projectData: Partial<ProjectCreateRequest>): Promise<Project> => {
    if (!id) {
      throw new Error('Project ID is required for updates')
    }
    isLoading.value = true
    try {
      const updatedProject = await getRepo().update(id, projectData)
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = updatedProject
      }
      getEventBus().emit('project.updated', { project: updatedProject })
      return updatedProject
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const deleteProject = async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('Project ID is required for deletion')
    }
    isLoading.value = true
    try {
      await getRepo().delete(id)
      projects.value = projects.value.filter(p => p.id !== id)
      getEventBus().emit('project.deleted', { id })
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const addProject = (project: Project): Project | undefined => {
    if (!project || !project.id) {
      return
    }

    const existingIndex = projects.value.findIndex(p => p.id === project.id)
    if (existingIndex !== -1) {
      projects.value[existingIndex] = { ...projects.value[existingIndex], ...project }
      return projects.value[existingIndex]
    } else {
      projects.value.push(project)
      return project
    }
  }

  return {
    projects,
    isLoading,
    fetchProjects,
    fetchClientProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    addProject
  }
})
