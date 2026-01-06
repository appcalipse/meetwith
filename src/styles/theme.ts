import { extendTheme, ThemeConfig, ThemeProviderProps } from '@chakra-ui/react'
import { mode } from '@chakra-ui/theme-tools'
import { DM_Sans } from 'next/font/google'
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap' })
const config: ThemeConfig = {
  initialColorMode: 'dark',
  disableTransitionOnChange: false,
}

export const colors = {
  primary: {
    50: '#FCDACF',
    75: '#FDE5DD',
    100: '#FBC7B7',
    200: '#F9B19A',
    300: '#F78C69',
    400: '#F46739',
    500: '#F35826',
    600: '#E8420D',
    700: '#C1370B',
    800: '#912908',
    900: '#611C05',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F5F7FA',
    75: '#EAFBF2',
    100: '#E4E7EB',
    200: '#CBD2D9',
    300: '#9AA5B1',
    400: '#7B8794',
    450: '#2F3847',
    475: '#2D3748',
    500: '#616E7C',
    600: '#52606D',
    650: '#252E37',
    700: '#3E4C59',
    800: '#323F4B',
    825: '#1F2933',
    845: '#1D2630',
    850: '#181F24',
    900: '#131A20',
    950: '#192129',
  },
  green: {
    700: '#00411D',
    600: '#00B576',
    500: '#34C759',
    400: '#00ce5d',
    300: '#55de93',
    200: '#ccf5df',
    100: '#D1F0D8',
  },
  orangeButton: {
    200: '#F46739',
    300: '#F35826',
    800: '#F10000',
  },
  grayButton: {
    200: '#E4E7EB',
    300: '#CBD2D9',
  },
  yellow: {
    100: '#FFF899',
    300: '#FFC700',
    400: '#FF9500',
    600: '#F9E800',
  },
  red: {
    100: '#FFD5D6',
    250: '#FF383C',
    300: '#FF2023',
    400: '#FF1115',
    500: '#FF0000',
    600: '#EB001B',
    700: '#E40004',
  },
  orange: {
    100: '#FCDACF',
    200: '#FCD6CA',
    400: '#FF8A65',
    700: '#D93F0C',
    800: '#C1380B',
  },
  dark: {
    900: '#141A1F',
    800: '#191D27',
    700: '#131418',
  },
}

