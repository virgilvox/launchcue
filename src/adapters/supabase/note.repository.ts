import type { Note } from '@/types/models'
import type { NoteCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseNoteRepository extends SupabaseBaseRepository<Note, NoteCreateRequest, Partial<Note>> {
  constructor() {
    super('notes', 'active_notes', {
      clientId: 'client_id',
      projectId: 'project_id',
      teamId: 'team_id',
      userId: 'user_id',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): Note {
    return {
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      tags: (row.tags as string[]) || [],
      clientId: row.client_id as string | null,
      projectId: row.project_id as string | null,
      teamId: row.team_id as string,
      userId: row.user_id as string,
      deletedAt: row.deleted_at as string | null,
      deletedBy: row.deleted_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
