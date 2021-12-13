import { Box } from '@chakra-ui/layout'
import { DBSlotEnhanced } from '../../types/Meeting'
import MeetingCard from '../meeting/MeetingCard'

const Meetings: React.FC = () => {
  const meetings = [] as DBSlotEnhanced[]

  return (
    <Box bg="red.500">
      {meetings.map(meeting => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </Box>
  )
}

export default Meetings
