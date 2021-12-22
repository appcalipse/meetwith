import React from 'react'
import PropTypes from 'prop-types'
import dateFns from 'date-fns'

import generateTimeSlots from './generate-time-slots'

import { Flex, useColorModeValue, VStack } from '@chakra-ui/react'

function Root({ pickedDay, slotSizeMinutes, validator, pickTime }) {
  const timeSlots = generateTimeSlots(pickedDay, slotSizeMinutes)
  const filtered = timeSlots.filter(slot => {
    return validator ? validator(slot) : true
  })
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
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
            {dateFns.format(slot, 'HH:mm')}
          </Flex>
        )
      })}
    </VStack>
  )
}

Root.propTypes = {
  pickedDay: PropTypes.instanceOf(Date),
  slotSizeMinutes: PropTypes.number.isRequired,
  validator: PropTypes.func,
  pickTime: PropTypes.func.isRequired,
}

export default Root
