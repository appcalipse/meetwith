import { Box } from '@chakra-ui/react'

import CreatePoll from '@/components/quickpoll/CreatePoll'

const CreatePollPage = () => {
  return (
    <Box width="100%" minHeight="100vh" bg="neutral.850">
      <CreatePoll />
    </Box>
  )
}

export default CreatePollPage
