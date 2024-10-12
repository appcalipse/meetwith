import { Container, Flex, useToast } from '@chakra-ui/react'
import { addMinutes } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import ScheduleBase from '@/components/schedule/ScheduleBase'
import ScheduleCompleted from '@/components/schedule/ScheduleCompleted'
import ScheduleDetails from '@/components/schedule/ScheduleDetails'
import ScheduleTimeDiscover from '@/components/schedule/ScheduleTimeDiscover'
import { AccountContext } from '@/providers/AccountProvider'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'
import { MeetingProvider, SchedulingType } from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  getExistingAccounts,
  getGroup,
  getGroupsMembers,
} from '@/utils/api_helper'
import { scheduleMeeting } from '@/utils/calendar_manager'
import { handleApiError } from '@/utils/error_helper'
import { getAddressFromDomain } from '@/utils/rpc_helper_front'
import { isValidEmail, isValidEVMAddress } from '@/utils/validations'

export enum Page {
  SCHEDULE,
  SCHEDULE_TIME,
  SCHEDULE_DETAILS,
  COMPLETED,
}

interface IScheduleContext {
  groupParticipants: Record<string, Array<string>>
  groupAvailability: Record<string, Array<string>>
  setGroupParticipants: React.Dispatch<
    React.SetStateAction<Record<string, Array<string>>>
  >
  setGroupAvailability: React.Dispatch<
    React.SetStateAction<Record<string, Array<string>>>
  >
  addGroup: (group: IGroupParticipant) => void
  removeGroup: (groupId: string) => void
  participants: Array<ParticipantInfo | IGroupParticipant>
  handlePageSwitch: (page: Page) => void
  setParticipants: React.Dispatch<
    React.SetStateAction<Array<ParticipantInfo | IGroupParticipant>>
  >
  title: string
  content: string
  duration: number
  handleTitleChange: (title: string) => void
  handleContentChange: (content: string) => void
  handleDurationChange: (duration: number) => void
  pickedTime: Date | number | null
  handleTimePick: (time: Date | number) => void
  currentMonth: Date
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>
  currentSelectedDate: Date
  setCurrentSelectedDate: React.Dispatch<React.SetStateAction<Date>>
  timezone: string
  setTimezone: React.Dispatch<React.SetStateAction<string>>
  handleSchedule: () => void
  isScheduling: boolean
  meetingProvider: MeetingProvider
  setMeetingProvider: React.Dispatch<React.SetStateAction<MeetingProvider>>
  meetingUrl?: string
  setMeetingUrl: React.Dispatch<React.SetStateAction<string>>
}

export interface IGroupParticipant {
  id: string
  name: string
  isGroup: boolean
}

const DEFAULT_CONTEXT: IScheduleContext = {
  handlePageSwitch: () => {},
  groupParticipants: {},
  groupAvailability: {},
  setGroupParticipants: () => {},
  setGroupAvailability: () => {},
  addGroup: () => {},
  removeGroup: () => {},
  participants: [],
  setParticipants: () => {},
  title: '',
  content: '',
  duration: 30,
  handleTitleChange: () => {},
  handleContentChange: () => {},
  handleDurationChange: () => {},
  pickedTime: null,
  handleTimePick: () => {},
  currentMonth: new Date(),
  setCurrentMonth: () => {},
  currentSelectedDate: new Date(),
  setCurrentSelectedDate: () => {},
  timezone: '',
  setTimezone: () => {},
  handleSchedule: () => {},
  isScheduling: false,
  meetingProvider: MeetingProvider.HUDDLE,
  setMeetingProvider: () => {},
  meetingUrl: '',
  setMeetingUrl: () => {},
}
export const ScheduleContext =
  React.createContext<IScheduleContext>(DEFAULT_CONTEXT)

