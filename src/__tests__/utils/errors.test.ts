import * as errors from '@/utils/errors'

describe('errors utility', () => {
  describe('TimeNotAvailableError', () => {
    it('creates error instance', () => {
      const error = new errors.TimeNotAvailableError()
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(errors.TimeNotAvailableError)
    })

    it('has correct message', () => {
      const error = new errors.TimeNotAvailableError()
      expect(error.message).toBe('The selected slot is not available.')
    })

    it('has correct name', () => {
      const error = new errors.TimeNotAvailableError()
      expect(error.name).toBe('TimeNotAvailableError')
    })

    it('can be thrown and caught', () => {
      expect(() => {
        throw new errors.TimeNotAvailableError()
      }).toThrow('The selected slot is not available.')
    })

    it('instanceof checks work', () => {
      const error = new errors.TimeNotAvailableError()
      expect(error instanceof Error).toBe(true)
    })

    it('has stack trace', () => {
      const error = new errors.TimeNotAvailableError()
      expect(error.stack).toBeDefined()
    })
  })

  describe('AccountNotFoundError', () => {
    it('creates error with identifier', () => {
      const error = new errors.AccountNotFoundError('user123')
      expect(error.message).toContain('user123')
    })

    it('has correct name', () => {
      const error = new errors.AccountNotFoundError('test')
      expect(error.name).toBe('AccountNotFoundError')
    })

    it('formats message correctly', () => {
      const error = new errors.AccountNotFoundError('0xabc')
      expect(error.message).toBe('Account with identifier 0xabc not found.')
    })

    it('handles empty identifier', () => {
      const error = new errors.AccountNotFoundError('')
      expect(error.message).toContain('not found')
    })

    it('can be thrown', () => {
      expect(() => {
        throw new errors.AccountNotFoundError('test')
      }).toThrow(errors.AccountNotFoundError)
    })
  })

  describe('InvalidSessionError', () => {
    it('creates error instance', () => {
      const error = new errors.InvalidSessionError()
      expect(error).toBeInstanceOf(errors.InvalidSessionError)
    })

    it('has correct message', () => {
      const error = new errors.InvalidSessionError()
      expect(error.message).toBe('Session was invalidated.')
    })

    it('has correct name', () => {
      const error = new errors.InvalidSessionError()
      expect(error.name).toBe('InvalidSessionError')
    })
  })

  describe('MeetingNotFoundError', () => {
    it('creates error with identifier', () => {
      const error = new errors.MeetingNotFoundError('meeting123')
      expect(error.message).toContain('meeting123')
    })

    it('has correct name', () => {
      const error = new errors.MeetingNotFoundError('test')
      expect(error.name).toBe('MeetingNotFoundError')
    })

    it('formats message correctly', () => {
      const error = new errors.MeetingNotFoundError('abc')
      expect(error.message).toBe('Meeting slot with identifier abc not found.')
    })
  })

  describe('MeetingWithYourselfError', () => {
    it('creates error instance', () => {
      const error = new errors.MeetingWithYourselfError()
      expect(error).toBeInstanceOf(errors.MeetingWithYourselfError)
    })

    it('has correct message', () => {
      const error = new errors.MeetingWithYourselfError()
      expect(error.message).toBe('Trying to meet with yourself?')
    })

    it('has correct name', () => {
      const error = new errors.MeetingWithYourselfError()
      expect(error.name).toBe('MeetingWithYourselfError')
    })
  })

  describe('MeetingCreationError', () => {
    it('creates error instance', () => {
      const error = new errors.MeetingCreationError()
      expect(error).toBeInstanceOf(errors.MeetingCreationError)
    })

    it('has correct message', () => {
      const error = new errors.MeetingCreationError()
      expect(error.message).toBe('Error creating meeting')
    })

    it('has correct name', () => {
      const error = new errors.MeetingCreationError()
      expect(error.name).toBe('MeetingCreationError')
    })
  })

  describe('MultipleSchedulersError', () => {
    it('creates error instance', () => {
      const error = new errors.MultipleSchedulersError()
      expect(error).toBeInstanceOf(errors.MultipleSchedulersError)
    })

    it('has correct message', () => {
      const error = new errors.MultipleSchedulersError()
      expect(error.message).toBe('A meeting must have only one scheduler')
    })

    it('has correct name', () => {
      const error = new errors.MultipleSchedulersError()
      expect(error.name).toBe('MultipleSchedulersError')
    })
  })

  describe('NotGroupMemberError', () => {
    it('creates error instance', () => {
      const error = new errors.NotGroupMemberError()
      expect(error).toBeInstanceOf(errors.NotGroupMemberError)
    })

    it('has correct message', () => {
      const error = new errors.NotGroupMemberError()
      expect(error.message).toBe('Not a group member')
    })

    it('has correct name', () => {
      const error = new errors.NotGroupMemberError()
      expect(error.name).toBe('NotGroupMemberError')
    })
  })

  describe('AdminBelowOneError', () => {
    it('creates error instance', () => {
      const error = new errors.AdminBelowOneError()
      expect(error).toBeInstanceOf(errors.AdminBelowOneError)
    })

    it('has correct message', () => {
      const error = new errors.AdminBelowOneError()
      expect(error.message).toBe('Cannot have less than one admin')
    })

    it('has correct name', () => {
      const error = new errors.AdminBelowOneError()
      expect(error.name).toBe('AdminBelowOneError')
    })
  })

  describe('IsGroupMemberError', () => {
    it('creates error instance', () => {
      const error = new errors.IsGroupMemberError()
      expect(error).toBeInstanceOf(errors.IsGroupMemberError)
    })

    it('has correct message', () => {
      const error = new errors.IsGroupMemberError()
      expect(error.message).toBe('Group member cannot perform action')
    })

    it('has correct name', () => {
      const error = new errors.IsGroupMemberError()
      expect(error.name).toBe('IsGroupMemberError')
    })
  })

  describe('AlreadyGroupMemberError', () => {
    it('creates error instance', () => {
      const error = new errors.AlreadyGroupMemberError()
      expect(error).toBeInstanceOf(errors.AlreadyGroupMemberError)
    })

    it('has correct message', () => {
      const error = new errors.AlreadyGroupMemberError()
      expect(error.message).toBe('Group member cannot accept invite again')
    })

    it('has correct name', () => {
      const error = new errors.AlreadyGroupMemberError()
      expect(error.name).toBe('AlreadyGroupMemberError')
    })
  })

  describe('NotGroupAdminError', () => {
    it('creates error instance', () => {
      const error = new errors.NotGroupAdminError()
      expect(error).toBeInstanceOf(errors.NotGroupAdminError)
    })

    it('has correct message', () => {
      const error = new errors.NotGroupAdminError()
      expect(error.message).toBe('Not a group admin')
    })

    it('has correct name', () => {
      const error = new errors.NotGroupAdminError()
      expect(error.name).toBe('NotGroupAdminError')
    })
  })

  describe('BadRequestError', () => {
    it('creates error instance', () => {
      const error = new errors.BadRequestError()
      expect(error).toBeInstanceOf(errors.BadRequestError)
    })

    it('has correct message', () => {
      const error = new errors.BadRequestError()
      expect(error.message).toBe('Bad request')
    })

    it('has correct name', () => {
      const error = new errors.BadRequestError()
      expect(error.name).toBe('BadRequestError')
    })
  })

  describe('GroupNotExistsError', () => {
    it('creates error instance', () => {
      const error = new errors.GroupNotExistsError()
      expect(error).toBeInstanceOf(errors.GroupNotExistsError)
    })

    it('has correct message', () => {
      const error = new errors.GroupNotExistsError()
      expect(error.message).toBe('Group does not exists')
    })

    it('has correct name', () => {
      const error = new errors.GroupNotExistsError()
      expect(error.name).toBe('GroupNotExistsError')
    })
  })

  describe('IsGroupAdminError', () => {
    it('creates error instance', () => {
      const error = new errors.IsGroupAdminError()
      expect(error).toBeInstanceOf(errors.IsGroupAdminError)
    })

    it('has correct message', () => {
      const error = new errors.IsGroupAdminError()
      expect(error.message).toBe('Group admin cannot perform action')
    })

    it('has correct name', () => {
      const error = new errors.IsGroupAdminError()
      expect(error.name).toBe('IsGroupAdminError')
    })
  })

  describe('error inheritance', () => {
    it('all errors extend Error', () => {
      expect(new errors.TimeNotAvailableError()).toBeInstanceOf(Error)
      expect(new errors.AccountNotFoundError('test')).toBeInstanceOf(Error)
      expect(new errors.InvalidSessionError()).toBeInstanceOf(Error)
      expect(new errors.MeetingNotFoundError('test')).toBeInstanceOf(Error)
      expect(new errors.MeetingWithYourselfError()).toBeInstanceOf(Error)
      expect(new errors.MeetingCreationError()).toBeInstanceOf(Error)
      expect(new errors.MultipleSchedulersError()).toBeInstanceOf(Error)
      expect(new errors.NotGroupMemberError()).toBeInstanceOf(Error)
      expect(new errors.AdminBelowOneError()).toBeInstanceOf(Error)
      expect(new errors.IsGroupMemberError()).toBeInstanceOf(Error)
      expect(new errors.AlreadyGroupMemberError()).toBeInstanceOf(Error)
      expect(new errors.NotGroupAdminError()).toBeInstanceOf(Error)
      expect(new errors.BadRequestError()).toBeInstanceOf(Error)
      expect(new errors.GroupNotExistsError()).toBeInstanceOf(Error)
      expect(new errors.IsGroupAdminError()).toBeInstanceOf(Error)
    })

    it('all errors are throwable', () => {
      expect(() => { throw new errors.TimeNotAvailableError() }).toThrow()
      expect(() => { throw new errors.AccountNotFoundError('test') }).toThrow()
      expect(() => { throw new errors.InvalidSessionError() }).toThrow()
    })

    it('all errors have stack traces', () => {
      expect(new errors.TimeNotAvailableError().stack).toBeDefined()
      expect(new errors.AccountNotFoundError('test').stack).toBeDefined()
      expect(new errors.InvalidSessionError().stack).toBeDefined()
    })
  })

  describe('error catching', () => {
    it('can catch specific error types', () => {
      try {
        throw new errors.AccountNotFoundError('test')
      } catch (e) {
        expect(e).toBeInstanceOf(errors.AccountNotFoundError)
        expect(e instanceof Error).toBe(true)
      }
    })

    it('can distinguish between error types', () => {
      const error1 = new errors.TimeNotAvailableError()
      const error2 = new errors.AccountNotFoundError('test')
      expect(error1.name).not.toBe(error2.name)
    })
  })
})
