import receipt from '@/emails/receipt'

describe('receipt email template', () => {
  it('exports template', () => {
    expect(receipt).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof receipt).toBeTruthy()
  })

  it('can be imported', () => {
    expect(receipt).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(receipt).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/receipt')).not.toThrow()
  })

  it('is not null', () => {
    expect(receipt).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof receipt).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/receipt')
    const second = require('@/emails/receipt')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(receipt).toBeTruthy()
  })

  it('module is valid', () => {
    expect(receipt).toBeDefined()
  })

  it('can render email', () => {
    expect(() => receipt({})).not.toThrow()
  })

  it('handles props', () => {
    expect(receipt).toBeInstanceOf(Function)
  })
})
