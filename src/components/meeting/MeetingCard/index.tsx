import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  HStack,
  Link,
  Spacer,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import {
  addHours,
  differenceInMinutes,
  isAfter,
  isWithinInterval,
} from 'date-fns'
import { Encrypted } from 'eth-crypto'
import { useContext, useEffect, useState } from 'react'
import React from 'react'
import { FaEdit, FaEraser } from 'react-icons/fa'

import { useEditMeetingDialog } from '@/components/schedule/edit-meeting-dialog/edit.hook'
import { addUTMParams } from '@/utils/meeting_call_helper'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

import { AccountContext } from '../../../providers/AccountProvider'
import { DBSlot, MeetingDecrypted } from '../../../types/Meeting'
import { logEvent } from '../../../utils/analytics'
import { fetchContentFromIPFSFromBrowser } from '../../../utils/api_helper'
import {
  cancelMeeting,
  dateToHumanReadable,
  decryptMeeting,
  durationToHumanReadable,
  generateIcs,
} from '../../../utils/calendar_manager'
import IPFSLink from '../../IPFSLink'

interface MeetingCardProps {
  meeting: DBSlot
  timezone: string
  onUpdate?: () => void
}

interface Label {
  color: string
  text: string
}
const MeetingCard = ({ meeting, timezone, onUpdate }: MeetingCardProps) => {
  const duration = differenceInMinutes(meeting.end, meeting.start)

  const defineLabel = (start: Date, end: Date): Label | null => {
    const now = new Date()
    if (isWithinInterval(now, { start, end })) {
      return {
        color: 'yellow',
        text: 'Ongoing',
      }
    } else if (isAfter(now, end)) {
      return {
        color: 'gray',
        text: 'Ended',
      }
    } else if (isAfter(addHours(now, 6), start)) {
      return {
        color: 'green',
        text: 'Starting Soon',
      }
    }
    return null
  }

  const bgColor = useColorModeValue('white', 'gray.900')

  const label = defineLabel(meeting.start as Date, meeting.end as Date)
  const toast = useToast()

  const [EditModal, openEditModal, closeEditModal] = useEditMeetingDialog()
  const [isCanceling, setCanceling] = useState(false)

  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  const { currentAccount } = useContext(AccountContext)
  const decodeData = async () => {
    const meetingInfoEncrypted = (await fetchContentFromIPFSFromBrowser(
      meeting.meeting_info_file_path
    )) as Encrypted
    if (meetingInfoEncrypted) {
      const decryptedMeeting = await decryptMeeting(
        {
          ...meeting,
          meeting_info_encrypted: meetingInfoEncrypted,
        },
        currentAccount!
      )

      return decryptedMeeting
    }

    toast({
      title: 'Something went wrong',
      description: 'Unable to decode meeting data.',
      status: 'error',
      duration: 5000,
      position: 'top',
      isClosable: true,
    })

    return null
  }

  return (
    <>
      <Box
        shadow="md"
        width="100%"
        borderRadius="lg"
        overflow="hidden"
        bgColor={bgColor}
      >
        <Box p="6">
          <VStack alignItems="start" position="relative">
            {label && (
              <Badge
                borderRadius="full"
                px="2"
                colorScheme={label.color}
                alignSelf="flex-end"
                position="absolute"
              >
                {label.text}
              </Badge>
            )}
            <Box>
              <strong>When</strong>:{' '}
              {dateToHumanReadable(meeting.start as Date, timezone, false)}
            </Box>
            <HStack>
              <strong>Duration</strong>:{' '}
              <Text>{durationToHumanReadable(duration)}</Text>
            </HStack>
            <IPFSLink
              title="Meeting private data"
              ipfsHash={meeting.meeting_info_file_path}
            />
            <DecodedInfo meeting={meeting} />
            <HStack>
              <Button
                onClick={() => {
                  decodeData().then(decriptedMeeting =>
                    openEditModal(meeting, decriptedMeeting, timezone)
                  )
                }}
                leftIcon={<FaEdit />}
                colorScheme="orange"
              >
                Edit
              </Button>
              <Button
                onClick={onOpen}
                leftIcon={<FaEraser />}
                colorScheme="orange"
                isLoading={isCanceling}
              >
                Cancel
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
      <Spacer />
      <EditModal />
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Cancel Meeting
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? You can&apos;t undo this action afterwards.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  setCanceling(true)
                  decodeData().then(decriptedMeeting => {
                    cancelMeeting(currentAccount!.address, decriptedMeeting!)
                      .then(() => {
                        setCanceling(false)
                        onUpdate && onUpdate()
                        onClose()
                      })
                      .catch(error => {
                        setCanceling(false)
                        toast({
                          title: 'Something went wrong',
                          description: error.message,
                          status: 'error',
                          duration: 5000,
                          position: 'top',
                          isClosable: true,
                        })
                      })
                  })
                }}
                ml={3}
                isLoading={isCanceling}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}

const DecodedInfo: React.FC<{ meeting: DBSlot }> = ({ meeting }) => {
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState(undefined as MeetingDecrypted | undefined)
  const { currentAccount } = useContext(AccountContext)

  useEffect(() => {
    const decodeData = async () => {
      const meetingInfoEncrypted = (await fetchContentFromIPFSFromBrowser(
        meeting.meeting_info_file_path
      )) as Encrypted
      if (meetingInfoEncrypted) {
        const decryptedMeeting = await decryptMeeting(
          {
            ...meeting,
            meeting_info_encrypted: meetingInfoEncrypted,
          },
          currentAccount!
        )

        setInfo(decryptedMeeting)
      }
      setLoading(false)
    }
    decodeData()
  }, [])

  const downloadIcs = (
    info: MeetingDecrypted,
    currentConnectedAccountAddress: string
  ) => {
    const icsFile = generateIcs(info, currentConnectedAccountAddress)

    const url = window.URL.createObjectURL(
      new Blob([icsFile.value!], { type: 'text/plain' })
    )
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `meeting_${meeting.id}.ics`)

    document.body.appendChild(link)
    link.click()
    link.parentNode!.removeChild(link)
  }

  const getNamesDisplay = (meeting: MeetingDecrypted) => {
    return getAllParticipantsDisplayName(
      meeting.participants,
      currentAccount!.address
    )
  }

  const bgColor = useColorModeValue('gray.50', 'gray.700')

  return (
    <Box
      mt={2}
      borderRadius={4}
      p={4}
      bgColor={bgColor}
      width="100%"
      overflow="hidden"
    >
      {loading ? (
        <HStack>
          <Text>Decoding meeting info...</Text>{' '}
          <Spinner size="sm" colorScheme="gray" />
        </HStack>
      ) : info ? (
        <VStack alignItems="flex-start">
          <Text>
            <strong>Meeting link</strong>
          </Text>
          <Link
            href={addUTMParams(info.meeting_url)}
            isExternal
            onClick={() => logEvent('Clicked to start meeting')}
          >
            {info.meeting_url}
          </Link>
          <VStack alignItems="flex-start">
            <Text>
              <strong>Participants</strong>
            </Text>
            <Text>{getNamesDisplay(info)}</Text>
          </VStack>
          {info.content && (
            <Box>
              <Text>
                <strong>Notes</strong>
              </Text>
              <Text mb={2}>{info.content}</Text>
            </Box>
          )}
          <Button
            colorScheme="orange"
            variant="outline"
            onClick={() => downloadIcs(info, currentAccount!.address)}
          >
            Download .ics
          </Button>
        </VStack>
      ) : (
        <HStack>
          <Text>Failed to decode information</Text>
        </HStack>
      )}
    </Box>
  )
}

export default MeetingCard
