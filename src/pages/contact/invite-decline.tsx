import {
  Button,
  Container,
  Heading,
  Image,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { EditMode, Intents } from '@meta/Dashboard'
import { useRouter } from 'next/router'
import { useContext, useEffect } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'

export default function LogoutPage() {
  const bgColor = useColorModeValue('white', 'neutral.800')
  const { openConnection } = useContext(OnboardingModalContext)
  const { query, push } = useRouter()
  const params = new URLSearchParams(query as Record<string, string>)
  const { logged } = useContext(AccountContext)
  const queryString = params.toString()

  const DECLINE_URL = `/dashboard/${EditMode.CONTACTS}?${queryString}&intent=${Intents.DECLINE_CONTACT}`
  useEffect(() => {
    if (logged) {
      void push(DECLINE_URL)
    }
  }, [logged])

  return (
    <Container
      maxW="7xl"
      mt={8}
      minH={{ sm: '100vh', md: 'auto' }}
      flex={1}
      display="grid"
      placeContent="center"
    >
      <VStack
        m="auto"
        gap={10}
        bg={bgColor}
        borderWidth={1}
        borderColor="neutral.600"
        p={6}
        borderRadius={6}
      >
        <Image width="100px" p={2} src="/assets/logo.svg" alt="Meetwith" />
        <Image
          src="/assets/join-illustration.svg"
          alt="Decline illustration"
          width="300px"
          height="auto"
        />
        <Heading size="md" maxW="450px" textAlign="center">
          Hey there! You’ve been invited to a Contact List
        </Heading>
        <Button
          onClick={() => {
            if (logged) {
              void push(DECLINE_URL)
            } else {
              openConnection(DECLINE_URL)
            }
          }}
          colorScheme="primary"
          w="100%"
        >
          Decline invite
        </Button>
      </VStack>
    </Container>
  )
}
