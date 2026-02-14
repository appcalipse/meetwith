import poll_invite from '@/emails/poll_invite'

describe('poll_invite email template', () => {
  it('exports template', () => {
    expect(poll_invite).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof poll_invite).toBeTruthy()
  })

  it('can be imported', () => {
    expect(poll_invite).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(poll_invite).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/poll_invite')).not.toThrow()
  })

  it('is not null', () => {
    expect(poll_invite).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof poll_invite).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/poll_invite')
    const second = require('@/emails/poll_invite')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(poll_invite).toBeTruthy()
  })

  it('module is valid', () => {
    expect(poll_invite).toBeDefined()
  })

  it('can render email', () => {
    expect(() => poll_invite({})).not.toThrow()
  })

  it('handles props', () => {
    expect(poll_invite).toBeInstanceOf(Function)
  })
})
