import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { CAMPAIGN_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Campaign } from '../types/models'
import type { CampaignCreateRequest } from '../types/api'
import { useAuthStore } from './auth'

export const useCampaignStore = defineStore('campaign', () => {
  const campaigns = ref<Campaign[]>([])
  const isLoading = ref(false)

  function getRepo() {
    return getContainer().resolve<Repository<Campaign, CampaignCreateRequest, Partial<CampaignCreateRequest>>>(CAMPAIGN_REPO)
  }

  const fetchCampaigns = async (params?: Record<string, unknown>): Promise<Campaign[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getRepo().findAll(params)
      campaigns.value = Array.isArray(response) ? response : []
      return campaigns.value
    } catch (error) {
      campaigns.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const getCampaign = async (id: string): Promise<Campaign> => {
    if (!id) throw new Error('Campaign ID is required')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const cached = campaigns.value.find(c => c.id === id)
    if (cached) return cached
    return getRepo().findById(id)
  }

  const createCampaign = async (data: CampaignCreateRequest): Promise<Campaign> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const created = await getRepo().create(data)
    if (created && created.id) {
      campaigns.value.push(created)
      getEventBus().emit('campaign.created', { campaign: created })
    }
    return created
  }

  const updateCampaign = async (id: string, data: Partial<CampaignCreateRequest>): Promise<Campaign> => {
    if (!id) throw new Error('Campaign ID is required for updates')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      const updated = await getRepo().update(id, data)
      const index = campaigns.value.findIndex(c => c.id === id)
      if (index !== -1) {
        campaigns.value[index] = updated
      }
      getEventBus().emit('campaign.updated', { campaign: updated })
      return updated
    } finally {
      isLoading.value = false
    }
  }

  const deleteCampaign = async (id: string): Promise<void> => {
    if (!id) throw new Error('Campaign ID is required for deletion')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      await getRepo().delete(id)
      campaigns.value = campaigns.value.filter(c => c.id !== id)
      getEventBus().emit('campaign.deleted', { id })
    } finally {
      isLoading.value = false
    }
  }

  return {
    campaigns,
    isLoading,
    fetchCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign
  }
})
