import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Composable for role-based UI gating.
 *
 * Usage:
 *   const { canEdit, disabledProps } = usePermissions()
 *   // In template: <button v-bind="disabledProps(canEdit)" ...>
 */
export function usePermissions() {
  const auth = useAuthStore()

  const canEdit = computed(() => auth.canEdit)
  const canManageTeam = computed(() => auth.canManageTeam)
  const isViewer = computed(() => auth.isViewer)

  /**
   * Returns `{ disabled: true, title: '...' }` when the given permission is
   * false, or `{}` when true.  Spread onto any `<button>` with `v-bind`.
   */
  function disabledProps(permission: { value: boolean } | boolean) {
    const allowed = typeof permission === 'boolean' ? permission : permission.value
    if (allowed) return {}
    return { disabled: true, title: 'You need Member role or higher' }
  }

  return { canEdit, canManageTeam, isViewer, disabledProps }
}
