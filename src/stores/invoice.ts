import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { INVOICE_REPO, SCOPE_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Invoice, Scope } from '../types/models'
import type { InvoiceCreateRequest } from '../types/api'
import { useAuthStore } from './auth'

export const useInvoiceStore = defineStore('invoice', () => {
  const invoices = ref<Invoice[]>([])
  const isLoading = ref(false)

  function getRepo() {
    return getContainer().resolve<Repository<Invoice, InvoiceCreateRequest, Partial<InvoiceCreateRequest>>>(INVOICE_REPO)
  }

  const outstandingTotal = computed(() => {
    return invoices.value
      .filter(inv => inv.status === 'sent' || inv.status === 'viewed')
      .reduce((sum, inv) => sum + inv.total, 0)
  })

  const overdueCount = computed(() => {
    return invoices.value.filter(inv => inv.status === 'overdue').length
  })

  const fetchInvoices = async (params?: { clientId?: string; projectId?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<Invoice[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getRepo().findAll(params)
      invoices.value = Array.isArray(response) ? response : []
      return invoices.value
    } catch (error) {
      invoices.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createInvoice = async (data: InvoiceCreateRequest): Promise<Invoice> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const created = await getRepo().create(data)
    if (created && created.id) {
      invoices.value.push(created)
      getEventBus().emit('invoice.created', { invoice: created })
    }
    return created
  }

  // Note: This only creates an invoice from scope data. Scope status changes
  // happen separately in ScopeBuilder.vue via updateScope() as a distinct user action.
  // The two-step flow means a failed invoice creation does not leave scope status inconsistent.
  const createFromScope = async (scopeId: string, overrides?: Partial<InvoiceCreateRequest>): Promise<Invoice> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const scopeRepo = getContainer().resolve<Repository<Scope>>(SCOPE_REPO)
    const scope = await scopeRepo.findById(scopeId)
    const data: InvoiceCreateRequest = {
      clientId: scope.clientId!,
      scopeId,
      lineItems: scope.deliverables?.map(d => ({
        description: d.title,
        quantity: d.quantity,
        unit: d.unit,
        rate: d.rate,
      })),
      ...overrides,
    }
    const created = await getRepo().create(data)
    if (created && created.id) {
      invoices.value.push(created)
      getEventBus().emit('invoice.created', { invoice: created })
    }
    return created
  }

  const updateInvoice = async (id: string, data: Partial<InvoiceCreateRequest>): Promise<Invoice> => {
    if (!id) {
      throw new Error('Invoice ID is required for updates')
    }
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      const updated = await getRepo().update(id, data)
      const index = invoices.value.findIndex(inv => inv.id === id)
      if (index !== -1) {
        invoices.value[index] = updated
      }
      getEventBus().emit('invoice.updated', { invoice: updated })
      return updated
    } finally {
      isLoading.value = false
    }
  }

  const deleteInvoice = async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('Invoice ID is required for deletion')
    }
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      await getRepo().delete(id)
      invoices.value = invoices.value.filter(inv => inv.id !== id)
      getEventBus().emit('invoice.deleted', { id })
    } finally {
      isLoading.value = false
    }
  }

  return {
    invoices,
    isLoading,
    outstandingTotal,
    overdueCount,
    fetchInvoices,
    createInvoice,
    createFromScope,
    updateInvoice,
    deleteInvoice
  }
})
