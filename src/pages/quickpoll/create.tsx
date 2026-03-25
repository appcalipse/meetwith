import { Box } from '@chakra-ui/react'

import CreatePoll from '@/components/quickpoll/CreatePoll'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'

const PublicCreatePollPage = () => {
  return (
    <Box bg="bg-canvas" width="100%" flex="1" pt={{ base: 16, md: 24 }}>
      <ParticipantsProvider skipFetching>
        <CreatePoll isPublicMode={true} />
      </ParticipantsProvider>
    </Box>
  )
}

export default PublicCreatePollPage
