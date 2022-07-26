import { Flex, Image, Text, useColorModeValue, VStack } from '@chakra-ui/react'
import { format } from 'date-fns'
import PropTypes from 'prop-types'
import React from 'react'

import generateTimeSlots from './generate-time-slots'

function Root({ pickedDay, slotSizeMinutes, validator, pickTime }) {
  const timeSlots = generateTimeSlots(pickedDay, slotSizeMinutes)
  const filtered = timeSlots.filter(slot => {
    return validator ? validator(slot) : true
  })
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <>
      {filtered.length > 0 ? (
        <VStack maxW="200px" mx="auto">
          {filtered.map(slot => {
            return (
              <Flex
                key={slot}
                onClick={() => pickTime(slot)}
                width="100%"
                border="1px solid"
                borderColor={borderColor}
                p={2}
                justifyContent="center"
                _hover={{ cursor: 'pointer', color: 'orange.400' }}
              >
                {format(slot, 'HH:mm a')}
              </Flex>
            )
          })}
        </VStack>
      ) : (
        <VStack alignItems="center">
          <Image
            src="/assets/no_meetings.svg"
            w="200px"
            pb={4}
            alt="No slots available"
          />
          <Text>No slots available for this day</Text>
        </VStack>
      )}
    </>
  )
}

Root.propTypes = {
  pickedDay: PropTypes.instanceOf(Date),
  slotSizeMinutes: PropTypes.number.isRequired,
  validator: PropTypes.func,
  pickTime: PropTypes.func.isRequired,
}

export default Root
