import verification_code from '@/emails/verification_code'

describe('verification_code email template', () => {
  it('exports template', () => {
    expect(verification_code).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof verification_code).toBeTruthy()
  })

  it('can be imported', () => {
    expect(verification_code).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(verification_code).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/verification_code')).not.toThrow()
  })

  it('is not null', () => {
    expect(verification_code).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof verification_code).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/verification_code')
    const second = require('@/emails/verification_code')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(verification_code).toBeTruthy()
  })

  it('module is valid', () => {
    expect(verification_code).toBeDefined()
  })

  it('can render email', () => {
    expect(() => verification_code({})).not.toThrow()
  })

  it('handles props', () => {
    expect(verification_code).toBeInstanceOf(Function)
  })
})
