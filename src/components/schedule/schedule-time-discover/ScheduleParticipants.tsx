import {
  Checkbox,
  Divider,
  Heading,
  HStack,
  Tag,
  TagLabel,
  TagLeftIcon,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { GoDotFill } from 'react-icons/go'

import Loading from '@/components/Loading'
import { ScheduleContext } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { getExistingAccounts } from '@/utils/api_helper'
type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }
export function ScheduleParticipants() {
  const {
    participants,
    groupParticipants,
    groupAvailability,
    setGroupAvailability,
  } = useContext(ScheduleContext)
  const { currentAccount } = useContext(AccountContext)
  const [meetingMembers, setMeetingMembers] = useState<Array<MeetingMembers>>(
    []
  )
  const allAvailabilities = useMemo(
    () =>
      [...new Set(Object.values(groupAvailability).flat())].map(val =>
        val.toLowerCase()
      ),
    [groupAvailability]
  )

  const [loading, setLoading] = useState(false)
  const fetchGroupMembers = async () => {
    setLoading(true)
    const actualMembers = [...new Set(Object.values(groupParticipants).flat())]
    const members = await getExistingAccounts(actualMembers, false)
    setMeetingMembers(
      members.map(val => ({
        account_address: val.address?.toLowerCase(),
        name: val.preferences.name,
        status: ParticipationStatus.Pending,
        type: ParticipantType.Invitee,
        slot_id: '',
        meeting_id: '',
        isCalendarConnected: val.isCalendarConnected,
      }))
    )
    setLoading(false)
  }
  useEffect(() => {
    fetchGroupMembers()
  }, [participants])
  const handleAvailabilityChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const account_address = event.target.value
    const keys = Object.keys(groupAvailability)
    for (const key of keys) {
      const allGroupParticipants = groupAvailability[key] || []
      setGroupAvailability(prev => ({
        ...prev,
        [key]: allGroupParticipants.includes(account_address)
          ? allGroupParticipants.filter(val => val !== account_address)
          : [...allGroupParticipants, account_address],
      }))
    }
  }
  return (
    <VStack
      py={7}
      px={5}
      borderWidth={1}
      borderColor={'neutral.400'}
      rounded={12}
      gap={5}
      minH="80vh"
      maxH={'90vh'}
      overflowY={'auto'}
      w="fit-content"
      minW={'410px'}
    >
      <HStack gap={9} w="100%" justify={'space-between'}>
        <Heading size={'sm'}>Participants</Heading>
        <Heading size={'sm'}>Calendar connection</Heading>
      </HStack>
      <Divider bg={'neutral.400'} />
      <VStack gap={4}>
        {loading ? (
          <Loading />
        ) : (
          meetingMembers.map((participant, index) => {
            return (
              <HStack
                key={index}
                gap={9}
                width={'100%'}
                justifyContent={'space-between'}
                alignItems={'center'}
                h={'72px'}
              >
                <Checkbox
                  onChange={handleAvailabilityChange}
                  colorScheme={'primary'}
                  value={participant.account_address}
                  size="lg"
                  alignItems={'center'}
                  isChecked={allAvailabilities.includes(
                    participant.account_address?.toLowerCase() || ''
                  )}
                >
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
                      {participant.name}
                    </Heading>
                    {currentAccount?.address ===
                      participant.account_address && (
                      <Text fontSize={'sm'} color={'neutral.200'}>
                        Organizer
                      </Text>
                    )}
                  </VStack>
                </Checkbox>
                {participant.isCalendarConnected ? (
                  <Tag size={'sm'} bg="neutral.400">
                    <TagLeftIcon
                      boxSize="12px"
                      w={5}
                      h={5}
                      as={GoDotFill}
                      color="green.500"
                    />
                    <TagLabel px="2px">Connected</TagLabel>
                  </Tag>
                ) : (
                  <Text p={0} fontWeight={700}>
                    Not connected
                  </Text>
                )}
              </HStack>
            )
          })
        )}
      </VStack>
    </VStack>
  )
}
