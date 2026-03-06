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
    it('AccountProvider should export AccountContext and AccountProvider', () => {
      const mod = require('@/providers/AccountProvider')
      expect(mod.AccountContext).toBeDefined()
      expect(mod.AccountProvider).toBeDefined()
    })

    it('MetricStateProvider should export MetricStateContext', () => {
      const mod = require('@/providers/MetricStateProvider')
      expect(mod.MetricStateContext).toBeDefined()
      expect(mod.default).toBeDefined()
    })

    it('OnboardingModalProvider should export OnboardingModalContext and OnboardingModalProvider', () => {
      const mod = require('@/providers/OnboardingModalProvider')
      expect(mod.OnboardingModalContext).toBeDefined()
      expect(mod.OnboardingModalProvider).toBeDefined()
    })

    it('OnboardingProvider should export OnboardingContext and OnboardingProvider', () => {
      const mod = require('@/providers/OnboardingProvider')
      expect(mod.OnboardingContext).toBeDefined()
      expect(mod.OnboardingProvider).toBeDefined()
    })

    it('WalletProvider should export WalletProvider and useWallet', () => {
      const mod = require('@/providers/WalletProvider')
      expect(mod.WalletProvider).toBeDefined()
      expect(mod.useWallet).toBeDefined()
      expect(typeof mod.useWallet).toBe('function')
    })

    it('CalendarContext should export CalendarContext, CalendarProvider, and useCalendarContext', () => {
      const mod = require('@/providers/calendar/CalendarContext')
      expect(mod.CalendarContext).toBeDefined()
      expect(mod.CalendarProvider).toBeDefined()
      expect(mod.useCalendarContext).toBeDefined()
      expect(typeof mod.useCalendarContext).toBe('function')
    })

    it('QuickPollAvailabilityContext should export useQuickPollAvailability and QuickPollAvailabilityProvider', () => {
      const mod = require('@/providers/quickpoll/QuickPollAvailabilityContext')
      expect(mod.useQuickPollAvailability).toBeDefined()
      expect(mod.QuickPollAvailabilityProvider).toBeDefined()
    })

    it('schedule ActionsContext should export ActionsContext and useScheduleActions', () => {
      const mod = require('@/providers/schedule/ActionsContext')
      expect(mod.ActionsContext).toBeDefined()
      expect(mod.useScheduleActions).toBeDefined()
      expect(typeof mod.useScheduleActions).toBe('function')
    })

    it('schedule PermissionsContext should export useParticipantPermissions and PermissionsProvider', () => {
      const mod = require('@/providers/schedule/PermissionsContext')
      expect(mod.useParticipantPermissions).toBeDefined()
      expect(mod.PermissionsProvider).toBeDefined()
    })

    it('schedule ParticipantsContext should export ParticipantsContext, useParticipants, and ParticipantsProvider', () => {
      const mod = require('@/providers/schedule/ParticipantsContext')
      expect(mod.ParticipantsContext).toBeDefined()
      expect(mod.useParticipants).toBeDefined()
      expect(mod.ParticipantsProvider).toBeDefined()
    })

    it('schedule NavigationContext should export useScheduleNavigation, NavigationProvider, and Page enum', () => {
      const mod = require('@/providers/schedule/NavigationContext')
      expect(mod.useScheduleNavigation).toBeDefined()
      expect(mod.NavigationProvider).toBeDefined()
      expect(mod.Page).toBeDefined()
    })

    it('schedule ScheduleContext should export useScheduleState and ScheduleStateProvider', () => {
      const mod = require('@/providers/schedule/ScheduleContext')
      expect(mod.useScheduleState).toBeDefined()
      expect(mod.ScheduleStateProvider).toBeDefined()
    })
  })
})
