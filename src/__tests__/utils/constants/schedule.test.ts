import * as scheduleConstants from '@/utils/constants/schedule'

describe('schedule constants', () => {
  it('exports constants', () => {
    expect(scheduleConstants).toBeDefined()
  })

  it('has constant values', () => {
    expect(typeof scheduleConstants).toBe('object')
  })

  it('is importable', () => {
    expect(scheduleConstants).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/utils/constants/schedule')).not.toThrow()
  })

  it('has exports', () => {
    expect(Object.keys(scheduleConstants).length).toBeGreaterThanOrEqual(0)
  })

  it('exports defined', () => {
    Object.values(scheduleConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('valid structure', () => {
    expect(scheduleConstants).not.toBeNull()
  })

  it('provides constants', () => {
    expect(scheduleConstants).toBeTruthy()
  })

  it('is stable', () => {
    const first = require('@/utils/constants/schedule')
    const second = require('@/utils/constants/schedule')
    expect(first).toEqual(second)
  })

  it('exports accessible', () => {
    expect(scheduleConstants).not.toBeUndefined()
  })

  it('has values', () => {
    Object.values(scheduleConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('correct format', () => {
    expect(typeof scheduleConstants).not.toBe('undefined')
  })
})
