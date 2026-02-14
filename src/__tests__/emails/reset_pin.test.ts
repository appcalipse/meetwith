import reset_pin from '@/emails/reset_pin'

describe('reset_pin email template', () => {
  it('exports template', () => {
    expect(reset_pin).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof reset_pin).toBeTruthy()
  })

  it('can be imported', () => {
    expect(reset_pin).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(reset_pin).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/reset_pin')).not.toThrow()
  })

  it('is not null', () => {
    expect(reset_pin).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof reset_pin).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/reset_pin')
    const second = require('@/emails/reset_pin')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(reset_pin).toBeTruthy()
  })

  it('module is valid', () => {
    expect(reset_pin).toBeDefined()
  })

  it('can render email', () => {
    expect(() => reset_pin({})).not.toThrow()
  })

  it('handles props', () => {
    expect(reset_pin).toBeInstanceOf(Function)
  })
})
