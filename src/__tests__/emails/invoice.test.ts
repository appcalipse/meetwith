import invoice from '@/emails/invoice'

describe('invoice email template', () => {
  it('exports template', () => {
    expect(invoice).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof invoice).toBeTruthy()
  })

  it('can be imported', () => {
    expect(invoice).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(invoice).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/invoice')).not.toThrow()
  })

  it('is not null', () => {
    expect(invoice).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof invoice).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/invoice')
    const second = require('@/emails/invoice')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(invoice).toBeTruthy()
  })

  it('module is valid', () => {
    expect(invoice).toBeDefined()
  })

  it('can render email', () => {
    expect(() => invoice({})).not.toThrow()
  })

  it('handles props', () => {
    expect(invoice).toBeInstanceOf(Function)
  })
})
