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
      display="grid"
      flex={1}
      maxW="7xl"
      minH={{ md: 'auto', sm: '100vh' }}
      mt={8}
      placeContent="center"
    >
      <VStack
        bg={bgColor}
        borderColor="neutral.600"
        borderRadius={6}
        borderWidth={1}
        gap={10}
        m="auto"
        p={6}
      >
        <Image alt="Meetwith" p={2} src="/assets/logo.svg" width="100px" />
        <Image
          alt="Decline illustration"
          height="auto"
          src="/assets/join-illustration.svg"
          width="300px"
        />
        <Heading maxW="450px" size="md" textAlign="center">
          Hey there! You’ve been invited to a Contact List
        </Heading>
        <Button
          colorScheme="primary"
          onClick={() => {
            if (logged) {
              void push(DECLINE_URL)
            } else {
              openConnection(DECLINE_URL)
            }
          }}
          w="100%"
        >
          Decline invite
        </Button>
      </VStack>
    </Container>
  )
}
