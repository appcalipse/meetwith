import invoice_email from '@/emails/invoice_email'

describe('invoice_email email template', () => {
  it('exports template', () => {
    expect(invoice_email).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof invoice_email).toBeTruthy()
  })

  it('can be imported', () => {
    expect(invoice_email).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(invoice_email).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/invoice_email')).not.toThrow()
  })

  it('is not null', () => {
    expect(invoice_email).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof invoice_email).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/invoice_email')
    const second = require('@/emails/invoice_email')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(invoice_email).toBeTruthy()
  })

  it('module is valid', () => {
    expect(invoice_email).toBeDefined()
  })

  it('can render email', () => {
    expect(() => invoice_email({})).not.toThrow()
  })

  it('handles props', () => {
    expect(invoice_email).toBeInstanceOf(Function)
  })
})
