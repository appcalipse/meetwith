import {
  generateBorderColor,
  generateBorderColorWithIntensity,
  generateColorScheme,
  getAdvancedContrastingText,
  getContrastingTextColor,
  getContrastRatio,
  getDesignSystemTextColor,
  isLightColor,
} from '@/utils/color-utils'

describe('color-utils', () => {
  describe('generateBorderColor', () => {
    it('should generate darker border for light backgrounds', () => {
      const result = generateBorderColor('#FEF0EC', false)
      expect(result).toMatch(/^#[0-9A-F]{6}$/)
      expect(result).not.toBe('#FEF0EC')
    })

    it('should generate lighter border for dark backgrounds', () => {
      const result = generateBorderColor('#2D3748', true)
      expect(result).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should throw error for invalid hex color', () => {
      expect(() => generateBorderColor('invalid')).toThrow('Invalid hex color format')
    })

    it('should handle hex colors with or without #', () => {
      const withHash = generateBorderColor('#FEF0EC')
      const withoutHash = generateBorderColor('FEF0EC')
      expect(withHash).toMatch(/^#[0-9A-F]{6}$/)
      expect(withoutHash).toMatch(/^#[0-9A-F]{6}$/)
    })
  })

  describe('getContrastRatio', () => {
    it('should return 21 for black and white', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000')
      expect(ratio).toBeCloseTo(21, 0)
    })

    it('should return 1 for same colors', () => {
      const ratio = getContrastRatio('#FF5733', '#FF5733')
      expect(ratio).toBe(1)
    })
  })

  describe('isLightColor', () => {
    it('should return true for white', () => {
      expect(isLightColor('#FFFFFF')).toBe(true)
    })

    it('should return false for black', () => {
      expect(isLightColor('#000000')).toBe(false)
    })
  })

  describe('getContrastingTextColor', () => {
    it('should return white for dark backgrounds', () => {
      const result = getContrastingTextColor('#2D3748')
      expect(result).toBe('#FFFFFF')
    })

    it('should return black for light backgrounds', () => {
      const result = getContrastingTextColor('#FEF0EC')
      expect(result).toBe('#000000')
    })
  })
})
