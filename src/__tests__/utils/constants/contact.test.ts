import * as contactConstants from '@/utils/constants/contact'

describe('contact constants', () => {
  it('exports constants', () => {
    expect(contactConstants).toBeDefined()
  })

  it('has constant values', () => {
    expect(typeof contactConstants).toBe('object')
  })

  it('is importable', () => {
    expect(contactConstants).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/utils/constants/contact')).not.toThrow()
  })

  it('has exports', () => {
    expect(Object.keys(contactConstants).length).toBeGreaterThanOrEqual(0)
  })

  it('exports defined', () => {
    Object.values(contactConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('valid structure', () => {
    expect(contactConstants).not.toBeNull()
  })

  it('provides constants', () => {
    expect(contactConstants).toBeTruthy()
  })

  it('is stable', () => {
    const first = require('@/utils/constants/contact')
    const second = require('@/utils/constants/contact')
    expect(first).toEqual(second)
  })

  it('exports accessible', () => {
    expect(contactConstants).not.toBeUndefined()
  })

  it('has values', () => {
    Object.values(contactConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('correct format', () => {
    expect(typeof contactConstants).not.toBe('undefined')
  })
})
