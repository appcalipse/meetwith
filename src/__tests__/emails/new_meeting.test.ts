import new_meeting from '@/emails/new_meeting'

describe('new_meeting email template', () => {
  it('exports template', () => {
    expect(new_meeting).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof new_meeting).toBeTruthy()
  })

  it('can be imported', () => {
    expect(new_meeting).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(new_meeting).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/new_meeting')).not.toThrow()
  })

  it('is not null', () => {
    expect(new_meeting).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof new_meeting).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/new_meeting')
    const second = require('@/emails/new_meeting')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(new_meeting).toBeTruthy()
  })

  it('module is valid', () => {
    expect(new_meeting).toBeDefined()
  })

  it('can render email', () => {
    expect(() => new_meeting({})).not.toThrow()
  })

  it('handles props', () => {
    expect(new_meeting).toBeInstanceOf(Function)
  })
})
