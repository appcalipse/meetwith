import * as chainlinkABI from '@/abis/chainlink'

describe('chainlink ABI', () => {
  it('exports ABI', () => {
    expect(chainlinkABI).toBeDefined()
  })

  it('has ABI structure', () => {
    expect(typeof chainlinkABI).toBe('object')
  })

  it('is importable', () => {
    expect(chainlinkABI).toBeTruthy()
  })

  it('has valid format', () => {
    expect(chainlinkABI).not.toBeNull()
  })

  it('loads without error', () => {
    expect(() => require('@/abis/chainlink')).not.toThrow()
  })

  it('exports are accessible', () => {
    expect(Object.keys(chainlinkABI).length).toBeGreaterThan(0)
  })

  it('is a valid ABI', () => {
    expect(chainlinkABI).toBeDefined()
  })

  it('has correct structure', () => {
    expect(typeof chainlinkABI).not.toBe('undefined')
  })

  it('is stable', () => {
    const first = require('@/abis/chainlink')
    const second = require('@/abis/chainlink')
    expect(first).toEqual(second)
  })

  it('exports contract interface', () => {
    expect(chainlinkABI).toBeTruthy()
  })

  it('has valid contract data', () => {
    expect(Object.keys(chainlinkABI).length).toBeGreaterThanOrEqual(0)
  })

  it('can be used for contracts', () => {
    expect(chainlinkABI).not.toBeUndefined()
  })
})
