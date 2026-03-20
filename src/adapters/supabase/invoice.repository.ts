import type { Invoice } from '@/types/models'
import type { InvoiceCreateRequest } from '@/types/api'
import type { QueryFilter } from '../types'
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

  async findAll(filter: QueryFilter = {}): Promise<Invoice[]> {
    const sb = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = sb.from(this.viewName).select(this.getSelectColumns())

    const { dateFrom, dateTo, ...rest } = filter

    // Date range filters on created_at (no date_from/date_to columns exist)
    if (dateFrom !== undefined && dateFrom !== null) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo !== undefined && dateTo !== null) {
      query = query.lte('created_at', dateTo)
    }

    // Apply remaining filters normally
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined || value === null) continue
      const column = this.toSnake(key)
      query = query.eq(column, value)
    }

    query = this.applyDefaultOrder(query)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row))
  }

  async create(dto: InvoiceCreateRequest): Promise<Invoice> {
    return this.createWithRetry(dto, false)
  }

  /**
   * Insert an invoice, retrying once with a fresh number on unique-constraint
   * violation (code 23505). This guards against the rare race where two
   * requests slip past the advisory lock (e.g. different PostgREST pooled
   * connections).
   */
  private async createWithRetry(dto: InvoiceCreateRequest, isRetry: boolean): Promise<Invoice> {
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

    // Retry once on unique constraint violation (PostgreSQL 23505)
    if (error && !isRetry && ((error as unknown as Record<string, unknown>).code === '23505' || error.message?.includes('duplicate key'))) {
      return this.createWithRetry(dto, true)
    }

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
