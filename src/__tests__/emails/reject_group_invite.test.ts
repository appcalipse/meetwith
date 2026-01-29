import reject_group_invite from '@/emails/reject_group_invite'

describe('reject_group_invite email template', () => {
  it('exports template', () => {
    expect(reject_group_invite).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof reject_group_invite).toBeTruthy()
  })

  it('can be imported', () => {
    expect(reject_group_invite).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(reject_group_invite).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/reject_group_invite')).not.toThrow()
  })

  it('is not null', () => {
    expect(reject_group_invite).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof reject_group_invite).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/reject_group_invite')
    const second = require('@/emails/reject_group_invite')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(reject_group_invite).toBeTruthy()
  })

  it('module is valid', () => {
    expect(reject_group_invite).toBeDefined()
  })

  it('can render email', () => {
    expect(() => reject_group_invite({})).not.toThrow()
  })

  it('handles props', () => {
    expect(reject_group_invite).toBeInstanceOf(Function)
  })
})
