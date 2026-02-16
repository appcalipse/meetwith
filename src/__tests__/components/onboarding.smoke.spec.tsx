/**
 * Smoke tests for onboarding components
 *
 * These tests verify that components can be imported and have basic structure
 */

describe('onboarding components', () => {
  describe('imports', () => {
    it('should import OnboardingAvailabilityStep without crashing', () => {
      expect(() => require('@/components/onboarding/OnboardingAvailabilityStep')).not.toThrow()
    })

    it('should import OnboardingModal without crashing', () => {
      expect(() => require('@/components/onboarding/OnboardingModal')).not.toThrow()
    })

    it('should import DiscordOnboardingModal without crashing', () => {
      expect(() => require('@/components/onboarding/DiscordOnboardingModal')).not.toThrow()
    })

    it('should import DashboardOnboardingGauge without crashing', () => {
      expect(() => require('@/components/onboarding/DashboardOnboardingGauge')).not.toThrow()
    })

    it('should import GroupOnBoardingModal without crashing', () => {
      expect(() => require('@/components/onboarding/GroupOnBoardingModal')).not.toThrow()
    })
  })

  describe('component structure', () => {
    it('OnboardingModal should have exports', () => {
      const component = require('@/components/onboarding/OnboardingModal')
      expect(component).toBeDefined()
    })

    it('DiscordOnboardingModal should have exports', () => {
      const component = require('@/components/onboarding/DiscordOnboardingModal')
      expect(component).toBeDefined()
    })

    it('DashboardOnboardingGauge should have exports', () => {
      const component = require('@/components/onboarding/DashboardOnboardingGauge')
      expect(component).toBeDefined()
    })
  })
})
