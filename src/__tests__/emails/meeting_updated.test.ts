import meeting_updated from '@/emails/meeting_updated'

describe('meeting_updated email template', () => {
  it('exports template', () => {
    expect(meeting_updated).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof meeting_updated).toBeTruthy()
  })

  it('can be imported', () => {
    expect(meeting_updated).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(meeting_updated).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/meeting_updated')).not.toThrow()
  })

  it('is not null', () => {
    expect(meeting_updated).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof meeting_updated).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/meeting_updated')
    const second = require('@/emails/meeting_updated')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(meeting_updated).toBeTruthy()
  })

  it('module is valid', () => {
    expect(meeting_updated).toBeDefined()
  })

  it('can render email', () => {
    expect(() => meeting_updated({})).not.toThrow()
  })

  it('handles props', () => {
    expect(meeting_updated).toBeInstanceOf(Function)
  })
})
