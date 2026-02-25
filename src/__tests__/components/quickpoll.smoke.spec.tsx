/**
 * Smoke tests for quickpoll components
 * 
 * These tests verify that components can be imported and have basic structure
 */

describe('quickpoll components', () => {
  describe('imports', () => {
    it('should import MobileQuickPollParticipant without crashing', () => {
      expect(() => require('@/components/quickpoll/MobileQuickPollParticipant')).not.toThrow()
    })

    it('should import OngoingPolls without crashing', () => {
      expect(() => require('@/components/quickpoll/OngoingPolls')).not.toThrow()
    })

    it('should import CountSkeleton without crashing', () => {
      expect(() => require('@/components/quickpoll/CountSkeleton')).not.toThrow()
    })

    it('should import QuickPollAvailabilityDiscover without crashing', () => {
      expect(() => require('@/components/quickpoll/QuickPollAvailabilityDiscover')).not.toThrow()
    })

    it('should import GuestDetailsForm without crashing', () => {
      expect(() => require('@/components/quickpoll/GuestDetailsForm')).not.toThrow()
    })

    it('should import ChooseAvailabilityMethodModal without crashing', () => {
      expect(() => require('@/components/quickpoll/ChooseAvailabilityMethodModal')).not.toThrow()
    })

    it('should import CreatePoll without crashing', () => {
      expect(() => require('@/components/quickpoll/CreatePoll')).not.toThrow()
    })

    it('should import GuestIdentificationModal without crashing', () => {
      expect(() => require('@/components/quickpoll/GuestIdentificationModal')).not.toThrow()
    })

    it('should import QuickPollPickAvailability without crashing', () => {
      expect(() => require('@/components/quickpoll/QuickPollPickAvailability')).not.toThrow()
    })

    it('should import QuickPollMain without crashing', () => {
      expect(() => require('@/components/quickpoll/QuickPollMain')).not.toThrow()
    })

    it('should import QuickPollParticipationInstructions without crashing', () => {
      expect(() => require('@/components/quickpoll/QuickPollParticipationInstructions')).not.toThrow()
    })

    it('should import QuickPollSaveChangesModal without crashing', () => {
      expect(() => require('@/components/quickpoll/QuickPollSaveChangesModal')).not.toThrow()
    })

    it('should import FeatureCards without crashing', () => {
      expect(() => require('@/components/quickpoll/FeatureCards')).not.toThrow()
    })

    it('should import PollSuccessScreen without crashing', () => {
      expect(() => require('@/components/quickpoll/PollSuccessScreen')).not.toThrow()
    })

    it('should import AllPolls without crashing', () => {
      expect(() => require('@/components/quickpoll/AllPolls')).not.toThrow()
    })

    it('should import QuickPollParticipants without crashing', () => {
      expect(() => require('@/components/quickpoll/QuickPollParticipants')).not.toThrow()
    })

    it('should import QuickPoll without crashing', () => {
      expect(() => require('@/components/quickpoll/QuickPoll')).not.toThrow()
    })

    it('should import PollCard without crashing', () => {
      expect(() => require('@/components/quickpoll/PollCard')).not.toThrow()
    })

    it('should import PastPolls without crashing', () => {
      expect(() => require('@/components/quickpoll/PastPolls')).not.toThrow()
    })
  })

  describe('component structure', () => {
    it('QuickPoll should have exports', () => {
      const component = require('@/components/quickpoll/QuickPoll')
      expect(component).toBeDefined()
    })

    it('CreatePoll should have exports', () => {
      const component = require('@/components/quickpoll/CreatePoll')
      expect(component).toBeDefined()
    })

    it('QuickPollMain should have exports', () => {
      const component = require('@/components/quickpoll/QuickPollMain')
      expect(component).toBeDefined()
    })

    it('AllPolls should have exports', () => {
      const component = require('@/components/quickpoll/AllPolls')
      expect(component).toBeDefined()
    })
  })
})
