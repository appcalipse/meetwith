import {
  Badge,
  Box,
  VStack,
  Text,
  Link,
  useColorModeValue,
  HStack,
  Spinner,
  Spacer,
  Button,
} from '@chakra-ui/react'
import dayjs from '../../../utils/dayjs_extender'
import {
  DBSlot,
  MeetingDecrypted,
  ParticipantInfo,
  ParticipantType,
} from '../../../types/Meeting'
import {
  decryptMeeting,
  durationToHumanReadable,
  generateIcs,
} from '../../../utils/calendar_manager'
import IPFSLink from '../../IPFSLink'
import { useContext, useEffect, useState } from 'react'
import { fetchContentFromIPFSFromBrowser } from '../../../utils/ipfs_helper'
import { Encrypted } from 'eth-crypto'
import { ellipsizeAddress } from '../../../utils/user_manager'
import { Dayjs } from 'dayjs'
import { AccountContext } from '../../../providers/AccountProvider'
import { logEvent } from '../../../utils/analytics'
import { UTM_PARAMS } from '../../../utils/meeting_call_helper'

interface MeetingCardProps {
  meeting: DBSlot
  opened?: boolean
}

interface Label {
  color: string
  text: string
}
const MeetingCard = ({ meeting }: MeetingCardProps) => {
  const duration = dayjs(meeting.end).diff(dayjs(meeting.start), 'minute')

  const defineLabel = (start: Dayjs, end: Dayjs): Label | null => {
    const now = dayjs()
    if (now.isBetween(start, end)) {
      return {
        color: 'yellow',
        text: 'Ongoing',
      }
    } else if (now.isAfter(end)) {
      return {
        color: 'gray',
        text: 'Ended',
      }
    } else if (now.add(6, 'hour').isAfter(start)) {
      return {
        color: 'green',
        text: 'Soon',
      }
    }
    return null
  }

  const label = defineLabel(dayjs(meeting.start), dayjs(meeting.end))
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
              <strong>When</strong>: {dayjs(meeting.start).format('LLLL')}
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
        const decryptedMeeting = await decryptMeeting({
          ...meeting,
          meeting_info_encrypted: meetingInfoEncrypted,
        })

        setInfo(decryptedMeeting)
      }
      setLoading(false)
    }
    decodeData()
  }, [])

  const bgColor = useColorModeValue('gray.100', 'gray.900')

  const getParticipantDisplay = (participant: ParticipantInfo) => {
    let display =
      participant.account_id === currentAccount?.id
        ? 'You'
        : participant.name || ellipsizeAddress(participant.address)

    if (participant.type === ParticipantType.Scheduler) {
      display = `${display} (Scheduler)`
    }

    return display
  }

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
                .map(participant => getParticipantDisplay(participant))
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
