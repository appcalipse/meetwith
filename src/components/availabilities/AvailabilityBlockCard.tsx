import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { AiFillClockCircle } from 'react-icons/ai'

import { AvailabilityBlock } from '@/types/availability'
import {
  getFormattedSchedule,
  getHoursPerWeek,
} from '@/utils/availability.helper'

interface AvailabilityBlockCardProps {
  block: AvailabilityBlock
  onEdit: (block: AvailabilityBlock) => void
  onDuplicate: (block: AvailabilityBlock) => void
}

export const AvailabilityBlockCard: React.FC<AvailabilityBlockCardProps> = ({
  block,
  onEdit,
  onDuplicate,
}) => {
  return (
    <Box
      bg="neutral.900"
      border="1px solid"
      borderColor="neutral.400"
      borderRadius={12}
      p={{ base: 4, md: 6 }}
      width="100%"
      position="relative"
    >
      <Flex
        justify="space-between"
        align="flex-start"
        mb={4}
        flexDirection={{ base: 'column', md: 'row' }}
        gap={{ base: 4, md: 0 }}
      >
        <Flex
          align="flex-start"
          justify="space-between"
          w="100%"
          flexDirection={{ base: 'column', md: 'row' }}
          gap={{ base: 4, md: 0 }}
        >
          <HStack spacing={5}>
            <Heading fontSize={20} fontWeight={500} color="neutral.0">
              {block.title}
            </Heading>
            {block.isDefault && (
              <Badge
                background="green.400"
                borderRadius={8}
                color="neutral.0"
                fontSize={12.8}
                textTransform="none"
                fontWeight={500}
                px={4}
                py={1}
              >
                Default
              </Badge>
            )}
          </HStack>
          <HStack color="neutral.300" fontSize="sm">
            <HStack
              spacing={1}
              background="neutral.800"
              borderRadius={8}
              fontSize={12.8}
              px={3}
              py={1}
            >
              <Box as="span" fontSize={16}>
                <AiFillClockCircle color="#ffffff" />
              </Box>
              <Text color="neutral.0">
                {getHoursPerWeek(block.weekly_availability)}
              </Text>
            </HStack>
          </HStack>
        </Flex>
      </Flex>

      <VStack align="start" spacing={2} mb={4}>
        <Flex
          direction="column"
          gap={3}
          borderBottom="1px solid"
          borderColor="neutral.400"
          pb={3}
          width="100%"
        >
          {getFormattedSchedule(block.weekly_availability).map(
            (line, index) => (
              <Text
                key={index}
                color="neutral.300"
                fontWeight={500}
                fontSize={16}
              >
                {line}
              </Text>
            )
          )}
        </Flex>

        <Text color="neutral.300" fontWeight={500} fontSize={16}>
          Timezone: {block.timezone}
        </Text>
      </VStack>

      <Flex
        justify="space-between"
        align="center"
        mt={6}
        flexDirection={{ base: 'column', md: 'row' }}
        gap={{ base: 4, md: 0 }}
      >
        <Button
          bg="primary.200"
          color="neutral.800"
          _hover={{ bg: 'primary.200' }}
          fontSize={15}
          fontWeight={700}
          width={{ base: '100%', md: '185px' }}
          height="38px"
          borderRadius={8}
          onClick={() => onEdit(block)}
        >
          Manage availability
        </Button>
        <Button
          bg="transparent"
          color="primary.200"
          _hover={{ bg: 'transparent' }}
          fontSize={15}
          fontWeight={700}
          width={{ base: '100%', md: '160px' }}
          height="38px"
          border="1px solid"
          borderColor="primary.200"
          borderRadius={8}
          onClick={() => onDuplicate(block)}
        >
          Duplicate
        </Button>
      </Flex>
    </Box>
  )
}
