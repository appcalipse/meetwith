import { Tag } from '@chakra-ui/react'
import React from 'react'

const TimeNotAvailableWarning = () => {
  return (
    <Tag
      color="red.500"
      bg="#FCD6CA"
      fontSize="sm"
      px={2}
      py={4}
      borderRadius="md"
    >
      Oops! That time slot was just booked by someone else who paid before you.
      No worries, all your other details are still saved. Please choose another
      available time to continue.
    </Tag>
  )
}
export default TimeNotAvailableWarning
