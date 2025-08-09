import {
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { Textarea } from '@chakra-ui/textarea'
import * as Sentry from '@sentry/nextjs'
import { DateTime } from 'luxon'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import { FaBell, FaCalendar, FaClock, FaFile } from 'react-icons/fa'
import { IoMdTimer } from 'react-icons/io'

import Loading from '@/components/Loading'
import { RescheduleConferenceData } from '@/components/public-meeting'
import useAccountContext from '@/hooks/useAccountContext'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'
import { getMeetingGuest, guestMeetingCancel } from '@/utils/api_helper'
import { dateToHumanReadable } from '@/utils/calendar_manager'
import { decryptContent } from '@/utils/cryptography'
import { getFormattedDateAndDuration } from '@/utils/date_helper'
import { MeetingNotFoundError, UnauthorizedError } from '@/utils/errors'
import { isJson } from '@/utils/generic_utils'
import { ParticipantInfoForNotification } from '@/utils/notification_helper'

const CancelMeetingPage: NextPage = () => {
  const router = useRouter()
  const { slotId, metadata } = router.query
  const [loading, setLoading] = useState(true)
  const [meeting, setMeeting] = useState<RescheduleConferenceData>()
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
      const data: RescheduleConferenceData = await getMeetingGuest(
        slotId as string
      )
      if (metadata) {
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
      const response = await guestMeetingCancel(slotId as string, {
        metadata: metadata as string,
        currentTimezone: timezone,
        reason,
      })
      if (response?.success) {
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
          <VStack>
            <Loading label="" />
          </VStack>
          <Modal
            isOpen
            onClose={() => router.push('/')}
            isCentered
            size="xl"
            closeOnOverlayClick
          >
            <ModalOverlay />
            <ModalContent
              p={12}
              borderRadius={6}
              bg={notificationsAlertBackground}
            >
              <ModalBody w="100%">
                <Flex direction="column" gap={4} justify="center" w="100%">
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
                      Finish setting up your free account for a more streamlined
                      web3 experience!
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
              </ModalBody>
            </ModalContent>
          </Modal>
        </Flex>
      </Container>
    )
  }
  const { formattedDate, timeDuration } = getFormattedDateAndDuration(
    timezone,
    meeting.start,
    0, // safe to pass zero as we're also passing end time
    meeting.end
  )
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
        <Modal
          isOpen
          onClose={() => router.push('/')}
          closeOnOverlayClick
          isCentered
          size="xl"
        >
          <ModalOverlay />
          <ModalContent p="6">
            <ModalHeader
              p={'0'}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <ModalCloseButton />
            </ModalHeader>
            <ModalBody p={'10'} mt={'6'}>
              <VStack alignItems="flex-start">
                <Heading>Cancel Meeting</Heading>
                <VStack alignItems="start" gap={4}>
                  <HStack>
                    <FaFile size={24} />
                    <Text fontWeight="700" textAlign="left">
                      {meeting.title}
                    </Text>
                  </HStack>
                  <HStack>
                    <FaCalendar size={24} />
                    <Text fontWeight="700" textAlign="left">
                      {formattedDate}
                    </Text>
                  </HStack>
                  <HStack>
                    <FaClock size={24} />
                    <Text fontWeight="700">
                      {timeDuration} ({timezone})
                    </Text>
                  </HStack>
                  <HStack>
                    <IoMdTimer size={28} />
                    <Text fontWeight="700">
                      {DateTime.fromJSDate(meeting.end)
                        .diff(DateTime.fromJSDate(meeting.start))
                        .as('minutes')}{' '}
                      minutes
                    </Text>
                  </HStack>
                </VStack>
                <Text>Leave a message to the other participants</Text>
                <Textarea
                  rows={8}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
                <HStack w={'fit-content'} mt={'6'} gap={'4'}>
                  <Button
                    onClick={handleCancelMeeting}
                    isLoading={isCancelling}
                    colorScheme="primary"
                  >
                    Cancel Meeting
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Flex>
    </Container>
  )
}

export default CancelMeetingPage
