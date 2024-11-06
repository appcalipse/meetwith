import { Flex, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'
import { BiGrid } from 'react-icons/bi'
import { FaArrowLeft } from 'react-icons/fa6'

import {
  IGroupParticipant,
  Page,
  ScheduleContext,
} from '@/pages/dashboard/schedule'
import { DayAvailability } from '@/types/Account'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { getExistingAccounts } from '@/utils/api_helper'

import Loading from '../Loading'
import { ScheduleParticipants } from './schedule-time-discover/ScheduleParticipants'
import { SchedulePickTime } from './schedule-time-discover/SchedulePickTime'

export type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }

const ScheduleTimeDiscover = () => {
  const { handlePageSwitch } = useContext(ScheduleContext)
  const handleClose = () => {
    handlePageSwitch(Page.SCHEDULE)
  }
  const { participants, groupParticipants } = useContext(ScheduleContext)

  const [meetingMembers, setMeetingMembers] = useState<Array<MeetingMembers>>(
    []
  )
  const [accountAvailabilities, setAccountAvailabilities] = useState<
    Record<string, Array<DayAvailability>>
  >({})

  const [loading, setLoading] = useState(false)
  const fetchGroupMembers = async () => {
    setLoading(true)
    const selectedParticipants = participants
      .map(participant => {
        const person = participant as ParticipantInfo
        return person.account_address
      })
      .filter(participant => participant !== undefined)
    const actualMembers = [
      ...new Set(
        ...[...Object.values(groupParticipants).flat(), ...selectedParticipants]
      ),
    ]
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
    for (const member of members) {
      setAccountAvailabilities(prev => ({
        ...prev,
        [member.address?.toLowerCase()]:
          member.preferences.availabilities || [],
      }))
    }
    setLoading(false)
  }
  useEffect(() => {
    fetchGroupMembers()
  }, [participants])

  return (
    <VStack width="100%" m="auto" alignItems="stretch" gap={3}>
      <HStack justifyContent={'space-between'}>
        <HStack mb={0} cursor="pointer" onClick={handleClose}>
          <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
          <Heading size="md" color="primary.500">
            Back
          </Heading>
        </HStack>
        <BiGrid />
      </HStack>
      {loading ? (
        <Flex
          m={8}
          justifyContent="center"
          width="100%"
          justify={'center'}
          align={'center'}
        >
          <Loading />
        </Flex>
      ) : (
        <HStack
          width="100%"
          justifyContent={'flex-start'}
          align={'flex-start'}
          height={'fit-content'}
          gap={'14px'}
        >
          <ScheduleParticipants meetingMembers={meetingMembers} />
          <SchedulePickTime accountAvailabilities={accountAvailabilities} />
        </HStack>
      )}
    </VStack>
  )
}

export default ScheduleTimeDiscover
