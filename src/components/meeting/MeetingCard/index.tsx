import {
  Badge,
  Box,
  Button,
  HStack,
  Link,
  Spacer,
  Spinner,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import {
  addHours,
  differenceInMinutes,
  isAfter,
  isWithinInterval,
} from 'date-fns'
import { format, utcToZonedTime } from 'date-fns-tz'
import { Encrypted } from 'eth-crypto'
import { useContext, useEffect, useState } from 'react'

import { AccountContext } from '../../../providers/AccountProvider'
import { DBSlot, MeetingDecrypted } from '../../../types/Meeting'
import { logEvent } from '../../../utils/analytics'
import { fetchContentFromIPFSFromBrowser } from '../../../utils/api_helper'
import {
  decryptMeeting,
  durationToHumanReadable,
  generateIcs,
} from '../../../utils/calendar_manager'
import { UTM_PARAMS } from '../../../utils/meeting_call_helper'
import { getParticipantDisplay } from '../../../utils/user_manager'
import IPFSLink from '../../IPFSLink'
interface MeetingCardProps {
  meeting: DBSlot
  timezone: string
}

interface Label {
  color: string
  text: string
}
const MeetingCard = ({ meeting, timezone }: MeetingCardProps) => {
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

  const label = defineLabel(meeting.start, meeting.end)
  return (
    <>
      <Box
        boxShadow="base"
        width="100%"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
      >
        <Box p="6">
          <VStack alignItems="start">
            {label && (
              <Badge
                borderRadius="full"
                px="2"
                colorScheme={label.color}
                alignSelf="flex-end"
              >
                {label.text}
              </Badge>
            )}
            <Box>
              <strong>When</strong>:{' '}
              {format(utcToZonedTime(meeting.start, timezone), 'PPPPp')}
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
          </VStack>
        </Box>
      </Box>
      <Spacer />
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

  const bgColor = useColorModeValue('gray.100', 'gray.900')

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
            href={`${info.meeting_url}${UTM_PARAMS}`}
            isExternal
            onClick={() => logEvent('Clicked to start meeting')}
          >
            {info.meeting_url}
          </Link>
          <VStack alignItems="flex-start">
            <Text>
              <strong>Participants</strong>
            </Text>
            <Text>
              {info.participants
                .map(participant =>
                  getParticipantDisplay(participant, currentAccount)
                )
                .join(', ')}
            </Text>
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
            onClick={() => generateIcs(info)}
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
