export class TimeNotAvailableError extends Error {
  constructor() {
    super('The selected slot is not available.')
    this.name = 'TimeNotAvailableError'
  }
}

export class AccountNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Account with identifier ${identifier} not found.`)
    this.name = 'AccountNotFoundError'
  }
}

export class InvalidSessionError extends Error {
  constructor() {
    super('Session was invalidated.')
    this.name = 'InvalidSessionError'
  }
}

export class MeetingNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Meeting slot with identifier ${identifier} not found.`)
    this.name = 'MeetingNotFoundError'
  }
}

export class MeetingWithYourselfError extends Error {
  constructor() {
    super(`Trying to meet with yourself?`)
    this.name = 'MeetingWithYourselfError'
  }
}

export class MeetingCreationError extends Error {
  constructor() {
    super(`Error creating meeting`)
    this.name = 'MeetingCreationError'
  }
}

export class MultipleSchedulersError extends Error {
  constructor() {
    super(`A meeting must have only one scheduler`)
    this.name = 'MultipleSchedulersError'
  }
}

export class NotGroupMemberError extends Error {
  constructor() {
    super(`Not a group member`)
    this.name = 'NotGroupMemberError'
  }
}

export class AdminBelowOneError extends Error {
  constructor() {
    super(`Cannot have less than one admin`)
    this.name = 'AdminBelowOneError'
  }
}
export class IsGroupMemberError extends Error {
  constructor() {
    super(`Group member cannot perform action`)
    this.name = 'IsGroupMemberError'
  }
}
export class AlreadyGroupMemberError extends Error {
  constructor() {
    super(`Group member cannot accept invite again`)
    this.name = 'AlreadyGroupMemberError'
  }
}
export class NotGroupAdminError extends Error {
  constructor() {
    super(`Not a group admin`)
    this.name = 'NotGroupAdminError'
  }
}

export class BadRequestError extends Error {
  constructor() {
    super(`Bad request`)
    this.name = 'BadRequestError'
  }
}

export class GroupNotExistsError extends Error {
  constructor() {
    super(`Group does not exists`)
    this.name = 'GroupNotExistsError'
  }
}

export class IsGroupAdminError extends Error {
  constructor() {
    super(`Group admin cannot perform action`)
    this.name = 'IsGroupAdminError'
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You don't have access to this resource.")
    this.name = 'UnauthorizedError'
  }
}

export class GateInUseError extends Error {
  constructor() {
    super("This gate is being used and therefore can't be deleted.")
    this.name = 'GateInUseError'
  }
}

export class ApiFetchError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(`${message}`)
    this.name = 'ApiFetchError'
    this.status = status
  }
}

export class GateConditionNotValidError extends Error {
  constructor() {
    super(`You do not meet the necessary token conditions to do this action.`)
    this.name = 'GateConditionNotValidError'
  }
}

export class MeetingChangeConflictError extends Error {
  constructor() {
    super(
      `Somebody edited the meeting before you, Please refresh the page to get the latest status.`
    )
    this.name = 'MeetingChangeConflictError'
  }
}
export class MeetingCancelConflictError extends Error {
  constructor() {
    super(
      `Somebody else cancelled the meeting before you. Please refresh the page to get the latest status.`
    )
    this.name = 'MeetingCancelConflictError'
  }
}

export class MeetingCancelForbiddenError extends Error {
  constructor() {
    super(
      `Only the host or owners can cancel the meeting. You can RSPV "no" from the calendar-invite and/or ask the host to reschedule`
    )
    this.name = 'MeetingCancelForbiddenError'
  }
}

export class InvalidURL extends Error {
  constructor() {
    super(``)
    this.name = 'InvalidURL'
  }
}

export class Huddle01ServiceUnavailable extends Error {
  constructor() {
    super(`Huddle API is broken`)
    this.name = 'Huddle01ServiceUnavailable'
  }
}
export class GoogleServiceUnavailable extends Error {
  constructor() {
    super(`Google API is unavailable`)
    this.name = 'GoogleServiceUnavailable'
  }
}

export class ZoomServiceUnavailable extends Error {
  constructor() {
    super(`Zoom API is broken`)
    this.name = 'ZoomServiceUnavailable'
  }
}

