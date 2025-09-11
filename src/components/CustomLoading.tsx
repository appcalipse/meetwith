import { Box, HStack, Image, Spinner, Text, VStack } from '@chakra-ui/react'
import React from 'react'

const CustomLoading: React.FC<{ text?: string }> = ({
  text = 'Loading...',
}) => (
  <Box
    width="100%"
    height="100%"
    minH="400px"
    display="flex"
    alignItems="center"
    justifyContent="center"
    position="relative"
  >
    <VStack alignItems="center" spacing={4}>
      <Image
        src="/assets/schedule.svg"
        height={200}
        width={200}
        alt="Loading..."
      />
      <HStack spacing={3}>
        <Spinner size="md" />
        <Text fontSize="lg" color="text-primary">
          {text}
        </Text>
      </HStack>
    </VStack>
  </Box>
)

export default CustomLoading
