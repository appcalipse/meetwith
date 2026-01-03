import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  Link,
  Tag,
  TagLabel,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { FC, useMemo } from 'react'
import { FaRegCopy, FaTrash } from 'react-icons/fa6'
import { Frequency } from 'rrule'
import sanitizeHtml from 'sanitize-html'

import useClipboard from '@/hooks/useClipboard'
import {
  AttendeeStatus,
  isAccepted,
  isDeclined,
  isPendingAction,
  UnifiedEvent,
} from '@/types/Calendar'
import { logEvent } from '@/utils/analytics'
import { dateToLocalizedRange } from '@/utils/calendar_manager'
import { addUTMParams } from '@/utils/huddle.helper'

import { defineLabel } from './MeetingCard'

interface CalendarEventCardProps {
  event: UnifiedEvent
  timezone: string
}
const getRecurrenceLabel = (freq?: Frequency) => {
  switch (freq) {
    case Frequency.DAILY:
      return 'Daily'
    case Frequency.WEEKLY:
      return 'Weekly'
    case Frequency.MONTHLY:
      return 'Monthly'
    case Frequency.YEARLY:
      return 'Yearly'
    default:
      return null
  }
}

const CalendarEventCard: FC<CalendarEventCardProps> = ({ event, timezone }) => {
  const borderColor = useColorModeValue('gray.200', 'neutral.700')
  const textColor = useColorModeValue('gray.600', 'gray.400')
  const labelBgColor = useColorModeValue('blue.50', 'blue.900')
  const label = defineLabel(event.start as Date, event.end as Date, timezone)
  const { copyFeedbackOpen, handleCopy } = useClipboard()

  const getUserStatus = () => {
    const userAttendee = event.attendees?.find(
      a => a.email === event.accountEmail
    )
    return userAttendee?.status
  }
  const bgColor = useColorModeValue('white', 'neutral.900')
  const iconColor = useColorModeValue('gray.500', 'gray.200')

  const isRecurring =
    event?.recurrence && Object.values(event?.recurrence).length > 0
  const recurrenceLabel = getRecurrenceLabel(event?.recurrence?.frequency)
  const handleDelete = () => {}
  const participants = useMemo(() => {
    const result: string[] = []
    for (const attendee of event.attendees || []) {
      let display = ''
      if (attendee.email === event.accountEmail) {
        display = 'You'
      } else if (attendee.name) {
        display = attendee.name
      } else if (attendee.email) {
        display = attendee.email
      }
      if (attendee.isOrganizer) {
        display = `${display} (Organizer)`
      }
    }
    return result.join(', ')
  }, [event])
  const actor = useMemo(() => {
    return event.attendees?.find(
      attendee => attendee.email === event.accountEmail
    )
  }, [event])
  const handleRSVP = (status: AttendeeStatus) => {}
  return (
    <Box
      shadow="sm"
      width="100%"
      borderRadius="lg"
      position="relative"
      bgColor={bgColor}
      mt={3}
      pt={{
        base: label ? 3 : 0,
        md: label ? 1.5 : 0,
      }}
    >
      <HStack position="absolute" right={0} top={0}>
        {label && (
          <Badge
            borderRadius={0}
            borderBottomRightRadius={4}
            px={2}
            py={1}
            colorScheme={label.color}
            alignSelf="flex-end"
          >
            {label.text}
          </Badge>
        )}
        {isRecurring && recurrenceLabel && (
          <Badge
            borderRadius={0}
            borderBottomRightRadius={4}
            px={2}
            py={1}
            colorScheme={'gray'}
            alignSelf="flex-end"
          >
            Recurrence: {recurrenceLabel}
          </Badge>
        )}{' '}
        <Badge
          fontSize="xs"
          borderRadius={0}
          borderBottomRightRadius={4}
          px={2}
          py={1}
          colorScheme={'primary'}
        >
          {event.source}
        </Badge>
      </HStack>
      <Box p={6} pt={isRecurring ? 8 : 6} maxWidth="100%">
        <VStack alignItems="start" position="relative" gap={6}>
          <Flex
            alignItems="start"
            w="100%"
            flexDirection={{
              base: 'column-reverse',
              md: 'row',
            }}
            gap={4}
            flexWrap="wrap"
          >
            <VStack flex={1} alignItems="start">
              <Flex flex={1} alignItems="center" gap={3}>
                <Heading fontSize="24px">
                  <strong>{event?.title || 'No Title'}</strong>
                </Heading>
              </Flex>
              <Text fontSize="16px" alignItems="start">
                <strong>
                  {dateToLocalizedRange(
                    event.start as Date,
                    event.end as Date,
                    timezone,
                    true
                  )}
                </strong>
              </Text>
            </VStack>

            <HStack
              ml={{
                base: 'auto',
                md: 0,
              }}
            >
              <Link
                href={addUTMParams(event?.meeting_url || '')}
                isExternal
                onClick={() => logEvent('Joined a meeting')}
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                maxWidth="100%"
                textDecoration="none"
                flex={1}
                _hover={{
                  textDecoration: 'none',
                }}
              >
                <Button colorScheme="primary">Join meeting</Button>
              </Link>
              <Tooltip label="Delete meeting" placement="top" display="none">
                <IconButton
                  color={iconColor}
                  aria-label="delete"
                  icon={<FaTrash size={16} />}
                  onClick={handleDelete}
                />
              </Tooltip>
            </HStack>
          </Flex>

          <Divider />
          <VStack alignItems="start" maxWidth="100%">
            <HStack alignItems="flex-start" maxWidth="100%">
              <Text display="inline" width="100%" whiteSpace="balance">
                <strong>Participants: </strong>
                {participants || 'No participants'}
              </Text>
            </HStack>
            <HStack
              alignItems="flex-start"
              maxWidth="100%"
              flexWrap="wrap"
              gap={2}
              width="100%"
            >
              <Text whiteSpace="nowrap" fontWeight={700}>
                Meeting link:
              </Text>
              <Flex flex={1} overflow="hidden">
                <Link
                  whiteSpace="nowrap"
                  textOverflow="ellipsis"
                  overflow="hidden"
                  href={addUTMParams(event.meeting_url || '')}
                  isExternal
                  onClick={() => logEvent('Clicked to start meeting')}
                >
                  {event.meeting_url}
                </Link>
                <Tooltip
                  label="Link copied"
                  placement="top"
                  isOpen={copyFeedbackOpen}
                >
                  <Button
                    w={4}
                    colorScheme="primary"
                    variant="link"
                    onClick={() => handleCopy(event.meeting_url || '')}
                    leftIcon={<FaRegCopy />}
                  />

                  {/* <FaRegCopy size={16} display="block" cursor="pointer" /> */}
                </Tooltip>
              </Flex>
            </HStack>
            {event.description && (
              <HStack alignItems="flex-start" flexWrap="wrap">
                <Text>
                  <strong>Description:</strong>
                </Text>
                <Text
                  width="100%"
                  wordBreak="break-word"
                  whiteSpace="pre-wrap"
                  suppressHydrationWarning
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(event.description, {
                      allowedAttributes: false,
                      allowVulnerableTags: false,
                    }),
                  }}
                />
              </HStack>
            )}
          </VStack>
          <HStack alignItems="center" gap={3.5} display="none">
            <Text fontWeight={700}>RSVP:</Text>
            <HStack alignItems="center" gap={2}>
              <Tag
                bg={isAccepted(actor?.status) ? 'green.500' : 'transparent'}
                borderWidth={1}
                borderColor={'green.500'}
                rounded="full"
                px={3}
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.ACCEPTED)}
              >
                <TagLabel
                  color={isAccepted(actor?.status) ? 'white' : 'green.500'}
                >
                  Yes
                </TagLabel>
              </Tag>
              <Tag
                bg={isDeclined(actor?.status) ? 'red.250' : 'transparent'}
                borderWidth={1}
                borderColor={'red.250'}
                rounded="full"
                px={3}
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.DECLINED)}
              >
                <TagLabel
                  color={isDeclined(actor?.status) ? 'white' : 'red.250'}
                >
                  No
                </TagLabel>
              </Tag>
              <Tag
                bg={
                  isPendingAction(actor?.status) ? 'primary.300' : 'transparent'
                }
                borderWidth={1}
                borderColor={'primary.300'}
                rounded="full"
                px={3}
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.NEEDS_ACTION)}
              >
                <TagLabel
                  color={
                    isPendingAction(actor?.status) ? 'white' : 'primary.300'
                  }
                >
                  Maybe
                </TagLabel>
              </Tag>
            </HStack>
          </HStack>
        </VStack>
      </Box>
    </Box>
  )
}

export default CalendarEventCard
