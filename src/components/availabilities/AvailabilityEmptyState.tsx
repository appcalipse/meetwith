import { AddIcon } from '@chakra-ui/icons'
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { AiFillClockCircle } from 'react-icons/ai'

interface AvailabilityEmptyStateProps {
  onCreateBlock: () => void
}

export const AvailabilityEmptyState: React.FC<AvailabilityEmptyStateProps> = ({
  onCreateBlock,
}) => {
  return (
    <Box
      bg="neutral.900"
      border="1px solid"
      borderColor="neutral.400"
      borderRadius={12}
      p={{ base: 6, md: 8 }}
      width="100%"
      textAlign="center"
    >
      <VStack spacing={4}>
        <Box as="span" fontSize={{ base: 40, md: 48 }} color="primary.200">
          <AiFillClockCircle />
        </Box>
        <VStack spacing={2}>
          <Heading
            fontSize={{ base: 20, md: 24 }}
            color="neutral.0"
            fontWeight={500}
          >
            No availability blocks yet
          </Heading>
          <Text
            color="neutral.300"
            fontSize={{ base: 14, md: 16 }}
            maxW={{ base: '100%', md: '400px' }}
          >
            Create your first availability block to define when you&apos;re
            available for meetings.
          </Text>
        </VStack>
        <Button
          leftIcon={<AddIcon color="neutral.800" />}
          colorScheme="orange"
          bg="primary.200"
          color="neutral.800"
          _hover={{ bg: 'primary.200' }}
          onClick={onCreateBlock}
          fontSize="sm"
          px={6}
          mt={2}
        >
          Create first availability block
        </Button>
      </VStack>
    </Box>
  )
}
