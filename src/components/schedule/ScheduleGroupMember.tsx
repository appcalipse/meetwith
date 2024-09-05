import { Box, Checkbox, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import React, { FC, useContext } from 'react'

import { Availability } from '@/components/icons/Availability'
import { ScheduleContext } from '@/pages/dashboard/schedule'
import { Account } from '@/types/Account'
import { GroupMember } from '@/types/Group'

interface ScheduleGroupMemberProps extends GroupMember {
  currentAccount: Account | null
  groupId: string
  address: string
}

const ScheduleGroupMember: FC<ScheduleGroupMemberProps> = props => {
  const {
    groupParticipants,
    groupAvailability,
    setGroupAvailability,
    setGroupParticipants,
  } = useContext(ScheduleContext)
  const allGroupParticipants = groupParticipants[props.groupId] || []
  const allGroupAvailability = groupAvailability[props.groupId] || []
  const handleParticipantsChange = () => {
    setGroupParticipants(prev => ({
      ...prev,
      [props.groupId]: allGroupParticipants.includes(props.address)
        ? allGroupParticipants.filter(val => val !== props.address)
        : [...allGroupParticipants, props.address],
    }))
    const filteredAvailability = allGroupAvailability.filter(
      val => val !== props.address
    )
    setGroupAvailability(prev => ({
      ...prev,
      [props.groupId]: allGroupParticipants.includes(props.address)
        ? filteredAvailability
        : [...filteredAvailability, props.address],
    }))
  }
  const handleAvailabilityChange = () => {
    setGroupAvailability(prev => ({
      ...prev,
      [props.groupId]: allGroupAvailability.includes(props.address)
        ? allGroupAvailability.filter(val => val !== props.address)
        : [...allGroupAvailability, props.address],
    }))
  }
  return (
    <HStack w={'100%'} gap={4} justifyContent="space-between" mt={0} minH={24}>
      <Checkbox
        onChange={handleParticipantsChange}
        ml={{ base: 2, md: 8 }}
        colorScheme={'primary'}
        value={props.userId}
        size="lg"
        isChecked={allGroupParticipants.includes(props.address)}
      >
        <VStack alignItems="flex-start" ml={4}>
          <Heading size="sm">{props.displayName} </Heading>
          {props.currentAccount?.address === props.address && (
            <Text color={'neutral.600'}>Organizer</Text>
          )}
        </VStack>
      </Checkbox>
      <HStack gap={3} width="fit-content" flex={0}>
        {allGroupParticipants.includes(props.address) && (
          <Availability
            w="auto"
            h={{
              base: 20,
              md: 24,
            }}
            color={
              allGroupAvailability.includes(props.address)
                ? 'white'
                : 'neutral.600'
            }
            onClick={handleAvailabilityChange}
            cursor="pointer"
          />
        )}
        <Box width={4} />
      </HStack>
    </HStack>
  )
}

export default ScheduleGroupMember
