import { extendTheme, ThemeConfig } from '@chakra-ui/react'

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
  },
}

const newTheme = {
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

// declare a variable for our theme and pass our overrides in the extendTheme method from chakra
const customTheme = extendTheme(newTheme)

// export our theme
export default customTheme
