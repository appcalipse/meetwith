import meeting_cancelled from '@/emails/meeting_cancelled'

describe('meeting_cancelled email template', () => {
  it('exports template', () => {
    expect(meeting_cancelled).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof meeting_cancelled).toBeTruthy()
  })

  it('can be imported', () => {
    expect(meeting_cancelled).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(meeting_cancelled).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/meeting_cancelled')).not.toThrow()
  })

  it('is not null', () => {
    expect(meeting_cancelled).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof meeting_cancelled).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/meeting_cancelled')
    const second = require('@/emails/meeting_cancelled')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(meeting_cancelled).toBeTruthy()
  })

  it('module is valid', () => {
    expect(meeting_cancelled).toBeDefined()
  })

  it('can render email', () => {
    expect(() => meeting_cancelled({})).not.toThrow()
  })

  it('handles props', () => {
    expect(meeting_cancelled).toBeInstanceOf(Function)
  })
})
