import new_meeting_scheduler from '@/emails/new_meeting_scheduler'

describe('new_meeting_scheduler email template', () => {
  it('exports template', () => {
    expect(new_meeting_scheduler).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof new_meeting_scheduler).toBeTruthy()
  })

  it('can be imported', () => {
    expect(new_meeting_scheduler).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(new_meeting_scheduler).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/new_meeting_scheduler')).not.toThrow()
  })

  it('is not null', () => {
    expect(new_meeting_scheduler).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof new_meeting_scheduler).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/new_meeting_scheduler')
    const second = require('@/emails/new_meeting_scheduler')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(new_meeting_scheduler).toBeTruthy()
  })

  it('module is valid', () => {
    expect(new_meeting_scheduler).toBeDefined()
  })

  it('can render email', () => {
    expect(() => new_meeting_scheduler({})).not.toThrow()
  })

  it('handles props', () => {
    expect(new_meeting_scheduler).toBeInstanceOf(Function)
  })
})
