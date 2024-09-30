import { Box, Button, Container, Text } from '@chakra-ui/react'
import type { NextPage } from 'next'
import React, { useContext } from 'react'

import ConnectWalletDialog from '@/components/ConnectWalletDialog'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useLogin } from '@/session/login'
import { withDashboardRedirect } from '@/session/requireAuthentication'
import { Account } from '@/types/Account'
import { getAccount } from '@/utils/api_helper'

interface PartnerLoginProps {
  currentAccount: Account | null
  partner: string
}

const PartnerLogin: NextPage<PartnerLoginProps> = ({ currentAccount }) => {
  const { openConnection } = useContext(OnboardingModalContext)
  const { loginIn } = useLogin()

  return (
    <Container
      maxW="6xl"
      flex={1}
      justifyContent="center"
      alignItems="center"
      display="flex"
    >
      <Box textAlign="center">
        <Text mb={8}>Please connect to use Meet with Wallet</Text>
        <Button
          colorScheme="primary"
          onClick={() => {
            openConnection()
          }}
        >
          {currentAccount ? 'Sign in' : 'Create an account'}
        </Button>
      </Box>
      <ConnectWalletDialog isOpen={loginIn} />
    </Container>
  )
}

PartnerLogin.getInitialProps = async ctx => {
  const accountAddress = ctx.query.account
  const partner = ctx.query.partner! as string

  // For now just hardcode this
  if (partner !== 'ethermail') {
    ctx.res?.writeHead(302, {
      Location: '/',
    })
    ctx.res?.end()
    return { currentAccount: null, partner: '' }
  }

  try {
    const account = await getAccount(accountAddress! as string)

    return { currentAccount: account, partner }
  } catch (e) {
    return { currentAccount: null, partner }
  }
}

export default withDashboardRedirect(PartnerLogin)
