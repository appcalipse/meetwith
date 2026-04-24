import { Box, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import AllPolls from '@/components/quickpoll/AllPolls'
import PublicPollsList from '@/components/quickpoll/PublicPollsList'
import { useGuestMigration } from '@/hooks/useGuestMigration'
import { getLocalPolls } from '@/utils/storage'

const QuickPollLandingPage = () => {
  useGuestMigration()
  const [hasLocalPolls, setHasLocalPolls] = useState(false)

  useEffect(() => {
    setHasLocalPolls(getLocalPolls().length > 0)
  }, [])

  return (
    <Box bg="bg-canvas" width="100%" pt={{ base: 16, md: 24 }} flex="1">
      <Box
        maxW="1000px"
        mx="auto"
        px={{ base: 4, md: 6 }}
        py={{ base: 6, md: 10 }}
      >
        <VStack spacing={8} align="stretch">
          {hasLocalPolls ? <AllPolls isPublicMode /> : <PublicPollsList />}
        </VStack>
      </Box>
    </Box>
  )
}

export default QuickPollLandingPage
