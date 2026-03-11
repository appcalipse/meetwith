import { Box, Button, Heading, Image, Text, VStack } from '@chakra-ui/react'
import { formatInTimeZone } from 'date-fns-tz'
import { useRouter } from 'next/router'
import React from 'react'

import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { EditMode, Intents } from '@/types/Dashboard'

const ScheduleCompleted = () => {
  const router = useRouter()
  const { intent } = router.query
  const { title, pickedTime, timezone } = useScheduleState()
  return (
    <VStack maxW={{ base: '300px', md: '400px' }} w="fit-content" m="auto" data-testid="schedule-completed">
      <Box display="flex" justifyContent="center" width="full" mb="32px">
        <Image
          src="/assets/schedule_success.svg"
          alt="Success"
          width="350px"
          alignSelf="center"
          m="0"
          p="0"
        />
      </Box>
      <Heading
        as="h1"
        fontWeight="700"
        textAlign="center"
        mb="8px"
        fontSize="24px"
        lineHeight="28.8px"
        fontFamily="'DM Sans', sans-serif"
        display="flex"
        justifyContent="center"
      >
        Success!
      </Heading>
      <Text
        textAlign="center"
        width="349px"
        mb="30px"
        fontWeight="500"
        fontSize="16px"
        lineHeight="24px"
        fontFamily="'DM Sans', sans-serif"
      >
        Your meeting <b>{title}</b> on{' '}
        <b>
          {pickedTime
            ? formatInTimeZone(pickedTime, timezone, 'MMM d, yyyy')
            : 'Invalid date'}
        </b>{' '}
        at{' '}
        <b>
          {formatInTimeZone(pickedTime || new Date(), timezone, 'hh:mm a')} (
          {timezone})
        </b>{' '}
        has been {intent === Intents.UPDATE_MEETING ? 'updated' : 'scheduled'}.
      </Text>
      <Button
        onClick={() => router.push(`/dashboard/${EditMode.MEETINGS}`)}
        colorScheme="primary"
        data-testid="view-meetings-btn"
        size="md"
        height="48px"
        borderRadius="8px"
        w="full"
        mb="8px"
      >
        View meetings
      </Button>
      {router.query?.ref === 'group' && (
        <Button
          onClick={() => router.push(`/dashboard/${EditMode.GROUPS}`)}
          variant="outline"
          size="md"
          height="48px"
          borderRadius="8px"
          colorScheme="primary"
          borderWidth="2px"
          w="full"
        >
          Back to My Groups
        </Button>
      )}
    </VStack>
  )
}

export default ScheduleCompleted