export class GroupCreationError extends Error {
  details: string

  constructor(message: string, details = '') {
    super(message)
    this.name = 'GroupCreationError'
    this.details = details
  }
}

export class UserInvitationError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'UserInvitationError'
    this.status = status
  }
}

export class UrlCreationError extends Error {
  constructor() {
    super(`Error creating URL`)
    this.name = 'UrlCreationError'
  }
}

export class CouponExpired extends Error {
  constructor() {
    super(`Coupon has expired`)
    this.name = 'CouponExpired'
  }
}
export class CouponNotValid extends Error {
  constructor() {
    super(`Coupon is not valid`)
    this.name = 'CouponNotValid'
  }
}
export class CouponAlreadyUsed extends Error {
  constructor() {
    super(`Coupon has already been used`)
    this.name = 'CouponAlreadyUsed'
  }
}

export class NoActiveSubscription extends Error {
  constructor() {
    super(`No active subscription found`)
    this.name = 'NoActiveSubscription'
  }
}

export class SubscriptionNotCustom extends Error {
  constructor() {
    super(`Subscription is not custom`)
    this.name = 'SubscriptionNotCustom'
  }
}

export class SubscriptionDomainUpdateNotAllowed extends Error {
  constructor() {
    super(
      'Domain can only be updated for billing subscriptions or custom subscriptions. Legacy blockchain subscriptions require on-chain transactions.'
    )
    this.name = 'SubscriptionDomainUpdateNotAllowed'
  }
}

export class MissingSubscriptionMetadataError extends Error {
  constructor() {
    super(
      'Missing required subscription metadata: billing_plan_id or account_address'
    )
    this.name = 'MissingSubscriptionMetadataError'
  }
}

export class BillingPlanNotFoundError extends Error {
  constructor(billing_plan_id: string) {
    super(`Billing plan not found: ${billing_plan_id}`)
    this.name = 'BillingPlanNotFoundError'
  }
}

// Billing Plan Errors
export class BillingPlansFetchError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to fetch billing plans')
    this.name = 'BillingPlansFetchError'
  }
}

export class BillingPlanFetchError extends Error {
  constructor(planId?: string, message?: string) {
    super(
      message || `Failed to fetch billing plan${planId ? `: ${planId}` : ''}`
    )
    this.name = 'BillingPlanFetchError'
  }
}

export class BillingPlanProvidersFetchError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to fetch billing plan providers')
    this.name = 'BillingPlanProvidersFetchError'
  }
}

export class BillingPlanProviderFetchError extends Error {
  constructor(planId?: string, provider?: string, message?: string) {
    super(
      message ||
        `Failed to fetch billing plan provider${
          planId ? ` for plan ${planId}` : ''
        }${provider ? ` and provider ${provider}` : ''}`
    )
    this.name = 'BillingPlanProviderFetchError'
  }
}

export class BillingPlanFromStripeProductError extends Error {
  constructor(stripeProductId?: string, message?: string) {
    super(
      message ||
        `Failed to fetch billing plan from Stripe product${
          stripeProductId ? `: ${stripeProductId}` : ''
        }`
    )
    this.name = 'BillingPlanFromStripeProductError'
  }
}

// Stripe Subscription Errors
export class StripeSubscriptionCreationError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to create Stripe subscription')
    this.name = 'StripeSubscriptionCreationError'
  }
}

export class StripeSubscriptionFetchError extends Error {
  constructor(identifier?: string, message?: string) {
    super(
      message ||
        `Failed to fetch Stripe subscription${
          identifier ? `: ${identifier}` : ''
        }`
    )
    this.name = 'StripeSubscriptionFetchError'
  }
}

export class StripeSubscriptionUpdateError extends Error {
  constructor(stripeSubscriptionId?: string, message?: string) {
    super(
      message ||
        `Failed to update Stripe subscription${
          stripeSubscriptionId ? `: ${stripeSubscriptionId}` : ''
        }`
    )
    this.name = 'StripeSubscriptionUpdateError'
  }
}

export class StripeSubscriptionTransactionLinkError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to link transaction to Stripe subscription')
    this.name = 'StripeSubscriptionTransactionLinkError'
  }
}

