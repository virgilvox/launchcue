import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOnboardingStore } from '@/stores/onboarding'
import { ONBOARDING_REPO, CLIENT_INVITATION_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useOnboardingStore', () => {
  let mockChecklistRepo: ReturnType<typeof createMockRepository>
  let mockInvitationRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockChecklistRepo = createMockRepository()
    mockInvitationRepo = createMockRepository()
    setupStoreTest([
      { key: ONBOARDING_REPO, factory: () => mockChecklistRepo },
      { key: CLIENT_INVITATION_REPO, factory: () => mockInvitationRepo },
    ])
    seedAuth()
  })

  describe('fetchInvitations', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useOnboardingStore()
      const result = await store.fetchInvitations()
      expect(result).toEqual([])
    })

    it('fetches and stores invitations', async () => {
      const invitations = [
        { id: 'inv-1', clientId: 'c1', email: 'a@test.com' },
        { id: 'inv-2', clientId: 'c2', email: 'b@test.com' },
      ]
      ;(mockInvitationRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(invitations)

      const store = useOnboardingStore()
      const result = await store.fetchInvitations()

      expect(result).toHaveLength(2)
      expect(store.invitations).toEqual(invitations)
      expect(mockInvitationRepo.findAll).toHaveBeenCalled()
    })
  })

  describe('createInvitation', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useOnboardingStore()
      await expect(store.createInvitation({ clientId: 'c1', email: 'a@test.com' } as any)).rejects.toThrow('No team context')
    })

    it('creates invitation and pushes to array', async () => {
      const newInv = { id: 'inv-3', clientId: 'c1', email: 'c@test.com', token: 'tok-123' }
      ;(mockInvitationRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(newInv)

      const store = useOnboardingStore()
      const result = await store.createInvitation({ clientId: 'c1', email: 'c@test.com' } as any)

      expect(result).toEqual(newInv)
      expect(store.invitations).toContainEqual(newInv)
      expect(mockInvitationRepo.create).toHaveBeenCalled()
    })
  })

  describe('deleteInvitation', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useOnboardingStore()
      await expect(store.deleteInvitation('inv-1')).rejects.toThrow('No team context')
    })

    it('removes invitation from array', async () => {
      ;(mockInvitationRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useOnboardingStore()
      store.invitations = [
        { id: 'inv-1', email: 'a@test.com' },
        { id: 'inv-2', email: 'b@test.com' },
      ] as any[]

      await store.deleteInvitation('inv-1')

      expect(store.invitations).toHaveLength(1)
      expect(store.invitations[0].id).toBe('inv-2')
    })
  })

  describe('fetchChecklists', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useOnboardingStore()
      const result = await store.fetchChecklists()
      expect(result).toEqual([])
    })

    it('fetches and stores checklists', async () => {
      const checklists = [
        { id: 'cl-1', title: 'Checklist 1' },
        { id: 'cl-2', title: 'Checklist 2' },
      ]
      ;(mockChecklistRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(checklists)

      const store = useOnboardingStore()
      const result = await store.fetchChecklists()

      expect(result).toHaveLength(2)
      expect(store.checklists).toEqual(checklists)
    })
  })

  describe('createChecklist', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useOnboardingStore()
      await expect(store.createChecklist({ title: 'Test' } as any)).rejects.toThrow('No team context')
    })

    it('creates checklist and pushes to array', async () => {
      const newChecklist = { id: 'cl-3', title: 'New Checklist' }
      ;(mockChecklistRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(newChecklist)

      const store = useOnboardingStore()
      const result = await store.createChecklist({ title: 'New Checklist' } as any)

      expect(result).toEqual(newChecklist)
      expect(store.checklists).toContainEqual(newChecklist)
    })
  })

  describe('updateChecklist', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useOnboardingStore()
      await expect(store.updateChecklist('cl-1', { title: 'Updated' } as any)).rejects.toThrow('No team context')
    })

    it('updates checklist in array', async () => {
      const updated = { id: 'cl-1', title: 'Updated Checklist' }
      ;(mockChecklistRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useOnboardingStore()
      store.checklists = [{ id: 'cl-1', title: 'Original' }] as any[]

      const result = await store.updateChecklist('cl-1', { title: 'Updated Checklist' } as any)

      expect(result).toEqual(updated)
      expect(store.checklists[0].title).toBe('Updated Checklist')
    })
  })

  describe('completeStep', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useOnboardingStore()
      await expect(store.completeStep('cl-1', 's1')).rejects.toThrow('No team context')
    })

    it('completes a step and updates checklist in array', async () => {
      const updated = { id: 'cl-1', title: 'Checklist', steps: [{ id: 's1', completed: true }] }
      ;(mockChecklistRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useOnboardingStore()
      store.checklists = [{ id: 'cl-1', title: 'Checklist', steps: [{ id: 's1', completed: false }] }] as any[]

      const result = await store.completeStep('cl-1', 's1', { answer: 'yes' })

      expect(result).toEqual(updated)
      expect(mockChecklistRepo.update).toHaveBeenCalledWith('cl-1', {
        stepId: 's1',
        action: 'completeStep',
        response: { answer: 'yes' },
      })
    })
  })

  describe('deleteChecklist', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useOnboardingStore()
      await expect(store.deleteChecklist('cl-1')).rejects.toThrow('No team context')
    })

    it('removes checklist from array', async () => {
      ;(mockChecklistRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useOnboardingStore()
      store.checklists = [
        { id: 'cl-1', title: 'Checklist 1' },
        { id: 'cl-2', title: 'Checklist 2' },
      ] as any[]

      await store.deleteChecklist('cl-1')

      expect(store.checklists).toHaveLength(1)
      expect(store.checklists[0].id).toBe('cl-2')
    })
  })
})
