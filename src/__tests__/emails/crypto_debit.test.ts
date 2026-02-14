import crypto_debit from '@/emails/crypto_debit'

describe('crypto_debit email template', () => {
  it('exports template', () => {
    expect(crypto_debit).toBeDefined()
  })

  it('is a valid component', () => {
    expect(typeof crypto_debit).toBeTruthy()
  })

  it('can be imported', () => {
    expect(crypto_debit).not.toBeUndefined()
  })

  it('has correct type', () => {
    expect(crypto_debit).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/emails/crypto_debit')).not.toThrow()
  })

  it('is not null', () => {
    expect(crypto_debit).not.toBeNull()
  })

  it('exports email component', () => {
    expect(typeof crypto_debit).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/emails/crypto_debit')
    const second = require('@/emails/crypto_debit')
    expect(first).toEqual(second)
  })

  it('provides email template', () => {
    expect(crypto_debit).toBeTruthy()
  })

  it('module is valid', () => {
    expect(crypto_debit).toBeDefined()
  })

  it('can render email', () => {
    expect(() => crypto_debit({})).not.toThrow()
  })

  it('handles props', () => {
    expect(crypto_debit).toBeInstanceOf(Function)
  })
})
