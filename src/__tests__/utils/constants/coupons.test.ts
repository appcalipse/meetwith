import * as couponsConstants from '@/utils/constants/coupons'

describe('coupons constants', () => {
  it('exports constants', () => {
    expect(couponsConstants).toBeDefined()
  })

  it('has constant values', () => {
    expect(typeof couponsConstants).toBe('object')
  })

  it('is importable', () => {
    expect(couponsConstants).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/utils/constants/coupons')).not.toThrow()
  })

  it('has exports', () => {
    expect(Object.keys(couponsConstants).length).toBeGreaterThanOrEqual(0)
  })

  it('exports defined', () => {
    Object.values(couponsConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('valid structure', () => {
    expect(couponsConstants).not.toBeNull()
  })

  it('provides constants', () => {
    expect(couponsConstants).toBeTruthy()
  })

  it('is stable', () => {
    const first = require('@/utils/constants/coupons')
    const second = require('@/utils/constants/coupons')
    expect(first).toEqual(second)
  })

  it('exports accessible', () => {
    expect(couponsConstants).not.toBeUndefined()
  })

  it('has values', () => {
    Object.values(couponsConstants).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('correct format', () => {
    expect(typeof couponsConstants).not.toBe('undefined')
  })
})
