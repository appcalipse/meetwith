import '../styles/globals.css'
import type { AppProps } from 'next/app'
import * as React from 'react';
import { ChakraProvider } from '@chakra-ui/react';

import { extendTheme } from "@chakra-ui/react"
import NavBar from '../components/Navbar';
import { AccountProvider } from '../providers/AccountProvider';
import { initDB } from '../utils/database';

// 2. Extend the theme to include custom colors, fonts, etc
const colors = {
  brand: {
    900: "#1a365d",
    800: "#153e75",
    700: "#2a69ac",
  },
}

const theme = extendTheme({ colors })


export default function MyApp({ Component, pageProps }: AppProps) {

  const [loading, setLoading] = React.useState(true);

  const initApp = async () => {
    await initDB()
    setLoading(false)
  }

  React.useEffect(() => {
    initApp()
  }, [])

  return (
    <ChakraProvider>
      <AccountProvider>
        {loading ? <div>Loading...</div> :
          <>
            <NavBar />
            <Component {...pageProps} />
          </>
        }
      </AccountProvider>
    </ChakraProvider>
  );
}