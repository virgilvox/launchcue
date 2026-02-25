import { ref } from 'vue'
import { defineStore } from 'pinia'
import scopeService from '../services/scope.service'
import type { ScopeTemplate, Scope } from '../types/models'
import type { ScopeTemplateCreateRequest, ScopeCreateRequest } from '../types/api'

export const useScopeStore = defineStore('scope', () => {
  // State
  const templates = ref<ScopeTemplate[]>([])
  const scopes = ref<Scope[]>([])
  const isLoading = ref(false)

  // Actions
  const fetchTemplates = async (): Promise<ScopeTemplate[]> => {
    isLoading.value = true
    try {
      const response: unknown = await scopeService.getScopeTemplates()
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
    isLoading.value = true
    try {
      const response: unknown = await scopeService.getScopes(params)
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
    try {
      const created: ScopeTemplate = await scopeService.createScopeTemplate(data)
      if (created && created.id) {
        templates.value.push(created)
      }
      return created
    } catch (error) {
      throw error
    }
  }

  const updateTemplate = async (id: string, data: Partial<ScopeTemplateCreateRequest>): Promise<ScopeTemplate> => {
    if (!id) throw new Error('Template ID is required for updates')
    isLoading.value = true
    try {
      const updated: ScopeTemplate = await scopeService.updateScopeTemplate(id, data)
      const index = templates.value.findIndex(t => t.id === id)
      if (index !== -1) {
        templates.value[index] = updated
      }
      return updated
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const deleteTemplate = async (id: string): Promise<void> => {
    if (!id) throw new Error('Template ID is required for deletion')
    isLoading.value = true
    try {
      await scopeService.deleteScopeTemplate(id)
      templates.value = templates.value.filter(t => t.id !== id)
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createScope = async (data: ScopeCreateRequest): Promise<Scope> => {
    try {
      const created: Scope = await scopeService.createScope(data)
      if (created && created.id) {
        scopes.value.push(created)
      }
      return created
    } catch (error) {
      throw error
    }
  }

  const createScopeFromTemplate = async (templateId: string, overrides?: Partial<ScopeCreateRequest>): Promise<Scope> => {
    try {
      const created: Scope = await scopeService.createScopeFromTemplate(templateId, overrides)
      if (created && created.id) {
        scopes.value.push(created)
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

    // Validate status transition if status is being changed
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
      const updated: Scope = await scopeService.updateScope(id, data)
      const index = scopes.value.findIndex(s => s.id === id)
      if (index !== -1) {
        scopes.value[index] = updated
      }
      return updated
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const deleteScope = async (id: string): Promise<void> => {
    if (!id) throw new Error('Scope ID is required for deletion')
    isLoading.value = true
    try {
      await scopeService.deleteScope(id)
      scopes.value = scopes.value.filter(s => s.id !== id)
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Return state and actions
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
