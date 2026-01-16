import { Box } from '@chakra-ui/react'
import { useRouter } from 'next/router'

import CustomLoading from '@/components/CustomLoading'
import CreatePoll from '@/components/quickpoll/CreatePoll'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'

const EditPollPage = () => {
  const router = useRouter()
  const { slug } = router.query

  // Show loading while router is not ready or slug is not available
  if (!router.isReady || !slug || typeof slug !== 'string') {
    return <CustomLoading text="Loading poll..." />
  }

  return (
    <Box bg="neutral.850" minHeight="100vh" width="100%">
      <ParticipantsProvider>
        <CreatePoll isEditMode={true} pollSlug={slug} />
      </ParticipantsProvider>
    </Box>
  )
}

export default EditPollPage
