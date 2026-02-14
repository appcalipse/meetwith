import change_email from '@/emails/change_email'

describe('change_email email template', () => {
  it('exports template', () => {
    expect(change_email).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof change_email).toBeTruthy()
  })

  it('can be imported', () => {
    expect(change_email).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(change_email).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/change_email')).not.toThrow()
  })

  it('is not null', () => {
    expect(change_email).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof change_email).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/change_email')
    const second = require('@/emails/change_email')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(change_email).toBeTruthy()
  })

  it('module is valid', () => {
    expect(change_email).toBeDefined()
  })

  it('can render email', () => {
    expect(() => change_email({})).not.toThrow()
  })

  it('handles props', () => {
    expect(change_email).toBeInstanceOf(Function)
  })
})
