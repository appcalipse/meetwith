import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { Textarea } from '@chakra-ui/textarea'
import * as Sentry from '@sentry/nextjs'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import { DBSlot } from '@/types/Meeting'
import { getMeetingGuest, guestMeetingCancel } from '@/utils/api_helper'
import { MeetingNotFoundError, UnauthorizedError } from '@/utils/errors'

const CancelMeetingPage: NextPage = () => {
  const router = useRouter()
  const { slotId, metadata } = router.query
  const [loading, setLoading] = useState(true)
  const [meeting, setMeeting] = useState<DBSlot>()
  const [isCancelling, setIsCancelling] = useState(false)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [reason, setReason] = useState('')
  const toast = useToast()
  const loadMeetingData = async () => {
    try {
      setLoading(true)
      const data = await getMeetingGuest(slotId as string)
      setMeeting(data)
    } catch (error) {
      Sentry.captureException(error)
      setMeeting(undefined)
    } finally {
      setLoading(false)
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
        currentTimezone: timeZone,
        reason,
      })
      if (response?.success) {
        toast({
          title: 'Meeting cancelled',
          status: 'success',
          duration: 5000,
          isClosable: true,
          description: 'The meeting has been successfully cancelled',
        })
        void router.push('/')
      }
    } catch (error) {
      console.log(error)
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
        <Modal isOpen onClose={() => router.push('/')} isCentered size="xl">
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
                <Heading>Cancel meeting</Heading>
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
