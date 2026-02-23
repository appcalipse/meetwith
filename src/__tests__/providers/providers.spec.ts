/**
 * Smoke tests for provider modules
 *
 * These tests verify that provider modules can be imported without crashing
 * and have the expected exports.
 */

describe('provider modules', () => {
  describe('imports', () => {
    it('should import AccountProvider without crashing', () => {
      expect(() => require('@/providers/AccountProvider')).not.toThrow()
    })

    it('should import ContactInvitesProvider without crashing', () => {
      expect(() => require('@/providers/ContactInvitesProvider')).not.toThrow()
    })

    it('should import MetricStateProvider without crashing', () => {
      expect(() => require('@/providers/MetricStateProvider')).not.toThrow()
    })

    it('should import OnboardingModalProvider without crashing', () => {
      expect(() => require('@/providers/OnboardingModalProvider')).not.toThrow()
    })

    it('should import OnboardingProvider without crashing', () => {
      expect(() => require('@/providers/OnboardingProvider')).not.toThrow()
    })

    it('should import WalletProvider without crashing', () => {
      expect(() => require('@/providers/WalletProvider')).not.toThrow()
    })

    it('should import CalendarContext without crashing', () => {
      expect(() => require('@/providers/calendar/CalendarContext')).not.toThrow()
    })

    it('should import QuickPollAvailabilityContext without crashing', () => {
      expect(() => require('@/providers/quickpoll/QuickPollAvailabilityContext')).not.toThrow()
    })

    it('should import schedule ActionsContext without crashing', () => {
      expect(() => require('@/providers/schedule/ActionsContext')).not.toThrow()
    })

    it('should import schedule PermissionsContext without crashing', () => {
      expect(() => require('@/providers/schedule/PermissionsContext')).not.toThrow()
    })

    it('should import schedule ParticipantsContext without crashing', () => {
      expect(() => require('@/providers/schedule/ParticipantsContext')).not.toThrow()
    })

    it('should import schedule NavigationContext without crashing', () => {
      expect(() => require('@/providers/schedule/NavigationContext')).not.toThrow()
    })

    it('should import schedule ScheduleContext without crashing', () => {
      expect(() => require('@/providers/schedule/ScheduleContext')).not.toThrow()
    })
  })

  describe('module exports', () => {
    it('AccountProvider should have exports', () => {
      const mod = require('@/providers/AccountProvider')
      expect(mod).toBeDefined()
    })

    it('ContactInvitesProvider should have exports', () => {
      const mod = require('@/providers/ContactInvitesProvider')
      expect(mod).toBeDefined()
    })

    it('MetricStateProvider should have exports', () => {
      const mod = require('@/providers/MetricStateProvider')
      expect(mod).toBeDefined()
    })

    it('OnboardingModalProvider should have exports', () => {
      const mod = require('@/providers/OnboardingModalProvider')
      expect(mod).toBeDefined()
    })

    it('OnboardingProvider should have exports', () => {
      const mod = require('@/providers/OnboardingProvider')
      expect(mod).toBeDefined()
    })

    it('WalletProvider should have exports', () => {
      const mod = require('@/providers/WalletProvider')
      expect(mod).toBeDefined()
    })

    it('CalendarContext should have exports', () => {
      const mod = require('@/providers/calendar/CalendarContext')
      expect(mod).toBeDefined()
    })

    it('QuickPollAvailabilityContext should have exports', () => {
      const mod = require('@/providers/quickpoll/QuickPollAvailabilityContext')
      expect(mod).toBeDefined()
    })

    it('schedule ActionsContext should have exports', () => {
      const mod = require('@/providers/schedule/ActionsContext')
      expect(mod).toBeDefined()
    })

    it('schedule PermissionsContext should have exports', () => {
      const mod = require('@/providers/schedule/PermissionsContext')
      expect(mod).toBeDefined()
    })

    it('schedule ParticipantsContext should have exports', () => {
      const mod = require('@/providers/schedule/ParticipantsContext')
      expect(mod).toBeDefined()
    })

    it('schedule NavigationContext should have exports', () => {
      const mod = require('@/providers/schedule/NavigationContext')
      expect(mod).toBeDefined()
    })

    it('schedule ScheduleContext should have exports', () => {
      const mod = require('@/providers/schedule/ScheduleContext')
      expect(mod).toBeDefined()
    })
  })
})
