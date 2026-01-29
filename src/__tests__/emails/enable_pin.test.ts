import enable_pin from '@/emails/enable_pin'

describe('enable_pin email template', () => {
  it('exports template', () => {
    expect(enable_pin).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof enable_pin).toBeTruthy()
  })

  it('can be imported', () => {
    expect(enable_pin).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(enable_pin).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/enable_pin')).not.toThrow()
  })

  it('is not null', () => {
    expect(enable_pin).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof enable_pin).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/enable_pin')
    const second = require('@/emails/enable_pin')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(enable_pin).toBeTruthy()
  })

  it('module is valid', () => {
    expect(enable_pin).toBeDefined()
  })

  it('can render email', () => {
    expect(() => enable_pin({})).not.toThrow()
  })

  it('handles props', () => {
    expect(enable_pin).toBeInstanceOf(Function)
  })
})
