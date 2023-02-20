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

import Loading from '@/components/Loading'
import MWWButton from '@/components/MWWButton'
import { AccountContext } from '@/providers/AccountProvider'
import { useLogin } from '@/session/login'
import { ButtonType, Color } from '@/styles/theme'
import { ConferenceMeeting, MeetingAccessType } from '@/types/Meeting'
import { getConferenceMeeting } from '@/utils/api_helper'

const JoinMeetingPage: NextPage = () => {
  const router = useRouter()
  const { meetingId } = router.query
  const [loading, setLoading] = useState(true)
  const [conference, setConference] = useState<ConferenceMeeting>()
  const [error, setError] = useState<string>()

  const { handleLogin, currentAccount, loginIn } = useLogin()

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

  if (!conference) {
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
              bgGradient="linear(to-r, orange.400, orange.600)"
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
            <MWWButton
              onClick={() => router.push('/')}
              colorScheme="orangeButton"
              color="white"
              variant="solid"
            >
              Go to Home
            </MWWButton>
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
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
            p={16}
          >
            <VStack>
              <Text pb={8}>You need to login to join this meeting</Text>
              <MWWButton
                size="lg"
                onClick={() => handleLogin()}
                isLoading={loginIn}
              >
                Sign in
                <Box display={{ base: 'none', md: 'flex' }} as="span">
                  &#160;with wallet
                </Box>
              </MWWButton>
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
