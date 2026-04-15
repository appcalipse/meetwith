import { Box } from '@chakra-ui/react'
import { useRouter } from 'next/router'

import CreatePoll from '@/components/quickpoll/CreatePoll'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'

const PublicEditPollPage = () => {
  const router = useRouter()
  const { slug } = router.query

  if (!slug || typeof slug !== 'string') return null

  return (
    <Box bg="bg-canvas" width="100%" flex="1" pt={{ base: 16, md: 24 }}>
      <ParticipantsProvider skipFetching>
        <CreatePoll isEditMode={true} isPublicMode={true} pollSlug={slug} />
      </ParticipantsProvider>
    </Box>
  )
}

export default PublicEditPollPage
