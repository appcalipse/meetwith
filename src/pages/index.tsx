import { Box, DarkMode, useColorMode } from '@chakra-ui/react'
import { getIronSession } from 'iron-session'
import type { NextPage } from 'next'
import dynamic from 'next/dynamic'
import NextHead from 'next/head'
import { useEffect } from 'react'

import { sessionOptions } from '@/middleware'
import redirectTo from '@/utils/redirect'

import Hero from '../components/landing/Hero'

const Why = dynamic(() => import('../components/landing/Why'), { ssr: true })
const Features = dynamic(
  () =>
    import('../components/landing/Features').then(mod => ({
      default: mod.Features,
    })),
  { ssr: true }
)
const Pricing = dynamic(
  () =>
    import('../components/landing/Pricing').then(mod => ({
      default: mod.Pricing,
    })),
  { ssr: true }
)
const Faq = dynamic(() => import('../components/landing/FAQ'), { ssr: true })

const ProAccessPopUp = dynamic(
  () => import('@/components/landing/ProAccessPopUp'),
  {
    ssr: false,
  }
)
const Home: NextPage = () => {
  const { colorMode, setColorMode } = useColorMode()

  useEffect(() => {
    // Forcefully set the theme to dark mode
    if (colorMode !== 'dark') {
      setColorMode('dark')
    }
  }, [colorMode, setColorMode])

  return (
    <main data-testid="main-container">
      <NextHead>
        <link
          rel="preload"
          href="/assets/product-ui.webp"
          as="image"
          type="image/webp"
        />
      </NextHead>
      <DarkMode>
        <Box bg={'neutral.900'} fontWeight={500} pb={36}>
          <Hero />
          <Why />
          <Features />
          <Pricing />
          <Faq />
          <ProAccessPopUp />
        </Box>
      </DarkMode>
    </main>
  )
}

Home.getInitialProps = async ctx => {
  if (!!ctx.req) {
    const session = await getIronSession(ctx.req, ctx.res!, sessionOptions)
    if (session.account) {
      let query = ''
      if (Object.keys(ctx.query).length !== 0) {
        const queryString = Object.keys(ctx.query)
          .map(key => {
            return (
              encodeURIComponent(key) +
              '=' +
              encodeURIComponent(ctx.query[key] as string)
            )
          })
          .join('&')
        query = `?${queryString}`
      }
      return redirectTo(`/dashboard/meetings${query}`, 302, ctx)
    }
  }

  return {}
}

export default Home
