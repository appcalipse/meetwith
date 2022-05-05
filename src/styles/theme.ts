import { extendTheme, ThemeConfig, ThemeProviderProps } from '@chakra-ui/react'
import { mode } from '@chakra-ui/theme-tools'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const colors = {
  orange: {
    50: '#ffe9e0',
    100: '#ffc5b3',
    200: '#faa184',
    300: '#f67c55',
    400: '#f35826',
    500: '#d93f0c',
    600: '#aa3009',
    700: '#7a2205',
    800: '#4b1200',
    900: '#1f0300',
    // TO-DO: change to a better name after defining the new color scheme
    link: '#f15624',
  },
  gray: {
    link: '#3E4C67',
  },
}

const newTheme = {
  styles: {
    global: (props: ThemeProviderProps) => ({
      body: {
        bg: mode('gray.50', 'gray.700')(props),
      },
      '*, *::before, &::after': {
        borderColor: mode('gray.300', 'whiteAlpha.300')(props),
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
    heading: 'DM Sans',
    body: 'DM Sans',
  },
  components: {
    Link: {
      baseStyle: {
        color: 'orange.400',
      },
    },
    Button: {
      baseStyle: {
        color: 'white',
      },
    },
  },
}

export enum ButtonType {
  SOLID = 'solid',
  OUTLINE = 'outline',
  GHOST = 'ghost',
  LINK = 'link',
}

export enum Color {
  ORANGE = 'orange',
  GRAY = 'gray',
}

// declare a variable for our theme and pass our overrides in the extendTheme method from chakra
const customTheme = extendTheme(newTheme)

// export our theme
export default customTheme
