import {
  Flex,
  HStack,
  Image,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import PropTypes from 'prop-types'
import React, { useContext } from 'react'

import { AccountContext } from '@/providers/AccountProvider'

import generateTimeSlots from './generate-time-slots'

function Root({
  pickedDay,
  slotSizeMinutes,
  validator,
  pickTime,
  selfAvailabilityCheck,
  showSelfAvailability,
}) {
  const { currentAccount } = useContext(AccountContext)
  const timeSlots = generateTimeSlots(pickedDay, slotSizeMinutes)
  const filtered = timeSlots.filter(slot => {
    return validator ? validator(slot) : true
  })
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const circleColor = useColorModeValue('orange.500', 'orange.500')

  return (
    <>
      {!currentAccount && (
        <HStack
          maxW="220px"
          mx="auto"
          width="100%"
          border="1px solid"
          borderColor={borderColor}
          bgColor={circleColor}
          p={2}
          justifyContent="center"
          mb={4}
        >
          <Text flex={1} fontSize={'sm'} textAlign="center" color="white">
            Sign in to see your availability
          </Text>
        </HStack>
      )}
      {showSelfAvailability && (
        <HStack
          maxW="220px"
          mx="auto"
          width="100%"
          border="1px solid"
          borderColor={borderColor}
          p={2}
          justifyContent="center"
          mb={4}
        >
          <Text flex={1} fontSize={'sm'} textAlign="center">
            Times you are available
          </Text>
          <Flex
            borderRadius="50%"
            w="10px"
            h="10px"
            marginEnd={'8px !important'}
            backgroundColor={circleColor}
          />
        </HStack>
      )}
      {filtered.length > 0 ? (
        <VStack maxW="220px" mx="auto">
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
                alignItems="center"
                _hover={{ cursor: 'pointer', color: 'orange.400' }}
              >
                {<Text flex={1}>{format(slot, 'HH:mm a')}</Text>}
                {showSelfAvailability && selfAvailabilityCheck(slot) ? (
                  <Flex
                    borderRadius="50%"
                    w="10px"
                    h="10px"
                    bgColor={circleColor}
                    ml={-4}
                    mr={2}
                  />
                ) : (
                  <Flex w="10px" h="10px" ml={-3} />
                )}
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
  selfAvailabilityCheck: PropTypes.func,
  pickTime: PropTypes.func.isRequired,
  showSelfAvailability: PropTypes.bool,
}

export default Root
