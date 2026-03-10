import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { SCOPE_REPO, SCOPE_TEMPLATE_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { ScopeTemplate, Scope } from '../types/models'
import type { ScopeTemplateCreateRequest, ScopeCreateRequest } from '../types/api'
import { useAuthStore } from './auth'

export const useScopeStore = defineStore('scope', () => {
  const templates = ref<ScopeTemplate[]>([])
  const scopes = ref<Scope[]>([])
  const isLoading = ref(false)

  function getTemplateRepo() {
    return getContainer().resolve<Repository<ScopeTemplate, ScopeTemplateCreateRequest, Partial<ScopeTemplateCreateRequest>>>(SCOPE_TEMPLATE_REPO)
  }

  function getScopeRepo() {
    return getContainer().resolve<Repository<Scope, ScopeCreateRequest, Partial<ScopeCreateRequest>>>(SCOPE_REPO)
  }

  const fetchTemplates = async (): Promise<ScopeTemplate[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getTemplateRepo().findAll()
      templates.value = Array.isArray(response) ? response : []
      return templates.value
    } catch (error) {
      templates.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const fetchScopes = async (params?: { projectId?: string; clientId?: string; status?: string }): Promise<Scope[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getScopeRepo().findAll(params)
      scopes.value = Array.isArray(response) ? response : []
      return scopes.value
    } catch (error) {
      scopes.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createTemplate = async (data: ScopeTemplateCreateRequest): Promise<ScopeTemplate> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      const created = await getTemplateRepo().create(data)
      if (created && created.id) {
        templates.value.push(created)
        getEventBus().emit('scope-template.created', { template: created })
      }
      return created
    } catch (error) {
      throw error
    }
  }

  const updateTemplate = async (id: string, data: Partial<ScopeTemplateCreateRequest>): Promise<ScopeTemplate> => {
    if (!id) throw new Error('Template ID is required for updates')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      const updated = await getTemplateRepo().update(id, data)
      const index = templates.value.findIndex(t => t.id === id)
      if (index !== -1) {
        templates.value[index] = updated
      }
      getEventBus().emit('scope-template.updated', { template: updated })
      return updated
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const deleteTemplate = async (id: string): Promise<void> => {
    if (!id) throw new Error('Template ID is required for deletion')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      await getTemplateRepo().delete(id)
      templates.value = templates.value.filter(t => t.id !== id)
      getEventBus().emit('scope-template.deleted', { id })
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createScope = async (data: ScopeCreateRequest): Promise<Scope> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      const created = await getScopeRepo().create(data)
      if (created && created.id) {
        scopes.value.push(created)
        getEventBus().emit('scope.created', { scope: created })
      }
      return created
    } catch (error) {
      throw error
    }
  }

  const createScopeFromTemplate = async (templateId: string, overrides?: Partial<ScopeCreateRequest>): Promise<Scope> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      const template = await getTemplateRepo().findById(templateId)
      const merged: ScopeCreateRequest = {
        title: template.title,
        description: template.description,
        deliverables: template.deliverables?.map(d => ({
          title: d.title,
          description: d.description,
          quantity: d.quantity,
          unit: d.unit,
          rate: d.rate,
          estimatedHours: d.estimatedHours,
        })),
        terms: template.terms,
        templateId,
        ...overrides,
      }
      const created = await getScopeRepo().create(merged)
      if (created && created.id) {
        scopes.value.push(created)
        getEventBus().emit('scope.created', { scope: created })
      }
      return created
    } catch (error) {
      throw error
    }
  }

  // Valid status transitions for scopes
  const validTransitions: Record<string, string[]> = {
    draft: ['sent'],
    sent: ['approved', 'revised'],
    revised: ['sent'],
    approved: []
  }

  const validateStatusTransition = (currentStatus: string, newStatus: string): boolean => {
    const allowed = validTransitions[currentStatus]
    return allowed ? allowed.includes(newStatus) : false
  }

  const updateScope = async (id: string, data: Partial<ScopeCreateRequest>): Promise<Scope> => {
    if (!id) throw new Error('Scope ID is required for updates')
    if (!useAuthStore().currentTeam) throw new Error('No team context')

    if (data.status) {
      const existing = scopes.value.find(s => s.id === id)
      if (existing && existing.status && data.status !== existing.status) {
        if (!validateStatusTransition(existing.status, data.status)) {
          throw new Error(`Cannot transition scope from "${existing.status}" to "${data.status}". Allowed: ${validTransitions[existing.status]?.join(', ') || 'none'}`)
        }
      }
    }

    isLoading.value = true
    try {
      const updated = await getScopeRepo().update(id, data)
      const index = scopes.value.findIndex(s => s.id === id)
      if (index !== -1) {
        scopes.value[index] = updated
      }
      getEventBus().emit('scope.updated', { scope: updated })
      return updated
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const deleteScope = async (id: string): Promise<void> => {
    if (!id) throw new Error('Scope ID is required for deletion')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      await getScopeRepo().delete(id)
      scopes.value = scopes.value.filter(s => s.id !== id)
      getEventBus().emit('scope.deleted', { id })
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    templates,
    scopes,
    isLoading,
    fetchTemplates,
    fetchScopes,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createScope,
    createScopeFromTemplate,
    updateScope,
    deleteScope
  }
})
