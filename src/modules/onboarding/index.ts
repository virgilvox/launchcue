import type { FeatureModule } from '@/core/types'

export const onboardingModule: FeatureModule = {
  id: 'onboarding',
  name: 'Onboarding',
  dependencies: ['clients'],
  // Onboarding routes are portal-only, registered separately in the portal layout
  // No main app nav items — onboarding is accessed through client detail pages
}
