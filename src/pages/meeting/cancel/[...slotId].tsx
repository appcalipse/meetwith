import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Spacer,
  Text,
  VStack,
} from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { decryptWithPrivateKey } from 'eth-crypto'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { BiWallet } from 'react-icons/bi'

import Loading from '@/components/Loading'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useLogin } from '@/session/login'
import {
  ConferenceMeeting,
  DBSlot,
  MeetingAccessType,
  MeetingInfo,
} from '@/types/Meeting'
import { getConferenceMeeting, getMeeting } from '@/utils/api_helper'

const JoinMeetingPage: NextPage = () => {
  const router = useRouter()
  const { meetingId } = router.query
  const [loading, setLoading] = useState(true)
  const [meeting, setMeeting] = useState<DBSlot>()

  const { openConnection } = useContext(OnboardingModalContext)
  const { currentAccount, loginIn } = useLogin()
  const loadMeetingData = async () => {
    try {
      setLoading(true)
      const data = await getMeeting(meetingId as string, true)
      setMeeting(data)
    } catch (error) {
      Sentry.captureException(error)
      setMeeting(undefined)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (meetingId) {
      void loadMeetingData()
    }
  }, [])
  const handleCancelMeeting = () => {}
  if (loading) {
    return (
      <Container>
        <Flex
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
          p={16}
        >
          <Loading label="" />
          Please wait while we load the meeting data...
        </Flex>
      </Container>
    )
  }

  if (!meeting) {
    return (
      <Container>
        <Flex
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
          p={16}
        >
          <VStack>
            <Heading
              display="inline-block"
              as="h2"
              size="2xl"
              bgGradient="linear(to-r, primary.400, primary.600)"
              backgroundClip="text"
            >
              Ops
            </Heading>
            <Spacer />
            <Image src="/assets/404.svg" alt="404" width="300px" />
            <Spacer />
            <Text pt={4}>
              Ooops, the meeting you are looking for was not found.
            </Text>
            <Spacer />
            <Button
              onClick={() => router.push('/')}
              colorScheme="primary"
              variant="solid"
            >
              Go to Home
            </Button>
          </VStack>
        </Flex>
      </Container>
    )
  }
  return (
    <Container>
      <Flex
        width="100%"
        height="100%"
        alignItems="center"
        justifyContent="center"
        p={16}
      >
        <VStack>
          <Loading label="" />
          <Text>
            Everything is fine, we will redirect you to the meeting...
          </Text>
        </VStack>
      </Flex>
    </Container>
  )
}

export default JoinMeetingPage
