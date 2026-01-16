import { Box, Button, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React from 'react'

import { SettingsSection } from '@/types/Dashboard'

interface ProUpgradePromptProps {
  heading: string
  subheading: string
  buttonText?: string
  redirectPath?: string
}

const ProUpgradePrompt: React.FC<ProUpgradePromptProps> = ({
  heading,
  subheading,
  buttonText = 'Upgrade to Pro',
  redirectPath,
}) => {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push(
      redirectPath || `/dashboard/settings/${SettingsSection.SUBSCRIPTIONS}`
    )
  }

  return (
    <Box
      width="100%"
      maxW="800px"
      mx="auto"
      p={8}
      bg="bg-surface"
      borderRadius="12px"
      border="1px solid"
      borderColor="border-subtle"
    >
      <VStack spacing={6} align="stretch">
        <VStack spacing={2} align="start">
          <Text fontSize="24px" fontWeight="700" color="text-primary">
            {heading}
          </Text>
          <Text fontSize="16px" color="text-secondary">
            {subheading}
          </Text>
        </VStack>
        <Button colorScheme="primary" size="lg" onClick={handleUpgrade}>
          {buttonText}
        </Button>
      </VStack>
    </Box>
  )
}

export default ProUpgradePrompt
