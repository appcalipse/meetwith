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
            title: 'Unable to load meeting details',
            status: 'error',
            description:
              'The meeting information could not be retrieved. Please try again.',
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
            metadata: metadata as string,
            currentTimezone: timezone,
            reason,
          }
        )
      }
      if (response) {
        setCancelled(true)
        toast({
          title: 'Meeting cancelled',
          status: 'success',
          duration: 5000,
          isClosable: true,
          description: 'The meeting has been successfully cancelled',
        })
      } else {
        toast({
          title: 'Error cancelling meeting',
          status: 'error',
          duration: 5000,
          isClosable: true,
          description:
            'An error occurred while cancelling the meeting, please try refreshing the page and trying again.',
        })
      }
    } catch (error) {
      if (error instanceof MeetingNotFoundError) {
        toast({
          title: 'Meeting not found',
          status: 'error',
          duration: 5000,
          isClosable: true,
          description: 'The meeting you are trying to cancel was not found',
        })
      } else if (error instanceof UnauthorizedError) {
        toast({
          title: 'Invalid Cancel Url',
          status: 'error',
          duration: 5000,
          isClosable: true,
          description: 'The cancel url is invalid',
        })
      } else if (error instanceof Error) {
        toast({
          title: 'Error cancelling meeting',
          status: 'error',
          duration: 5000,
          isClosable: true,
          description: error.message,
        })
      }
    }
    setIsCancelling(false)
  }

  if (loading) {
    return (
      <Container minH="100vh">
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
      <Container minH="100vh">
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
  if (cancelled) {
    return (
      <Container minH="100vh">
        <Flex
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
          p={16}
        >
          <Flex
            direction="column"
            gap={4}
            justify="center"
            w="100%"
            borderRadius={6}
            p={12}
            bg={notificationsAlertBackground}
          >
            <Text fontSize="1.5rem" fontWeight={500} align="center">
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
              height="200px"
              src="/assets/calendar_success.svg"
              alt="Meeting scheduled"
            />
            <HStack
              borderRadius={6}
              bg={notificationsAlertIconBackground}
              width="100%"
              p={4}
            >
              <Icon as={FaBell} color="primary.300" />
              <Text color="primary.300">
                Finish setting up your free account for a more streamlined web3
                experience!
              </Text>
            </HStack>
            <Button
              colorScheme="primary"
              width="100%"
              onClick={() => handleLogin()}
            >
              Create Account
            </Button>
            <Button
              colorScheme="primary"
              variant="outline"
              width="100%"
              onClick={() => router.push('/')}
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
        width="100%"
        height="100%"
        alignItems="center"
        justifyContent="center"
        p={16}
      >
        <VStack>
          <Loading label="" />
        </VStack>
        <CancelComponent
          meeting={meeting}
          timezone={timezone}
          reason={reason}
          setReason={setReason}
          handleCancelMeeting={handleCancelMeeting}
          isCancelling={isCancelling}
          onClose={() => router.push('/')}
          isOpen
        />
      </Flex>
    </Container>
  )
}

export default CancelMeetingPage
