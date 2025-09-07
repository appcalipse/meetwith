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
    100: '#E4E7EB',
    200: '#CBD2D9',
    300: '#9AA5B1',
    400: '#7B8794',
    450: '#2F3847',
    500: '#616E7C',
    600: '#52606D',
    700: '#3E4C59',
    800: '#323F4B',
    825: '#1F2933',
    845: '#1D2630',
    850: '#181F24',
    900: '#131A20',
  },
  green: {
    500: '#34C759',
    400: '#00ce5d',
    300: '#55de93',
    200: '#ccf5df',
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
    600: '#F9E800',
  },
  red: {
    500: '#FF0000',
    600: '#EB001B',
  },
  orange: {
    400: '#FF8A65',
  },
  dark: {
    900: '#141A1F',
    800: '#191D27',
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
}

// declare a variable for our theme and pass our overrides in the extendTheme method from chakra
const customTheme = extendTheme(newTheme)
// export our theme
export default customTheme
