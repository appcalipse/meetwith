import { Box } from '@chakra-ui/react'

import CreatePoll from '@/components/quickpoll/CreatePoll'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'

const CreatePollPage = () => {
  return (
    <Box bg="neutral.850" minHeight="100vh" width="100%">
      <ParticipantsProvider>
        <CreatePoll />
      </ParticipantsProvider>
    </Box>
  )
}

export default CreatePollPage
