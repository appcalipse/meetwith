import { Button, Heading, useToast } from '@chakra-ui/react'
import { set } from 'date-fns'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { FaDiscord } from 'react-icons/fa'

import { DiscordAccount } from '@/types/Discord'
import { generateDiscordAccount } from '@/utils/api_helper'
import { discordRedirectUrl, OnboardingSubject } from '@/utils/constants'

interface ConnectedAccountProps {
  discord_account?: DiscordAccount
}

const DiscordConnection: React.FC<ConnectedAccountProps> = ({
  discord_account,
}) => {
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
        } catch (error) {}
        setConnecting(false)
      }
    }
  }

  useEffect(() => {
    generateDiscord()
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
            JSON.stringify({ origin: 'discord_connected' })
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
