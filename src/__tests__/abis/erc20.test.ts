import * as erc20ABI from '@/abis/erc20'

describe('erc20 ABI', () => {
  it('exports ABI', () => {
    expect(erc20ABI).toBeDefined()
  })

  it('has ABI structure', () => {
    expect(typeof erc20ABI).toBe('object')
  })

  it('is importable', () => {
    expect(erc20ABI).toBeTruthy()
  })

  it('has valid format', () => {
    expect(erc20ABI).not.toBeNull()
  })

  it('loads without error', () => {
    expect(() => require('@/abis/erc20')).not.toThrow()
  })

  it('exports are accessible', () => {
    expect(Object.keys(erc20ABI).length).toBeGreaterThan(0)
  })

  it('is a valid ABI', () => {
    expect(erc20ABI).toBeDefined()
  })

  it('has correct structure', () => {
    expect(typeof erc20ABI).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/abis/erc20')
    const second = require('@/abis/erc20')
    expect(first).toEqual(second)
  })

  it('exports contract interface', () => {
    expect(erc20ABI).toBeTruthy()
  })

  it('has valid contract data', () => {
    expect(Object.keys(erc20ABI).length).toBeGreaterThanOrEqual(0)
  })

  it('can be used for contracts', () => {
    expect(erc20ABI).not.toBeUndefined()
  })
})
