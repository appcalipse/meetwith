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
    // In test environment, it may be localhost
    expect(appUrl).toMatch(/meetwith|localhost/)
  })
})
