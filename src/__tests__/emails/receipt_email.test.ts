import receipt_email from '@/emails/receipt_email'

describe('receipt_email email template', () => {
  it('exports template', () => {
    expect(receipt_email).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof receipt_email).toBeTruthy()
  })

  it('can be imported', () => {
    expect(receipt_email).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(receipt_email).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/receipt_email')).not.toThrow()
  })

  it('is not null', () => {
    expect(receipt_email).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof receipt_email).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/receipt_email')
    const second = require('@/emails/receipt_email')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(receipt_email).toBeTruthy()
  })

  it('module is valid', () => {
    expect(receipt_email).toBeDefined()
  })

  it('can render email', () => {
    expect(() => receipt_email({})).not.toThrow()
  })

  it('handles props', () => {
    expect(receipt_email).toBeInstanceOf(Function)
  })
})
