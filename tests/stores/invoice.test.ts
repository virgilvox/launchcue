import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useInvoiceStore } from '@/stores/invoice'
import { INVOICE_REPO, SCOPE_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useInvoiceStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>
  let mockScopeRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    mockScopeRepo = createMockRepository()
    setupStoreTest([
      { key: INVOICE_REPO, factory: () => mockRepo },
      { key: SCOPE_REPO, factory: () => mockScopeRepo },
    ])
    seedAuth()
  })

  describe('fetchInvoices', () => {
    it('returns empty when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useInvoiceStore()
      const result = await store.fetchInvoices()
      expect(result).toEqual([])
    })

    it('fetches and stores invoices', async () => {
      const invoices = [{ id: 'i1', total: 1000, status: 'sent' }]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(invoices)
      const store = useInvoiceStore()
      const result = await store.fetchInvoices()
      expect(result).toEqual(invoices)
      expect(store.invoices).toEqual(invoices)
    })
  })

  describe('createInvoice', () => {
    it('creates and pushes to array', async () => {
      const invoice = { id: 'i1', total: 500 }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(invoice)
      const store = useInvoiceStore()
      const result = await store.createInvoice({ clientId: 'c1' } as any)
      expect(result).toEqual(invoice)
      expect(store.invoices).toContainEqual(invoice)
    })
  })

  describe('createFromScope', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useInvoiceStore()
      await expect(store.createFromScope('s1')).rejects.toThrow('No team context')
    })

    it('creates invoice from scope data', async () => {
      const scope = {
        id: 's1',
        clientId: 'c1',
        deliverables: [
          { title: 'Design', quantity: 1, unit: 'hour', rate: 100 },
        ],
      }
      ;(mockScopeRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(scope)
      const invoice = { id: 'i1', total: 100 }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(invoice)

      const store = useInvoiceStore()
      const result = await store.createFromScope('s1')

      expect(result).toEqual(invoice)
      expect(store.invoices).toContainEqual(invoice)
      const createCall = (mockRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(createCall.clientId).toBe('c1')
      expect(createCall.scopeId).toBe('s1')
    })
  })

  describe('updateInvoice', () => {
    it('throws when id is empty', async () => {
      const store = useInvoiceStore()
      await expect(store.updateInvoice('', {})).rejects.toThrow('Invoice ID is required')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useInvoiceStore()
      await expect(store.updateInvoice('i1', { status: 'sent' })).rejects.toThrow('No team context')
    })

    it('updates invoice in array', async () => {
      const updated = { id: 'i1', total: 2000, status: 'sent' }
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)
      const store = useInvoiceStore()
      store.invoices = [{ id: 'i1', total: 1000, status: 'draft' }] as any[]
      await store.updateInvoice('i1', { status: 'sent' })
      expect(store.invoices[0].status).toBe('sent')
    })
  })

  describe('deleteInvoice', () => {
    it('throws when id is empty', async () => {
      const store = useInvoiceStore()
      await expect(store.deleteInvoice('')).rejects.toThrow('Invoice ID is required')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useInvoiceStore()
      await expect(store.deleteInvoice('i1')).rejects.toThrow('No team context')
    })

    it('removes invoice from array', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const store = useInvoiceStore()
      store.invoices = [{ id: 'i1' }, { id: 'i2' }] as any[]
      await store.deleteInvoice('i1')
      expect(store.invoices).toHaveLength(1)
    })
  })

  describe('outstandingTotal', () => {
    it('sums sent and viewed invoices', () => {
      const store = useInvoiceStore()
      store.invoices = [
        { id: 'i1', total: 1000, status: 'sent' },
        { id: 'i2', total: 500, status: 'viewed' },
        { id: 'i3', total: 200, status: 'paid' },
        { id: 'i4', total: 300, status: 'draft' },
      ] as any[]
      expect(store.outstandingTotal).toBe(1500)
    })

    it('returns 0 when no outstanding', () => {
      const store = useInvoiceStore()
      store.invoices = [{ id: 'i1', total: 1000, status: 'paid' }] as any[]
      expect(store.outstandingTotal).toBe(0)
    })
  })

  describe('overdueCount', () => {
    it('counts overdue invoices', () => {
      const store = useInvoiceStore()
      store.invoices = [
        { id: 'i1', status: 'overdue' },
        { id: 'i2', status: 'sent' },
        { id: 'i3', status: 'overdue' },
      ] as any[]
      expect(store.overdueCount).toBe(2)
    })

    it('returns 0 when none overdue', () => {
      const store = useInvoiceStore()
      store.invoices = [{ id: 'i1', status: 'sent' }] as any[]
      expect(store.overdueCount).toBe(0)
    })
  })
})
