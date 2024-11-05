import { Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { useContext } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import { Page, ScheduleContext } from '@/pages/dashboard/schedule'

import { ScheduleParticipants } from './schedule-time-discover/ScheduleParticipants'
import { SchedulePickTime } from './schedule-time-discover/SchedulePickTime'

const ScheduleTimeDiscover = () => {
  const { handlePageSwitch } = useContext(ScheduleContext)
  const handleClose = () => {
    handlePageSwitch(Page.SCHEDULE)
  }

  return (
    <VStack width="100%" m="auto" alignItems="stretch" gap={3}>
      <HStack mb={0} cursor="pointer" onClick={handleClose}>
        <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
        <Heading size="md" color="primary.500">
          Back
        </Heading>
      </HStack>
      <HStack
        width="100%"
        justifyContent={'flex-start'}
        align={'flex-start'}
        height={'fit-content'}
        gap={'14px'}
      >
        <ScheduleParticipants />
        <SchedulePickTime />
      </HStack>
    </VStack>
  )
}

export default ScheduleTimeDiscover
