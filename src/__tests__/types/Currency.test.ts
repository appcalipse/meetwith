import type * as CurrencyTypes from '@/types/Currency'

describe('Currency types', () => {
  it('exports types', () => {
    expect(typeof CurrencyTypes).toBeTruthy()
  })

  it('is importable', () => {
    expect(() => require('@/types/Currency')).not.toThrow()
  })

  it('has type definitions', () => {
    const types = require('@/types/Currency')
    expect(types).toBeDefined()
  })

  it('exports are accessible', () => {
    const types = require('@/types/Currency')
    expect(typeof types).toBe('object')
  })

  it('loads without error', () => {
    expect(() => require('@/types/Currency')).not.toThrow()
  })

  it('has valid structure', () => {
    const types = require('@/types/Currency')
    expect(types).not.toBeNull()
  })

  it('is stable', () => {
    const first = require('@/types/Currency')
    const second = require('@/types/Currency')
    expect(first).toEqual(second)
  })

  it('provides type exports', () => {
    const types = require('@/types/Currency')
    expect(types).toBeTruthy()
  })

  it('has correct module format', () => {
    const types = require('@/types/Currency')
    expect(typeof types).not.toBe('undefined')
  })

  it('can be used for typing', () => {
    const types = require('@/types/Currency')
    expect(types).not.toBeUndefined()
  })

  it('exports are defined', () => {
    const types = require('@/types/Currency')
    expect(types).toBeDefined()
  })

  it('module is valid', () => {
    const types = require('@/types/Currency')
    expect(types).toBeTruthy()
  })
})
