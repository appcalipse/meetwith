import { ColorModeScript } from '@chakra-ui/color-mode'
import Document, { Head, Html, Main, NextScript } from 'next/document'

import { Head as CustomHead } from '@/components/Head'

import theme from '../styles/theme'

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <CustomHead />
        <body>
          <ColorModeScript
            initialColorMode={theme.config.initialColorMode}
            type="cookie"
          />
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
