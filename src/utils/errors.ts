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
    super(`Somebody edited the meeting before you.`)
    this.name = 'MeetingChangeConflictError'
  }
}

export class MeetingCancelForbiddenError extends Error {
  constructor() {
    super(
      `Only the host can cancel the meeting. You can RSPV "no" from the calendar-invite and/or ask the host to reschedule`
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
