import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useContext, useMemo } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import { IoMdClose } from 'react-icons/io'

import { ScheduleContext } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { isGroupParticipant } from '@/types/schedule'
import { getMergedParticipants } from '@/utils/schedule.helper'

interface ScheduleParticipantsProps {
  isMobile?: boolean
}

export function ScheduleParticipants({ isMobile }: ScheduleParticipantsProps) {
  const {
    groupAvailability,
    setGroupAvailability,
    groupParticipants,
    setGroupParticipants,
    meetingMembers,
    participants,
    groups: allGroups,
  } = useContext(ScheduleContext)
  const { currentAccount } = useContext(AccountContext)
  const groups = useMemo(
    () =>
      participants.filter(val => {
        return isGroupParticipant(val)
      }),
    [participants]
  )
  const allAvailabilities = useMemo(() => {
    return [...new Set(Object.values(groupAvailability).flat())].map(val =>
      val.toLowerCase()
    )
  }, [groupAvailability])
  const handleAvailabilityChange = (account_address: string) => {
    const keys = Object.keys(groupAvailability)
    for (const key of keys) {
      const allGroupParticipants = groupAvailability[key] || []
      const newParticipants = allAvailabilities.includes(account_address)
        ? allGroupParticipants.filter(val => val !== account_address)
        : [...allGroupParticipants, account_address]
      setGroupAvailability(prev => ({
        ...prev,
        [key]: newParticipants,
      }))
    }
  }
  const totalParticipantsCount = useMemo(() => {
    const participantsMerged = getMergedParticipants(
      participants,
      allGroups,
      groupParticipants,
      currentAccount?.address || ''
    )
    return participantsMerged.length + 1
  }, [participants, allGroups, groupParticipants, currentAccount?.address])
  const handleParticipantRemove = (account_address: string) => {
    if (account_address === currentAccount?.address) return
    const keys = Object.keys(groupAvailability)
    for (const key of keys) {
      const allGroupParticipants = groupParticipants[key] || []
      const newParticipants = allAvailabilities.includes(account_address)
        ? allGroupParticipants.filter(val => val !== account_address)
        : [...allGroupParticipants, account_address]
      setGroupParticipants(prev => ({
        ...prev,
        [key]: newParticipants,
      }))
    }
  }
  return (
    <VStack
      py={isMobile ? 10 : 7}
      px={5}
      borderWidth={1}
      rounded={12}
      gap={5}
      minH="80vh"
      maxH={'90vh'}
      overflowY={'auto'}
      w="fit-content"
      minW={'410px'}
      display={{
        base: isMobile ? 'flex' : 'none',
        lg: 'flex',
      }}
    >
      <HStack gap={9} w="100%" justify={'space-between'}>
        <Heading size={'sm'}>Select Participants</Heading>
        <Heading size={'sm'}>Delete</Heading>
      </HStack>
      <Divider bg={'neutral.400'} />
      {groups.length > 0 && totalParticipantsCount > 1 && (
        <VStack gap={2} alignItems="start">
          {groups.length > 0 && (
            <Text>
              <b>Groups Selected:</b> {groups.map(val => val.name).join(', ')}
            </Text>
          )}
          {totalParticipantsCount > 1 && (
            <Text>
              <b>Number of Participants:</b> {totalParticipantsCount}
            </Text>
          )}
        </VStack>
      )}
      <VStack gap={4} w="100%">
        {meetingMembers?.map((participant, index) => {
          return (
            <HStack
              key={index}
              gap={9}
              width={'100%'}
              justifyContent={'space-between'}
              alignItems={'center'}
              h={'72px'}
            >
              <HStack>
                <Box
                  onClick={() =>
                    handleAvailabilityChange(
                      participant.address?.toLowerCase() || ''
                    )
                  }
                >
                  {allAvailabilities.includes(
                    participant.address?.toLowerCase() || ''
                  ) ? (
                    <AiOutlineEye cursor="pointer" size={30} color="#F9B19A" />
                  ) : (
                    <AiOutlineEyeInvisible
                      cursor="pointer"
                      size={30}
                      color="#F9B19A"
                    />
                  )}
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
                    maxW="300px"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    w={'fit-content'}
                  >
                    {participant.preferences.name || 'You'}
                  </Heading>
                  {currentAccount?.address === participant.address && (
                    <Text fontSize={'sm'} color={'neutral.200'}>
                      Organizer
                    </Text>
                  )}
                </VStack>
              </HStack>
              <IoMdClose
                size={30}
                cursor="pointer"
                color="#CBD2D9"
                onClick={() =>
                  handleParticipantRemove(
                    participant.address?.toLowerCase() || ''
                  )
                }
              />
            </HStack>
          )
        })}
      </VStack>
      <Button variant="outline" colorScheme="primary" w="100%" px={4} py={3}>
        Add more participants
      </Button>
    </VStack>
  )
}
