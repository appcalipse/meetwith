import {
  TimeNotAvailableError,
  AccountNotFoundError,
  InvalidSessionError,
  MeetingNotFoundError,
  MeetingWithYourselfError,
  MeetingCreationError,
  MultipleSchedulersError,
  NotGroupMemberError,
  AdminBelowOneError,
  IsGroupMemberError,
  AlreadyGroupMemberError,
  NotGroupAdminError,
  BadRequestError,
  GroupNotExistsError,
  IsGroupAdminError,
  UnauthorizedError,
  GateInUseError,
  ApiFetchError,
  GateConditionNotValidError,
  MeetingChangeConflictError,
  MeetingCancelConflictError,
  MeetingCancelForbiddenError,
  InvalidURL,
  Huddle01ServiceUnavailable,
  GoogleServiceUnavailable,
  ZoomServiceUnavailable,
  GroupCreationError,
  UserInvitationError,
  UrlCreationError,
  CouponExpired,
  CouponNotValid,
  CouponAlreadyUsed,
  NoActiveSubscription,
  SubscriptionNotCustom,
  SubscriptionDomainUpdateNotAllowed,
  MissingSubscriptionMetadataError,
  BillingPlanNotFoundError,
  BillingPlansFetchError,
  BillingPlanFetchError,
  BillingPlanProvidersFetchError,
  BillingPlanProviderFetchError,
  BillingPlanFromStripeProductError,
  StripeSubscriptionCreationError,
  StripeSubscriptionFetchError,
  StripeSubscriptionUpdateError,
  StripeSubscriptionTransactionLinkError,
  SubscriptionTransactionCreationError,
  SubscriptionPeriodCreationError,
  SubscriptionPeriodFetchError,
  SubscriptionHistoryCheckError,
  SubscriptionPeriodsFetchError,
  SubscriptionHistoryFetchError,
  BillingPeriodsFetchError,
  SubscriptionPeriodsExpirationError,
  SubscriptionPeriodStatusUpdateError,
  SubscriptionPeriodTransactionUpdateError,
  SubscriptionPeriodFindError,
  ContactAlreadyExists,
  ContactNotFound,
  ContactInviteNotFound,
  ContactInviteNotForAccount,
  OwnInviteError,
  ContactInviteAlreadySent,
  CantInviteYourself,
  MemberDoesNotExist,
  PermissionDenied,
  GuestListModificationDenied,
  MeetingDetailsModificationDenied,
  AvailabilityBlockNotFoundError,
  DefaultAvailabilityBlockError,
  InvalidAvailabilityBlockError,
  LastMeetingTypeError,
  MeetingTypeLimitExceededError,
  PaidMeetingTypeNotAllowedError,
  SchedulingGroupLimitExceededError,
  CalendarIntegrationLimitExceededError,
  QuickPollLimitExceededError,
  QuickPollSchedulingLimitExceededError,
  CalendarSyncLimitExceededError,
  TransactionCouldBeNotFoundError,
  ChainNotFound,
  MeetingTypeNotFound,
  InValidGuests,
  TransactionIsRequired,
  TransactionNotFoundError,
  AllMeetingSlotsUsedError,
  MeetingSlugAlreadyExists,
  UploadError,
  GuestRescheduleForbiddenError,
  MeetingSessionNotFoundError,
  ServiceUnavailableError,
  QuickPollNotFoundError,
  QuickPollSlugNotFoundError,
  QuickPollUnauthorizedError,
  QuickPollCreationError,
  QuickPollUpdateError,
  QuickPollCancellationError,
  QuickPollDeletionError,
  QuickPollParticipantNotFoundError,
  QuickPollParticipantCreationError,
  QuickPollParticipantUpdateError,
  QuickPollSlugGenerationError,
  QuickPollValidationError,
  QuickPollPermissionDeniedError,
  QuickPollPrivatePollAccessDeniedError,
  QuickPollExpiredError,
  QuickPollAlreadyCancelledError,
  QuickPollAlreadyCompletedError,
  DecryptionFailedError,
} from '@/utils/errors'

