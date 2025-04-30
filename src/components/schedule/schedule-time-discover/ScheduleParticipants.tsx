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
import React, { useContext, useMemo } from 'react'
import { GoDotFill } from 'react-icons/go'

import { ScheduleContext } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'

import { MeetingMembers } from '../ScheduleTimeDiscover'

interface ScheduleParticipantsProps {
  meetingMembers: MeetingMembers[]
  isMobile?: boolean
}
export function ScheduleParticipants({
  meetingMembers,
  isMobile,
}: ScheduleParticipantsProps) {
  const { groupAvailability, setGroupAvailability } =
    useContext(ScheduleContext)
  const { currentAccount } = useContext(AccountContext)
  const allAvailabilities = useMemo(() => {
    const availabilities = [
      ...new Set(Object.values(groupAvailability).flat()),
    ].map(val => val.toLowerCase())
    if (availabilities.length === 0) {
      availabilities.push(currentAccount?.address || '')
    }
    return availabilities
  }, [groupAvailability])

  const handleAvailabilityChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const account_address = event.target.value
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
  return (
    <VStack
      py={isMobile ? 10 : 7}
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
      display={{
        base: isMobile ? 'flex' : 'none',
        lg: 'flex',
      }}
    >
      <HStack gap={9} w="100%" justify={'space-between'}>
        <Heading size={'sm'}>Participants</Heading>
        <Heading size={'sm'}>Calendar connection</Heading>
      </HStack>
      <Divider bg={'neutral.400'} />
      <VStack gap={4}>
        {meetingMembers.map((participant, index) => {
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
                value={participant.account_address?.toLowerCase()}
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
                    {participant.name || 'You'}
                  </Heading>
                  {currentAccount?.address === participant.account_address && (
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
        })}
      </VStack>
    </VStack>
  )
}
