import {
  clearQuickPollSignInContext,
  getGuestPollDetails,
  getMeetingsScheduled,
  getNotificationTime,
  getQuickPollSignInContext,
  getSignature,
  getSubscriptionHandle,
  incrementNotificationLookup,
  removeGuestPollDetails,
  removeSignature,
  removeSubscriptionHandle,
  saveGuestPollDetails,
  saveMeetingsScheduled,
  saveNotificationTime,
  saveQuickPollSignInContext,
  saveSignature,
  saveSubscriptionHandle,
} from '@/utils/storage'

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.restoreAllMocks()
  })

  describe('saveSignature / getSignature / removeSignature', () => {
    it('should save and retrieve a signature', () => {
      saveSignature('0xABC123', 'sig_value')
      expect(getSignature('0xABC123')).toBe('sig_value')
    })

    it('should be case insensitive for addresses', () => {
      saveSignature('0xABC123', 'sig_value')
      expect(getSignature('0xabc123')).toBe('sig_value')
    })

    it('should remove a signature', () => {
      saveSignature('0xABC123', 'sig_value')
      removeSignature('0xABC123')
      expect(getSignature('0xABC123')).toBeNull()
    })

    it('should return null when getSignature is called with empty string', () => {
      expect(getSignature('')).toBeNull()
    })
  })

  describe('saveMeetingsScheduled / getMeetingsScheduled', () => {
    it('should set meetings scheduled to 1 on first save', () => {
      saveMeetingsScheduled('0xABC')
      expect(getMeetingsScheduled('0xabc')).toBe(1)
    })

    it('should increment meetings scheduled on subsequent saves', () => {
      saveMeetingsScheduled('0xABC')
      saveMeetingsScheduled('0xABC')
      saveMeetingsScheduled('0xABC')
      expect(getMeetingsScheduled('0xabc')).toBe(3)
    })

    it('should return NaN when no meetings are scheduled', () => {
      expect(getMeetingsScheduled('0xNONE')).toBeNaN()
    })
  })

  describe('saveNotificationTime / getNotificationTime / incrementNotificationLookup', () => {
    it('should save notification time with date+24h and lookups=0', () => {
      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now)

      saveNotificationTime('0xABC')
      const result = getNotificationTime('0xABC')

      expect(result).toEqual({
        date: now + 24 * 60 * 60 * 1000,
        lookups: 0,
      })
    })

    it('should increment lookups', () => {
      saveNotificationTime('0xABC')
      incrementNotificationLookup('0xABC')
      incrementNotificationLookup('0xABC')

      const result = getNotificationTime('0xABC')
      expect(result!.lookups).toBe(2)
    })

    it('should return default when no data is stored', () => {
      const result = getNotificationTime('0xNONE')
      expect(result).toEqual({ date: 0, lookups: 0 })
    })

    it('should return null when address is undefined', () => {
      expect(getNotificationTime(undefined)).toBeNull()
    })

    it('should do nothing when saveNotificationTime is called with undefined', () => {
      saveNotificationTime(undefined)
      expect(window.localStorage.length).toBe(0)
    })

    it('should do nothing when incrementNotificationLookup is called with undefined', () => {
      incrementNotificationLookup(undefined)
      expect(window.localStorage.length).toBe(0)
    })
  })

  describe('saveGuestPollDetails / getGuestPollDetails / removeGuestPollDetails', () => {
    const guestDetails = {
      participantId: 'p1',
      email: 'test@example.com',
      name: 'Test User',
    }

    it('should save and retrieve guest poll details', () => {
      saveGuestPollDetails('poll-1', guestDetails)
      expect(getGuestPollDetails('poll-1')).toEqual(guestDetails)
    })

    it('should return null when no details are stored', () => {
      expect(getGuestPollDetails('nonexistent')).toBeNull()
    })

    it('should return null for invalid JSON', () => {
      window.localStorage.setItem('quickpoll_guest_details:poll-bad', '{invalid')
      expect(getGuestPollDetails('poll-bad')).toBeNull()
    })

    it('should remove guest poll details', () => {
      saveGuestPollDetails('poll-1', guestDetails)
      removeGuestPollDetails('poll-1')
      expect(getGuestPollDetails('poll-1')).toBeNull()
    })
  })

  describe('saveSubscriptionHandle / getSubscriptionHandle / removeSubscriptionHandle', () => {
    it('should save and retrieve a subscription handle', () => {
      saveSubscriptionHandle('handle_abc')
      expect(getSubscriptionHandle()).toBe('handle_abc')
    })

    it('should return null when no handle is stored', () => {
      expect(getSubscriptionHandle()).toBeNull()
    })

    it('should remove the subscription handle', () => {
      saveSubscriptionHandle('handle_abc')
      removeSubscriptionHandle()
      expect(getSubscriptionHandle()).toBeNull()
    })
  })

  describe('saveQuickPollSignInContext / getQuickPollSignInContext / clearQuickPollSignInContext', () => {
    const context = {
      pollSlug: 'my-poll',
      pollId: 'poll-123',
      pollTitle: 'My Poll',
      returnUrl: '/poll/my-poll',
    }

    it('should save context with a timestamp', () => {
      const now = 1000000
      jest.spyOn(Date, 'now').mockReturnValue(now)

      saveQuickPollSignInContext(context)
      const result = getQuickPollSignInContext()

      expect(result).toEqual({ ...context, timestamp: now })
    })

    it('should return context within TTL', () => {
      const now = 1000000
      jest.spyOn(Date, 'now').mockReturnValue(now)
      saveQuickPollSignInContext(context)

      // Advance time by 29 minutes (within 30 min TTL)
      jest.spyOn(Date, 'now').mockReturnValue(now + 29 * 60 * 1000)
      expect(getQuickPollSignInContext()).toEqual({ ...context, timestamp: now })
    })

    it('should return null after 30 minute expiry', () => {
      const now = 1000000
      jest.spyOn(Date, 'now').mockReturnValue(now)
      saveQuickPollSignInContext(context)

      // Advance time past 30 minutes
      jest.spyOn(Date, 'now').mockReturnValue(now + 30 * 60 * 1000 + 1)
      expect(getQuickPollSignInContext()).toBeNull()
    })

    it('should return null for invalid JSON', () => {
      window.localStorage.setItem('quickpoll_signin_context', '{invalid')
      expect(getQuickPollSignInContext()).toBeNull()
    })

    it('should clear the context', () => {
      const now = 1000000
      jest.spyOn(Date, 'now').mockReturnValue(now)
      saveQuickPollSignInContext(context)
      clearQuickPollSignInContext()
      expect(getQuickPollSignInContext()).toBeNull()
    })
  })
})
