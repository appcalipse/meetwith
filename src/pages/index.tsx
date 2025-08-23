import { Box, DarkMode, useColorMode } from '@chakra-ui/react'
import { getIronSession } from 'iron-session'
import type { NextPage } from 'next'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'

import Loading from '@/components/Loading'
import { sessionOptions } from '@/middleware'
import redirectTo from '@/utils/redirect'

import Faq from '../components/landing/FAQ'
import { Features } from '../components/landing/Features'
import Hero from '../components/landing/Hero'
import Why from '../components/landing/Why'
const ProAccessPopUp = dynamic(
  () => import('@/components/landing/ProAccessPopUp'),
  {
    ssr: false,
    loading: () => <Loading />,
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
      <DarkMode>
        <Box bg={'neutral.900'} pb={36} fontWeight={500}>
          <Hero />
          <Why />
          <Features />
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
