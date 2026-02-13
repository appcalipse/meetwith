import {
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Image,
  Spacer,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { FaBell } from 'react-icons/fa'

import Loading from '@/components/Loading'
import { RescheduleConferenceData } from '@/components/public-meeting'
import CancelComponent from '@/components/public-meeting/CancelComponent'
import useAccountContext from '@/hooks/useAccountContext'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { MeetingDecrypted } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import {
  decodeMeetingGuest,
  getMeetingGuest,
  getSlotByMeetingId,
  guestMeetingCancel,
} from '@/utils/api_helper'
import {
  cancelMeetingGuest,
  dateToHumanReadable,
  decodeMeeting,
} from '@/utils/calendar_manager'
import { decryptContent } from '@/utils/cryptography'
import { MeetingNotFoundError, UnauthorizedError } from '@/utils/errors'
import { isJson } from '@/utils/generic_utils'
import { ParticipantInfoForNotification } from '@/utils/notification_helper'

const CancelMeetingPage: NextPage = () => {
  const router = useRouter()
  const { slotId, metadata, type } = router.query
  const [loading, setLoading] = useState(true)
  const [meeting, setMeeting] = useState<RescheduleConferenceData | undefined>(
    undefined
  )
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const { openConnection } = useContext(OnboardingModalContext)
  const currentAccount = useAccountContext()
  const notificationsAlertBackground = useColorModeValue('white', 'gray.800')
  const notificationsAlertIconBackground = useColorModeValue(
    'gray.300',
    'gray.700'
  )
  const [reason, setReason] = useState('')
  const toast = useToast()
  const loadMeetingData = async () => {
    try {
      setLoading(true)
      let data: RescheduleConferenceData | undefined = undefined
      if (metadata && type !== 'conference') {
        data = await getMeetingGuest(slotId as string)
        const guestParticipants = decryptContent(
          process.env.NEXT_PUBLIC_SERVER_PUB_KEY!,
          Array.isArray(metadata) ? metadata[0] : metadata
        )
        if (guestParticipants) {
          data.participants = isJson(guestParticipants)
            ? (JSON.parse(
                guestParticipants
              ) as Array<ParticipantInfoForNotification>)
            : undefined
        }
        const actor = data.participants?.find(p => p.slot_id === slotId)
        if (actor) {
          setTimezone(
            actor.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
          )
        }
      } else if (slotId) {
        let decryptedMeeting: MeetingDecrypted | null = null
        const slot = await getSlotByMeetingId(
          Array.isArray(slotId) ? slotId[0] : slotId
        )
        if (slot?.user_type === 'account') {
          decryptedMeeting = await decodeMeeting(slot, currentAccount!)
        } else if (slot?.user_type === 'guest') {
          decryptedMeeting = await decodeMeetingGuest(slot)
        }
        if (!decryptedMeeting) {
          toast({
            description:
              'The meeting information could not be retrieved. Please try again.',
            status: 'error',
            title: 'Unable to load meeting details',
          })
          return
        }
        data = decryptedMeeting
      }
      setMeeting(data)
    } catch (error) {
      Sentry.captureException(error)
      setMeeting(undefined)
    } finally {
      setLoading(false)
    }
  }
  const handleLogin = async () => {
    if (!currentAccount) {
      logEvent('Clicked to login from cancel page')
      openConnection()
    } else {
      await router.push('/dashboard')
    }
  }
  useEffect(() => {
    if (slotId) {
      void loadMeetingData()
    }
  }, [])
  const handleCancelMeeting = async () => {
    setIsCancelling(true)
    try {
      let response
      if (type === 'conference') {
        response = await cancelMeetingGuest(meeting as MeetingDecrypted, reason)
      } else {
        response = await guestMeetingCancel(
          ((Array.isArray(slotId) ? slotId[0] : slotId) ||
            meeting?.id ||
            '') as string,
          {
            currentTimezone: timezone,
            metadata: metadata as string,
            reason,
          }
        )
      }
      if (response) {
        setCancelled(true)
        toast({
          description: 'The meeting has been successfully cancelled',
          duration: 5000,
          isClosable: true,
          status: 'success',
          title: 'Meeting cancelled',
        })
      } else {
        toast({
          description:
            'An error occurred while cancelling the meeting, please try refreshing the page and trying again.',
          duration: 5000,
          isClosable: true,
          status: 'error',
          title: 'Error cancelling meeting',
        })
      }
    } catch (error) {
      if (error instanceof MeetingNotFoundError) {
        toast({
          description: 'The meeting you are trying to cancel was not found',
          duration: 5000,
          isClosable: true,
          status: 'error',
          title: 'Meeting not found',
        })
      } else if (error instanceof UnauthorizedError) {
        toast({
          description: 'The cancel url is invalid',
          duration: 5000,
          isClosable: true,
          status: 'error',
          title: 'Invalid Cancel Url',
        })
      } else if (error instanceof Error) {
        toast({
          description: error.message,
          duration: 5000,
          isClosable: true,
          status: 'error',
          title: 'Error cancelling meeting',
        })
      }
    }
    setIsCancelling(false)
  }

  if (loading) {
    return (
      <Container minH="100vh">
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

  if (!meeting) {
    return (
      <Container minH="100vh">
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
  if (cancelled) {
    return (
      <Container minH="100vh">
        <Flex
          alignItems="center"
          height="100%"
          justifyContent="center"
          p={16}
          width="100%"
        >
          <Flex
            bg={notificationsAlertBackground}
            borderRadius={6}
            direction="column"
            gap={4}
            justify="center"
            p={12}
            w="100%"
          >
            <Text align="center" fontSize="1.5rem" fontWeight={500}>
              Success!
            </Text>
            {meeting?.start && (
              <Text textAlign="center">
                {`Your meeting with title ${
                  meeting?.title
                } scheduled at ${dateToHumanReadable(
                  meeting?.start || new Date(),
                  timezone || '',
                  true
                )} has been cancelled successfully.`}
              </Text>
            )}
            <Image
              alt="Meeting scheduled"
              height="200px"
              src="/assets/calendar_success.svg"
            />
            <HStack
              bg={notificationsAlertIconBackground}
              borderRadius={6}
              p={4}
              width="100%"
            >
              <Icon as={FaBell} color="primary.300" />
              <Text color="primary.300">
                Finish setting up your free account for a more streamlined web3
                experience!
              </Text>
            </HStack>
            <Button
              colorScheme="primary"
              onClick={() => handleLogin()}
              width="100%"
            >
              Create Account
            </Button>
            <Button
              colorScheme="primary"
              onClick={() => router.push('/')}
              variant="outline"
              width="100%"
            >
              Go Home
            </Button>
          </Flex>
        </Flex>
      </Container>
    )
  }
  return (
    <Container minH="100vh">
      <Flex
        alignItems="center"
        height="100%"
        justifyContent="center"
        p={16}
        width="100%"
      >
        <VStack>
          <Loading label="" />
        </VStack>
        <CancelComponent
          handleCancelMeeting={handleCancelMeeting}
          isCancelling={isCancelling}
          isOpen
          meeting={meeting}
          onClose={() => router.push('/')}
          reason={reason}
          setReason={setReason}
          timezone={timezone}
        />
      </Flex>
    </Container>
  )
}

export default CancelMeetingPage
