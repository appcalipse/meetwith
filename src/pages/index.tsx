import { Box, DarkMode, useColorMode, useDisclosure } from '@chakra-ui/react'
import { getIronSession } from 'iron-session'
import type { NextPage } from 'next'
import React, { useContext, useEffect } from 'react'

import ProAccessPopUp from '@/components/landing/ProAccessPopUp'
import { sessionOptions } from '@/middleware'
import { AccountContext } from '@/providers/AccountProvider'
import { Coupon } from '@/types/Subscription'
import { getNewestCoupon } from '@/utils/api_helper'
import redirectTo from '@/utils/redirect'
import { isProAccount } from '@/utils/subscription_manager'

import { Faq } from '../components/landing/FAQ'
import { Features } from '../components/landing/Features'
import { Hero } from '../components/landing/Hero'
import { Why } from '../components/landing/Why'

const Home: NextPage = () => {
  const [coupon, setCoupon] = React.useState<Coupon | undefined>(undefined)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { logged, currentAccount } = useContext(AccountContext)
  const { colorMode, setColorMode } = useColorMode()

  useEffect(() => {
    // Forcefully set the theme to dark mode
    if (colorMode !== 'dark') {
      setColorMode('dark')
    }
  }, [colorMode, setColorMode])
  const fetchCoupon = async () => {
    const data = await getNewestCoupon()
    setCoupon(data)
    onOpen()
  }
  useEffect(() => {
    if (logged && isProAccount(currentAccount ?? undefined)) {
      onClose()
      return
    }
    void fetchCoupon()
  }, [currentAccount])
  return (
    <main data-testid="main-container">
      <DarkMode>
        <Box bg={'neutral.900'} pb={36} fontWeight={500}>
          <Hero />
          <ProAccessPopUp
            onDialogClose={onClose}
            isDialogOpen={isOpen}
            coupon={coupon}
          />
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
