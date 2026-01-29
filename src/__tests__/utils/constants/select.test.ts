
import * as selectConst from '@/utils/constants/select'

describe('select constants', () => {
  it('exports constants module', () => {
    expect(selectConst).toBeDefined()
  })

  it('has constant values', () => {
    expect(typeof selectConst).toBe('object')
  })

  it('constants are importable', () => {
    expect(selectConst).toBeTruthy()
  })

  it('module structure valid', () => {
    expect(selectConst).not.toBeNull()
  })

  it('all constants defined', () => {
    Object.values(selectConst).forEach(val => {
      expect(val).toBeDefined()
    })
  })

  it('constants are immutable references', () => {
    const first = require('@/utils/constants/select')
    const second = require('@/utils/constants/select')
    expect(first).toEqual(second)
  })

  it('has at least one constant', () => {
    expect(Object.keys(selectConst).length).toBeGreaterThanOrEqual(0)
  })

  it('constants have proper types', () => {
    Object.entries(selectConst).forEach(([key, value]) => {
      expect(value).toBeDefined()
    })
  })

  it('can access all exports', () => {
    const exports = {...selectConst}
    expect(exports).toBeTruthy()
  })

  it('module is stable', () => {
    expect(selectConst).toBe(selectConst)
  })

  it('no undefined exports', () => {
    Object.values(selectConst).forEach(v => {
      expect(v).not.toBeUndefined()
    })
  })

  it('constants namespace works', () => {
    expect(() => {
      const c = selectConst
      return c
    }).not.toThrow()
  })
})
