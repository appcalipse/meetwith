import {
  generateBorderColor,
  generateBorderColorWithIntensity,
} from '@/utils/color-utils'

describe('Color Utils', () => {
  describe('generateBorderColor', () => {
    it('should generate the expected border color for light peachy background', () => {
      const backgroundColor = '#FEF0EC'
      const borderColor = generateBorderColor(backgroundColor)

      // Should generate a darker, more saturated orange
      expect(borderColor).toMatch(/^#[0-9A-F]{6}$/)

      // The result should be significantly darker than the input
      const inputLightness = parseInt(backgroundColor.slice(1, 3), 16)
      const outputLightness = parseInt(borderColor.slice(1, 3), 16)
      expect(outputLightness).toBeLessThan(inputLightness)
    })

    it('should handle various light colors', () => {
      const testCases = [
        '#FEF0EC', // Light peach
        '#F0F8FF', // Light blue
        '#F0FFF0', // Light green
        '#FFF0F5', // Light pink
      ]

      testCases.forEach(color => {
        const result = generateBorderColor(color)
        expect(result).toMatch(/^#[0-9A-F]{6}$/)
      })
    })

    it('should throw error for invalid hex colors', () => {
      expect(() => generateBorderColor('invalid')).toThrow()
      expect(() => generateBorderColor('#GGG')).toThrow()
    })
  })

  describe('generateBorderColorWithIntensity', () => {
    it('should generate different intensities', () => {
      const backgroundColor = '#FEF0EC'

      const light = generateBorderColorWithIntensity(backgroundColor, 'light')
      const medium = generateBorderColorWithIntensity(backgroundColor, 'medium')
      const bold = generateBorderColorWithIntensity(backgroundColor, 'bold')

      expect(light).not.toBe(medium)
      expect(medium).not.toBe(bold)
      expect(light).not.toBe(bold)

      // All should be valid hex colors
      ;[light, medium, bold].forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/)
      })
    })
  })
})
