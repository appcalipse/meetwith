/**
 * Color utility functions for generating border colors and color variations
 */

/**
 * Converts hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        b: parseInt(result[3], 16),
        g: parseInt(result[2], 16),
        r: parseInt(result[1], 16),
      }
    : null
}

/**
 * Converts RGB to HSL
 */
function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h: number, s: number

  const l = (max + min) / 2

  if (max === min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
      default:
        h = 0
    }
    h /= 6
  }

  return { h: h * 360, l: l * 100, s: s * 100 }
}

/**
 * Converts HSL to RGB
 */
function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    b: Math.round(b * 255),
    g: Math.round(g * 255),
    r: Math.round(r * 255),
  }
}

/**
 * Converts RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Generates a thicker/darker border color from a light background color
 * This algorithm creates a bold accent color suitable for borders by:
 * 1. Maintaining the base hue family
 * 2. Dramatically increasing saturation
 * 3. Reducing lightness for strong contrast
 *
 * @param backgroundColor - Hex color string (e.g., '#FEF0EC')
 * @returns Hex color string for the border (e.g., '#F35826')
 */
export function generateBorderColor(
  backgroundColor: string,
  isLight = false
): string {
  // Remove # if present and validate
  const cleanHex = backgroundColor.replace('#', '')
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error('Invalid hex color format')
  }

  // Convert to RGB
  const rgb = hexToRgb('#' + cleanHex)
  if (!rgb) {
    throw new Error('Failed to convert hex to RGB')
  }

  // Convert to HSL for easier manipulation
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)

  // Algorithm for creating border color:
  let { h, s, l } = hsl

  // For very light colors (high lightness), we need to create a bold accent
  if (isLight) {
    // Dark theme: lighten borders for contrast
    if (l < 15) {
      s = Math.min(85, s + 60)
      l = Math.min(75, l + 60)
    } else if (l < 40) {
      s = Math.min(80, s + 40)
      l = Math.min(70, l + 35)
    } else {
      s = Math.min(75, s + 20)
      l = Math.min(80, l + 20)
    }
  } else {
    // Light theme: darken borders for contrast (existing behavior)
    if (l > 85) {
      s = Math.min(85, s + 60)
      l = Math.max(25, l - 60)
    } else if (l > 60) {
      s = Math.min(80, s + 40)
      l = Math.max(30, l - 35)
    } else {
      s = Math.min(75, s + 20)
      l = Math.max(20, l - 20)
    }
  }
  // Adjust hue slightly for warmer tones if it's in the orange/red family
  if ((h >= 0 && h <= 30) || (h >= 330 && h <= 360)) {
    // Orange/red hues - make slightly warmer
    h = (h + 10) % 360
  }

  // Convert back to RGB
  const newRgb = hslToRgb(h, s, l)

  // Convert to hex
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b)
}

/**
 * Alternative function that provides different intensity levels
 */
export function generateBorderColorWithIntensity(
  backgroundColor: string,
  intensity: 'light' | 'medium' | 'bold' = 'bold'
): string {
  const cleanHex = backgroundColor.replace('#', '')
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error('Invalid hex color format')
  }

  const rgb = hexToRgb('#' + cleanHex)
  if (!rgb) {
    throw new Error('Failed to convert hex to RGB')
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  let { h, s, l } = hsl

  // Adjust based on intensity
  switch (intensity) {
    case 'light':
      s = Math.min(60, s + 30)
      l = Math.max(45, l - 25)
      break
    case 'medium':
      s = Math.min(75, s + 45)
      l = Math.max(35, l - 40)
      break
    case 'bold':
    default:
      s = Math.min(85, s + 60)
      l = Math.max(25, l - 60)
      break
  }

  // Warm up orange/red hues
  if ((h >= 0 && h <= 30) || (h >= 330 && h <= 360)) {
    h = (h + 8) % 360
  }

  const newRgb = hslToRgb(h, s, l)
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b)
}

/**
 * Calculates the relative luminance of a color according to WCAG standards
 * Used for determining contrast ratios between colors
 */
function getLuminance(r: number, g: number, b: number): number {
  // Convert to linear RGB values
  const toLinear = (value: number): number => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }

  const rLinear = toLinear(r)
  const gLinear = toLinear(g)
  const bLinear = toLinear(b)

  // Calculate relative luminance using WCAG formula
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * Calculates the contrast ratio between two colors according to WCAG standards
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @returns Contrast ratio (1-21, where 21 is maximum contrast)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid hex color format')
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Determines if a color is considered light or dark based on its luminance
 * @param color - Hex color string
 * @returns true if the color is light, false if dark
 */
export function isLightColor(color: string): boolean {
  const rgb = hexToRgb(color)
  if (!rgb) {
    throw new Error('Invalid hex color format')
  }

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b)
  return luminance > 0.5 // Threshold for determining light vs dark
}

