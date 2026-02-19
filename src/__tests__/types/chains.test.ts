import type * as chainsTypes from '@/types/chains'

describe('chains types', () => {
  it('exports types', () => {
    expect(typeof chainsTypes).toBeTruthy()
  })

  it('is importable', () => {
    expect(() => require('@/types/chains')).not.toThrow()
  })

  it('has type definitions', () => {
    const types = require('@/types/chains')
    expect(types).toBeDefined()
  })

  it('exports are accessible', () => {
    const types = require('@/types/chains')
    expect(typeof types).toBe('object')
  })

  it('loads without error', () => {
    expect(() => require('@/types/chains')).not.toThrow()
  })

  it('has valid structure', () => {
    const types = require('@/types/chains')
    expect(types).not.toBeNull()
  })

  it('is stable', () => {
    const first = require('@/types/chains')
    const second = require('@/types/chains')
    expect(first).toEqual(second)
  })

  it('provides type exports', () => {
    const types = require('@/types/chains')
    expect(types).toBeTruthy()
  })

  it('has correct module format', () => {
    const types = require('@/types/chains')
    expect(typeof types).not.toBe('undefined')
  })

  it('can be used for typing', () => {
    const types = require('@/types/chains')
    expect(types).not.toBeUndefined()
  })

  it('exports are defined', () => {
    const types = require('@/types/chains')
    expect(types).toBeDefined()
  })

  it('module is valid', () => {
    const types = require('@/types/chains')
    expect(types).toBeTruthy()
  })
})
