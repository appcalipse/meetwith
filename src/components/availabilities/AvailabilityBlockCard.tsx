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
  const meetingTypes = block.meetingTypes || []

  return (
    <Box
      bg="bg-surface"
      border="1px solid"
      borderColor="border-subtle"
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
            <Heading fontSize={20} fontWeight={500} color="text-primary">
              {block.title}
            </Heading>
            {block.isDefault && (
              <Badge
                background="green.400"
                borderRadius={8}
                color="text-primary"
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
          <HStack color="text-secondary" fontSize="sm">
            <HStack
              spacing={1}
              bg="bg-surface-tertiary-2"
              borderRadius={8}
              fontSize={12.8}
              px={3}
              py={1}
            >
              <Box as="span" fontSize={16}>
                <AiFillClockCircle color="text-primary" />
              </Box>
              <Text color="text-primary">
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
          borderColor="border-subtle"
          pb={3}
          width="100%"
        >
          {getFormattedSchedule(block.weekly_availability).map(
            (schedule, index) => (
              <Flex key={index} align="center" gap={1}>
                <Text color="text-secondary" fontWeight={500} fontSize={16}>
                  <span style={{ fontWeight: 900 }}>{schedule.weekdays}</span> :{' '}
                  {schedule.timeRange}
                </Text>
              </Flex>
            )
          )}
        </Flex>

        <Text color="text-secondary" fontWeight={500} fontSize={16}>
          Timezone: {block.timezone}
        </Text>

        {/* Associated Meeting Types */}
        {meetingTypes.filter(type => type && type.title).length > 0 && (
          <Box width="100%">
            <Flex align="center" gap={2} flexWrap="wrap">
              <Text color="text-secondary" fontWeight={500} fontSize={16}>
                Associated Meeting Types:
              </Text>
              <Flex flexWrap="wrap" gap={2}>
                {meetingTypes
                  .filter(type => type && type.title)
                  .map(meetingType => (
                    <Badge
                      key={meetingType.id}
                      bg="bg-surface-tertiary-2"
                      color="text-primary"
                      borderRadius={6}
                      fontSize={12}
                      px={2}
                      py={1}
                    >
                      {meetingType.title}
                    </Badge>
                  ))}
              </Flex>
            </Flex>
          </Box>
        )}
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