const Schedule: NextPage = () => {
  const { currentAccount } = useContext(AccountContext)
  const [participants, setParticipants] = useState<
    Array<ParticipantInfo | IGroupParticipant>
  >([])
  const [groupParticipants, setGroupParticipants] = useState<
    Record<string, Array<string>>
  >({})
  const [groupAvailability, setGroupAvailability] = useState<
    Record<string, Array<string>>
  >({})
  const [currentPage, setCurrentPage] = useState<Page>(Page.SCHEDULE)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = useState('')
  const [duration, setDuration] = React.useState(30)
  const [pickedTime, setPickedTime] = useState<Date | number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentSelectedDate, setCurrentSelectedDate] = useState(new Date())
  const [isPrefetching, setIsPrefetching] = useState(false)
  const [timezone, setTimezone] = useState<string>(
    currentAccount?.preferences?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>(
    currentAccount?.preferences.meetingProvider.includes(MeetingProvider.HUDDLE)
      ? MeetingProvider.HUDDLE
      : MeetingProvider.CUSTOM
  )
  const [meetingUrl, setMeetingUrl] = useState('')
  const toast = useToast()
  const { query } = useRouter()
  const { groupId } = query as { groupId: string }
  const [isScheduling, setIsScheduling] = useState(false)
  const handleTimePick = (time: Date | number) => setPickedTime(time)
  const handleAddGroup = (group: IGroupParticipant) => {
    setParticipants(prev => {
      const groupAdded = prev.some(val => {
        const groupData = val as IGroupParticipant
        return groupData.isGroup && groupData.id === group.id
      })
      if (groupAdded) {
        return prev
      }
      return [...prev, group]
    })
  }
  const handleRemoveGroup = (groupId: string) =>
    setParticipants(prev =>
      prev.filter(val => {
        const groupData = val as IGroupParticipant
        const isGroup = groupData.isGroup && groupData.id === groupId
        return !isGroup
      })
    )
  const renderCurrentPage = () => {
    switch (currentPage) {
      case Page.SCHEDULE:
        return <ScheduleBase />
      case Page.SCHEDULE_TIME:
        return <ScheduleTimeDiscover />
      case Page.SCHEDULE_DETAILS:
        return <ScheduleDetails />
      case Page.COMPLETED:
        return <ScheduleCompleted />
    }
  }
  const parseAccounts = async (
    participants: ParticipantInfo[]
  ): Promise<{ valid: ParticipantInfo[]; invalid: string[] }> => {
    const valid: ParticipantInfo[] = []
    const invalid: string[] = []
    for (const participant of participants) {
      if (
        isValidEVMAddress(participant.account_address || '') ||
        isValidEmail(participant.guest_email || '')
      ) {
        valid.push(participant)
      } else {
        const address = await getAddressFromDomain(participant.name || '')
        if (address) {
          valid.push({
            account_address: address,
            type: ParticipantType.Invitee,
            slot_id: '',
            meeting_id: '',
            status: ParticipationStatus.Pending,
          })
        } else {
          invalid.push(participant.name!)
        }
      }
    }
    return { valid, invalid }
  }
  const handleSchedule = async () => {
    try {
      setIsScheduling(true)
      const actualMembers = [
        ...new Set(Object.values(groupParticipants).flat()),
      ]
      const members = await getExistingAccounts(actualMembers)
      const participantsGroup = members.map(val => ({
        account_address: val.address?.toLowerCase(),
        name: val.preferences.name,
        status: ParticipationStatus.Pending,
        type: ParticipantType.Invitee,
        slot_id: '',
        meeting_id: '',
      }))
      const currentParticipant = participants.filter(val => {
        const groupData = val as IGroupParticipant
        const isGroup = groupData.isGroup
        return !isGroup
      }) as Array<ParticipantInfo>
      const allParticipants = [
        ...new Set(
          [...currentParticipant, ...participantsGroup].filter(
            val => val.account_address != currentAccount!.address
          )
        ),
      ]
      const _participants = await parseAccounts(allParticipants)
      _participants.valid.push({
        account_address: currentAccount!.address,
        type: ParticipantType.Scheduler,
        status: ParticipationStatus.Accepted,
        slot_id: '',
        meeting_id: '',
      })
      if (_participants.invalid.length > 0) {
        toast({
          title: 'Invalid invitees',
          description: `Can't invite ${_participants.invalid.join(
            ', '
          )}. Please check the addresses/profiles/emails`,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
        setIsScheduling(false)
        return
      }
      if (!pickedTime) return
      const start = zonedTimeToUtc(pickedTime as Date, timezone)
      const end = addMinutes(new Date(start), duration)
      await scheduleMeeting(
        true,
        SchedulingType.REGULAR,
        'no_type',
        start,
        end,
        _participants.valid,
        meetingProvider || MeetingProvider.HUDDLE,
        currentAccount,
        content,
        meetingUrl,
        undefined,
        title
      )
      setCurrentPage(Page.COMPLETED)
    } catch (error: any) {
      handleApiError('Error scheduling meeting', error)
    }
    setIsScheduling(false)
  }
  const context: IScheduleContext = {
    groupParticipants,
    groupAvailability,
    setGroupParticipants,
    setGroupAvailability,
    participants,
    addGroup: handleAddGroup,
    removeGroup: handleRemoveGroup,
    handlePageSwitch: (page: Page) => setCurrentPage(page),
    setParticipants,
    title,
    content,
    duration,
    handleTitleChange: setTitle,
    handleContentChange: setContent,
    handleDurationChange: setDuration,
    pickedTime,
    handleTimePick,
    currentMonth,
    setCurrentMonth,
    currentSelectedDate,
    setCurrentSelectedDate,
    timezone,
    setTimezone,
    handleSchedule,
    isScheduling,
    meetingProvider,
    setMeetingProvider,
    meetingUrl,
    setMeetingUrl,
  }
  const handleGroupPrefetch = async () => {
    if (!groupId) return
    setIsPrefetching(true)
    try {
      const group = await getGroup(groupId)
      const fetchedGroupMembers = await getGroupsMembers(groupId)
      const actualMembers = fetchedGroupMembers
        .filter(val => !val.invitePending)
        .filter(val => !!val.address)
      const allAddresses = actualMembers
        .map(val => val.address)
        .filter((val): val is string => typeof val === 'string')
      if (!(groupParticipants[groupId] || groupAvailability[groupId])) {
        setGroupAvailability(prev => ({
          ...prev,
          [groupId]: allAddresses,
        }))
        setGroupParticipants(prev => ({
          ...prev,
          [groupId]: allAddresses,
        }))
        handleAddGroup({
          isGroup: true,
          name: group.name,
          id: group.id,
        })
      }
    } catch (error: any) {
      handleApiError('Error prefetching group.', error)
    }
    setIsPrefetching(false)
  }
  useEffect(() => {
    handleGroupPrefetch()
  }, [groupId])
  return (
    <ScheduleContext.Provider value={context}>
      <Container
        maxW={{
          base: '100%',
          '2xl': '7xl',
        }}
        mt={28}
        flex={1}
        pb={16}
      >
        {isPrefetching ? (
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
          renderCurrentPage()
        )}
      </Container>
    </ScheduleContext.Provider>
  )
}

const EnhancedSchedule: NextPage = withLoginRedirect(
  forceAuthenticationCheck(Schedule)
)

EnhancedSchedule.getInitialProps = async ctx => {
  const { groupId } = ctx.query
  return { groupId }
}

export default withLoginRedirect(EnhancedSchedule)
