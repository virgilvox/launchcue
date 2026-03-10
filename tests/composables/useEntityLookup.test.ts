import { describe, it, expect, beforeEach } from 'vitest'
import { setupStoreTest } from '../helpers/store-setup'
import { useClientStore } from '@/stores/client'
import { useProjectStore } from '@/stores/project'
import { useEntityLookup } from '@/composables/useEntityLookup'
import { CLIENT_REPO, PROJECT_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'

describe('useEntityLookup', () => {
  beforeEach(() => {
    setupStoreTest([
      { key: CLIENT_REPO, factory: () => createMockRepository() },
      { key: PROJECT_REPO, factory: () => createMockRepository() },
    ])
  })

  function seedStores() {
    const clientStore = useClientStore()
    const projectStore = useProjectStore()

    clientStore.clients = [
      { id: 'c1', name: 'Acme Corp', color: 'blue' },
      { id: 'c2', name: 'Globex', color: 'emerald' },
    ] as any[]

    projectStore.projects = [
      { id: 'p1', title: 'Website Redesign' },
      { id: 'p2', title: 'Mobile App' },
    ] as any[]
  }

  it('getClientName returns client name when found', () => {
    seedStores()
    const { getClientName } = useEntityLookup()
    expect(getClientName('c1')).toBe('Acme Corp')
  })

  it('getClientName returns dash for null or unknown id', () => {
    seedStores()
    const { getClientName } = useEntityLookup()
    expect(getClientName(null)).toBe('\u2014')
    expect(getClientName(undefined)).toBe('\u2014')
    expect(getClientName('nonexistent')).toBe('\u2014')
  })

  it('getProjectName returns project title when found', () => {
    seedStores()
    const { getProjectName } = useEntityLookup()
    expect(getProjectName('p1')).toBe('Website Redesign')
  })

  it('getProjectName returns dash for null or unknown id', () => {
    seedStores()
    const { getProjectName } = useEntityLookup()
    expect(getProjectName(null)).toBe('\u2014')
    expect(getProjectName(undefined)).toBe('\u2014')
    expect(getProjectName('nonexistent')).toBe('\u2014')
  })

  it('getClientColorId returns color for known client', () => {
    seedStores()
    const { getClientColorId } = useEntityLookup()
    expect(getClientColorId('c1')).toBe('blue')
    expect(getClientColorId('c2')).toBe('emerald')
  })

  it('getClientColorId returns slate for null or unknown id', () => {
    seedStores()
    const { getClientColorId } = useEntityLookup()
    expect(getClientColorId(null)).toBe('slate')
    expect(getClientColorId('nonexistent')).toBe('slate')
  })

  it('getClientHex returns hex color string', () => {
    seedStores()
    const { getClientHex } = useEntityLookup()
    // 'blue' maps to '#3B82F6' per clientColors.ts
    expect(getClientHex('c1')).toBe('#3B82F6')
    // null/unknown falls back to slate '#64748B'
    expect(getClientHex(null)).toBe('#64748B')
  })
})
