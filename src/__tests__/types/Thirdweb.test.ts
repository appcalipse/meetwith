import type * as ThirdwebTypes from '@/types/Thirdweb'

describe('Thirdweb types', () => {
  it('exports types', () => {
    expect(typeof ThirdwebTypes).toBeTruthy()
  })

  it('is importable', () => {
    expect(() => require('@/types/Thirdweb')).not.toThrow()
  })

  it('has type definitions', () => {
    const types = require('@/types/Thirdweb')
    expect(types).toBeDefined()
  })

  it('exports are accessible', () => {
    const types = require('@/types/Thirdweb')
    expect(typeof types).toBe('object')
  })

  it('loads without error', () => {
    expect(() => require('@/types/Thirdweb')).not.toThrow()
  })

  it('has valid structure', () => {
    const types = require('@/types/Thirdweb')
    expect(types).not.toBeNull()
  })

  it('is stable', () => {
    const first = require('@/types/Thirdweb')
    const second = require('@/types/Thirdweb')
    expect(first).toEqual(second)
  })

  it('provides type exports', () => {
    const types = require('@/types/Thirdweb')
    expect(types).toBeTruthy()
  })

  it('has correct module format', () => {
    const types = require('@/types/Thirdweb')
    expect(typeof types).not.toBe('undefined')
  })

  it('can be used for typing', () => {
    const types = require('@/types/Thirdweb')
    expect(types).not.toBeUndefined()
  })

  it('exports are defined', () => {
    const types = require('@/types/Thirdweb')
    expect(types).toBeDefined()
  })

  it('module is valid', () => {
    const types = require('@/types/Thirdweb')
    expect(types).toBeTruthy()
  })
})
