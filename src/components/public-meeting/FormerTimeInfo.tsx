import { Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { getFormattedDateAndDuration } from '@utils/date_helper'
import React, { FC } from 'react'
import { FaCalendar, FaClock, FaGlobe } from 'react-icons/fa'

interface IFormerTimeInfoProps {
  startTime: Date
  timezone: string
  endTime: Date
  duration_minutes?: number
}
const FormerTimeInfo: FC<IFormerTimeInfoProps> = ({
  startTime,
  timezone,
  endTime,
  duration_minutes = 0,
}) => {
  const { formattedDate, timeDuration } = getFormattedDateAndDuration(
    timezone,
    startTime,
    duration_minutes,
    endTime
  )
  return (
    <VStack alignItems="flex-start">
      <Heading fontSize={'xl'} mb={4}>
        Former Time:
      </Heading>
      <HStack>
        <FaCalendar size={24} />
        <Text>{`${formattedDate}, ${timeDuration}`}</Text>
      </HStack>
      <HStack>
        <FaClock size={24} />
        <Text>{duration_minutes} minutes</Text>
      </HStack>
      <HStack>
        <FaGlobe size={24} />
        <Text align="center" fontSize="base" fontWeight="500">
          {timezone}
        </Text>
      </HStack>
    </VStack>
  )
}

export default FormerTimeInfo
