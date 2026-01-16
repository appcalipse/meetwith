import {
  Button,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { DateTime } from 'luxon'
import React from 'react'
import { FaCalendar, FaClock, FaFile } from 'react-icons/fa'
import { IoMdTimer } from 'react-icons/io'

import { getFormattedDateAndDuration } from '@/utils/date_helper'

import { RescheduleConferenceData } from '.'

type Props = {
  onClose: () => void
  meeting: RescheduleConferenceData
  timezone: string
  reason: string
  setReason: (reason: string) => void
  handleCancelMeeting: () => void
  isCancelling: boolean
  isOpen: boolean
}

const CancelComponent = ({
  meeting,
  timezone,
  reason,
  setReason,
  handleCancelMeeting,
  isCancelling,
  isOpen,
  onClose,
}: Props) => {
  const { formattedDate, timeDuration } = getFormattedDateAndDuration(
    timezone,
    meeting.start,
    0, // safe to pass zero as we're also passing end time
    meeting.end
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={false}
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
  )
}

export default CancelComponent
