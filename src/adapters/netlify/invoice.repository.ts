import type { Invoice } from '@/types/models'
import type { InvoiceCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { INVOICE_ENDPOINT } from '@/services/api.service'

export class NetlifyInvoiceRepository implements Repository<Invoice, InvoiceCreateRequest, Partial<InvoiceCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<Invoice[]> {
    return apiService.get<Invoice[]>(INVOICE_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<Invoice> {
    return apiService.get<Invoice>(`${INVOICE_ENDPOINT}/${id}`)
  }

  async create(data: InvoiceCreateRequest): Promise<Invoice> {
    return apiService.post<Invoice>(INVOICE_ENDPOINT, data)
  }

  async update(id: string, data: Partial<InvoiceCreateRequest>): Promise<Invoice> {
    return apiService.put<Invoice>(`${INVOICE_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${INVOICE_ENDPOINT}/${id}`)
  }
}
