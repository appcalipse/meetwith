import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { FaDiscord } from 'react-icons/fa'

import { DiscordAccount } from '@/types/Discord'
import { generateDiscordAccount } from '@/utils/api_helper'
import { discordRedirectUrl } from '@/utils/constants'

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
      const { discordResult, code } = router.query

      if (discordResult && code) {
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

  const bgColor = useColorModeValue('gray.800', 'white')
  const badgeColor = useColorModeValue('gray.600', 'gray.500')
  const color = useColorModeValue('white', 'gray.800')

  return (
    <HStack>
      <VStack flex={1} alignItems="flex-start">
        <HStack>
          <Flex
            width="22px"
            height="22px"
            bgColor={bgColor}
            borderRadius="50%"
            justifyContent="center"
            alignItems="center"
          >
            <Icon as={FaDiscord} color={color} />
          </Flex>
          <Text fontSize="lg" fontWeight="bold">
            Discord
          </Text>
          {isDiscordConnected && (
            <HStack borderRadius={4} px={1} bgColor={badgeColor}>
              <Box
                borderRadius="50%"
                w="8px"
                h="8px"
                bgColor="rgba(52, 199, 89, 1)"
              />
              <Text color="primary.200" fontSize="xs">
                Connected
              </Text>
            </HStack>
          )}
        </HStack>
        <Text opacity="0.5">
          Connect to enable notifications and Discord bot commands
        </Text>
      </VStack>

      {isDiscordConnected ? (
        <Button variant="ghost" colorScheme="primary">
          Disconnect
        </Button>
      ) : (
        <Button
          as="a"
          isLoading={connecting}
          loadingText="Connecting"
          variant="outline"
          colorScheme="primary"
          onClick={() => setConnecting(true)}
          href={`https://discord.com/api/oauth2/authorize?client_id=${
            process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
          }&redirect_uri=${encodeURIComponent(
            discordRedirectUrl
          )}&response_type=code&scope=identify%20guilds`}
        >
          Connect
        </Button>
      )}
    </HStack>
  )
}

const ConnectedAccounts: React.FC<ConnectedAccountProps> = props => {
  return (
    <>
      <Heading id="connected" fontSize="2xl" mb={8}>
        Connected Accounts
      </Heading>
      <DiscordConnection {...props} />
    </>
  )
}

export default ConnectedAccounts
