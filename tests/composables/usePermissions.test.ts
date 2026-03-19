import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { makeTeamSummary, makeUser } from '../helpers/mock-factories'

describe('usePermissions', () => {
  let mockAuth: ReturnType<typeof setupStoreTest>['mockAuth']

  beforeEach(() => {
    const result = setupStoreTest()
    mockAuth = result.mockAuth
  })

  function seedWithRole(role: string) {
    seedAuth({
      user: makeUser({ role }),
      teams: [makeTeamSummary({ role })],
      currentTeam: makeTeamSummary({ role }),
      mockAuth,
    })
    const authStore = useAuthStore()
    // Directly set user role so computed properties resolve immediately
    authStore.user = { ...makeUser({ role }), role } as any
  }

  describe('role-based computed properties', () => {
    it('owner can edit and manage team, is not viewer', () => {
      seedWithRole('owner')
      const { canEdit, canManageTeam, isViewer } = usePermissions()

      expect(canEdit.value).toBe(true)
      expect(canManageTeam.value).toBe(true)
      expect(isViewer.value).toBe(false)
    })

    it('admin can edit and manage team, is not viewer', () => {
      seedWithRole('admin')
      const { canEdit, canManageTeam, isViewer } = usePermissions()

      expect(canEdit.value).toBe(true)
      expect(canManageTeam.value).toBe(true)
      expect(isViewer.value).toBe(false)
    })

    it('member can edit but cannot manage team, is not viewer', () => {
      seedWithRole('member')
      const { canEdit, canManageTeam, isViewer } = usePermissions()

      expect(canEdit.value).toBe(true)
      expect(canManageTeam.value).toBe(false)
      expect(isViewer.value).toBe(false)
    })

    it('viewer cannot edit or manage team, isViewer is true', () => {
      seedWithRole('viewer')
      const { canEdit, canManageTeam, isViewer } = usePermissions()

      expect(canEdit.value).toBe(false)
      expect(canManageTeam.value).toBe(false)
      expect(isViewer.value).toBe(true)
    })
  })

  describe('disabledProps', () => {
    it('returns empty object when boolean permission is true', () => {
      seedWithRole('owner')
      const { disabledProps } = usePermissions()

      expect(disabledProps(true)).toEqual({})
    })

    it('returns disabled attrs when boolean permission is false', () => {
      seedWithRole('viewer')
      const { disabledProps } = usePermissions()

      const result = disabledProps(false)
      expect(result).toEqual({
        disabled: true,
        title: 'You need Member role or higher',
      })
    })

    it('returns empty object when ref permission is true', () => {
      seedWithRole('owner')
      const { disabledProps } = usePermissions()

      const permission = ref(true)
      expect(disabledProps(permission)).toEqual({})
    })

    it('returns disabled attrs when ref permission is false', () => {
      seedWithRole('viewer')
      const { disabledProps } = usePermissions()

      const permission = ref(false)
      expect(disabledProps(permission)).toEqual({
        disabled: true,
        title: 'You need Member role or higher',
      })
    })

    it('works with computed permission values from the composable', () => {
      seedWithRole('viewer')
      const { canEdit, disabledProps } = usePermissions()

      expect(disabledProps(canEdit)).toEqual({
        disabled: true,
        title: 'You need Member role or higher',
      })
    })

    it('works with granted computed permission values', () => {
      seedWithRole('owner')
      const { canEdit, disabledProps } = usePermissions()

      expect(disabledProps(canEdit)).toEqual({})
    })
  })
})
