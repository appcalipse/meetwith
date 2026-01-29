import { appUrl } from '@/utils/constants'

describe('constants', () => {
  it('exports appUrl', () => {
    expect(appUrl).toBeDefined()
    expect(typeof appUrl).toBe('string')
  })

  it('appUrl is valid URL', () => {
    expect(appUrl).toMatch(/^https?:\/\//)
  })

  it('has correct domain', () => {
    expect(appUrl).toContain('meetwith')
  })
})
