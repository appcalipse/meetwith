import { Box } from '@chakra-ui/react'

import CreatePoll from '@/components/quickpoll/CreatePoll'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'

const CreatePollPage = () => {
  return (
    <Box width="100%" minHeight="100vh" bg="neutral.850">
      <ParticipantsProvider>
        <CreatePoll />
      </ParticipantsProvider>
    </Box>
  )
}

export default CreatePollPage
