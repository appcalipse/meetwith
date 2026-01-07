import { Box, Heading, HStack } from '@chakra-ui/layout'
import { useDisclosure } from '@chakra-ui/react'
import type { FC } from 'react'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa6'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

import MobileControllerModal from './MobileControllerModal'

const MobileCalendarController: FC = ({}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { currentDate } = useCalendarContext()
  return (
    <Box
      role="button"
      color="upcoming-event-title"
      cursor="pointer"
      width="100%"
      borderColor="connected-calendar-border"
      borderWidth={1}
      borderRadius="0.375rem"
      py={1.5}
      px={3}
      onClick={isOpen ? onClose : onOpen}
    >
      <HStack justifyContent="space-between" w="full">
        <Heading fontSize={16}>{currentDate.toFormat('MMMM')}</Heading>
        {isOpen ? <FaChevronDown size={15} /> : <FaChevronRight size={15} />}
      </HStack>
      <MobileControllerModal isOpen={isOpen} onClose={onClose} />
    </Box>
  )
}

export default MobileCalendarController
