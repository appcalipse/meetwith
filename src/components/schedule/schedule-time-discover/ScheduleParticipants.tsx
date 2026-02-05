import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import { IoMdClose } from 'react-icons/io'

import { useScheduleNavigation } from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { ParticipantType } from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { deduplicateArray } from '@/utils/generic_utils'
import { ellipsizeAddress } from '@/utils/user_manager'

interface ScheduleParticipantsProps {
  isMobile?: boolean
}

export function ScheduleParticipants({ isMobile }: ScheduleParticipantsProps) {
  const {
    groupAvailability,
    participants,
    toggleAvailability,
    removeParticipant,
    allParticipants,
  } = useParticipants()
  const { setInviteModalOpen } = useScheduleNavigation()
  const groups = useMemo(
    () =>
      participants.filter(val => {
        return isGroupParticipant(val)
      }),
    [participants]
  )

  const allAvailabilities = useMemo(
    () =>
      deduplicateArray(Object.values(groupAvailability).flat()).map(val =>
        val?.toLowerCase()
      ),
    [groupAvailability]
  )

  return (
    <VStack
      py={{ base: 10, md: 7 }}
      px={5}
      borderWidth={1}
      borderColor={'input-border'}
      rounded={12}
      gap={5}
      minH={'80vh'}
      overflowY={'auto'}
      w={{ base: '100%', md: 'fit-content' }}
      mx={{ base: 'auto', md: 0 }}
      bg="bg-surface-secondary"
      minW={{ base: 'none', md: '315px' }}
      maxW={'400px'}
      display={{
        base: isMobile ? 'flex' : 'none',
        lg: 'flex',
      }}
      position="sticky"
      top={0}
      zIndex={1}
    >
      <HStack gap={9} w="100%" justify={'space-between'}>
        <Heading size={'sm'}>Select Participants</Heading>
        <Heading size={'sm'}>Delete</Heading>
      </HStack>
      <Divider bg={'neutral.400'} />
      {groups.length > 0 && allParticipants.length > 1 && (
        <VStack gap={2} alignItems="start" w="100%">
          {groups.length > 0 && (
            <Text textAlign="left">
              <b>Groups Selected:</b> {groups.map(val => val.name).join(', ')}
            </Text>
          )}
          {allParticipants.length > 1 && (
            <Text textAlign="left">
              <b>Number of Participants:</b> {allParticipants.length}
            </Text>
          )}
        </VStack>
      )}
      <VStack gap={4} w="100%">
        {allParticipants?.map(participant => {
          return (
            <HStack
              key={
                participant.account_address ||
                participant.guest_email ||
                participant.name
              }
              width={'100%'}
              justifyContent={'space-between'}
              alignItems={'center'}
              h={'72px'}
            >
              <HStack alignItems={'center'}>
                <Box
                  onClick={() =>
                    participant.account_address &&
                    toggleAvailability(
                      participant.account_address?.toLowerCase()
                    )
                  }
                >
                  <Icon
                    as={
                      allAvailabilities.includes(
                        participant.account_address?.toLowerCase() || ''
                      )
                        ? AiOutlineEye
                        : AiOutlineEyeInvisible
                    }
                    cursor="pointer"
                    boxSize={6}
                    color="border-default-primary"
                    w={6}
                    h={6}
                  />
                </Box>
                <VStack
                  alignItems="flex-start"
                  ml={4}
                  gap={2}
                  py={8}
                  my="auto"
                  justifyContent={'center'}
                >
                  <Heading
                    size="sm"
                    lineHeight={'normal'}
                    maxW="180px"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    w={'fit-content'}
                  >
                    {participant.name ||
                      participant.guest_email ||
                      ellipsizeAddress(participant.account_address || '')}
                  </Heading>
                  {participant.type === ParticipantType.Scheduler && (
                    <Text fontSize={'sm'} color={'text-highlight-primary'}>
                      Organizer
                    </Text>
                  )}
                </VStack>
              </HStack>
              <Icon
                as={IoMdClose}
                w={5}
                h={5}
                display="block"
                cursor="pointer"
                color="text-highlight-primary"
                onClick={() => removeParticipant(participant)}
              />
            </HStack>
          )
        })}
      </VStack>
      <Button
        variant="outline"
        colorScheme="primary"
        w="100%"
        px={4}
        py={3}
        onClick={() => setInviteModalOpen(true)}
      >
        Add more participants
      </Button>
    </VStack>
  )
}
