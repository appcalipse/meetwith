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
          <title>Meet with wallet</title>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#f35826" />
          <meta name="msapplication-TileColor" content="#1a202c" />
          <meta name="theme-color" content="#f35826"></meta>
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
