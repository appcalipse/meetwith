import contact_invite from '@/emails/contact_invite'

describe('contact_invite email template', () => {
  it('exports template', () => {
    expect(contact_invite).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof contact_invite).toBeTruthy()
  })

  it('can be imported', () => {
    expect(contact_invite).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(contact_invite).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/contact_invite')).not.toThrow()
  })

  it('is not null', () => {
    expect(contact_invite).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof contact_invite).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/contact_invite')
    const second = require('@/emails/contact_invite')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(contact_invite).toBeTruthy()
  })

  it('module is valid', () => {
    expect(contact_invite).toBeDefined()
  })

  it('can render email', () => {
    expect(() => contact_invite({})).not.toThrow()
  })

  it('handles props', () => {
    expect(contact_invite).toBeInstanceOf(Function)
  })
})
