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
import { generateTimeSlots } from '@/utils/slots.helper'

import { OnboardingModalContext } from '../../../providers/OnboardingModalProvider'

function Root({
  pickedDay,
  slotSizeMinutes,
  validator,
  pickTime,
  selfAvailabilityCheck,
  showSelfAvailability,
}) {
  const { openConnection } = useContext(OnboardingModalContext)
  const { currentAccount } = useContext(AccountContext)
  const endingOfDay = new Date(pickedDay)
  endingOfDay.setHours(23, 59, 59, 999)
  const timeSlots = generateTimeSlots(
    pickedDay,
    slotSizeMinutes,
    false,
    endingOfDay
  )
  const filtered = timeSlots.filter(slot => {
    return validator ? validator(slot.start) : true
  })
  const borderColor = useColorModeValue('neutral.200', 'neutral.500')
  const circleColor = useColorModeValue('primary.500', 'primary.500')
  const textColor = useColorModeValue('primary.500', 'neutral.100')
  return (
    <>
      {!currentAccount && (
        <HStack
          maxW="220px"
          width="100%"
          border="1px solid"
          borderColor={borderColor}
          bgColor={circleColor}
          p={2}
          justifyContent="center"
          mb={4}
          cursor="pointer"
          onClick={() => openConnection(undefined, false)}
        >
          <Text flex={1} fontSize={'sm'} textAlign="center" color="white">
            Sign in to see your availability
          </Text>
        </HStack>
      )}
      {showSelfAvailability && (
        <HStack
          maxW="220px"
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
        <VStack maxW="220px">
          {filtered.map(slot => {
            return (
              <Flex
                key={slot.start}
                onClick={() => pickTime(slot.start)}
                width="100%"
                borderWidth={2}
                borderColor={borderColor}
                p={4}
                justifyContent="center"
                alignItems="center"
                w={160}
                _hover={{
                  cursor: 'pointer',
                  color: 'white',
                  bgColor: 'primary.400',
                  borderColor: textColor,
                }}
                role={'group'}
                borderRadius={8}
                color={textColor}
                transitionProperty="all"
                transitionDuration="300ms"
                transitionTimingFunction="ease-in-out"
              >
                {
                  <Text flex={1} fontWeight="bold">
                    {format(slot.start, 'p')}
                  </Text>
                }
                {showSelfAvailability && selfAvailabilityCheck(slot.start) ? (
                  <Flex
                    borderRadius="50%"
                    w="10px"
                    h="10px"
                    bgColor={circleColor}
                    _groupHover={{
                      bgColor: 'white',
                    }}
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
