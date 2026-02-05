import { Heading, Link, Text, VStack } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { DateTime } from 'luxon'
import * as React from 'react'
import { DashboardEvent, isDashboardMwwEvent, Optional } from '@/types/Calendar'
import { MeetingProvider, MeetingRepeat } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import { addUTMParams } from '@/utils/huddle.helper'

interface UpComingEventProps {
  meeting: DashboardEvent
}

const getLinkDisplay = (platform?: MeetingProvider, url?: Optional<string>) => {
  switch (platform) {
    case MeetingProvider.ZOOM:
      return 'zoom.us'
    case MeetingProvider.GOOGLE_MEET:
      return 'meet.google.com'
    case MeetingProvider.JITSI_MEET:
      return 'meet.jit.si'
    case MeetingProvider.HUDDLE:
      return 'meetwith.huddle.com'
    default:
      const domainRegex = /^(?:https?:\/\/)?(?:www\.)?([^\/]+)/
      return url?.match(domainRegex)?.[1] || url
  }
}
const UpComingEvent: React.FC<UpComingEventProps> = ({ meeting }) => {
  const title = isDashboardMwwEvent(meeting)
    ? meeting.decrypted.title
    : meeting.title
  const recurrence = isDashboardMwwEvent(meeting)
    ? meeting.recurrence
      ? meeting.recurrence
      : //TODO: correct this
        // biome-ignore lint/suspicious/noExplicitAny: temporary fix for typing
        (meeting as any).decrypted.recurrence
    : meeting.recurrence?.frequency ||
      meeting.providerData?.google?.recurringEventId

  const meeting_url = isDashboardMwwEvent(meeting)
    ? meeting.decrypted.meeting_url
    : meeting.meeting_url
  const provider = isDashboardMwwEvent(meeting)
    ? meeting.decrypted.provider
    : undefined
  return (
    <VStack
      alignItems="flex-start"
      spacing={4}
      w="100%"
      borderWidth={1}
      borderColor="border-subtle"
      py={2.5}
      px={3}
      rounded="md"
    >
      <VStack alignItems="flex-start" spacing={1} w="100%">
        <Text
          textTransform="uppercase"
          fontSize={16}
          fontWeight={500}
          color="neutral.400"
        >
          {recurrence && recurrence !== MeetingRepeat.NO_REPEAT
            ? 'RECURRING'
            : 'ONE-TIME'}
        </Text>
        <Heading
          fontSize={16}
          fontWeight={700}
          maxW={250}
          w="fit-content"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
          color="upcoming-event-title"
        >
          {title}
        </Heading>
        <Text fontWeight={500} w="100%" color="upcoming-event-text">
          {`${DateTime.fromJSDate(new Date(meeting.start)).toFormat(
            "dd LLL yyyy 'at' h:mma"
          )}`}
        </Text>
        <Link
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          overflow="hidden"
          href={addUTMParams(meeting_url || '')}
          color="primary.200"
          textDecor="underline"
          isExternal
          onClick={() => logEvent('Clicked to start meeting')}
        >
          {getLinkDisplay(provider, meeting_url)}
        </Link>
      </VStack>
      <Link
        href={addUTMParams(meeting_url || '')}
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
    </VStack>
  )
}

export default UpComingEvent
