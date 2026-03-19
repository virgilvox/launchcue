import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { NOTE_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Note } from '../types/models'
import type { NoteCreateRequest } from '../types/api'
import { useAuthStore } from './auth'

export const useNoteStore = defineStore('note', () => {
  const notes = ref<Note[]>([])
  const isLoading = ref(false)

  // Pagination state
  const currentPage = ref(1)
  const totalItems = ref(0)
  const totalPages = ref(0)
  const pageSize = ref(50)

  function getRepo() {
    return getContainer().resolve<Repository<Note, NoteCreateRequest, Partial<NoteCreateRequest>>>(NOTE_REPO)
  }

  const fetchNotes = async (
    params?: Record<string, unknown>,
    pagination?: { page?: number; limit?: number }
  ): Promise<Note[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const repo = getRepo()
      const page = pagination?.page ?? 1
      const limit = pagination?.limit ?? 50

      if (repo.findPaginated) {
        const result = await repo.findPaginated(params || {}, { page, limit })
        notes.value = result.data || []
        currentPage.value = result.page
        totalItems.value = result.total
        totalPages.value = result.totalPages
        pageSize.value = result.limit
      } else {
        const response = await repo.findAll(params)
        notes.value = Array.isArray(response) ? response : []
        totalItems.value = notes.value.length
        totalPages.value = 1
        currentPage.value = 1
      }
      return notes.value
    } catch (error) {
      notes.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const getNote = async (id: string): Promise<Note> => {
    if (!id) throw new Error('Note ID is required')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    return getRepo().findById(id)
  }

  const createNote = async (data: NoteCreateRequest): Promise<Note> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      const created = await getRepo().create(data)
      if (created && created.id) {
        notes.value.push(created)
        getEventBus().emit('note.created', { note: created })
      }
      return created
    } catch (error) {
      throw error
    }
  }

  const updateNote = async (id: string, data: Partial<NoteCreateRequest>): Promise<Note> => {
    if (!id) throw new Error('Note ID is required for updates')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      const updated = await getRepo().update(id, data)
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notes.value[index] = updated
      }
      getEventBus().emit('note.updated', { note: updated })
      return updated
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const deleteNote = async (id: string): Promise<void> => {
    if (!id) throw new Error('Note ID is required for deletion')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      await getRepo().delete(id)
      notes.value = notes.value.filter(n => n.id !== id)
      totalItems.value = Math.max(0, totalItems.value - 1)
      totalPages.value = Math.max(1, Math.ceil(totalItems.value / pageSize.value))
      if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
      getEventBus().emit('note.deleted', { id })
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    notes,
    isLoading,
    currentPage,
    totalItems,
    totalPages,
    pageSize,
    fetchNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote
  }
})