// Subscription Transaction Errors
export class SubscriptionTransactionCreationError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to create subscription transaction')
    this.name = 'SubscriptionTransactionCreationError'
  }
}

// Subscription Period Errors
export class SubscriptionPeriodCreationError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to create subscription period')
    this.name = 'SubscriptionPeriodCreationError'
  }
}

export class SubscriptionPeriodFetchError extends Error {
  constructor(accountAddress?: string, message?: string) {
    super(
      message ||
        `Failed to fetch subscription period${
          accountAddress ? ` for account ${accountAddress}` : ''
        }`
    )
    this.name = 'SubscriptionPeriodFetchError'
  }
}

export class SubscriptionHistoryCheckError extends Error {
  constructor(accountAddress?: string, message?: string) {
    super(
      message ||
        `Failed to check subscription history${
          accountAddress ? ` for account ${accountAddress}` : ''
        }`
    )
    this.name = 'SubscriptionHistoryCheckError'
  }
}

export class SubscriptionPeriodsFetchError extends Error {
  constructor(accountAddress?: string, message?: string) {
    super(
      message ||
        `Failed to fetch subscription periods${
          accountAddress ? ` for account ${accountAddress}` : ''
        }`
    )
    this.name = 'SubscriptionPeriodsFetchError'
  }
}

export class SubscriptionHistoryFetchError extends Error {
  constructor(accountAddress?: string, message?: string) {
    super(
      message ||
        `Failed to fetch subscription history${
          accountAddress ? ` for account ${accountAddress}` : ''
        }`
    )
    this.name = 'SubscriptionHistoryFetchError'
  }
}

export class BillingPeriodsFetchError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to fetch billing periods by expiry window')
    this.name = 'BillingPeriodsFetchError'
  }
}

export class SubscriptionPeriodsExpirationError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to expire subscription periods')
    this.name = 'SubscriptionPeriodsExpirationError'
  }
}

export class SubscriptionPeriodStatusUpdateError extends Error {
  constructor(subscriptionId?: string, message?: string) {
    super(
      message ||
        `Failed to update subscription period status${
          subscriptionId ? `: ${subscriptionId}` : ''
        }`
    )
    this.name = 'SubscriptionPeriodStatusUpdateError'
  }
}

export class SubscriptionPeriodTransactionUpdateError extends Error {
  constructor(subscriptionId?: string, message?: string) {
    super(
      message ||
        `Failed to update subscription period transaction${
          subscriptionId ? `: ${subscriptionId}` : ''
        }`
    )
    this.name = 'SubscriptionPeriodTransactionUpdateError'
  }
}

export class SubscriptionPeriodFindError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to find subscription period')
    this.name = 'SubscriptionPeriodFindError'
  }
}

export class ContactAlreadyExists extends Error {
  constructor() {
    super(`Contact already exists`)
    this.name = 'ContactAlreadyExists'
  }
}
export class ContactNotFound extends Error {
  constructor() {
    super(`Contact not found`)
    this.name = 'ContactNotFound'
  }
}

export class ContactInviteNotFound extends Error {
  constructor() {
    super(`Contact invite not found`)
    this.name = 'ContactInviteNotFound'
  }
}

export class ContactInviteNotForAccount extends Error {
  constructor() {
    super(`Contact invite not for this account`)
    this.name = 'ContactInviteNotForAccount'
  }
}

// you can't accept your own invite
export class OwnInviteError extends Error {
  constructor() {
    super(`You can't accept your own invite`)
    this.name = 'OwnInviteError'
  }
}

export class ContactInviteAlreadySent extends Error {
  constructor() {
    super(`Contact invite already sent`)
    this.name = 'ContactInviteAlreadySent'
  }
}

export class CantInviteYourself extends Error {
  constructor() {
    super(`You can't invite yourself`)
    this.name = 'CantInviteYourself'
  }
}
export class MemberDoesNotExist extends Error {
  constructor() {
    super(`Member does not exist in this group`)
    this.name = 'MemberDoesNotExist'
  }
}

