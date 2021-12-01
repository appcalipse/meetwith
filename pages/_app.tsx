import '../styles/globals.css';
import type {AppProps} from 'next/app';
import * as React from 'react';
import {ChakraProvider} from '@chakra-ui/react';
import { CookiesProvider } from "react-cookie"
import {extendTheme} from '@chakra-ui/react';
import NavBar from '../components/Navbar';
import Footer from '../components/Footer';
import {AccountProvider} from '../providers/AccountProvider';
import Head from 'next/head';
import {initAnalytics} from '../utils/analytics';
import customTheme from '../styles/theme';
import { CookieConsent } from '../components/CookieConsent';

const theme = extendTheme(customTheme);

export default function MyApp({Component, pageProps}: AppProps) {
  const [loading, setLoading] = React.useState(true);

  const initApp = async () => {
    setLoading(false);
    await initAnalytics();
  };

  React.useEffect(() => {
    initApp();
  }, []);

  return (
    <ChakraProvider theme={theme}>
          <CookiesProvider>
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
      <CookieConsent/>
      </CookiesProvider>
    </ChakraProvider>
  );
}
