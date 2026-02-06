import {
  generateBorderColor,
  generateBorderColorWithIntensity,
  getContrastRatio,
  isLightColor,
  getContrastingTextColor,
  getAdvancedContrastingText,
  generateColorScheme,
  getDesignSystemTextColor,
} from '@/utils/color-utils'

describe('color-utils', () => {
  describe('generateBorderColor', () => {
    it('should generate border color for light background', () => {
      const borderColor = generateBorderColor('#FEF0EC')
      expect(borderColor).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should generate border color for dark background', () => {
      const borderColor = generateBorderColor('#2D3748', true)
      expect(borderColor).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should throw error for invalid hex', () => {
      expect(() => generateBorderColor('invalid')).toThrow('Invalid hex color format')
    })

    it('should handle hex without # prefix', () => {
      const borderColor = generateBorderColor('FEF0EC')
      expect(borderColor).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should generate darker color for light backgrounds', () => {
      const bg = '#F0F0F0'
      const border = generateBorderColor(bg)
      expect(isLightColor(border)).toBe(false)
    })
  })

  describe('generateBorderColorWithIntensity', () => {
    it('should generate light intensity border', () => {
      const borderColor = generateBorderColorWithIntensity('#FEF0EC', 'light')
      expect(borderColor).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should generate medium intensity border', () => {
      const borderColor = generateBorderColorWithIntensity('#FEF0EC', 'medium')
      expect(borderColor).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should generate bold intensity border by default', () => {
      const borderColor1 = generateBorderColorWithIntensity('#FEF0EC')
      const borderColor2 = generateBorderColorWithIntensity('#FEF0EC', 'bold')
      expect(borderColor1).toBe(borderColor2)
    })

    it('should throw error for invalid hex', () => {
      expect(() => generateBorderColorWithIntensity('invalid')).toThrow()
    })
  })

  describe('getContrastRatio', () => {
    it('should calculate contrast ratio between two colors', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000')
      expect(ratio).toBeCloseTo(21, 0)
    })

    it('should return 1 for identical colors', () => {
      const ratio = getContrastRatio('#FF0000', '#FF0000')
      expect(ratio).toBe(1)
    })

    it('should handle different color formats', () => {
      const ratio1 = getContrastRatio('#FFF', '#000')
      const ratio2 = getContrastRatio('#FFFFFF', '#000000')
      expect(ratio1).not.toBe(ratio2)
    })

    it('should throw error for invalid colors', () => {
      expect(() => getContrastRatio('invalid', '#000000')).toThrow()
    })
  })

  describe('isLightColor', () => {
    it('should identify white as light', () => {
      expect(isLightColor('#FFFFFF')).toBe(true)
    })

    it('should identify black as dark', () => {
      expect(isLightColor('#000000')).toBe(false)
    })

    it('should identify light gray as light', () => {
      expect(isLightColor('#CCCCCC')).toBe(true)
    })

    it('should identify dark gray as dark', () => {
      expect(isLightColor('#333333')).toBe(false)
    })

    it('should throw error for invalid color', () => {
      expect(() => isLightColor('invalid')).toThrow()
    })
  })

  describe('getContrastingTextColor', () => {
    it('should return white for dark backgrounds', () => {
      const textColor = getContrastingTextColor('#000000')
      expect(textColor).toBe('#FFFFFF')
    })

    it('should return black for light backgrounds', () => {
      const textColor = getContrastingTextColor('#FFFFFF')
      expect(textColor).toBe('#000000')
    })

    it('should use custom colors', () => {
      const textColor = getContrastingTextColor('#808080', '#F0F0F0', '#101010')
      expect(textColor).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should handle mid-tone grays', () => {
      const textColor = getContrastingTextColor('#888888')
      expect(['#FFFFFF', '#000000']).toContain(textColor)
    })
  })

  describe('getAdvancedContrastingText', () => {
    it('should return WCAG compliant text color', () => {
      const result = getAdvancedContrastingText('#FFFFFF', { wcagLevel: 'AA' })
      
      expect(result.color).toBe('#000000')
      expect(result.wcagCompliant).toBe(true)
      expect(result.contrastRatio).toBeGreaterThan(4.5)
    })

    it('should handle AAA compliance level', () => {
      const result = getAdvancedContrastingText('#FFFFFF', { wcagLevel: 'AAA' })
      
      expect(result.wcagCompliant).toBe(true)
      expect(result.contrastRatio).toBeGreaterThan(7)
    })

    it('should prefer light text when specified', () => {
      const result = getAdvancedContrastingText('#000000', { preference: 'light' })
      
      expect(result.color).toBe('#FFFFFF')
    })

    it('should use alternative colors', () => {
      const result = getAdvancedContrastingText('#808080', {
        alternatives: ['#FF0000', '#00FF00'],
      })
      
      expect(result).toBeDefined()
    })

    it('should return best option when no color is compliant', () => {
      const result = getAdvancedContrastingText('#808080', {
        lightText: '#909090',
        darkText: '#707070',
        wcagLevel: 'AAA',
      })
      
      expect(result.wcagCompliant).toBe(false)
      expect(result.level).toBe('fail')
    })
  })

  describe('generateColorScheme', () => {
    it('should generate complete color scheme', () => {
      const scheme = generateColorScheme('#FEF0EC')
      
      expect(scheme.background).toBe('#FEF0EC')
      expect(scheme.border).toMatch(/^#[0-9A-F]{6}$/)
      expect(scheme.text).toMatch(/^#[0-9A-F]{6}$/)
      expect(scheme.textDetails.contrastRatio).toBeGreaterThan(0)
    })

    it('should use specified border intensity', () => {
      const scheme = generateColorScheme('#FEF0EC', { borderIntensity: 'light' })
      
      expect(scheme.border).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should use text options', () => {
      const scheme = generateColorScheme('#FEF0EC', {
        textOptions: { wcagLevel: 'AAA' },
      })
      
      expect(scheme.textDetails.wcagCompliant).toBeDefined()
    })

    it('should provide WCAG compliance info', () => {
      const scheme = generateColorScheme('#FFFFFF')
      
      expect(['AA', 'AAA', 'fail']).toContain(scheme.textDetails.level)
      expect(typeof scheme.textDetails.wcagCompliant).toBe('boolean')
    })
  })

  describe('getDesignSystemTextColor', () => {
    it('should return design system compliant color', () => {
      const textColor = getDesignSystemTextColor('#FFFFFF')
      
      expect(textColor).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should handle dark backgrounds', () => {
      const textColor = getDesignSystemTextColor('#000000')
      
      expect(textColor).toBe('#FFFFFF')
    })

    it('should handle mid-tone backgrounds', () => {
      const textColor = getDesignSystemTextColor('#808080')
      
      expect(textColor).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should use brand colors', () => {
      const textColor = getDesignSystemTextColor('#F46739')
      
      expect(['#FFFFFF', '#2D3748', '#7B8794']).toContain(textColor)
    })
  })
})