export class PermissionDenied extends Error {
  constructor(message = `You do not have permission to perform this action`) {
    super(message)
    this.name = 'PermissionDenied'
  }
}
export class GuestListModificationDenied extends PermissionDenied {
  constructor() {
    super("You don't have permission to modify the meeting invitees.")
    this.name = 'GuestListModificationDenied'
  }
}

export class MeetingDetailsModificationDenied extends PermissionDenied {
  constructor() {
    super("You don't have permission to modify the meeting details")
    this.name = 'MeetingDetailsModificationDenied'
  }
}

export class AvailabilityBlockNotFoundError extends Error {
  constructor() {
    super('Availability block not found')
    this.name = 'AvailabilityBlockNotFoundError'
  }
}

export class DefaultAvailabilityBlockError extends Error {
  constructor(message?: string) {
    super(message || 'Cannot delete the default availability block')
    this.name = 'DefaultAvailabilityBlockError'
  }
}

export class InvalidAvailabilityBlockError extends Error {
  constructor(message: string) {
    super(message || 'Invalid availability block data')
    this.name = 'InvalidAvailabilityBlockError'
  }
}

export class LastMeetingTypeError extends Error {
  constructor() {
    super(
      `You cannot delete your last meeting type, please create a new one first`
    )
    this.name = 'LastMeetingTypeError'
  }
}

export class MeetingTypeLimitExceededError extends Error {
  constructor() {
    super(
      `Free tier allows only 1 meeting type. Upgrade to Pro for unlimited meeting types.`
    )
    this.name = 'MeetingTypeLimitExceededError'
  }
}

export class PaidMeetingTypeNotAllowedError extends Error {
  constructor() {
    super(
      `Free tier only allows FREE meeting types. Upgrade to Pro to create paid meeting types.`
    )
    this.name = 'PaidMeetingTypeNotAllowedError'
  }
}

export class SchedulingGroupLimitExceededError extends Error {
  constructor() {
    super(
      `Free tier allows joining up to 5 groups. Upgrade to Pro to join unlimited groups and create your own.`
    )
    this.name = 'SchedulingGroupLimitExceededError'
  }
}

export class CalendarIntegrationLimitExceededError extends Error {
  constructor() {
    super(
      `Free tier allows only 2 calendar integrations. Upgrade to Pro for unlimited calendar integrations.`
    )
    this.name = 'CalendarIntegrationLimitExceededError'
  }
}

export class QuickPollLimitExceededError extends Error {
  constructor() {
    super(
      `Free tier allows only 1 active poll per month. Upgrade to Pro for unlimited active polls.`
    )
    this.name = 'QuickPollLimitExceededError'
  }
}

export class QuickPollSchedulingLimitExceededError extends Error {
  constructor() {
    super(
      `Free tier allows only 1 poll scheduling per month. Upgrade to Pro for unlimited poll scheduling.`
    )
    this.name = 'QuickPollSchedulingLimitExceededError'
  }
}

export class CalendarSyncLimitExceededError extends Error {
  constructor() {
    super(
      `Free tier allows only 2 calendar syncs. Upgrade to Pro for unlimited calendar syncs.`
    )
    this.name = 'CalendarSyncLimitExceededError'
  }
}

export class TransactionCouldBeNotFoundError extends Error {
  constructor(txHash: `0x${string}`) {
    super(`Transaction or receipt not found for hash: ${txHash}`)
    this.name = 'TransactionCouldNotFoundError'
  }
}

export class ChainNotFound extends Error {
  constructor(chainId: string) {
    super(`Chain ${chainId} not found`)
    this.name = 'ChainNotFound'
  }
}

export class MeetingTypeNotFound extends Error {
  constructor() {
    super(`Meeting type not found`)
    this.name = 'MeetingTypeNotFound'
  }
}

export class InValidGuests extends Error {
  constructor() {
    super(`Guest email or address is required.`)
    this.name = 'InValidGuests'
  }
}

export class TransactionIsRequired extends Error {
  constructor() {
    super('Transaction hash is required')
    this.name = 'TransactionIsRequired'
  }
}

export class TransactionNotFoundError extends Error {
  constructor(txHash: `0x${string}`) {
    super(`Transaction with hash: ${txHash} not found`)
    this.name = 'TransactionNotFoundError'
  }
}

