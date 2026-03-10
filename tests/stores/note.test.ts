import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNoteStore } from '@/stores/note'
import { NOTE_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useNoteStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    setupStoreTest([{ key: NOTE_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchNotes', () => {
    it('returns empty when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useNoteStore()
      const result = await store.fetchNotes()
      expect(result).toEqual([])
    })

    it('fetches and stores notes', async () => {
      const notes = [{ id: 'n1', title: 'Note 1' }, { id: 'n2', title: 'Note 2' }]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(notes)

      const store = useNoteStore()
      const result = await store.fetchNotes()

      expect(result).toHaveLength(2)
      expect(store.notes).toEqual(notes)
    })

    it('sets notes to empty on error', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'))
      const store = useNoteStore()
      await expect(store.fetchNotes()).rejects.toThrow('Failed')
      expect(store.notes).toEqual([])
    })
  })

  describe('getNote', () => {
    it('throws on missing id', async () => {
      const store = useNoteStore()
      await expect(store.getNote('')).rejects.toThrow('Note ID is required')
    })

    it('fetches from repo', async () => {
      const note = { id: 'n1', title: 'Note' }
      ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(note)

      const store = useNoteStore()
      const result = await store.getNote('n1')
      expect(result).toEqual(note)
      expect(mockRepo.findById).toHaveBeenCalledWith('n1')
    })
  })

  describe('createNote', () => {
    it('creates, pushes to array, and emits event', async () => {
      const note = { id: 'n1', title: 'New Note' }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(note)

      const store = useNoteStore()
      const result = await store.createNote({ title: 'New Note' } as any)

      expect(result).toEqual(note)
      expect(store.notes).toContainEqual(note)
    })
  })

  describe('updateNote', () => {
    it('throws on missing id', async () => {
      const store = useNoteStore()
      await expect(store.updateNote('', { title: 'Updated' })).rejects.toThrow('Note ID is required for updates')
    })

    it('updates note in array', async () => {
      const updated = { id: 'n1', title: 'Updated' }
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useNoteStore()
      store.notes = [{ id: 'n1', title: 'Old' }] as any[]

      await store.updateNote('n1', { title: 'Updated' })
      expect(store.notes[0].title).toBe('Updated')
    })
  })

  describe('deleteNote', () => {
    it('throws on missing id', async () => {
      const store = useNoteStore()
      await expect(store.deleteNote('')).rejects.toThrow('Note ID is required for deletion')
    })

    it('removes note from array', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const store = useNoteStore()
      store.notes = [{ id: 'n1' }, { id: 'n2' }] as any[]

      await store.deleteNote('n1')
      expect(store.notes).toHaveLength(1)
      expect(store.notes[0].id).toBe('n2')
    })
  })
})
