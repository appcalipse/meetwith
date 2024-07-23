import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { format, isBefore, isSameMinute } from 'date-fns'
import React, { FC } from 'react'

interface ScheduleDayProps {
  day: Date
  schedule: Array<Interval>
  pickTime: (schedule: Date | number) => void
  duration: number
  pickedTime: Date | number | null
}

const ScheduleDay: FC<ScheduleDayProps> = ({
  day,
  duration,
  schedule,
  pickTime,
  pickedTime,
}) => {
  const borderColor = useColorModeValue('neutral.200', 'neutral.500')
  const textColor = useColorModeValue('primary.500', 'neutral.100')
  return (
    <VStack gap={8}>
      <VStack gap={3}>
        <Heading size="md">{format(day, 'EEEE')}</Heading>
        <Text fontWeight={700}>{format(day, 'PPP')}</Text>
        <Box bg="neutral.200" color="neutral.800" borderRadius={6} px={3}>
          <Text fontWeight="700">{duration} min</Text>
        </Box>
      </VStack>
      <VStack gap={3}>
        {schedule.map((slot, index) => (
          <Button
            key={slot.start.toString()}
            onClick={() => {
              pickTime(slot.start)
            }}
            width="100%"
            borderWidth={2}
            borderColor={borderColor}
            px={4}
            py={7}
            bg="transparent"
            justifyContent="center"
            alignItems="center"
            w={160}
            _hover={{
              cursor: 'pointer',
              color: 'white',
              bgColor: 'primary.400',
              borderColor: textColor,
            }}
            isActive={pickedTime ? isSameMinute(pickedTime, slot.start) : false}
            _active={{
              cursor: 'pointer',
              color: 'white',
              bgColor: 'primary.400',
              borderColor: textColor,
            }}
            isDisabled={isBefore(slot.start, new Date())}
            borderRadius={8}
            color={textColor}
            transitionProperty="all"
            transitionDuration="300ms"
            transitionTimingFunction="ease-in-out"
          >
            <Text fontWeight="700">{format(slot.start, 'hh:mm a')}</Text>
          </Button>
        ))}
      </VStack>
    </VStack>
  )
}

export default ScheduleDay
