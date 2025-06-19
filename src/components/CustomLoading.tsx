import { Box, HStack, Image, Spinner, Text, VStack } from '@chakra-ui/react'
import React from 'react'

const CustomLoading: React.FC<{ text?: string }> = ({
  text = 'Loading...',
}) => (
  <Box
    width={{ base: '100%', md: '100%', lg: 880 }}
    minH="400px"
    position="fixed"
    top="15%"
    left="35%"
    zIndex={2000}
    display="flex"
    alignItems="center"
    justifyContent="center"
  >
    <VStack alignItems="center" mb={8}>
      <Image
        src="/assets/schedule.svg"
        height={200}
        width={200}
        alt="Loading..."
      />
      <HStack pt={8}>
        <Spinner />
        <Text fontSize="lg">{text}</Text>
      </HStack>
    </VStack>
  </Box>
)

export default CustomLoading
