import { Flex, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import { Page, ScheduleContext } from '@/pages/dashboard/schedule'
import { CustomDayAvailability } from '@/types/common'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { getExistingAccounts } from '@/utils/api_helper'

import { Grid4 } from '../icons/Grid4'
import Loading from '../Loading'
import MobileScheduleParticipantModal from './schedule-time-discover/MobileScheduleParticipant'
import { ScheduleParticipants } from './schedule-time-discover/ScheduleParticipants'
import { SchedulePickTime } from './schedule-time-discover/SchedulePickTime'

export type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }

const ScheduleTimeDiscover = () => {
  const { handlePageSwitch } = useContext(ScheduleContext)
  const [isOpen, setIsOpen] = useState(false)
  const handleClose = () => {
    handlePageSwitch(Page.SCHEDULE)
  }

  const { participants, groupParticipants } = useContext(ScheduleContext)

  const [meetingMembers, setMeetingMembers] = useState<Array<MeetingMembers>>(
    []
  )
  const [accountAvailabilities, setAccountAvailabilities] = useState<
    Record<string, Array<CustomDayAvailability>>
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
        Object.values(groupParticipants).flat().concat(selectedParticipants)
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
      const timezone = member.preferences.timezone
      const availabilities = member.preferences.availabilities?.map(val => {
        return {
          ...val,
          ranges: val.ranges.map(timeRange => {
            return {
              start: timeRange.start,
              end: timeRange.end,
              timezone,
              weekday: val.weekday,
            }
          }),
        }
      })
      setAccountAvailabilities(prev => ({
        ...prev,
        [member.address?.toLowerCase()]: availabilities || [],
      }))
    }
    setLoading(false)
  }
  useEffect(() => {
    fetchGroupMembers()
  }, [participants, groupParticipants])

  return (
    <VStack
      width="100%"
      m="auto"
      alignItems="stretch"
      gap={3}
      p={{ base: 4, md: 0 }}
    >
      <HStack justifyContent={'space-between'}>
        <HStack mb={0} cursor="pointer" onClick={handleClose}>
          <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
          <Heading size="md" color="primary.500">
            Back
          </Heading>
        </HStack>
        <Grid4
          w={8}
          h={8}
          onClick={() => setIsOpen(!isOpen)}
          cursor={'pointer'}
          display={{ base: 'block', md: 'none' }}
        />
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
          <MobileScheduleParticipantModal
            onClose={() => setIsOpen(false)}
            isOpen={isOpen}
            meetingMembers={meetingMembers}
          />
          <ScheduleParticipants meetingMembers={meetingMembers} />
          <SchedulePickTime
            accountAvailabilities={accountAvailabilities}
            meetingMembers={meetingMembers}
          />
        </HStack>
      )}
    </VStack>
  )
}

export default ScheduleTimeDiscover
