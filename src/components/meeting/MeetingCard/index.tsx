import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Link,
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
import { useContext, useEffect, useState } from 'react'
import React from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import sanitizeHtml from 'sanitize-html'

import { CancelMeetingDialog } from '@/components/schedule/cancel-dialog'
import {
  dateToHumanReadable,
  decodeMeeting,
  durationToHumanReadable,
  generateIcs,
} from '@/utils/calendar_manager'
import { appUrl, isProduction } from '@/utils/constants'
import { addUTMParams } from '@/utils/huddle.helper'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

import { AccountContext } from '../../../providers/AccountProvider'
import {
  DBSlot,
  MeetingChangeType,
  MeetingDecrypted,
} from '../../../types/Meeting'
import { logEvent } from '../../../utils/analytics'

interface MeetingCardProps {
  meeting: DBSlot
  timezone: string
  onCancel: (removed: string[]) => void
  onClickToOpen: (
    meeting: DBSlot,
    decryptedMeeting: MeetingDecrypted,
    timezone: string
  ) => void
}

interface Label {
  color: string
  text: string
}

const LIMIT_DATE_TO_SHOW_UPDATE = new Date('2022-10-21')

const MeetingCard = ({
  meeting,
  timezone,
  onCancel,
  onClickToOpen,
}: MeetingCardProps) => {
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

  const { isOpen, onOpen, onClose } = useDisclosure()

  const [decryptedMeeting, setDecryptedMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )
  const [loading, setLoading] = useState(true)

  const { currentAccount } = useContext(AccountContext)
  const decodeData = async () => {
    const decodedMeeting = await decodeMeeting(meeting, currentAccount!)

    if (decodedMeeting) {
      setDecryptedMeeting(decodedMeeting)
    } else {
      toast({
        title: 'Something went wrong',
        description: 'Unable to decode meeting data.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    decodeData()
  }, [meeting])

  const iconColor = useColorModeValue('gray.500', 'gray.200')

  const showEdit =
    isAfter(meeting.created_at!, LIMIT_DATE_TO_SHOW_UPDATE) &&
    isAfter(meeting.start, new Date())

  return (
    <>
      <Box
        shadow="md"
        width="100%"
        borderRadius="lg"
        overflow="hidden"
        position="relative"
        bgColor={bgColor}
      >
        {label && (
          <Badge
            borderRadius={0}
            borderBottomRightRadius={4}
            px={2}
            py={1}
            colorScheme={label.color}
            alignSelf="flex-end"
            position="absolute"
            left={0}
            top={0}
          >
            {label.text}
          </Badge>
        )}
        <Box p="6" maxWidth="100%">
          <VStack alignItems="start" position="relative">
            <Flex flexDir="row-reverse" alignItems="center" w="100%">
              {showEdit && (
                <HStack>
                  <IconButton
                    color={iconColor}
                    aria-label="remove"
                    icon={<FaEdit size={16} />}
                    onClick={() => {
                      decryptedMeeting &&
                        onClickToOpen(meeting, decryptedMeeting, timezone)
                    }}
                  />
                  <IconButton
                    color={iconColor}
                    aria-label="remove"
                    icon={<FaTrash size={16} />}
                    onClick={onOpen}
                  />
                </HStack>
              )}
              <Box flex={1} pt={2}>
                <strong>When</strong>:{' '}
                {dateToHumanReadable(meeting.start as Date, timezone, false)}
              </Box>
            </Flex>

            <HStack>
              <strong>Duration:</strong>:{' '}
              <Text>{durationToHumanReadable(duration)}</Text>
            </HStack>
            <DecodedInfo
              loading={loading}
              decryptedMeeting={decryptedMeeting}
            />
          </VStack>
        </Box>
      </Box>
      <CancelMeetingDialog
        isOpen={isOpen}
        onClose={onClose}
        decriptedMeeting={decryptedMeeting}
        currentAccount={currentAccount}
        afterCancel={onCancel}
      />
    </>
  )
}

const DecodedInfo: React.FC<{
  loading: boolean
  decryptedMeeting?: MeetingDecrypted
}> = ({ decryptedMeeting, loading }) => {
  const { currentAccount } = useContext(AccountContext)

  const downloadIcs = (
    info: MeetingDecrypted,
    currentConnectedAccountAddress: string
  ) => {
    const icsFile = generateIcs(
      info,
      currentConnectedAccountAddress,
      MeetingChangeType.CREATE,
      `${appUrl}/dashboard/meetings?slotId=${info.id}`
    )

    const url = window.URL.createObjectURL(
      new Blob([icsFile.value!], { type: 'text/plain' })
    )
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `meeting_${decryptedMeeting!.id}.ics`)

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
      ) : decryptedMeeting ? (
        <VStack alignItems="flex-start">
          <Text>
            <strong>Meeting link</strong>
          </Text>
          <Link
            href={addUTMParams(decryptedMeeting.meeting_url || '')}
            isExternal
            onClick={() => logEvent('Clicked to start meeting')}
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            maxWidth="100%"
            flex={1}
          >
            {decryptedMeeting.meeting_url}
          </Link>
          <VStack alignItems="flex-start">
            <Text>
              <strong>Participants</strong>
            </Text>
            <Text>{getNamesDisplay(decryptedMeeting)}</Text>
          </VStack>
          {decryptedMeeting.content && (
            <Box width="100%">
              <Text>
                <strong>Notes</strong>
              </Text>
              <Text
                width="100%"
                mb={6}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(decryptedMeeting.content, {
                    allowedTags: false,
                    allowedAttributes: false,
                  }),
                }}
              />
            </Box>
          )}
          <Button
            colorScheme="primary"
            variant="outline"
            onClick={() =>
              downloadIcs(decryptedMeeting, currentAccount!.address)
            }
          >
            Download .ics
          </Button>
          {!isProduction && (
            <Button onClick={() => console.debug(decryptedMeeting)}>
              Log info (for debugging)
            </Button>
          )}
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
