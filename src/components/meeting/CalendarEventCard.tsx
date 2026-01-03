import {
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  Link,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { FC } from 'react'
import {
  FiCalendar,
  FiClock,
  FiExternalLink,
  FiMapPin,
  FiUsers,
} from 'react-icons/fi'
import sanitizeHtml from 'sanitize-html'

import { AttendeeStatus, UnifiedEvent } from '@/types/Calendar'
import { dateToLocalizedRange } from '@/utils/calendar_manager'

interface CalendarEventCardProps {
  event: UnifiedEvent
  timezone: string
}

const CalendarEventCard: FC<CalendarEventCardProps> = ({ event, timezone }) => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const borderColor = useColorModeValue('gray.200', 'neutral.700')
  const textColor = useColorModeValue('gray.600', 'gray.400')
  const labelBgColor = useColorModeValue('blue.50', 'blue.900')

  const sourceColor =
    {
      Google: 'blue',
      'Office 365': 'orange',
      iCloud: 'gray',
      Webdav: 'purple',
    }[event.source] || 'gray'

  const getUserStatus = () => {
    const userAttendee = event.attendees?.find(
      a => a.email === event.accountEmail
    )
    return userAttendee?.status
  }

  const status = getUserStatus()
  const isDeclined = status === AttendeeStatus.DECLINED
  const isTentative = status === AttendeeStatus.TENTATIVE

  return (
    <Box
      w="100%"
      bg={bgColor}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      borderLeftWidth="4px"
      borderLeftColor={`${sourceColor}.500`}
      p={6}
      shadow="sm"
      opacity={isDeclined ? 0.5 : 1}
      position="relative"
      transition="all 0.2s"
      _hover={{
        shadow: 'md',
      }}
    >
      <VStack align="stretch" spacing={3}>
        {/* Header */}
        <Flex justify="space-between" align="start" gap={3}>
          <VStack align="start" spacing={1} flex={1}>
            <HStack spacing={2}>
              <Icon as={FiCalendar} color={`${sourceColor}.500`} boxSize={4} />
              <Text fontWeight="bold" fontSize="lg" noOfLines={2}>
                {event.title || 'No Title'}
              </Text>
            </HStack>
            <Badge colorScheme={sourceColor} fontSize="xs" px={2}>
              {event.source}
            </Badge>
          </VStack>

          <VStack align="end" spacing={1}>
            {isDeclined && (
              <Badge colorScheme="red" fontSize="xs">
                Declined
              </Badge>
            )}
            {isTentative && !isDeclined && (
              <Badge colorScheme="yellow" fontSize="xs">
                Tentative
              </Badge>
            )}
            {event.isAllDay && (
              <Badge colorScheme="purple" fontSize="xs">
                All Day
              </Badge>
            )}
          </VStack>
        </Flex>

        {/* Time */}
        <HStack color={textColor} spacing={2}>
          <Icon as={FiClock} boxSize={4} />
          <Text fontSize="sm">
            {dateToLocalizedRange(
              event.start as Date,
              event.end as Date,
              timezone,
              true
            )}
          </Text>
        </HStack>

        {/* Description */}
        {event.description && (
          <Text
            fontSize="sm"
            color={textColor}
            noOfLines={2}
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(event.description, {
                allowedAttributes: false,
                allowVulnerableTags: false,
              }),
            }}
          />
        )}

        {/* Meeting Link */}
        {event.meeting_url && (
          <Link
            href={event.meeting_url}
            isExternal
            color="primary.500"
            fontSize="sm"
            fontWeight="medium"
            display="flex"
            alignItems="center"
            gap={2}
            _hover={{
              textDecoration: 'underline',
            }}
          >
            <Icon as={FiMapPin} />
            <Text>Join Meeting</Text>
            <Icon as={FiExternalLink} boxSize={3} />
          </Link>
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 1 && (
          <HStack color={textColor} spacing={2}>
            <Icon as={FiUsers} boxSize={4} />
            <Text fontSize="xs">
              {event.attendees.length} attendee
              {event.attendees.length !== 1 ? 's' : ''}
            </Text>
          </HStack>
        )}

        {/* View in Calendar Link */}
        {event.webLink && (
          <HStack justify="flex-end" width="100%">
            <Link
              href={event.webLink}
              isExternal
              color="gray.500"
              fontSize="xs"
              display="flex"
              alignItems="center"
              gap={1}
              _hover={{
                color: 'gray.700',
              }}
            >
              View in {event.source}
              <Icon as={FiExternalLink} boxSize={3} />
            </Link>
          </HStack>
        )}

        {/* External Event Label */}
        <Box
          position="absolute"
          top={2}
          right={2}
          bg={labelBgColor}
          px={2}
          py={1}
          borderRadius="md"
          fontSize="xs"
          fontWeight="medium"
          color={`${sourceColor}.600`}
        >
          Calendar Event
        </Box>
      </VStack>
    </Box>
  )
}

export default CalendarEventCard
