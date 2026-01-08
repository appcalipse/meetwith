import { DateTime } from 'luxon'
import type React from 'react'
import { type ReactNode, createContext, useContext, useState } from 'react'

import { MeetingReminders } from '@/types/common'
import {
  type MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
} from '@/types/Meeting'
import { DurationMode, TimeRangeFilter } from '@/types/schedule'
import { MeetingPermissions } from '@/utils/constants/schedule'

interface IScheduleStateContext {
  title: string
  content: string
  duration: number
  pickedTime: Date | null
  currentSelectedDate: DateTime
  timezone: string
  meetingProvider: MeetingProvider
  meetingUrl: string
  meetingNotification: Array<{
    value: MeetingReminders
    label?: string
  }>
  meetingRepeat: { value: MeetingRepeat; label?: string }
  isScheduling: boolean
  selectedPermissions: Array<MeetingPermissions> | undefined
  decryptedMeeting: MeetingDecrypted | undefined
  durationMode: DurationMode
  timeRangeFilter: TimeRangeFilter | null
  setTitle: React.Dispatch<React.SetStateAction<string>>
  setContent: React.Dispatch<React.SetStateAction<string>>
  setDuration: React.Dispatch<React.SetStateAction<number>>
  setPickedTime: React.Dispatch<React.SetStateAction<Date | null>>
  setCurrentSelectedDate: React.Dispatch<React.SetStateAction<DateTime>>
  setTimezone: React.Dispatch<React.SetStateAction<string>>
  setMeetingProvider: React.Dispatch<React.SetStateAction<MeetingProvider>>
  setMeetingUrl: React.Dispatch<React.SetStateAction<string>>
  setMeetingNotification: React.Dispatch<
    React.SetStateAction<Array<{ value: MeetingReminders; label?: string }>>
  >
  setMeetingRepeat: React.Dispatch<
    React.SetStateAction<{ value: MeetingRepeat; label?: string }>
  >
  setSelectedPermissions: React.Dispatch<
    React.SetStateAction<Array<MeetingPermissions> | undefined>
  >
  setIsScheduling: React.Dispatch<React.SetStateAction<boolean>>
  setDecryptedMeeting: React.Dispatch<
    React.SetStateAction<MeetingDecrypted | undefined>
  >
  setDurationMode: React.Dispatch<React.SetStateAction<DurationMode>>
  setTimeRangeFilter: React.Dispatch<
    React.SetStateAction<TimeRangeFilter | null>
  >
}

const ScheduleStateContext = createContext<IScheduleStateContext | undefined>(
  undefined
)

export const useScheduleState = () => {
  const context = useContext(ScheduleStateContext)
  if (!context) {
    throw new Error(
      'useScheduleState must be used within ScheduleStateProvider'
    )
  }
  return context
}

interface ScheduleStateProviderProps {
  children: ReactNode
}

export const ScheduleStateProvider: React.FC<ScheduleStateProviderProps> = ({
  children,
}) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [duration, setDuration] = useState(30)
  const [pickedTime, setPickedTime] = useState<Date | null>(null)
  const [currentSelectedDate, setCurrentSelectedDate] = useState<DateTime>(
    DateTime.now()
  )
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [decryptedMeeting, setDecryptedMeeting] = useState<
    MeetingDecrypted | undefined
  >(undefined)
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>(
    MeetingProvider.GOOGLE_MEET
  )
  const [meetingUrl, setMeetingUrl] = useState('')
  const [meetingNotification, setMeetingNotification] = useState<
    Array<{ value: MeetingReminders; label?: string }>
  >([
    {
      value: MeetingReminders['1_HOUR_BEFORE'],
      label: '1 hour before',
    },
  ])
  const [meetingRepeat, setMeetingRepeat] = useState<{
    value: MeetingRepeat
    label?: string
  }>({
    value: MeetingRepeat['NO_REPEAT'],
    label: 'Does not repeat',
  })
  const [selectedPermissions, setSelectedPermissions] = useState<
    Array<MeetingPermissions> | undefined
  >([
    MeetingPermissions.SEE_GUEST_LIST,
    MeetingPermissions.INVITE_GUESTS,
    MeetingPermissions.EDIT_MEETING,
  ])
  const [isScheduling, setIsScheduling] = useState(false)
  const [durationMode, setDurationMode] = useState<DurationMode>(
    DurationMode.PRESET
  )
  const [timeRangeFilter, setTimeRangeFilter] =
    useState<TimeRangeFilter | null>(null)

  const value: IScheduleStateContext = {
    title,
    content,
    duration,
    pickedTime,
    currentSelectedDate,
    timezone,
    meetingProvider,
    meetingUrl,
    meetingNotification,
    meetingRepeat,
    isScheduling,
    selectedPermissions,
    durationMode,
    timeRangeFilter,
    setTitle,
    setContent,
    setDuration,
    setPickedTime,
    setCurrentSelectedDate,
    setTimezone,
    setMeetingProvider,
    setMeetingUrl,
    setMeetingNotification,
    setMeetingRepeat,
    setSelectedPermissions,
    setIsScheduling,
    decryptedMeeting,
    setDecryptedMeeting,
    setDurationMode,
    setTimeRangeFilter,
  }

  return (
    <ScheduleStateContext.Provider value={value}>
      {children}
    </ScheduleStateContext.Provider>
  )
}
