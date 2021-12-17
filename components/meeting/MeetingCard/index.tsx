import { Badge, Box, VStack, Text, Link } from '@chakra-ui/react'
import dayjs from '../../../utils/dayjs_extender'
import { DBSlot, MeetingDecrypted } from '../../../types/Meeting'
import {
  decryptMeeting,
  durationToHumanReadable,
} from '../../../utils/calendar_manager'
import IPFSLink from '../../IPFSLink'
import { useEffect, useState } from 'react'
import { fetchContentFromIPFSFromBrowser } from '../../../utils/ipfs_helper'
import { Encrypted } from 'eth-crypto'
import { ellipsizeAddress } from '../../../utils/user_manager'

interface MeetingCardProps {
  meeting: DBSlot
  opened?: boolean
}
const MeetingCard = ({ meeting }: MeetingCardProps) => {
  const duration = dayjs(meeting.end).diff(dayjs(meeting.start), 'minute')
  const future = dayjs(meeting.start).isAfter(dayjs())

  return (
    <Box
      boxShadow="base"
      maxW="lg"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      mb={4}
    >
      <Box p="6">
        <VStack alignItems="start">
          {future && (
            <Badge borderRadius="full" px="2" colorScheme="teal">
              Upcoming
            </Badge>
          )}
          <Box>
            <strong>When</strong>: {dayjs(meeting.start).format('LLLL')}
          </Box>
          <strong>Duration</strong>: {durationToHumanReadable(duration)}
          <IPFSLink
            title="Meeting private data"
            ipfsHash={meeting.meeting_info_file_path}
          />
          <DecodedInfo meeting={meeting} />
        </VStack>
      </Box>
    </Box>
  )
}

const DecodedInfo: React.FC<{ meeting: DBSlot }> = ({ meeting }) => {
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState({} as MeetingDecrypted)

  const decodeData = async () => {
    const meetingInfoEncrypted = (await fetchContentFromIPFSFromBrowser(
      meeting.meeting_info_file_path
    )) as Encrypted
    const decryptedMeeting = await decryptMeeting({
      ...meeting,
      meeting_info_encrypted: meetingInfoEncrypted,
    })

    setInfo(decryptedMeeting)
    setLoading(false)
  }
  useEffect(() => {
    decodeData()
  }, [])

  return loading ? (
    <Box mt={2}>Decoding meeting info...</Box>
  ) : (
    <VStack>
      <Text mb={2}>
        <strong>Meeting link</strong>
      </Text>
      <Link href={info.meeting_url} target="_blank">
        {info.meeting_url}
      </Link>
      <VStack>
        <Text mb={2}>
          <strong>Participants</strong>
        </Text>
        <Text>
          {info.participants
            .map(
              participant =>
                participant.name || ellipsizeAddress(participant.address)
            )
            .join(', ')}
        </Text>
      </VStack>
      {info.content && (
        <Box>
          <Text mb={2}>{info.content}</Text>
        </Box>
      )}
    </VStack>
  )
}

export default MeetingCard