describe('Error Classes', () => {
  describe('TimeNotAvailableError', () => {
    it('should create error with correct name and message', () => {
      const error = new TimeNotAvailableError()
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('TimeNotAvailableError')
      expect(error.message).toBe('The selected slot is not available.')
    })
  })

  describe('AccountNotFoundError', () => {
    it('should create error with identifier in message', () => {
      const error = new AccountNotFoundError('user123')
      expect(error.name).toBe('AccountNotFoundError')
      expect(error.message).toBe('Account with identifier user123 not found.')
    })
  })

  describe('InvalidSessionError', () => {
    it('should create error with correct message', () => {
      const error = new InvalidSessionError()
      expect(error.name).toBe('InvalidSessionError')
      expect(error.message).toBe('Session was invalidated.')
    })
  })

  describe('MeetingNotFoundError', () => {
    it('should create error with identifier in message', () => {
      const error = new MeetingNotFoundError('meeting456')
      expect(error.name).toBe('MeetingNotFoundError')
      expect(error.message).toBe(
        'Meeting slot with identifier meeting456 not found.'
      )
    })
  })

  describe('MeetingWithYourselfError', () => {
    it('should create error with correct message', () => {
      const error = new MeetingWithYourselfError()
      expect(error.name).toBe('MeetingWithYourselfError')
      expect(error.message).toBe('Trying to meet with yourself?')
    })
  })

  describe('ApiFetchError', () => {
    it('should create error with status and message', () => {
      const error = new ApiFetchError(404, 'Not Found')
      expect(error.name).toBe('ApiFetchError')
      expect(error.message).toBe('Not Found')
      expect(error.status).toBe(404)
    })
  })

  describe('GroupCreationError', () => {
    it('should create error with message and details', () => {
      const error = new GroupCreationError('Failed to create', 'Invalid data')
      expect(error.name).toBe('GroupCreationError')
      expect(error.message).toBe('Failed to create')
      expect(error.details).toBe('Invalid data')
    })

    it('should handle empty details', () => {
      const error = new GroupCreationError('Failed to create')
      expect(error.details).toBe('')
    })
  })

  describe('UserInvitationError', () => {
    it('should create error with message and status', () => {
      const error = new UserInvitationError('Invitation failed', 400)
      expect(error.name).toBe('UserInvitationError')
      expect(error.message).toBe('Invitation failed')
      expect(error.status).toBe(400)
    })
  })

  describe('BillingPlanNotFoundError', () => {
    it('should include billing plan id in message', () => {
      const error = new BillingPlanNotFoundError('plan123')
      expect(error.name).toBe('BillingPlanNotFoundError')
      expect(error.message).toBe('Billing plan not found: plan123')
    })
  })

  describe('BillingPlansFetchError', () => {
    it('should use default message when none provided', () => {
      const error = new BillingPlansFetchError()
      expect(error.message).toBe('Failed to fetch billing plans')
    })

    it('should use custom message when provided', () => {
      const error = new BillingPlansFetchError('Custom error')
      expect(error.message).toBe('Custom error')
    })
  })

  describe('BillingPlanFetchError', () => {
    it('should include plan id in message', () => {
      const error = new BillingPlanFetchError('plan123')
      expect(error.message).toContain('plan123')
    })

    it('should use default message when no params', () => {
      const error = new BillingPlanFetchError()
      expect(error.message).toBe('Failed to fetch billing plan')
    })
  })

  describe('PermissionDenied', () => {
    it('should use default message', () => {
      const error = new PermissionDenied()
      expect(error.name).toBe('PermissionDenied')
      expect(error.message).toBe(
        'You do not have permission to perform this action'
      )
    })

    it('should use custom message', () => {
      const error = new PermissionDenied('Custom permission error')
      expect(error.message).toBe('Custom permission error')
    })
  })

  describe('GuestListModificationDenied', () => {
    it('should extend PermissionDenied', () => {
      const error = new GuestListModificationDenied()
      expect(error).toBeInstanceOf(PermissionDenied)
      expect(error.name).toBe('GuestListModificationDenied')
      expect(error.message).toContain("don't have permission")
    })
  })

  describe('MeetingDetailsModificationDenied', () => {
    it('should extend PermissionDenied', () => {
      const error = new MeetingDetailsModificationDenied()
      expect(error).toBeInstanceOf(PermissionDenied)
      expect(error.name).toBe('MeetingDetailsModificationDenied')
    })
  })

  describe('DefaultAvailabilityBlockError', () => {
    it('should use default message', () => {
      const error = new DefaultAvailabilityBlockError()
      expect(error.message).toBe('Cannot delete the default availability block')
    })

    it('should use custom message', () => {
      const error = new DefaultAvailabilityBlockError('Custom message')
      expect(error.message).toBe('Custom message')
    })
  })

  describe('InvalidAvailabilityBlockError', () => {
    it('should use provided message', () => {
      const error = new InvalidAvailabilityBlockError('Invalid data format')
      expect(error.message).toBe('Invalid data format')
    })
  })

  describe('TransactionCouldBeNotFoundError', () => {
    it('should include transaction hash in message', () => {
      const error = new TransactionCouldBeNotFoundError(
        '0x1234567890abcdef1234567890abcdef12345678'
      )
      expect(error.message).toContain('0x1234567890abcdef1234567890abcdef12345678')
    })
  })

  describe('ChainNotFound', () => {
    it('should include chain id in message', () => {
      const error = new ChainNotFound('1')
      expect(error.message).toBe('Chain 1 not found')
    })
  })

  describe('MeetingSlugAlreadyExists', () => {
    it('should include slug in message', () => {
      const error = new MeetingSlugAlreadyExists('my-meeting')
      expect(error.message).toContain('my-meeting')
    })
  })

  describe('UploadError', () => {
    it('should use custom message', () => {
      const error = new UploadError('File too large')
      expect(error.message).toBe('File too large')
    })
  })

  describe('MeetingSessionNotFoundError', () => {
    it('should include meeting id in message', () => {
      const error = new MeetingSessionNotFoundError('meeting123')
      expect(error.message).toContain('meeting123')
    })
  })

  describe('QuickPollNotFoundError', () => {
    it('should include poll id in message', () => {
      const error = new QuickPollNotFoundError('poll123')
      expect(error.message).toContain('poll123')
    })
  })

  describe('QuickPollSlugNotFoundError', () => {
    it('should include slug in message', () => {
      const error = new QuickPollSlugNotFoundError('my-poll')
      expect(error.message).toContain('my-poll')
    })
  })

  describe('QuickPollUnauthorizedError', () => {
    it('should use default message', () => {
      const error = new QuickPollUnauthorizedError()
      expect(error.message).toContain('do not have permission')
    })

    it('should use custom message', () => {
      const error = new QuickPollUnauthorizedError('Access denied')
      expect(error.message).toBe('Access denied')
    })
  })

  describe('QuickPollCreationError', () => {
    it('should use default message', () => {
      const error = new QuickPollCreationError()
      expect(error.message).toBe('Error creating quick poll')
    })

    it('should use custom message', () => {
      const error = new QuickPollCreationError('Custom creation error')
      expect(error.message).toBe('Custom creation error')
    })
  })

  describe('QuickPollValidationError', () => {
    it('should use provided message', () => {
      const error = new QuickPollValidationError('Invalid poll data')
      expect(error.message).toBe('Invalid poll data')
    })
  })

  describe('Simple Error Classes', () => {
    const simpleErrors = [
      { class: MeetingCreationError, name: 'MeetingCreationError' },
      { class: MultipleSchedulersError, name: 'MultipleSchedulersError' },
      { class: NotGroupMemberError, name: 'NotGroupMemberError' },
      { class: AdminBelowOneError, name: 'AdminBelowOneError' },
      { class: IsGroupMemberError, name: 'IsGroupMemberError' },
      { class: AlreadyGroupMemberError, name: 'AlreadyGroupMemberError' },
      { class: NotGroupAdminError, name: 'NotGroupAdminError' },
      { class: BadRequestError, name: 'BadRequestError' },
      { class: GroupNotExistsError, name: 'GroupNotExistsError' },
      { class: IsGroupAdminError, name: 'IsGroupAdminError' },
      { class: UnauthorizedError, name: 'UnauthorizedError' },
      { class: GateInUseError, name: 'GateInUseError' },
      { class: GateConditionNotValidError, name: 'GateConditionNotValidError' },
      { class: MeetingChangeConflictError, name: 'MeetingChangeConflictError' },
      { class: MeetingCancelConflictError, name: 'MeetingCancelConflictError' },
      {
        class: MeetingCancelForbiddenError,
        name: 'MeetingCancelForbiddenError',
      },
      {
        class: Huddle01ServiceUnavailable,
        name: 'Huddle01ServiceUnavailable',
      },
      { class: GoogleServiceUnavailable, name: 'GoogleServiceUnavailable' },
      { class: ZoomServiceUnavailable, name: 'ZoomServiceUnavailable' },
      { class: UrlCreationError, name: 'UrlCreationError' },
      { class: CouponExpired, name: 'CouponExpired' },
      { class: CouponNotValid, name: 'CouponNotValid' },
      { class: CouponAlreadyUsed, name: 'CouponAlreadyUsed' },
      { class: NoActiveSubscription, name: 'NoActiveSubscription' },
      { class: SubscriptionNotCustom, name: 'SubscriptionNotCustom' },
      {
        class: SubscriptionDomainUpdateNotAllowed,
        name: 'SubscriptionDomainUpdateNotAllowed',
      },
      {
        class: MissingSubscriptionMetadataError,
        name: 'MissingSubscriptionMetadataError',
      },
      { class: ContactAlreadyExists, name: 'ContactAlreadyExists' },
      { class: ContactNotFound, name: 'ContactNotFound' },
      { class: ContactInviteNotFound, name: 'ContactInviteNotFound' },
      {
        class: ContactInviteNotForAccount,
        name: 'ContactInviteNotForAccount',
      },
      { class: OwnInviteError, name: 'OwnInviteError' },
      { class: ContactInviteAlreadySent, name: 'ContactInviteAlreadySent' },
      { class: CantInviteYourself, name: 'CantInviteYourself' },
      { class: MemberDoesNotExist, name: 'MemberDoesNotExist' },
      {
        class: AvailabilityBlockNotFoundError,
        name: 'AvailabilityBlockNotFoundError',
      },
      { class: LastMeetingTypeError, name: 'LastMeetingTypeError' },
      {
        class: MeetingTypeLimitExceededError,
        name: 'MeetingTypeLimitExceededError',
      },
      {
        class: PaidMeetingTypeNotAllowedError,
        name: 'PaidMeetingTypeNotAllowedError',
      },
      {
        class: SchedulingGroupLimitExceededError,
        name: 'SchedulingGroupLimitExceededError',
      },
      {
        class: CalendarIntegrationLimitExceededError,
        name: 'CalendarIntegrationLimitExceededError',
      },
      {
        class: QuickPollLimitExceededError,
        name: 'QuickPollLimitExceededError',
      },
      {
        class: QuickPollSchedulingLimitExceededError,
        name: 'QuickPollSchedulingLimitExceededError',
      },
      {
        class: CalendarSyncLimitExceededError,
        name: 'CalendarSyncLimitExceededError',
      },
      { class: MeetingTypeNotFound, name: 'MeetingTypeNotFound' },
      { class: InValidGuests, name: 'InValidGuests' },
      { class: TransactionIsRequired, name: 'TransactionIsRequired' },
      { class: AllMeetingSlotsUsedError, name: 'AllMeetingSlotsUsedError' },
      {
        class: GuestRescheduleForbiddenError,
        name: 'GuestRescheduleForbiddenError',
      },
      { class: ServiceUnavailableError, name: 'Service Unavailable' },
      {
        class: QuickPollPrivatePollAccessDeniedError,
        name: 'QuickPollPrivatePollAccessDeniedError',
      },
      { class: QuickPollExpiredError, name: 'QuickPollExpiredError' },
      {
        class: QuickPollAlreadyCancelledError,
        name: 'QuickPollAlreadyCancelledError',
      },
      {
        class: QuickPollAlreadyCompletedError,
        name: 'QuickPollAlreadyCompletedError',
      },
      { class: DecryptionFailedError, name: 'DecryptionFailedError' },
    ]

    it.each(simpleErrors)('should create $name correctly', ({ class: ErrorClass, name }) => {
      const error = new ErrorClass()
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe(name)
      expect(error.message).toBeDefined()
    })
  })

  describe('InvalidURL', () => {
    it('should create error with empty message', () => {
      const error = new InvalidURL()
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('InvalidURL')
      expect(error.message).toBe('')
    })
  })

  describe('Stripe and Subscription Errors', () => {
    it('should create StripeSubscriptionCreationError', () => {
      const error = new StripeSubscriptionCreationError()
      expect(error.message).toBe('Failed to create Stripe subscription')
      
      const customError = new StripeSubscriptionCreationError('Custom message')
      expect(customError.message).toBe('Custom message')
    })

    it('should create StripeSubscriptionFetchError', () => {
      const error = new StripeSubscriptionFetchError('sub_123')
      expect(error.message).toContain('sub_123')
    })

    it('should create SubscriptionPeriodFetchError', () => {
      const error = new SubscriptionPeriodFetchError('0x123')
      expect(error.message).toContain('0x123')
    })

    it('should create TransactionNotFoundError', () => {
      const error = new TransactionNotFoundError(
        '0x1234567890abcdef1234567890abcdef12345678'
      )
      expect(error.message).toContain('0x1234567890abcdef1234567890abcdef12345678')
    })
  })
})
