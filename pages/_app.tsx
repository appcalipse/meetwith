import '../styles/globals.css';
import type {AppProps} from 'next/app';
import * as React from 'react';
import {ChakraProvider} from '@chakra-ui/react';

import {extendTheme} from '@chakra-ui/react';
import NavBar from '../components/Navbar';
import Footer from '../components/Footer';
import {AccountProvider} from '../providers/AccountProvider';
import Head from 'next/head';

// 2. Extend the theme to include custom colors, fonts, etc
const colors = {
  brand: {
    900: '#1a365d',
    800: '#153e75',
    700: '#2a69ac',
  },
  fonts: {
    heading: 'Work Sans',
    body: 'Work Sans',
  },
};

const theme = extendTheme({colors});

export default function MyApp({Component, pageProps}: AppProps) {
  const [loading, setLoading] = React.useState(true);

  const initApp = async () => {
    setLoading(false);
  };

  React.useEffect(() => {
    initApp();
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <AccountProvider>
        <Head>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
        </Head>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <NavBar />
            <Component {...pageProps} />
            <Footer />
          </>
        )}
      </AccountProvider>
    </ChakraProvider>
  );
}
