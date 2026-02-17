import { ColorModeScript } from '@chakra-ui/color-mode'
import Document, { Head, Html, Main, NextScript } from 'next/document'

import theme from '../styles/theme'

class MyDocument extends Document {
  render() {
    return (
      <Html suppressHydrationWarning>
        <Head>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
        </Head>
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
