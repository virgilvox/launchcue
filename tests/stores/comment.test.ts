import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCommentStore } from '@/stores/comment'
import { COMMENT_REPO } from '@/adapters/repository-keys'
import { createMockCommentRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useCommentStore', () => {
  let mockRepo: ReturnType<typeof createMockCommentRepository>

  beforeEach(() => {
    mockRepo = createMockCommentRepository()
    setupStoreTest([{ key: COMMENT_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchComments', () => {
    it('returns empty when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCommentStore()
      const result = await store.fetchComments('task', 't1')
      expect(result).toEqual([])
    })

    it('fetches comments for a resource', async () => {
      const comments = [{ id: 'cm1', content: 'Hello' }]
      ;(mockRepo.getComments as ReturnType<typeof vi.fn>).mockResolvedValue(comments)

      const store = useCommentStore()
      const result = await store.fetchComments('task', 't1')

      expect(result).toEqual(comments)
      expect(store.comments).toEqual(comments)
      expect(mockRepo.getComments).toHaveBeenCalledWith('task', 't1')
    })

    it('handles fetch error', async () => {
      ;(mockRepo.getComments as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'))
      const store = useCommentStore()
      await expect(store.fetchComments('task', 't1')).rejects.toThrow('Failed')
      expect(store.comments).toEqual([])
    })
  })

  describe('getRecentComments', () => {
    it('fetches recent comments without resource filter', async () => {
      ;(mockRepo.getComments as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useCommentStore()
      await store.getRecentComments()
      expect(mockRepo.getComments).toHaveBeenCalledWith('', '')
    })

    it('returns empty when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCommentStore()
      const result = await store.getRecentComments()
      expect(result).toEqual([])
      expect(mockRepo.getComments).not.toHaveBeenCalled()
    })
  })

  describe('createComment', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCommentStore()
      await expect(store.createComment('task', 't1', { content: 'Test' })).rejects.toThrow('No team context')
    })

    it('creates comment and pushes to array', async () => {
      const comment = { id: 'cm1', content: 'New comment' }
      ;(mockRepo.createComment as ReturnType<typeof vi.fn>).mockResolvedValue(comment)

      const store = useCommentStore()
      const result = await store.createComment('task', 't1', { content: 'New comment' })

      expect(result).toEqual(comment)
      expect(store.comments).toContainEqual(comment)
      expect(mockRepo.createComment).toHaveBeenCalledWith('task', 't1', { content: 'New comment' })
    })

    it('throws on creation error', async () => {
      ;(mockRepo.createComment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Create failed'))
      const store = useCommentStore()
      await expect(store.createComment('task', 't1', { content: 'fail' })).rejects.toThrow('Create failed')
    })
  })

  describe('deleteComment', () => {
    it('throws when id is empty', async () => {
      const store = useCommentStore()
      await expect(store.deleteComment('')).rejects.toThrow('Comment ID is required')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useCommentStore()
      await expect(store.deleteComment('cm1')).rejects.toThrow('No team context')
    })

    it('removes comment from array', async () => {
      ;(mockRepo.deleteComment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useCommentStore()
      store.comments = [{ id: 'cm1' }, { id: 'cm2' }] as any[]

      await store.deleteComment('cm1')
      expect(store.comments).toHaveLength(1)
      expect(store.comments[0].id).toBe('cm2')
    })

    it('throws on deletion error', async () => {
      ;(mockRepo.deleteComment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'))
      const store = useCommentStore()
      store.comments = [{ id: 'cm1' }] as any[]
      await expect(store.deleteComment('cm1')).rejects.toThrow('Delete failed')
    })
  })
})
