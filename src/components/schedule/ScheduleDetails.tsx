import { Text } from '@chakra-ui/layout'
import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Radio,
  RadioGroup,
  VStack,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import React, { useContext, useEffect, useState } from 'react'
import { FaCalendar, FaClock } from 'react-icons/fa'
import { FaArrowLeft, FaUserGroup } from 'react-icons/fa6'
import { IoMdTimer } from 'react-icons/io'

import Loading from '@/components/Loading'
import RichTextEditor from '@/components/profile/components/RichTextEditor'
import {
  IGroupParticipant,
  Page,
  ScheduleContext,
} from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { MeetingProvider } from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { getExistingAccounts } from '@/utils/api_helper'
import { renderProviderName } from '@/utils/generic_utils'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

const ScheduleDetails = () => {
  const {
    handlePageSwitch,
    title,
    duration,
    timezone,
    participants,
    groupAvailability,
    groupParticipants,
    content,
    handleContentChange,
    isScheduling,
    pickedTime,
    handleSchedule,
    meetingProvider,
    meetingUrl,
    setMeetingProvider,
    setMeetingUrl,
  } = useContext(ScheduleContext)
  const { currentAccount } = useContext(AccountContext)
  const [groupMembers, setGroupsMembers] = useState<Array<ParticipantInfo>>([])
  const [loading, setLoading] = useState(false)
  const meetingProviders = (
    currentAccount?.preferences?.meetingProviders || []
  ).concat(MeetingProvider.CUSTOM)
  const containsGroup = participants.some(val => {
    const groupData = val as IGroupParticipant
    const isGroup = groupData.isGroup
    return isGroup
  })

  const handleClose = () => {
    handlePageSwitch(Page.SCHEDULE_TIME)
  }
  const groups = participants.filter(val => {
    const groupData = val as IGroupParticipant
    const isGroup = groupData.isGroup
    return isGroup
  }) as Array<IGroupParticipant>
  const fetchGroupMembers = async () => {
    setLoading(true)
    const actualMembers = [...new Set(Object.values(groupParticipants).flat())]
    const members = await getExistingAccounts(actualMembers)
    setGroupsMembers(
      members.map(val => ({
        account_address: val.address?.toLowerCase(),
        name: val.preferences.name,
        status: ParticipationStatus.Pending,
        type: ParticipantType.Invitee,
        slot_id: '',
        meeting_id: '',
      }))
    )
    setLoading(false)
  }
  useEffect(() => {
    fetchGroupMembers()
  }, [participants])
  const getNamesDisplay = (participants: Array<ParticipantInfo>) => {
    return getAllParticipantsDisplayName(participants, currentAccount!.address)
  }
  const allAvailabilities = [
    ...new Set(Object.values(groupAvailability).flat()),
  ]

  const currentParticipant = participants.filter(val => {
    const groupData = val as IGroupParticipant
    const isGroup = groupData.isGroup
    return !isGroup
  }) as Array<ParticipantInfo>
  const requiredGroupMembers = groupMembers
    .filter(val => allAvailabilities.includes(val.account_address || ''))
    .concat(currentParticipant)
  const optionalGroupMembers = groupMembers.filter(
    val => !allAvailabilities.includes(val.account_address || '')
  )
  return (
    <Flex
      width="fit-content"
      minW={{
        base: '300px',
        md: '800px',
        sm: 'auto',
      }}
      m="auto"
      alignItems="start"
      gap={{ base: 4, md: 24, lg: 48 }}
      flexDirection={{
        base: 'column',
        md: 'row',
      }}
    >
      <HStack mb={0} cursor="pointer" onClick={handleClose}>
        <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
        <Heading size="md" color="primary.500">
          Back
        </Heading>
      </HStack>
      {loading ? (
        <Flex
          flex={1}
          alignItems="center"
          justifyContent="center"
          w={'100%'}
          h={'100%'}
        >
          <Loading />
        </Flex>
      ) : (
        <VStack alignItems="start" gap={{ base: 6, md: 12 }}>
          <Heading
            size="lg"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            maxWidth={{ base: '300px', md: '500px', lg: '900px' }}
          >
            {title}
          </Heading>
          <VStack alignItems="start" gap={4}>
            <HStack gap={3}>
              <FaCalendar size={24} />
              <Text fontWeight="700">{format(pickedTime!, 'MMM d, yyyy')}</Text>
            </HStack>
            <HStack gap={3}>
              <FaClock size={24} />
              <Text fontWeight="700">
                {format(pickedTime!, 'hh:mm a')} ({timezone})
              </Text>
            </HStack>
            <HStack gap={3}>
              <IoMdTimer size={28} />
              <Text fontWeight="700">{duration} minutes</Text>
            </HStack>
            <HStack alignItems="start" gap={3}>
              <FaUserGroup size={24} />
              {groups.length > 0 ? (
                <VStack gap={2} alignItems="start">
                  <Text fontWeight="700">
                    {groups.map(val => val.name).join(', ')}
                  </Text>
                  <VStack alignItems="start" color="#9BA5B7" fontWeight="500">
                    {requiredGroupMembers.length > 0 && (
                      <Text>
                        Required: {getNamesDisplay(requiredGroupMembers)}
                      </Text>
                    )}
                    {optionalGroupMembers.length > 0 && (
                      <Text>
                        Optional: {getNamesDisplay(optionalGroupMembers)}
                      </Text>
                    )}
                  </VStack>
                </VStack>
              ) : (
                <Text color="#9BA5B7" fontWeight="500">
                  Participants: {getNamesDisplay(currentParticipant)}
                </Text>
              )}
            </HStack>
          </VStack>
          <VStack alignItems="start" w={'100%'} gap={4}>
            <Text fontSize="18px" fontWeight={500}>
              Location
            </Text>
            <RadioGroup
              onChange={(val: MeetingProvider) => setMeetingProvider(val)}
              value={meetingProvider}
              w={'100%'}
            >
              <VStack w={'100%'} gap={4}>
                {meetingProviders.map(provider => (
                  <Radio
                    flexDirection="row-reverse"
                    justifyContent="space-between"
                    w="100%"
                    colorScheme="primary"
                    value={provider}
                    key={provider}
                  >
                    <Text
                      fontWeight="600"
                      color={'primary.200'}
                      cursor="pointer"
                    >
                      {renderProviderName(provider)}
                    </Text>
                  </Radio>
                ))}
              </VStack>
            </RadioGroup>
            {meetingProvider === MeetingProvider.CUSTOM && (
              <Input
                type="text"
                placeholder="insert a custom meeting url"
                isDisabled={isScheduling}
                my={4}
                value={meetingUrl}
                onChange={e => setMeetingUrl(e.target.value)}
              />
            )}
          </VStack>
          <FormControl
            w={{
              base: '100%',
              lg: '600px',
            }}
          >
            <FormLabel htmlFor="info">Description (optional)</FormLabel>
            <RichTextEditor
              id="info"
              value={content}
              onValueChange={handleContentChange}
              placeholder="Any information you want to share prior to the meeting?"
            />
          </FormControl>
          <Button
            w="100%"
            py={3}
            h={'auto'}
            colorScheme="primary"
            isLoading={isScheduling}
            onClick={handleSchedule}
          >
            Schedule
          </Button>
        </VStack>
      )}
    </Flex>
  )
}

export default ScheduleDetails