/**
 * Generates a contrasting text color for a given background color
 * Returns either black or white based on which provides better contrast
 *
 * @param backgroundColor - Hex color string for the background
 * @param lightText - Custom light text color (default: '#FFFFFF')
 * @param darkText - Custom dark text color (default: '#000000')
 * @returns Hex color string for the text that provides good contrast
 */
export function getContrastingTextColor(
  backgroundColor: string,
  lightText = '#FFFFFF',
  darkText = '#000000'
): string {
  const whiteContrast = getContrastRatio(backgroundColor, lightText)
  const blackContrast = getContrastRatio(backgroundColor, darkText)

  // Return the color with higher contrast ratio
  return whiteContrast > blackContrast ? lightText : darkText
}

/**
 * Advanced contrasting text color generator with multiple options
 * Provides different text color variations based on accessibility requirements
 *
 * @param backgroundColor - Hex color string for the background
 * @param options - Configuration options
 */
export function getAdvancedContrastingText(
  backgroundColor: string,
  options: {
    /** WCAG compliance level: 'AA' requires 4.5:1, 'AAA' requires 7:1 */
    wcagLevel?: 'AA' | 'AAA'
    /** Custom light text color */
    lightText?: string
    /** Custom dark text color */
    darkText?: string
    /** Alternative text colors to try */
    alternatives?: string[]
    /** Prefer a specific color when both meet requirements */
    preference?: 'light' | 'dark'
  } = {}
): {
  color: string
  contrastRatio: number
  wcagCompliant: boolean
  level: 'AA' | 'AAA' | 'fail'
} {
  const {
    wcagLevel = 'AA',
    lightText = '#FFFFFF',
    darkText = '#000000',
    alternatives = [],
    preference = 'light',
  } = options

  const minContrast = wcagLevel === 'AAA' ? 7 : 4.5

  // Test all possible text colors
  const textOptions = [lightText, darkText, ...alternatives]
  const results = textOptions.map(textColor => ({
    color: textColor,
    contrastRatio: getContrastRatio(backgroundColor, textColor),
  }))

  // Filter colors that meet minimum contrast requirements
  const compliantColors = results.filter(
    result => result.contrastRatio >= minContrast
  )

  // If we have compliant colors, choose based on preference
  if (compliantColors.length > 0) {
    const selected = compliantColors.sort((a, b) => {
      if (preference === 'light') {
        return isLightColor(b.color) ? 1 : -1
      } else {
        return isLightColor(a.color) ? 1 : -1
      }
    })[0]

    return {
      color: selected.color,
      contrastRatio: selected.contrastRatio,
      level: selected.contrastRatio >= 7 ? 'AAA' : 'AA',
      wcagCompliant: true,
    }
  }

  // If no colors meet requirements, return the one with highest contrast
  const bestOption = results.sort(
    (a, b) => b.contrastRatio - a.contrastRatio
  )[0]

  return {
    color: bestOption.color,
    contrastRatio: bestOption.contrastRatio,
    level: 'fail' as const,
    wcagCompliant: false,
  }
}

/**
 * Generates a complete color scheme with background, border, and contrasting text
 * Perfect for creating consistent UI components
 *
 * @param baseColor - The base background color
 * @param options - Configuration options
 */
export function generateColorScheme(
  baseColor: string,
  options: {
    borderIntensity?: 'light' | 'medium' | 'bold'
    textOptions?: {
      wcagLevel?: 'AA' | 'AAA'
      lightText?: string
      darkText?: string
    }
  } = {}
): {
  background: string
  border: string
  text: string
  textDetails: {
    contrastRatio: number
    wcagCompliant: boolean
    level: 'AA' | 'AAA' | 'fail'
  }
} {
  const { borderIntensity = 'bold', textOptions = {} } = options

  const background = baseColor
  const border = generateBorderColorWithIntensity(baseColor, borderIntensity)
  const textResult = getAdvancedContrastingText(background, textOptions)

  return {
    background,
    border,
    text: textResult.color,
    textDetails: {
      contrastRatio: textResult.contrastRatio,
      level: textResult.level,
      wcagCompliant: textResult.wcagCompliant,
    },
  }
}

/**
 * Utility function to get text color for your design system
 * Specifically optimized for your existing color palette
 */
export function getDesignSystemTextColor(backgroundColor: string): string {
  const brandColors = {
    accent: '#F46739',
    neutral: '#7B8794',
    primaryDark: '#2D3748',
    primaryLight: '#FFFFFF',
  }

  const textResult = getAdvancedContrastingText(backgroundColor, {
    alternatives: [brandColors.neutral],
    darkText: brandColors.primaryDark,
    lightText: brandColors.primaryLight,
    preference: 'dark',
    wcagLevel: 'AA',
  })

  return textResult.color
}