const newTheme = {
  styles: {
    global: (props: ThemeProviderProps) => ({
      body: {
        bg: mode('gray.50', 'neutral.850')(props),
      },
      '*, *::before, &::after': {
        borderColor: mode('gray.300', 'whiteAlpha.300')(props),
      },
      '.chakra-input__left-addon': {
        borderColor: 'inherit !important',
      },
      '.chakra-input__left-addon.disabled': {
        opacity: 0.4,
      },
    }),
  },
  config,
  colors,
  brand: {
    900: '#1a365d',
    800: '#153e75',
    700: '#2a69ac',
  },
  fonts: {
    heading: dmSans.style.fontFamily,
    body: dmSans.style.fontFamily,
  },
  components: {
    Link: {
      baseStyle: {
        color: 'primary.400',
      },
    },
    Button: {
      baseStyle: (props: ThemeProviderProps) => ({
        color: mode('gray.700', 'white')(props),
      }),
    },
  },
  semanticTokens: {
    colors: {
      'bg-canvas': {
        default: 'gray.50',
        _dark: 'neutral.850',
      },
      'bg-canvas-subtle': {
        default: 'neutral.100',
        _dark: 'neutral.475',
      },
      'bg-surface': {
        default: 'white',
        _dark: 'neutral.900',
      },
      'tab-button-bg': {
        default: 'white',
        _dark: 'neutral.900',
      },
      'event-text': {
        default: 'neutral.900',
        _dark: 'primary.500',
      },
      'upcoming-event-title': {
        default: 'neutral.900',
        _dark: 'neutral.0',
      },
      'bg-surface-secondary': {
        default: 'white',
        _dark: 'neutral.850',
      },
      'bg-surface-tertiary': {
        default: 'gray.50',
        _dark: 'neutral.825',
      },
      'border-wallet-subtle': {
        default: 'neutral.100',
        _dark: 'neutral.825',
      },
      'bg-surface-tertiary-2': {
        default: 'neutral.100',
        _dark: 'neutral.800',
      },
      'bg-surface-tertiary-3': {
        default: 'neutral.100',
        _dark: 'neutral.825',
      },
      'bg-event-alternate': {
        default: 'neutral.50',
        _dark: 'neutral.950',
      },
      'bg-event': {
        default: 'neutral.0',
        _dark: 'neutral.825',
      },
      'bg-calendar-row': { default: 'neutral.200', _dark: 'neutral.800' },
      'bg-surface-tertiary-4': {
        default: 'neutral.50',
        _dark: 'neutral.825',
      },
      'input-bg-subtle': {
        default: 'neutral.100',
        _dark: 'neutral.450',
      },
      'border-default': {
        default: 'neutral.200',
        _dark: 'neutral.600',
      },
      'border-subtle': {
        default: 'neutral.100',
        _dark: 'neutral.700',
      },
      'border-inverted-subtle': {
        default: 'neutral.700',
        _dark: 'neutral.0',
      },
      'sidebar-inverted-subtle': {
        default: 'neutral.700',
        _dark: 'neutral.200',
      },
      'border-emphasis': {
        default: 'neutral.300',
        _dark: 'neutral.500',
      },
      'border-default-primary': {
        default: 'primary.600',
        _dark: 'primary.200',
      },
      'border-subtle-primary': {
        default: 'primary.100',
        _dark: 'primary.700',
      },
      'border-emphasis-primary': {
        default: 'primary.300',
        _dark: 'primary.500',
      },
      'text-primary': {
        default: 'gray.800',
        _dark: 'white',
      },
      'text-highlight-primary': {
        default: 'gray.900',
        _dark: 'neutral.200',
      },
      'text-secondary': {
        default: 'gray.600',
        _dark: 'gray.300',
      },
      'text-tertiary': {
        default: 'gray.500',
        _dark: 'gray.400',
      },
      'text-muted': {
        default: 'gray.400',
        _dark: 'gray.500',
      },
      'text-subtle': {
        default: 'neutral.600',
        _dark: 'neutral.400',
      },
      'icon-default': {
        default: 'gray.600',
        _dark: 'gray.300',
      },
      'icon-secondary': {
        default: 'gray.500',
        _dark: 'gray.400',
      },
      'icon-emphasis': {
        default: 'gray.700',
        _dark: 'white',
      },
      'select-bg': {
        default: 'white',
        _dark: 'inherit',
      },
      'input-border': {
        default: 'neutral.200',
        _dark: 'neutral.400',
      },
      'warning-bg': {
        default: 'orange.200',
        _dark: 'orange.200',
      },
      'warning-text': {
        default: 'orange.700',
        _dark: 'orange.700',
      },
      'dark-bg': {
        default: 'neutral.0',
        _dark: 'dark.700',
      },
      'button-text-dark': {
        default: 'gray.800',
        _dark: 'gray.800',
      },
      'menu-bg': {
        default: 'white',
        _dark: 'neutral.800',
      },
      'tab-bg': {
        default: 'neutral.100',
        _dark: 'neutral.800',
      },
      'card-border': {
        default: 'neutral.200',
        _dark: 'neutral.800',
      },
      'menu-button-bg': {
        default: 'neutral.100',
        _dark: 'neutral.800',
      },
      'menu-button-hover': {
        default: 'neutral.200',
        _dark: 'neutral.700',
      },
      'menu-item-hover': {
        default: 'neutral.100',
        _dark: 'neutral.700',
      },
      'dropdown-hover': {
        default: 'neutral.50',
        _dark: 'neutral.800',
      },
      'upcoming-event-text': {
        default: 'neutral.400',
        _dark: 'neutral.100',
      },
      'connected-calendar-border': {
        default: 'neutral.100',
        _dark: 'neutral.400',
      },
    },
  },
}

// declare a variable for our theme and pass our overrides in the extendTheme method from chakra
const customTheme = extendTheme(newTheme)
// export our theme
export default customTheme
