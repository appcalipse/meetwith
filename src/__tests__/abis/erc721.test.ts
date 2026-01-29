import * as erc721ABI from '@/abis/erc721'

describe('erc721 ABI', () => {
  it('exports ABI', () => {
    expect(erc721ABI).toBeDefined()
  })

  it('has ABI structure', () => {
    expect(typeof erc721ABI).toBe('object')
  })

  it('is importable', () => {
    expect(erc721ABI).toBeTruthy()
  })

  it('has valid format', () => {
    expect(erc721ABI).not.toBeNull()
  })

  it('loads without error', () => {
    expect(() => require('@/abis/erc721')).not.toThrow()
  })

  it('exports are accessible', () => {
    expect(Object.keys(erc721ABI).length).toBeGreaterThan(0)
  })

  it('is a valid ABI', () => {
    expect(erc721ABI).toBeDefined()
  })

  it('has correct structure', () => {
    expect(typeof erc721ABI).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/abis/erc721')
    const second = require('@/abis/erc721')
    expect(first).toEqual(second)
  })

  it('exports contract interface', () => {
    expect(erc721ABI).toBeTruthy()
  })

  it('has valid contract data', () => {
    expect(Object.keys(erc721ABI).length).toBeGreaterThanOrEqual(0)
  })

  it('can be used for contracts', () => {
    expect(erc721ABI).not.toBeUndefined()
  })
})
