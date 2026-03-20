import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { WEBHOOK_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Webhook } from '../types/models'
import { useAuthStore } from './auth'

export const useWebhookStore = defineStore('webhook', () => {
  const webhooks = ref<Webhook[]>([])
  const isLoading = ref(false)

  function getRepo() {
    return getContainer().resolve<Repository<Webhook, Partial<Webhook>, Partial<Webhook>>>(WEBHOOK_REPO)
  }

  const fetchWebhooks = async (): Promise<Webhook[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getRepo().findAll()
      webhooks.value = Array.isArray(response) ? response : []
      return webhooks.value
    } catch (error) {
      webhooks.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createWebhook = async (data: Partial<Webhook>): Promise<Webhook> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const created = await getRepo().create(data)
    if (created && created.id) {
      webhooks.value.push(created)
      getEventBus().emit('webhook.created', { webhook: created })
    }
    return created
  }

  const updateWebhook = async (id: string, data: Partial<Webhook>): Promise<Webhook> => {
    if (!id) throw new Error('Webhook ID is required for updates')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      const updated = await getRepo().update(id, data)
      const index = webhooks.value.findIndex(w => w.id === id)
      if (index !== -1) {
        webhooks.value[index] = updated
      }
      getEventBus().emit('webhook.updated', { webhook: updated })
      return updated
    } finally {
      isLoading.value = false
    }
  }

  const deleteWebhook = async (id: string): Promise<void> => {
    if (!id) throw new Error('Webhook ID is required for deletion')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    await getRepo().delete(id)
    webhooks.value = webhooks.value.filter(w => w.id !== id)
    getEventBus().emit('webhook.deleted', { id })
  }

  return {
    webhooks,
    isLoading,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook
  }
})
