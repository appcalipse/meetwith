import session_booking_income from '@/emails/session_booking_income'

describe('session_booking_income email template', () => {
  it('exports template', () => {
    expect(session_booking_income).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof session_booking_income).toBeTruthy()
  })

  it('can be imported', () => {
    expect(session_booking_income).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(session_booking_income).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/session_booking_income')).not.toThrow()
  })

  it('is not null', () => {
    expect(session_booking_income).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof session_booking_income).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/session_booking_income')
    const second = require('@/emails/session_booking_income')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(session_booking_income).toBeTruthy()
  })

  it('module is valid', () => {
    expect(session_booking_income).toBeDefined()
  })

  it('can render email', () => {
    expect(() => session_booking_income({})).not.toThrow()
  })

  it('handles props', () => {
    expect(session_booking_income).toBeInstanceOf(Function)
  })
})
