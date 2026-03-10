import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useScopeStore } from '@/stores/scope'
import { SCOPE_REPO, SCOPE_TEMPLATE_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useScopeStore', () => {
  let mockScopeRepo: ReturnType<typeof createMockRepository>
  let mockTemplateRepo: ReturnType<typeof createMockRepository>
  let eventBus: ReturnType<typeof setupStoreTest>['eventBus']

  beforeEach(() => {
    mockScopeRepo = createMockRepository()
    mockTemplateRepo = createMockRepository()
    const setup = setupStoreTest([
      { key: SCOPE_REPO, factory: () => mockScopeRepo },
      { key: SCOPE_TEMPLATE_REPO, factory: () => mockTemplateRepo },
    ])
    eventBus = setup.eventBus
    seedAuth()
  })

  describe('fetchTemplates', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useScopeStore()
      const result = await store.fetchTemplates()
      expect(result).toEqual([])
    })

    it('fetches and stores templates', async () => {
      const templates = [
        { id: 'tpl1', title: 'Template 1' },
        { id: 'tpl2', title: 'Template 2' },
      ]
      ;(mockTemplateRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(templates)

      const store = useScopeStore()
      const result = await store.fetchTemplates()

      expect(result).toHaveLength(2)
      expect(store.templates).toEqual(templates)
      expect(mockTemplateRepo.findAll).toHaveBeenCalled()
    })
  })

  describe('fetchScopes', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useScopeStore()
      const result = await store.fetchScopes()
      expect(result).toEqual([])
    })

    it('fetches with params and stores scopes', async () => {
      const scopes = [{ id: 's1', title: 'Scope 1', status: 'draft' }]
      ;(mockScopeRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(scopes)

      const store = useScopeStore()
      const result = await store.fetchScopes({ projectId: 'p1' })

      expect(result).toHaveLength(1)
      expect(store.scopes).toEqual(scopes)
      expect(mockScopeRepo.findAll).toHaveBeenCalledWith({ projectId: 'p1' })
    })
  })

  describe('createTemplate', () => {
    it('creates template and pushes to array', async () => {
      const newTemplate = { id: 'tpl3', title: 'New Template' }
      ;(mockTemplateRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(newTemplate)

      const store = useScopeStore()
      const result = await store.createTemplate({ title: 'New Template' } as any)

      expect(result).toEqual(newTemplate)
      expect(store.templates).toContainEqual(newTemplate)
      expect(mockTemplateRepo.create).toHaveBeenCalled()
    })

    it('emits scope-template.created event', async () => {
      const newTemplate = { id: 'tpl3', title: 'New Template' }
      ;(mockTemplateRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(newTemplate)
      const emitSpy = vi.spyOn(eventBus, 'emit')

      const store = useScopeStore()
      await store.createTemplate({ title: 'New Template' } as any)

      expect(emitSpy).toHaveBeenCalledWith('scope-template.created', { template: newTemplate })
    })
  })

  describe('updateTemplate', () => {
    it('throws when template ID is missing', async () => {
      const store = useScopeStore()
      await expect(store.updateTemplate('', { title: 'Updated' } as any)).rejects.toThrow('Template ID is required for updates')
    })

    it('updates template in array', async () => {
      const original = { id: 'tpl1', title: 'Original' }
      const updated = { id: 'tpl1', title: 'Updated' }
      ;(mockTemplateRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useScopeStore()
      store.templates = [original] as any[]

      const result = await store.updateTemplate('tpl1', { title: 'Updated' } as any)

      expect(result).toEqual(updated)
      expect(store.templates[0].title).toBe('Updated')
    })
  })

  describe('deleteTemplate', () => {
    it('throws when template ID is missing', async () => {
      const store = useScopeStore()
      await expect(store.deleteTemplate('')).rejects.toThrow('Template ID is required for deletion')
    })

    it('removes template from array', async () => {
      ;(mockTemplateRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useScopeStore()
      store.templates = [
        { id: 'tpl1', title: 'Template 1' },
        { id: 'tpl2', title: 'Template 2' },
      ] as any[]

      await store.deleteTemplate('tpl1')

      expect(store.templates).toHaveLength(1)
      expect(store.templates[0].id).toBe('tpl2')
    })
  })

  describe('createScope', () => {
    it('creates scope and pushes to array', async () => {
      const newScope = { id: 's1', title: 'New Scope', status: 'draft' }
      ;(mockScopeRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(newScope)

      const store = useScopeStore()
      const result = await store.createScope({ title: 'New Scope' } as any)

      expect(result).toEqual(newScope)
      expect(store.scopes).toContainEqual(newScope)
      expect(mockScopeRepo.create).toHaveBeenCalled()
    })
  })

  describe('createScopeFromTemplate', () => {
    it('fetches template, merges with overrides, and creates scope', async () => {
      const template = {
        id: 'tpl1',
        title: 'Template Title',
        description: 'Template desc',
        deliverables: [
          { title: 'D1', description: 'Deliverable 1', quantity: 1, unit: 'ea', rate: 100, estimatedHours: 5 },
        ],
        terms: 'Net 30',
      }
      const createdScope = { id: 's2', title: 'Custom Title', description: 'Template desc', status: 'draft' }
      ;(mockTemplateRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(template)
      ;(mockScopeRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdScope)

      const store = useScopeStore()
      const result = await store.createScopeFromTemplate('tpl1', { title: 'Custom Title' })

      expect(mockTemplateRepo.findById).toHaveBeenCalledWith('tpl1')
      const createCall = (mockScopeRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(createCall.title).toBe('Custom Title')
      expect(createCall.templateId).toBe('tpl1')
      expect(createCall.terms).toBe('Net 30')
      expect(createCall.deliverables).toHaveLength(1)
      expect(result).toEqual(createdScope)
      expect(store.scopes).toContainEqual(createdScope)
    })
  })

  describe('updateScope — status machine', () => {
    it('allows draft → sent', async () => {
      const updated = { id: 's1', title: 'Scope', status: 'sent' }
      ;(mockScopeRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useScopeStore()
      store.scopes = [{ id: 's1', title: 'Scope', status: 'draft' }] as any[]

      const result = await store.updateScope('s1', { status: 'sent' })
      expect(result.status).toBe('sent')
    })

    it('allows sent → approved', async () => {
      const updated = { id: 's1', title: 'Scope', status: 'approved' }
      ;(mockScopeRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useScopeStore()
      store.scopes = [{ id: 's1', title: 'Scope', status: 'sent' }] as any[]

      const result = await store.updateScope('s1', { status: 'approved' })
      expect(result.status).toBe('approved')
    })

    it('allows sent → revised', async () => {
      const updated = { id: 's1', title: 'Scope', status: 'revised' }
      ;(mockScopeRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useScopeStore()
      store.scopes = [{ id: 's1', title: 'Scope', status: 'sent' }] as any[]

      const result = await store.updateScope('s1', { status: 'revised' })
      expect(result.status).toBe('revised')
    })

    it('rejects draft → approved', async () => {
      const store = useScopeStore()
      store.scopes = [{ id: 's1', title: 'Scope', status: 'draft' }] as any[]

      await expect(store.updateScope('s1', { status: 'approved' })).rejects.toThrow(
        'Cannot transition scope from "draft" to "approved"'
      )
    })

    it('rejects approved → sent', async () => {
      const store = useScopeStore()
      store.scopes = [{ id: 's1', title: 'Scope', status: 'approved' }] as any[]

      await expect(store.updateScope('s1', { status: 'sent' })).rejects.toThrow(
        'Cannot transition scope from "approved" to "sent"'
      )
    })
  })

  describe('deleteScope', () => {
    it('removes scope from array', async () => {
      ;(mockScopeRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useScopeStore()
      store.scopes = [
        { id: 's1', title: 'Scope 1' },
        { id: 's2', title: 'Scope 2' },
      ] as any[]

      await store.deleteScope('s1')

      expect(store.scopes).toHaveLength(1)
      expect(store.scopes[0].id).toBe('s2')
    })
  })
})
