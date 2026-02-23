import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import invoiceService from '../services/invoice.service'
import type { Invoice } from '../types/models'
import type { InvoiceCreateRequest } from '../types/api'

export const useInvoiceStore = defineStore('invoice', () => {
  // State
  const invoices = ref<Invoice[]>([])
  const isLoading = ref(false)

  // Computed
  const outstandingTotal = computed(() => {
    return invoices.value
      .filter(inv => inv.status === 'sent' || inv.status === 'viewed')
      .reduce((sum, inv) => sum + inv.total, 0)
  })

  const overdueCount = computed(() => {
    return invoices.value.filter(inv => inv.status === 'overdue').length
  })

  // Actions
  const fetchInvoices = async (params?: { clientId?: string; projectId?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<Invoice[]> => {
    isLoading.value = true
    try {
      const response: unknown = await invoiceService.getInvoices(params)
      invoices.value = Array.isArray(response) ? response : []
      return invoices.value
    } catch (error) {
      console.error('Error fetching invoices:', error)
      invoices.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createInvoice = async (data: InvoiceCreateRequest): Promise<Invoice> => {
    try {
      const created: Invoice = await invoiceService.createInvoice(data)
      if (created && created.id) {
        invoices.value.push(created)
      }
      return created
    } catch (error) {
      console.error('Error creating invoice:', error)
      throw error
    }
  }

  const createFromScope = async (scopeId: string, overrides?: Partial<InvoiceCreateRequest>): Promise<Invoice> => {
    try {
      const created: Invoice = await invoiceService.createFromScope(scopeId, overrides)
      if (created && created.id) {
        invoices.value.push(created)
      }
      return created
    } catch (error) {
      console.error('Error creating invoice from scope:', error)
      throw error
    }
  }

  const updateInvoice = async (id: string, data: Partial<InvoiceCreateRequest>): Promise<Invoice> => {
    if (!id) {
      throw new Error('Invoice ID is required for updates')
    }
    isLoading.value = true
    try {
      const updated: Invoice = await invoiceService.updateInvoice(id, data)
      const index = invoices.value.findIndex(inv => inv.id === id)
      if (index !== -1) {
        invoices.value[index] = updated
      }
      return updated
    } catch (error) {
      console.error('Error updating invoice:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const deleteInvoice = async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('Invoice ID is required for deletion')
    }
    isLoading.value = true
    try {
      await invoiceService.deleteInvoice(id)
      invoices.value = invoices.value.filter(inv => inv.id !== id)
    } catch (error) {
      console.error('Error deleting invoice:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Return state, computed, and actions
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
