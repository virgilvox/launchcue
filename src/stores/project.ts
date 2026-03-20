import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { PROJECT_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Project } from '../types/models'
import type { ProjectCreateRequest } from '../types/api'
import { useAuthStore } from './auth'
import { useLoadingCounter } from '@/composables/useLoadingCounter'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const { isLoading, wrap } = useLoadingCounter()

  function getRepo() {
    return getContainer().resolve<Repository<Project, ProjectCreateRequest, Partial<ProjectCreateRequest>>>(PROJECT_REPO)
  }

  const fetchProjects = async (): Promise<Project[]> => {
    if (!useAuthStore().currentTeam) return []
    return wrap(async () => {
      try {
        const response = await getRepo().findAll()
        projects.value = Array.isArray(response) ? response : []
        return projects.value
      } catch (error) {
        projects.value = []
        throw error
      }
    })
  }

  const fetchClientProjects = async (clientId: string): Promise<Project[]> => {
    if (!clientId) {
      throw new Error('Client ID is required to fetch client projects.')
    }
    if (!useAuthStore().currentTeam) return []
    return wrap(async () => {
      const response = await getRepo().findAll({ clientId })
      return Array.isArray(response) ? response : []
    })
  }

  const getProject = async (id: string): Promise<Project> => {
    if (!id) throw new Error('Project ID is required')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    return getRepo().findById(id)
  }

  const createProject = async (projectData: ProjectCreateRequest): Promise<Project> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const createdProject = await getRepo().create(projectData)
    if (createdProject && createdProject.id) {
      projects.value.push(createdProject)
      getEventBus().emit('project.created', { project: createdProject })
    }
    return createdProject
  }

  const updateProject = async (id: string, projectData: Partial<ProjectCreateRequest>): Promise<Project> => {
    if (!id) {
      throw new Error('Project ID is required for updates')
    }
    return wrap(async () => {
      const updatedProject = await getRepo().update(id, projectData)
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = updatedProject
      }
      getEventBus().emit('project.updated', { project: updatedProject })
      return updatedProject
    })
  }

  const deleteProject = async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('Project ID is required for deletion')
    }
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    return wrap(async () => {
      await getRepo().delete(id)
      projects.value = projects.value.filter(p => p.id !== id)
      getEventBus().emit('project.deleted', { id })
    })
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
