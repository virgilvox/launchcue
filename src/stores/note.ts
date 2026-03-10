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

  function getRepo() {
    return getContainer().resolve<Repository<Note, NoteCreateRequest, Partial<NoteCreateRequest>>>(NOTE_REPO)
  }

  const fetchNotes = async (params?: Record<string, unknown>): Promise<Note[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getRepo().findAll(params)
      notes.value = Array.isArray(response) ? response : []
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
    fetchNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote
  }
})
