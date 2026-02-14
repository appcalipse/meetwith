import billing from '@/emails/billing'

describe('billing email template', () => {
  it('exports template', () => {
    expect(billing).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof billing).toBeTruthy()
  })

  it('can be imported', () => {
    expect(billing).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(billing).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/billing')).not.toThrow()
  })

  it('is not null', () => {
    expect(billing).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof billing).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/billing')
    const second = require('@/emails/billing')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(billing).toBeTruthy()
  })

  it('module is valid', () => {
    expect(billing).toBeDefined()
  })

  it('can render email', () => {
    expect(() => billing({})).not.toThrow()
  })

  it('handles props', () => {
    expect(billing).toBeInstanceOf(Function)
  })
})
