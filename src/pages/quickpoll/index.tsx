import { Box, VStack } from '@chakra-ui/react'

import PublicPollsList from '@/components/quickpoll/PublicPollsList'
import { useGuestMigration } from '@/hooks/useGuestMigration'

const QuickPollLandingPage = () => {
  useGuestMigration()

  return (
    <Box bg="bg-canvas" width="100%" pt={{ base: 16, md: 24 }} flex="1">
      <Box
        maxW="1000px"
        mx="auto"
        px={{ base: 4, md: 6 }}
        py={{ base: 6, md: 10 }}
      >
        <VStack spacing={8} align="stretch">
          <PublicPollsList />
        </VStack>
      </Box>
    </Box>
  )
}

export default QuickPollLandingPage
