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

export class UnauthorizedError extends Error {
  constructor() {
    super("You don't have access to this resource.")
    this.name = 'UnauthorizedError'
  }
}

export class ApiFetchError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(`${status} : ${message}`)
    this.name = 'ApiFetchError'
    this.status = status
  }
}
