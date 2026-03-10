import type { Invoice } from '@/types/models'
import type { InvoiceCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'
import { getSupabase } from './client'

export class SupabaseInvoiceRepository extends SupabaseBaseRepository<Invoice, InvoiceCreateRequest, Partial<Invoice>> {
  constructor() {
    super('invoices', 'active_invoices', {
      teamId: 'team_id',
      clientId: 'client_id',
      projectId: 'project_id',
      scopeId: 'scope_id',
      invoiceNumber: 'invoice_number',
      lineItems: 'line_items',
      taxRate: 'tax_rate',
      dueDate: 'due_date',
      sentAt: 'sent_at',
      paidAt: 'paid_at',
      paidAmount: 'paid_amount',
      createdBy: 'created_by',
    })
  }

  async create(dto: InvoiceCreateRequest): Promise<Invoice> {
    const sb = getSupabase()

    // Resolve team_id from current user's metadata
    const { data: { user } } = await sb.auth.getUser()
    const teamId = (dto as unknown as Record<string, unknown>).teamId || user?.user_metadata?.current_team_id || null

    // Auto-generate invoice number via database function
    const { data: numData, error: numError } = await sb.rpc('generate_invoice_number', {
      p_team_id: teamId,
    })
    if (numError) throw new Error(numError.message)

    const row = this.mapToDb(dto as unknown as Record<string, unknown>)
    row.invoice_number = numData as string

    const { data, error } = await sb
      .from(this.tableName)
      .insert(row)
      .select(this.getSelectColumns())
      .single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(data as unknown as Record<string, unknown>)
  }

  protected mapFromDb(row: Record<string, unknown>): Invoice {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      clientId: row.client_id as string,
      projectId: row.project_id as string | null,
      scopeId: row.scope_id as string | null,
      invoiceNumber: row.invoice_number as string,
      lineItems: (row.line_items as Invoice['lineItems']) || [],
      subtotal: Number(row.subtotal) || 0,
      tax: row.tax != null ? Number(row.tax) : null,
      taxRate: row.tax_rate != null ? Number(row.tax_rate) : null,
      total: Number(row.total) || 0,
      currency: row.currency as string,
      status: row.status as Invoice['status'],
      notes: row.notes as string | undefined,
      dueDate: row.due_date as string | null,
      sentAt: row.sent_at as string | null,
      paidAt: row.paid_at as string | null,
      paidAmount: row.paid_amount != null ? Number(row.paid_amount) : null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
