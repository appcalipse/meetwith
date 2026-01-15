import { DateTime } from 'luxon'
import React, { createContext, ReactNode, useContext, useState } from 'react'

import { MeetingReminders } from '@/types/common'
import {
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
} from '@/types/Meeting'
import { UpdateMode } from '@/utils/constants/meeting'
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
  editMode: UpdateMode
  isScheduling: boolean
  selectedPermissions: Array<MeetingPermissions> | undefined
  decryptedMeeting: MeetingDecrypted | undefined
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
  setEditMode: React.Dispatch<React.SetStateAction<UpdateMode>>
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
  const [editMode, setEditMode] = useState<UpdateMode>(UpdateMode.SINGLE_EVENT)
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
      label: '1 hour before',
      value: MeetingReminders['1_HOUR_BEFORE'],
    },
  ])
  const [meetingRepeat, setMeetingRepeat] = useState<{
    value: MeetingRepeat
    label?: string
  }>({
    label: 'Does not repeat',
    value: MeetingRepeat['NO_REPEAT'],
  })
  const [selectedPermissions, setSelectedPermissions] = useState<
    Array<MeetingPermissions> | undefined
  >([MeetingPermissions.SEE_GUEST_LIST, MeetingPermissions.EDIT_MEETING])
  const [isScheduling, setIsScheduling] = useState(false)

  const value: IScheduleStateContext = {
    content,
    currentSelectedDate,
    decryptedMeeting,
    duration,
    editMode,
    isScheduling,
    meetingNotification,
    meetingProvider,
    meetingRepeat,
    meetingUrl,
    pickedTime,
    selectedPermissions,
    setContent,
    setCurrentSelectedDate,
    setDecryptedMeeting,
    setDuration,
    setEditMode,
    setIsScheduling,
    setMeetingNotification,
    setMeetingProvider,
    setMeetingRepeat,
    setMeetingUrl,
    setPickedTime,
    setSelectedPermissions,
    setTimezone,
    setTitle,
    timezone,
    title,
  }

  return (
    <ScheduleStateContext.Provider value={value}>
      {children}
    </ScheduleStateContext.Provider>
  )
}
