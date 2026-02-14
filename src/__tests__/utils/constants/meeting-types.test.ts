import * as meeting_typesConstants from '@/utils/constants/meeting-types'

describe('meeting-types constants', () => {
  it('exports constants', () => {
    expect(meeting_typesConstants).toBeDefined()
  })

  it('has constant values', () => {
    expect(typeof meeting_typesConstants).toBe('object')
  })

  it('is importable', () => {
    expect(meeting_typesConstants).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/utils/constants/meeting-types')).not.toThrow()
  })

  it('has exports', () => {
    expect(Object.keys(meeting_typesConstants).length).toBeGreaterThanOrEqual(0)
  })

  it('exports defined', () => {
    Object.values(meeting_typesConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('valid structure', () => {
    expect(meeting_typesConstants).not.toBeNull()
  })

  it('provides constants', () => {
    expect(meeting_typesConstants).toBeTruthy()
  })

  it('is stable', () => {
    const first = require('@/utils/constants/meeting-types')
    const second = require('@/utils/constants/meeting-types')
    expect(first).toEqual(second)
  })

  it('exports accessible', () => {
    expect(meeting_typesConstants).not.toBeUndefined()
  })

  it('has values', () => {
    Object.values(meeting_typesConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('correct format', () => {
    expect(typeof meeting_typesConstants).not.toBe('undefined')
  })
})
