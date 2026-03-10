import type { Repository, QueryFilter, PaginationOptions, PaginatedResult } from '../types'
import { getSupabase } from './client'

/**
 * Field mapping from camelCase (frontend) to snake_case (PostgreSQL).
 * Each subclass provides its own mapping.
 */
export type FieldMap = Record<string, string>

/**
 * Base Supabase repository implementing standard CRUD against a PostgreSQL table.
 * Uses the active_* views for reads (filters soft-deleted rows).
 */
export abstract class SupabaseBaseRepository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>
  implements Repository<T, CreateDTO, UpdateDTO>
{
  constructor(
    protected readonly tableName: string,
    protected readonly viewName: string, // e.g. 'active_tasks'
    protected readonly fieldMap: FieldMap = {}
  ) {}

  async findAll(filter: QueryFilter = {}): Promise<T[]> {
    const sb = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = sb.from(this.viewName).select(this.getSelectColumns())

    // Apply filters (converting camelCase keys to snake_case)
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null) continue
      const column = this.toSnake(key)
      query = query.eq(column, value)
    }

    query = this.applyDefaultOrder(query)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row))
  }

  async findById(id: string): Promise<T> {
    const { data, error } = await getSupabase()
      .from(this.viewName)
      .select(this.getSelectColumns())
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(data as unknown as Record<string, unknown>)
  }

  async create(dto: CreateDTO): Promise<T> {
    const row = this.mapToDb(dto as Record<string, unknown>)
    const { data, error } = await getSupabase()
      .from(this.tableName)
      .insert(row)
      .select(this.getSelectColumns())
      .single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(data as unknown as Record<string, unknown>)
  }

  async update(id: string, dto: UpdateDTO): Promise<T> {
    const row = this.mapToDb(dto as Record<string, unknown>)
    const { data, error } = await getSupabase()
      .from(this.tableName)
      .update(row)
      .eq('id', id)
      .select(this.getSelectColumns())
      .single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(data as unknown as Record<string, unknown>)
  }

  async delete(id: string): Promise<void> {
    // Soft delete by default
    const { error } = await getSupabase()
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async findPaginated(filter: QueryFilter, options: PaginationOptions): Promise<PaginatedResult<T>> {
    const sb = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = sb.from(this.viewName).select(this.getSelectColumns(), { count: 'exact' })

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null) continue
      const column = this.toSnake(key)
      query = query.eq(column, value)
    }

    query = this.applyDefaultOrder(query)

    const from = (options.page - 1) * options.limit
    const to = from + options.limit - 1
    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) throw new Error(error.message)

    const total = count || 0
    return {
      data: (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row)),
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    }
  }

  // ─── Override points ───

  /** Columns to select. Override for joins. */
  protected getSelectColumns(): string {
    return '*'
  }

  /** Default ordering. Override per entity. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applyDefaultOrder(query: any): any {
    return query.order('created_at', { ascending: false })
  }

  /** Map a DB row (snake_case) to the frontend model (camelCase). */
  protected abstract mapFromDb(row: Record<string, unknown>): T

  /** Map a frontend DTO (camelCase) to a DB row (snake_case). */
  protected mapToDb(dto: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue
      if (key === 'id') continue // Never include id in inserts/updates
      result[this.toSnake(key)] = value
    }
    return result
  }

  /** Convert a camelCase key to snake_case, using the field map if available. */
  protected toSnake(key: string): string {
    if (this.fieldMap[key]) return this.fieldMap[key]
    return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }
}
