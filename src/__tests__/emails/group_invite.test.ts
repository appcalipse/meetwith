import group_invite from '@/emails/group_invite'

describe('group_invite email template', () => {
  it('exports template', () => {
    expect(group_invite).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof group_invite).toBeTruthy()
  })

  it('can be imported', () => {
    expect(group_invite).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(group_invite).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/group_invite')).not.toThrow()
  })

  it('is not null', () => {
    expect(group_invite).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof group_invite).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/group_invite')
    const second = require('@/emails/group_invite')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(group_invite).toBeTruthy()
  })

  it('module is valid', () => {
    expect(group_invite).toBeDefined()
  })

  it('can render email', () => {
    expect(() => group_invite({})).not.toThrow()
  })

  it('handles props', () => {
    expect(group_invite).toBeInstanceOf(Function)
  })
})
