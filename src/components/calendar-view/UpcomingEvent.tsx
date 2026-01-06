import { Heading, Link, Text, VStack } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { DateTime } from 'luxon'
import * as React from 'react'

import {
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
} from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import { addUTMParams } from '@/utils/huddle.helper'

interface UpComingEventProps {
  meeting: MeetingDecrypted
}

const getLinkDisplay = (platform?: MeetingProvider, url?: string) => {
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
          {meeting.recurrence && meeting.recurrence !== MeetingRepeat.NO_REPEAT
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
          {meeting.title || 'No Title'}
        </Heading>
        <Text fontWeight={500} w="100%" color="upcoming-event-text">
          {`${DateTime.fromJSDate(meeting.start).toFormat(
            "dd LLL yyyy 'at' h:mma"
          )}`}
        </Text>
        <Link
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          overflow="hidden"
          href={addUTMParams(meeting.meeting_url || '')}
          color="primary.200"
          textDecor="underline"
          isExternal
          onClick={() => logEvent('Clicked to start meeting')}
        >
          {getLinkDisplay(meeting.provider, meeting.meeting_url)}
        </Link>
      </VStack>
      <Link
        href={addUTMParams(meeting.meeting_url || '')}
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
