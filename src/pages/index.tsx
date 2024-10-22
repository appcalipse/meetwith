import { Box, DarkMode } from '@chakra-ui/react'
import { getIronSession } from 'iron-session'
import type { NextPage } from 'next'
import React from 'react'

import { sessionOptions } from '@/middleware'
import redirectTo from '@/utils/redirect'

import { Faq } from '../components/landing/FAQ'
import { Features } from '../components/landing/Features'
import { Hero } from '../components/landing/Hero'
import { Plans } from '../components/landing/Plans'
import { Why } from '../components/landing/Why'

const Home: NextPage = () => {
  return (
    <main data-testid="main-container">
      <DarkMode>
        <Box bg={'neutral.1000'} pb={36} fontWeight={500}>
          <Hero />
          <Why />
          <Box px={5}>
            <Features />
          </Box>
          <Box px={5}>
            <Faq />
          </Box>
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
