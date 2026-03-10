import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCampaignStore } from '@/stores/campaign'
import { CAMPAIGN_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useCampaignStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    setupStoreTest([{ key: CAMPAIGN_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchCampaigns', () => {
    it('returns empty when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCampaignStore()
      const result = await store.fetchCampaigns()
      expect(result).toEqual([])
    })

    it('fetches and stores campaigns', async () => {
      const campaigns = [{ id: 'c1', title: 'Campaign 1' }]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(campaigns)

      const store = useCampaignStore()
      const result = await store.fetchCampaigns()
      expect(result).toEqual(campaigns)
      expect(store.campaigns).toEqual(campaigns)
    })

    it('passes params to findAll', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useCampaignStore()
      await store.fetchCampaigns({ status: 'active' })
      expect(mockRepo.findAll).toHaveBeenCalledWith({ status: 'active' })
    })
  })

  describe('getCampaign', () => {
    it('throws when id is empty', async () => {
      const store = useCampaignStore()
      await expect(store.getCampaign('')).rejects.toThrow('Campaign ID is required')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCampaignStore()
      await expect(store.getCampaign('c1')).rejects.toThrow('No team context')
    })

    it('returns cached campaign', async () => {
      const store = useCampaignStore()
      store.campaigns = [{ id: 'c1', title: 'Cached' }] as any[]
      const result = await store.getCampaign('c1')
      expect(result.title).toBe('Cached')
      expect(mockRepo.findById).not.toHaveBeenCalled()
    })

    it('fetches from repo when not cached', async () => {
      ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1', title: 'Fetched' })
      const store = useCampaignStore()
      const result = await store.getCampaign('c1')
      expect(result.title).toBe('Fetched')
    })
  })

  describe('createCampaign', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCampaignStore()
      await expect(store.createCampaign({ title: 'Test' } as any)).rejects.toThrow('No team context')
    })

    it('creates and pushes to array', async () => {
      const campaign = { id: 'c1', title: 'New' }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(campaign)
      const store = useCampaignStore()
      const result = await store.createCampaign({ title: 'New' } as any)
      expect(result).toEqual(campaign)
      expect(store.campaigns).toContainEqual(campaign)
    })
  })

  describe('updateCampaign', () => {
    it('throws when id is empty', async () => {
      const store = useCampaignStore()
      await expect(store.updateCampaign('', {})).rejects.toThrow('Campaign ID is required')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCampaignStore()
      await expect(store.updateCampaign('c1', { title: 'Updated' })).rejects.toThrow('No team context')
    })

    it('updates campaign in array', async () => {
      const updated = { id: 'c1', title: 'Updated' }
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)
      const store = useCampaignStore()
      store.campaigns = [{ id: 'c1', title: 'Old' }] as any[]
      await store.updateCampaign('c1', { title: 'Updated' })
      expect(store.campaigns[0].title).toBe('Updated')
    })
  })

  describe('deleteCampaign', () => {
    it('throws when id is empty', async () => {
      const store = useCampaignStore()
      await expect(store.deleteCampaign('')).rejects.toThrow('Campaign ID is required')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCampaignStore()
      await expect(store.deleteCampaign('c1')).rejects.toThrow('No team context')
    })

    it('removes campaign from array', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const store = useCampaignStore()
      store.campaigns = [{ id: 'c1' }, { id: 'c2' }] as any[]
      await store.deleteCampaign('c1')
      expect(store.campaigns).toHaveLength(1)
    })
  })
})
