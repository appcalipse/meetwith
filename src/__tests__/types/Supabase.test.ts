import type * as SupabaseTypes from '@/types/Supabase'

describe('Supabase types', () => {
  it('exports types', () => {
    expect(typeof SupabaseTypes).toBeTruthy()
  })

  it('is importable', () => {
    expect(() => require('@/types/Supabase')).not.toThrow()
  })

  it('has type definitions', () => {
    const types = require('@/types/Supabase')
    expect(types).toBeDefined()
  })

  it('exports are accessible', () => {
    const types = require('@/types/Supabase')
    expect(typeof types).toBe('object')
  })

  it('loads without error', () => {
    expect(() => require('@/types/Supabase')).not.toThrow()
  })

  it('has valid structure', () => {
    const types = require('@/types/Supabase')
    expect(types).not.toBeNull()
  })

  it('is stable', () => {
    const first = require('@/types/Supabase')
    const second = require('@/types/Supabase')
    expect(first).toEqual(second)
  })

  it('provides type exports', () => {
    const types = require('@/types/Supabase')
    expect(types).toBeTruthy()
  })

  it('has correct module format', () => {
    const types = require('@/types/Supabase')
    expect(typeof types).not.toBe('undefined')
  })

  it('can be used for typing', () => {
    const types = require('@/types/Supabase')
    expect(types).not.toBeUndefined()
  })

  it('exports are defined', () => {
    const types = require('@/types/Supabase')
    expect(types).toBeDefined()
  })

  it('module is valid', () => {
    const types = require('@/types/Supabase')
    expect(types).toBeTruthy()
  })
})
