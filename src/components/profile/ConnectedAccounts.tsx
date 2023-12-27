import { Button, Heading, useToast } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import { FaDiscord } from 'react-icons/fa'

import { AccountContext } from '@/providers/AccountProvider'
import { DiscordAccount } from '@/types/Discord'
import { generateDiscordAccount } from '@/utils/api_helper'
import { discordRedirectUrl, OnboardingSubject } from '@/utils/constants'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

interface ConnectedAccountProps {
  discord_account?: DiscordAccount
}

const DiscordConnection: React.FC<ConnectedAccountProps> = ({
  discord_account,
}) => {
  const { updateUser, currentAccount } = useContext(AccountContext)
  const [isDiscordConnected, setIsDiscordConnected] = useState(
    !!discord_account
  )
  const [connecting, setConnecting] = useState(false)

  const toast = useToast()

  const router = useRouter()

  const generateDiscord = async () => {
    if (!discord_account) {
      const { code, state } = router.query

      const origin = state
        ? (JSON.parse(Buffer.from(state as string, 'base64').toString())
            ?.origin as OnboardingSubject | undefined)
        : undefined

      if (origin && code) {
        setConnecting(true)
        try {
          await generateDiscordAccount(code as string)
          setIsDiscordConnected(true)
          toast({
            title: 'Discord Connected',
            description: 'Your Discord account has been connected',
            status: 'success',
            duration: 3000,
            isClosable: true,
          })
          await queryClient.invalidateQueries(
            QueryKeys.account(currentAccount?.address?.toLowerCase())
          )
          await updateUser()
        } catch (error) {}
        setConnecting(false)
      }
    }
  }

  useEffect(() => {
    !connecting && generateDiscord()
  }, [])

  return (
    <>
      {isDiscordConnected ? (
        <Button variant="outline" leftIcon={<FaDiscord />}>
          Connected
        </Button>
      ) : (
        <Button
          leftIcon={<FaDiscord />}
          as="a"
          isLoading={connecting}
          loadingText="Connecting"
          variant="outline"
          onClick={() => setConnecting(true)}
          href={`https://discord.com/api/oauth2/authorize?client_id=${
            process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
          }&redirect_uri=${encodeURIComponent(
            discordRedirectUrl
          )}&response_type=code&scope=identify%20guilds&state=${Buffer.from(
            JSON.stringify({ origin: OnboardingSubject.DiscordConnectedInPage })
          ).toString('base64')}`}
        >
          Connect Discord
        </Button>
      )}
    </>
  )
}

const ConnectedAccounts: React.FC<ConnectedAccountProps> = props => {
  return (
    <>
      <Heading id="connected" fontSize="2xl">
        Connected Accounts
      </Heading>
      <DiscordConnection {...props} />
    </>
  )
}

export default ConnectedAccounts
