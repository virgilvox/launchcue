import apiService, { INVOICE_ENDPOINT } from './api.service'
import type { Invoice } from '@/types/models'
import type { InvoiceCreateRequest } from '@/types/api'

class InvoiceService {
  async getInvoices(params?: { clientId?: string; projectId?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<Invoice[]> {
    return apiService.get<Invoice[]>(INVOICE_ENDPOINT, params as Record<string, unknown> || {})
  }

  async getInvoice(id: string): Promise<Invoice> {
    return apiService.get<Invoice>(`${INVOICE_ENDPOINT}/${id}`)
  }

  async createInvoice(data: InvoiceCreateRequest): Promise<Invoice> {
    return apiService.post<Invoice>(INVOICE_ENDPOINT, data)
  }

  async createFromScope(scopeId: string, overrides?: Partial<InvoiceCreateRequest>): Promise<Invoice> {
    return apiService.post<Invoice>(INVOICE_ENDPOINT, { ...overrides, scopeId })
  }

  async updateInvoice(id: string, data: Partial<InvoiceCreateRequest>): Promise<Invoice> {
    return apiService.put<Invoice>(`${INVOICE_ENDPOINT}/${id}`, data)
  }

  async deleteInvoice(id: string): Promise<unknown> {
    return apiService.delete(`${INVOICE_ENDPOINT}/${id}`)
  }
}

export default new InvoiceService()
