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
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { BiWallet } from 'react-icons/bi'

import Loading from '@/components/Loading'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useLogin } from '@/session/login'
import { ConferenceMeeting, MeetingAccessType } from '@/types/Meeting'
import { getConferenceMeeting } from '@/utils/api_helper'

const JoinMeetingPage: NextPage = () => {
  const router = useRouter()
  const { meetingId } = router.query
  const [loading, setLoading] = useState(true)
  const [conference, setConference] = useState<ConferenceMeeting>()

  const { openConnection } = useContext(OnboardingModalContext)
  const { currentAccount, loginIn } = useLogin()

  useEffect(() => {
    if (meetingId) {
      setLoading(true)
      getConferenceMeeting(meetingId as string)
        .then(data => {
          setConference(data)
        })
        .catch(error => {
          Sentry.captureException(error)
          setConference(undefined)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [])

  if (loading) {
    return (
      <Container>
        <Flex
          alignItems="center"
          height="100%"
          justifyContent="center"
          p={16}
          width="100%"
        >
          <Loading label="" />
          Please wait while we load the meeting data...
        </Flex>
      </Container>
    )
  }

  if (!conference) {
    return (
      <Container>
        <Flex
          alignItems="center"
          height="100%"
          justifyContent="center"
          p={16}
          width="100%"
        >
          <VStack>
            <Heading
              as="h2"
              backgroundClip="text"
              bgGradient="linear(to-r, primary.400, primary.600)"
              display="inline-block"
              size="2xl"
            >
              Ops
            </Heading>
            <Spacer />
            <Image alt="404" src="/assets/404.svg" width="300px" />
            <Spacer />
            <Text pt={4}>
              Ooops, the meeting you are looking for was not found.
            </Text>
            <Spacer />
            <Button
              colorScheme="primary"
              onClick={() => router.push('/')}
              variant="solid"
            >
              Go to Home
            </Button>
          </VStack>
        </Flex>
      </Container>
    )
  }

  // for now, just force login if the meeting is paid
  // a future version will check if the user has paid
  if (conference?.access_type === MeetingAccessType.PAID_MEETING) {
    if (!currentAccount) {
      return (
        <Container>
          <Flex
            alignItems="center"
            height="100%"
            justifyContent="center"
            p={16}
            width="100%"
          >
            <VStack>
              <Text pb={8}>You need to login to join this meeting</Text>
              <Button
                colorScheme="primary"
                isLoading={loginIn}
                leftIcon={<BiWallet />}
                onClick={() => openConnection()}
                size="lg"
              >
                Sign in
                <Box as="span" display={{ base: 'none', md: 'flex' }}>
                  &#160;with wallet
                </Box>
              </Button>
            </VStack>
          </Flex>
        </Container>
      )
    }
  }

  // For now we just redirect to the correct page, in the future we will
  // embedd the meetings in our own page
  document.location.href = conference!.meeting_url
  return (
    <Container>
      <Flex
        alignItems="center"
        height="100%"
        justifyContent="center"
        p={16}
        width="100%"
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
