import { extendTheme, ThemeConfig, ThemeProviderProps } from '@chakra-ui/react'
import { mode } from '@chakra-ui/theme-tools'
import { DM_Sans } from 'next/font/google'

const dmSans = DM_Sans({ display: 'swap', subsets: ['latin'] })
const config: ThemeConfig = {
  disableTransitionOnChange: false,
  initialColorMode: 'dark',
}

export const colors = {
  dark: {
    700: '#131418',
    800: '#191D27',
    900: '#141A1F',
  },
  grayButton: {
    200: '#E4E7EB',
    300: '#CBD2D9',
  },
  green: {
    100: '#D1F0D8',
    200: '#ccf5df',
    300: '#55de93',
    400: '#00ce5d',
    500: '#34C759',
    600: '#00B576',
    700: '#00411D',
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
  orange: {
    100: '#FCDACF',
    200: '#FCD6CA',
    400: '#FF8A65',
    700: '#D93F0C',
    800: '#C1380B',
  },
  orangeButton: {
    200: '#F46739',
    300: '#F35826',
    800: '#F10000',
  },
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
  red: {
    100: '#FFD5D6',
    250: '#FF383C',
    300: '#FF2023',
    400: '#FF1115',
    500: '#FF0000',
    600: '#EB001B',
    700: '#E40004',
  },
  yellow: {
    100: '#FFF899',
    300: '#FFC700',
    400: '#FF9500',
    600: '#F9E800',
  },
  blue: {
    400: '#2F89F8',
  },
}

const newTheme = {
  brand: {
    700: '#2a69ac',
    800: '#153e75',
    900: '#1a365d',
  },
  colors,
  components: {
    Button: {
      baseStyle: (props: ThemeProviderProps) => ({
        color: mode('gray.700', 'white')(props),
      }),
    },
    Link: {
      baseStyle: {
        color: 'primary.400',
      },
    },
  },
  config,
  fonts: {
    body: dmSans.style.fontFamily,
    heading: dmSans.style.fontFamily,
  },
  semanticTokens: {
    colors: {
      'bg-calendar-row': { _dark: 'neutral.800', default: 'neutral.200' },
      'bg-canvas': {
        _dark: 'neutral.850',
        default: 'gray.50',
      },
      'bg-canvas-subtle': {
        _dark: 'neutral.475',
        default: 'neutral.100',
      },
      'bg-event': {
        _dark: 'neutral.825',
        default: 'neutral.0',
      },
      'bg-event-alternate': {
        _dark: 'neutral.950',
        default: 'neutral.50',
      },
      'bg-surface': {
        _dark: 'neutral.900',
        default: 'white',
      },
      'bg-surface-secondary': {
        _dark: 'neutral.850',
        default: 'white',
      },
      'bg-surface-tertiary': {
        _dark: 'neutral.825',
        default: 'gray.50',
      },
      'bg-surface-tertiary-2': {
        _dark: 'neutral.800',
        default: 'neutral.100',
      },
      'bg-surface-tertiary-3': {
        _dark: 'neutral.825',
        default: 'neutral.100',
      },
      'bg-surface-tertiary-4': {
        _dark: 'neutral.825',
        default: 'neutral.50',
      },
      'border-default': {
        _dark: 'neutral.600',
        default: 'neutral.200',
      },
      'border-default-primary': {
        _dark: 'primary.200',
        default: 'primary.600',
      },
      'border-emphasis': {
        _dark: 'neutral.500',
        default: 'neutral.300',
      },
      'border-emphasis-primary': {
        _dark: 'primary.500',
        default: 'primary.300',
      },
      'border-inverted-subtle': {
        _dark: 'neutral.0',
        default: 'neutral.700',
      },
      'border-subtle': {
        _dark: 'neutral.700',
        default: 'neutral.100',
      },
      'border-subtle-primary': {
        _dark: 'primary.700',
        default: 'primary.100',
      },
      'border-wallet-subtle': {
        _dark: 'neutral.825',
        default: 'neutral.100',
      },
      'button-text-dark': {
        _dark: 'gray.800',
        default: 'gray.800',
      },
      'card-border': {
        _dark: 'neutral.800',
        default: 'neutral.200',
      },
      'connected-calendar-border': {
        _dark: 'neutral.400',
        default: 'neutral.100',
      },
      'dark-bg': {
        _dark: 'dark.700',
        default: 'neutral.0',
      },
      'dropdown-hover': {
        _dark: 'neutral.800',
        default: 'neutral.50',
      },
      'event-text': {
        _dark: 'primary.500',
        default: 'neutral.900',
      },
      'icon-default': {
        _dark: 'gray.300',
        default: 'gray.600',
      },
      'icon-emphasis': {
        _dark: 'white',
        default: 'gray.700',
      },
      'icon-secondary': {
        _dark: 'gray.400',
        default: 'gray.500',
      },
      'input-bg-subtle': {
        _dark: 'neutral.450',
        default: 'neutral.100',
      },
      'input-border': {
        _dark: 'neutral.400',
        default: 'neutral.200',
      },
      'menu-bg': {
        _dark: 'neutral.800',
        default: 'white',
      },
      'menu-button-bg': {
        _dark: 'neutral.800',
        default: 'neutral.100',
      },
      'menu-button-hover': {
        _dark: 'neutral.700',
        default: 'neutral.200',
      },
      'menu-item-hover': {
        _dark: 'neutral.700',
        default: 'neutral.100',
      },
      'select-bg': {
        _dark: 'inherit',
        default: 'white',
      },
      'sidebar-inverted-subtle': {
        _dark: 'neutral.200',
        default: 'neutral.700',
      },
      'tab-bg': {
        _dark: 'neutral.800',
        default: 'neutral.100',
      },
      'tab-button-bg': {
        _dark: 'neutral.900',
        default: 'white',
      },
      'text-highlight-primary': {
        _dark: 'neutral.200',
        default: 'gray.900',
      },
      'text-muted': {
        _dark: 'gray.500',
        default: 'gray.400',
      },
      'text-primary': {
        _dark: 'white',
        default: 'gray.800',
      },
      'text-secondary': {
        _dark: 'gray.300',
        default: 'gray.600',
      },
      'text-subtle': {
        _dark: 'neutral.400',
        default: 'neutral.600',
      },
      'text-tertiary': {
        _dark: 'gray.400',
        default: 'gray.500',
      },
      'upcoming-event-text': {
        _dark: 'neutral.100',
        default: 'neutral.400',
      },
      'upcoming-event-title': {
        _dark: 'neutral.0',
        default: 'neutral.900',
      },
      'warning-bg': {
        _dark: 'orange.200',
        default: 'orange.200',
      },
      'warning-text': {
        _dark: 'orange.700',
        default: 'orange.700',
      },
    },
  },
  styles: {
    global: (props: ThemeProviderProps) => ({
      '.chakra-input__left-addon': {
        borderColor: 'inherit !important',
      },
      '.chakra-input__left-addon.disabled': {
        opacity: 0.4,
      },
      '*, *::before, &::after': {
        borderColor: mode('gray.300', 'whiteAlpha.300')(props),
      },
      body: {
        bg: mode('gray.50', 'neutral.850')(props),
      },
    }),
  },
}

// declare a variable for our theme and pass our overrides in the extendTheme method from chakra
const customTheme = extendTheme(newTheme)
// export our theme
export default customTheme
