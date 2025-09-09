import React, { createContext, ReactNode, useContext, useState } from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { MeetingReminders } from '@/types/common'
import {
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
} from '@/types/Meeting'
import { MeetingPermissions } from '@/utils/constants/schedule'

interface IScheduleStateContext {
  title: string
  content: string
  duration: number
  pickedTime: Date | null
  currentSelectedDate: Date
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
  setTitle: React.Dispatch<React.SetStateAction<string>>
  setContent: React.Dispatch<React.SetStateAction<string>>
  setDuration: React.Dispatch<React.SetStateAction<number>>
  setPickedTime: React.Dispatch<React.SetStateAction<Date | null>>
  setCurrentSelectedDate: React.Dispatch<React.SetStateAction<Date>>
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
  const [currentSelectedDate, setCurrentSelectedDate] = useState(new Date())
  const currentAccount = useAccountContext()
  const [timezone, setTimezone] = useState<string>(
    currentAccount?.preferences?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [decryptedMeeting, setDecryptedMeeting] = useState<
    MeetingDecrypted | undefined
  >(undefined)
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>(
    MeetingProvider.HUDDLE
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
  >([MeetingPermissions.SEE_GUEST_LIST])
  const [isScheduling, setIsScheduling] = useState(false)

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
  }

  return (
    <ScheduleStateContext.Provider value={value}>
      {children}
    </ScheduleStateContext.Provider>
  )
}
