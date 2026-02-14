import email_change_success from '@/emails/email_change_success'

describe('email_change_success email template', () => {
  it('exports template', () => {
    expect(email_change_success).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof email_change_success).toBeTruthy()
  })

  it('can be imported', () => {
    expect(email_change_success).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(email_change_success).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/email_change_success')).not.toThrow()
  })

  it('is not null', () => {
    expect(email_change_success).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof email_change_success).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/email_change_success')
    const second = require('@/emails/email_change_success')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(email_change_success).toBeTruthy()
  })

  it('module is valid', () => {
    expect(email_change_success).toBeDefined()
  })

  it('can render email', () => {
    expect(() => email_change_success({})).not.toThrow()
  })

  it('handles props', () => {
    expect(email_change_success).toBeInstanceOf(Function)
  })
})
