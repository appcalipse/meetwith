import { Box, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React from 'react'
import { FaArrowRight } from 'react-icons/fa6'

import { TimeSlotTooltipContentProps } from '@/types/schedule'

export const TimeSlotTooltipContent: React.FC<TimeSlotTooltipContentProps> = ({
  currentUserState,
  currentUserEvent,
  eventUrl,
  otherUserStates,
  defaultBlockId,
}) => {
  const router = useRouter()

  const handleOpenAvailabilityBlock = () => {
    if (defaultBlockId) {
      router.push(`/dashboard/availability?editBlock=${defaultBlockId}`)
    }
  }

  return (
    <>
      {/* Show current user first */}
      {currentUserState && (
        <VStack
          w="fit-content"
          gap={1}
          align={'flex-start'}
          mb={currentUserState && !currentUserState.state ? 3 : 2}
        >
          <HStack>
            <Box
              w={4}
              h={4}
              rounded={999}
              bg={currentUserState.state ? 'green.400' : 'neutral.0'}
            />
            <Text>{`${currentUserState.displayName} (You)`}</Text>
          </HStack>
        </VStack>
      )}

      {/* Show event details or availability block message if current user is unavailable */}
      {currentUserState && !currentUserState.state && (
        <Box
          mb={3}
          p={3}
          bg="neutral.200"
          borderRadius={10}
          borderWidth={0}
          maxW={{ base: '100%', md: '450px' }}
        >
          {currentUserEvent ? (
            <>
              <Text
                fontSize="12.8px"
                fontWeight="500"
                mb={1.5}
                color="neutral.900"
              >
                YOUR CALENDAR EVENT BLOCKING SLOT
                {currentUserEvent.eventEmail && (
                  <span
                    style={{
                      fontSize: '12.8px',
                      fontWeight: '700',
                      color: 'neutral.900',
                    }}
                  >
                    {' '}
                    - {currentUserEvent.eventEmail}
                  </span>
                )}
              </Text>
              {currentUserEvent.eventTitle && (
                <Text
                  fontSize="16px"
                  fontWeight="500"
                  color="neutral.900"
                  mb={2}
                  noOfLines={1}
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {currentUserEvent.eventTitle}
                </Text>
              )}
              {eventUrl && (
                <HStack gap={1}>
                  <Link
                    href={eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    fontSize="16px"
                    color="primary.500"
                    fontWeight="500"
                    textDecoration="underline"
                  >
                    Open this event
                  </Link>
                  <FaArrowRight size={12} color="#F35826" />
                </HStack>
              )}
            </>
          ) : (
            <>
              <Text fontSize="16px" fontWeight="500" color="neutral.900" mb={2}>
                You&apos;re unavailable because of your <b>default</b>{' '}
                availability block settings. You can update it to make this time
                slot available.
              </Text>
              {defaultBlockId && (
                <HStack gap={1}>
                  <Link
                    as="button"
                    onClick={handleOpenAvailabilityBlock}
                    fontSize="16px"
                    color="primary.500"
                    fontWeight="500"
                    textDecoration="underline"
                    bg="transparent"
                    border="none"
                    p={0}
                    m={0}
                    cursor="pointer"
                    _hover={{
                      color: 'primary.300',
                    }}
                  >
                    Update availability block
                  </Link>
                  <FaArrowRight size={12} color="#F35826" />
                </HStack>
              )}
            </>
          )}
        </Box>
      )}

      {/* Show other participants */}
      {otherUserStates.length > 0 && (
        <>
          <Text fontSize="18px" fontWeight="700" mb={2} color="#ffffff">
            OTHERS AVAILABILITY
          </Text>

          <VStack w="fit-content" gap={1} align={'flex-start'}>
            {otherUserStates.map((userState, index) => (
              <HStack key={index}>
                <Box
                  w={4}
                  h={4}
                  rounded={999}
                  bg={userState.state ? 'green.400' : 'neutral.0'}
                />
                <Text>{userState.displayName}</Text>
              </HStack>
            ))}
          </VStack>
        </>
      )}
    </>
  )
}