export class AllMeetingSlotsUsedError extends Error {
  constructor() {
    super('All meeting slots are already used for this transaction')
    this.name = 'AllMeetingSlotsUsedError'
  }
}

export class MeetingSlugAlreadyExists extends Error {
  constructor(slug: string) {
    super(`Custom booking link path ${slug} already exists`)
    this.name = 'MeetingSlugAlreadyExists'
  }
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadError'
  }
}

export class GuestRescheduleForbiddenError extends Error {
  constructor() {
    super('Only the scheduler can reschedule this meeting.')
    this.name = 'GuestRescheduleForbiddenError'
  }
}
export class MeetingSessionNotFoundError extends Error {
  constructor(meeting_id: string) {
    super(`Meeting session not found for id: ${meeting_id}`)
    this.name = 'MeetingSessionNotFoundError'
  }
}

export class ServiceUnavailableError extends Error {
  constructor() {
    super(
      'We’re having trouble connecting at the moment. Please try again shortly.'
    )
    this.name = 'Service Unavailable'
  }
}

export class QuickPollNotFoundError extends Error {
  constructor(pollId: string) {
    super(`Quick poll with id ${pollId} not found`)
    this.name = 'QuickPollNotFoundError'
  }
}

export class QuickPollSlugNotFoundError extends Error {
  constructor(slug: string) {
    super(`Quick poll with slug ${slug} not found`)
    this.name = 'QuickPollSlugNotFoundError'
  }
}

export class QuickPollUnauthorizedError extends Error {
  constructor(
    message = 'You do not have permission to perform this action on this poll'
  ) {
    super(message)
    this.name = 'QuickPollUnauthorizedError'
  }
}

export class QuickPollCreationError extends Error {
  constructor(message = 'Error creating quick poll') {
    super(message)
    this.name = 'QuickPollCreationError'
  }
}

export class QuickPollUpdateError extends Error {
  constructor(message = 'Error updating quick poll') {
    super(message)
    this.name = 'QuickPollUpdateError'
  }
}

export class QuickPollCancellationError extends Error {
  constructor(message = 'Error cancelling quick poll') {
    super(message)
    this.name = 'QuickPollCancellationError'
  }
}

export class QuickPollDeletionError extends Error {
  constructor(message = 'Error deleting quick poll') {
    super(message)
    this.name = 'QuickPollDeletionError'
  }
}

export class QuickPollParticipantNotFoundError extends Error {
  constructor(participantId: string) {
    super(`Quick poll participant with id ${participantId} not found`)
    this.name = 'QuickPollParticipantNotFoundError'
  }
}

export class QuickPollParticipantCreationError extends Error {
  constructor(message = 'Error adding participant to quick poll') {
    super(message)
    this.name = 'QuickPollParticipantCreationError'
  }
}

export class QuickPollParticipantUpdateError extends Error {
  constructor(message = 'Error updating quick poll participant') {
    super(message)
    this.name = 'QuickPollParticipantUpdateError'
  }
}

export class QuickPollSlugGenerationError extends Error {
  constructor(message = 'Error generating unique poll slug') {
    super(message)
    this.name = 'QuickPollSlugGenerationError'
  }
}

export class QuickPollValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuickPollValidationError'
  }
}

export class QuickPollPermissionDeniedError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message)
    this.name = 'QuickPollPermissionDeniedError'
  }
}

export class QuickPollExpiredError extends Error {
  constructor() {
    super('This poll has expired and is no longer accepting responses')
    this.name = 'QuickPollExpiredError'
  }
}

export class QuickPollAlreadyCancelledError extends Error {
  constructor() {
    super('This poll has already been cancelled')
    this.name = 'QuickPollAlreadyCancelledError'
  }
}

export class QuickPollAlreadyCompletedError extends Error {
  constructor() {
    super('This poll has already been completed')
    this.name = 'QuickPollAlreadyCompletedError'
  }
}

export class DecryptionFailedError extends Error {
  constructor() {
    super('Failed to decrypt the data')
    this.name = 'DecryptionFailedError'
  }
}
