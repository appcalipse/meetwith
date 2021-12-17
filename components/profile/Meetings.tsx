import { Box } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'
import { AccountContext } from '../../providers/AccountProvider'
import { DBSlot } from '../../types/Meeting'
import { getMeetings } from '../../utils/api_helper'
import MeetingCard from '../meeting/MeetingCard'

const Meetings: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const [meetings, setMeetings] = useState<DBSlot[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMeetings = async () => {
    const newMeetings = (await getMeetings(
      currentAccount!.address,
      undefined,
      undefined,
      3,
      meetings.length
    )) as DBSlot[]
    setMeetings(meetings.concat(newMeetings))
    setLoading(false)
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  return (
    <Box>
      {meetings.map(meeting => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
      <Button onClick={fetchMeetings}>Load more</Button>
    </Box>
  )
}

export default Meetings
