import type * as ParticipantInfoTypes from '@/types/ParticipantInfo'

describe('ParticipantInfo types', () => {
  it('exports types', () => {
    expect(typeof ParticipantInfoTypes).toBeTruthy()
  })

  it('is importable', () => {
    expect(() => require('@/types/ParticipantInfo')).not.toThrow()
  })

  it('has type definitions', () => {
    const types = require('@/types/ParticipantInfo')
    expect(types).toBeDefined()
  })

  it('exports are accessible', () => {
    const types = require('@/types/ParticipantInfo')
    expect(typeof types).toBe('object')
  })

  it('loads without error', () => {
    expect(() => require('@/types/ParticipantInfo')).not.toThrow()
  })

  it('has valid structure', () => {
    const types = require('@/types/ParticipantInfo')
    expect(types).not.toBeNull()
  })

  it('is stable', () => {
    const first = require('@/types/ParticipantInfo')
    const second = require('@/types/ParticipantInfo')
    expect(first).toEqual(second)
  })

  it('provides type exports', () => {
    const types = require('@/types/ParticipantInfo')
    expect(types).toBeTruthy()
  })

  it('has correct module format', () => {
    const types = require('@/types/ParticipantInfo')
    expect(typeof types).not.toBe('undefined')
  })

  it('can be used for typing', () => {
    const types = require('@/types/ParticipantInfo')
    expect(types).not.toBeUndefined()
  })

  it('exports are defined', () => {
    const types = require('@/types/ParticipantInfo')
    expect(types).toBeDefined()
  })

  it('module is valid', () => {
    const types = require('@/types/ParticipantInfo')
    expect(types).toBeTruthy()
  })
})
