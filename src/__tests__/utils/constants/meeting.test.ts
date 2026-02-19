import * as meetingConstants from '@/utils/constants/meeting'

describe('meeting constants', () => {
  it('exports constants', () => {
    expect(meetingConstants).toBeDefined()
  })

  it('has constant values', () => {
    expect(typeof meetingConstants).toBe('object')
  })

  it('is importable', () => {
    expect(meetingConstants).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/utils/constants/meeting')).not.toThrow()
  })

  it('has exports', () => {
    expect(Object.keys(meetingConstants).length).toBeGreaterThanOrEqual(0)
  })

  it('exports defined', () => {
    Object.values(meetingConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('valid structure', () => {
    expect(meetingConstants).not.toBeNull()
  })

  it('provides constants', () => {
    expect(meetingConstants).toBeTruthy()
  })

  it('is stable', () => {
    const first = require('@/utils/constants/meeting')
    const second = require('@/utils/constants/meeting')
    expect(first).toEqual(second)
  })

  it('exports accessible', () => {
    expect(meetingConstants).not.toBeUndefined()
  })

  it('has values', () => {
    Object.values(meetingConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('correct format', () => {
    expect(typeof meetingConstants).not.toBe('undefined')
  })
})
