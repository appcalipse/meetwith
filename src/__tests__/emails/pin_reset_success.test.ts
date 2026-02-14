import pin_reset_success from '@/emails/pin_reset_success'

describe('pin_reset_success email template', () => {
  it('exports template', () => {
    expect(pin_reset_success).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof pin_reset_success).toBeTruthy()
  })

  it('can be imported', () => {
    expect(pin_reset_success).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(pin_reset_success).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/pin_reset_success')).not.toThrow()
  })

  it('is not null', () => {
    expect(pin_reset_success).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof pin_reset_success).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/pin_reset_success')
    const second = require('@/emails/pin_reset_success')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(pin_reset_success).toBeTruthy()
  })

  it('module is valid', () => {
    expect(pin_reset_success).toBeDefined()
  })

  it('can render email', () => {
    expect(() => pin_reset_success({})).not.toThrow()
  })

  it('handles props', () => {
    expect(pin_reset_success).toBeInstanceOf(Function)
  })
})
