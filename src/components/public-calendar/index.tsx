/* eslint-disable react-hooks/exhaustive-deps */
import { Box, Container, Flex, Text } from '@chakra-ui/layout'
import {
  Button,
  HStack,
  Spinner,
  useColorModeValue,
  useMediaQuery,
  VStack,
} from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import {
  addMinutes,
  addMonths,
  endOfMonth,
  format,
  Interval,
  isFuture,
  startOfMonth,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { Account, MeetingType } from '@/types/Account'
import { AccountNotifications } from '@/types/AccountNotifications'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { MeetingReminders } from '@/types/common'
import {
  DBSlot,
  GroupMeetingRequest,
  GroupMeetingType,
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import {
  getAccount,
  getBusySlots,
  getMeeting,
  getNotificationSubscriptions,
  listConnectedCalendars,
} from '@/utils/api_helper'
import {
  dateToHumanReadable,
  getAccountDomainUrl,
  scheduleMeeting,
  updateGuestMeeting,
} from '@/utils/calendar_manager'
import { Option } from '@/utils/constants/select'
import { parseMonthAvailabilitiesToDate, timezones } from '@/utils/date_helper'
import {
  GateConditionNotValidError,
  GoogleServiceUnavailable,
  Huddle01ServiceUnavailable,
  InvalidURL,
  MeetingCreationError,
  MeetingWithYourselfError,
  MultipleSchedulersError,
  TimeNotAvailableError,
  UrlCreationError,
  ZoomServiceUnavailable,
} from '@/utils/errors'
import { saveMeetingsScheduled } from '@/utils/storage'
import { getAccountDisplayName } from '@/utils/user_manager'

import { Head } from '../Head'
import MeetingScheduledDialog from '../meeting/MeetingScheduledDialog'
import MeetSlotPicker from '../MeetSlotPicker'
import ProfileInfo from '../profile/ProfileInfo'
import TokenGateValidation from '../token-gate/TokenGateValidation'
import GroupScheduleCalendarProfile from './GroupScheduleCalendarProfile'

interface InternalSchedule {
  scheduleType: SchedulingType
  startTime: Date
  guestEmail: string
  name?: string
  title?: string
  content?: string
  meetingUrl?: string
}

interface PublicCalendarProps {
  url: string
  account?: Account
  teamMeetingRequest?: GroupMeetingRequest
  serverSideRender: boolean
}

export enum CalendarType {
  REGULAR,
  TEAM,
}
const tzs = timezones.map(tz => {
  return {
    value: String(tz.tzCode),
    label: tz.name,
  }
})
const PublicCalendar: React.FC<PublicCalendarProps> = ({
  url,
  account,
  teamMeetingRequest,
  serverSideRender,
}) => {
  const [isSSR, setIsSSR] = useState(serverSideRender)
  useEffect(() => {
    setIsSSR(false)
  }, [])
  const { currentAccount, logged } = useContext(AccountContext)
  const [timezone, setTimezone] = useState<Option<string>>(
    tzs.find(
      val =>
        val.value ===
        (currentAccount?.preferences?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone)
    ) || tzs[0]
  )
  const router = useRouter()

  const calendarType =
    account !== undefined ? CalendarType.REGULAR : CalendarType.TEAM

  const [schedulingType, setSchedulingType] = useState(SchedulingType.REGULAR)
  const [unloggedSchedule, setUnloggedSchedule] = useState(
    null as InternalSchedule | null
  )
  const [groupAccounts, setTeamAccounts] = useState<Account[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<Date | undefined>(undefined)
  const [selectedType, setSelectedType] = useState({} as MeetingType)
  const [isPrivateType, setPrivateType] = useState(false)
  const [isGateValid, setIsGateValid] = useState<boolean | undefined>(undefined)
  const [readyToSchedule, setReadyToSchedule] = useState(false)
  const [reset, setReset] = useState(false)
  const [lastScheduledMeeting, setLastScheduledMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )
  const bgColor = useColorModeValue('white', 'neutral.900')
  const [notificationsSubs, setNotificationSubs] = useState(0)
  const [hasConnectedCalendar, setHasConnectedCalendar] = useState(false)
  const [rescheduleSlotId, setRescheduleSlotId] = useState<string | undefined>(
    undefined
  )
  const { openConnection } = useContext(OnboardingModalContext)
  const [rescheduleSlot, setRescheduleSlot] = useState<DBSlot | undefined>(
    undefined
  )
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState<Interval[]>([])
  const [selfAvailableSlots, setSelfAvailableSlots] = useState<Interval[]>([])
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [checkedSelfSlots, setCheckedSelfSlots] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [busySlots, setBusySlots] = useState<Interval[]>([])
  const [selfBusySlots, setSelfBusySlots] = useState<Interval[]>([])
  const toast = useToast()
  const [cachedRange, setCachedRange] = useState<{
    startDate: Date
    endDate: Date
  } | null>(null)
  const getSelfAvailableSlots = async () => {
    if (currentAccount) {
      const startDate = startOfMonth(currentMonth)
      const endDate = addMonths(endOfMonth(currentMonth), 2)
      let busySlots: Interval[] = []
      try {
        busySlots = await getBusySlots(
          currentAccount?.address,
          startDate,
          endDate
        )
      } catch (error) {}
      const availabilities = parseMonthAvailabilitiesToDate(
        currentAccount?.preferences?.availabilities || [],
        startDate,
        endDate,
        currentAccount?.preferences?.timezone || 'UTC'
      )
      setSelfAvailableSlots(availabilities)
      setSelfBusySlots(busySlots)
      setCheckedSelfSlots(true)
    }
  }
  const getAvailableSlots = async (skipCache = false) => {
    if (
      !skipCache &&
      cachedRange &&
      currentMonth >= cachedRange.startDate &&
      currentMonth <= cachedRange.endDate
    ) {
      return
    }
    void getSelfAvailableSlots()
    setCheckingSlots(true)
    const startDate = startOfMonth(currentMonth)
    const endDate = addMonths(endOfMonth(currentMonth), 2)
    let busySlots: Interval[] = []
    if (!account?.address) return
    try {
      busySlots = await getBusySlots(account?.address, startDate, endDate)
    } catch (error) {}
    const availabilities = parseMonthAvailabilitiesToDate(
      account?.preferences?.availabilities || [],
      startDate,
      endDate,
      account?.preferences?.timezone || 'UTC'
    )
    setBusySlots(busySlots)
    setAvailableSlots(availabilities)
    setCachedRange({ startDate, endDate })
    setCheckingSlots(false)
  }
  useEffect(() => {
    if (account?.preferences?.availabilities) {
      void getAvailableSlots()
    }
  }, [account?.preferences?.availabilities, currentMonth])

  const hydrateTeamAccounts = async () => {
    let accountstoFetch: string[] = []
    if (teamMeetingRequest!.team_structure.type === GroupMeetingType.TEAM) {
      // to be implemented
    } else {
      accountstoFetch =
        teamMeetingRequest!.team_structure.participants_accounts!
    }
    const accounts: Account[] = []
    await Promise.all(
      accountstoFetch.map(async account =>
        accounts.push(await getAccount(account))
      )
    )
    setTeamAccounts(accounts)
  }
  const [isMobile] = useMediaQuery(['(max-width: 800px)'], {
    ssr: true,
    fallback: false, // return false on the server, and re-evaluate on the client side
  })

  useEffect(() => {
    if (calendarType === CalendarType.REGULAR) {
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = account?.preferences?.availableTypes
        ?.filter(type => !type.deleted)
        ?.find(t => t.url === typeOnRoute)
      setPrivateType(!!type?.private)
    }
  }, [])

  useEffect(() => {
    if (calendarType === CalendarType.TEAM) {
      void hydrateTeamAccounts()
    }
  }, [calendarType])

  useEffect(() => {
    if (calendarType === CalendarType.REGULAR) {
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = account?.preferences?.availableTypes
        .filter(type => !type.deleted)
        .find(t => t.url === typeOnRoute)
      setSelectedType(
        (type || account?.preferences?.availableTypes?.[0] || {}) as MeetingType
      )
      void getAvailableSlots()
      setRescheduleSlotId(router.query.slot as string | undefined)
    }
  }, [account, router.query.address, router.query.slot])

  useEffect(() => {
    void getSlotInfo()
  }, [rescheduleSlotId])

  const getSlotInfo = async () => {
    if (rescheduleSlotId) {
      const slot = await getMeeting(rescheduleSlotId!)
      if (slot) {
        if (slot.account_address !== account!.address) {
          await router.push('/404')
        } else {
          setRescheduleSlot(slot)
        }
      }
    }
  }

  const fetchNotificationSubscriptions = async () => {
    let subs: AccountNotifications | null = null
    let connectedCalendars: ConnectedCalendarCore[] = []
    subs = (await getNotificationSubscriptions()) || {}
    connectedCalendars = (await listConnectedCalendars()) || []

    const validCals = connectedCalendars
      .filter(cal => cal.provider !== TimeSlotSource.MWW)
      .some(cal => cal.calendars.some(_cal => _cal.enabled))

    setNotificationSubs(subs.notification_types?.length)
    setHasConnectedCalendar(validCals)
  }

  useEffect(() => {
    if (logged) {
      void getSelfAvailableSlots()
      void fetchNotificationSubscriptions()

      if (unloggedSchedule) {
        void confirmSchedule(
          unloggedSchedule.scheduleType,
          unloggedSchedule.startTime,
          unloggedSchedule.guestEmail,
          unloggedSchedule.name,
          unloggedSchedule.content,
          unloggedSchedule.meetingUrl,
          unloggedSchedule.title
        )
      }
    }
  }, [currentAccount])

  const confirmSchedule = async (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string,
    emailToSendReminders?: string,
    title?: string,
    otherParticipants?: Array<ParticipantInfo>,
    meetingProvider?: MeetingProvider,
    meetingReminders?: Array<MeetingReminders>,
    meetingRepeat?: MeetingRepeat
  ): Promise<boolean> => {
    setUnloggedSchedule(null)
    setIsScheduling(true)

    const start = zonedTimeToUtc(
      startTime,
      timezone.value || Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    const end = addMinutes(
      new Date(start),
      CalendarType.REGULAR === calendarType
        ? selectedType.duration
        : teamMeetingRequest!.duration_in_minutes
    )

    if (scheduleType !== SchedulingType.GUEST && !name) {
      name = getAccountDisplayName(currentAccount!)
    }

    const participants: ParticipantInfo[] = [...(otherParticipants || [])]

    if (CalendarType.REGULAR === calendarType) {
      participants.push({
        account_address: account!.address,
        name: '',
        type: ParticipantType.Owner,
        status: ParticipationStatus.Accepted,
        slot_id: '',
        meeting_id: '',
      })
    } else {
      let alreadyAdded = ''
      if (
        teamMeetingRequest?.team_structure.participants_accounts?.includes(
          teamMeetingRequest!.owner
        )
      ) {
        participants.push({
          account_address: teamMeetingRequest!.owner,
          name: '',
          type: ParticipantType.Owner,
          status: ParticipationStatus.Pending,
          slot_id: '',
          meeting_id: '',
        })
        alreadyAdded = teamMeetingRequest!.owner
      } else {
        participants.push({
          account_address:
            teamMeetingRequest!.team_structure.participants_accounts![0],
          name: '',
          type: ParticipantType.Owner,
          status: ParticipationStatus.Pending,
          slot_id: '',
          meeting_id: '',
        })
        alreadyAdded =
          teamMeetingRequest!.team_structure.participants_accounts![0]
      }

      for (const address of teamMeetingRequest!.team_structure
        .participants_accounts!) {
        if (address !== alreadyAdded) {
          participants.push({
            account_address: address,
            name: '',
            type: ParticipantType.Invitee,
            status: ParticipationStatus.Pending,
            slot_id: '',
            meeting_id: '',
          })
        }
      }
    }

    setSchedulingType(scheduleType)

    participants.push({
      account_address: currentAccount?.address,
      ...(scheduleType === SchedulingType.GUEST && {
        guest_email: guestEmail!,
      }),
      name,
      type: ParticipantType.Scheduler,
      status: ParticipationStatus.Accepted,
      slot_id: '',
      meeting_id: '',
    })

    try {
      let meeting: MeetingDecrypted

      if (rescheduleSlotId) {
        // This is a reschedule operation for a guest
        meeting = await updateGuestMeeting(
          rescheduleSlotId,
          start,
          end,
          participants,
          meetingProvider || MeetingProvider.HUDDLE,
          content,
          meetingUrl,
          title,
          meetingReminders,
          meetingRepeat
        )
      } else {
        // This is a new meeting creation
        meeting = await scheduleMeeting(
          false,
          scheduleType,
          'no_type',
          start,
          end,
          participants,
          meetingProvider || MeetingProvider.HUDDLE,
          currentAccount,
          content,
          meetingUrl,
          emailToSendReminders,
          title,
          meetingReminders,
          meetingRepeat
        )
      }

      await getAvailableSlots(true)
      currentAccount && saveMeetingsScheduled(currentAccount!.address)
      currentAccount && (await fetchNotificationSubscriptions())

      setLastScheduledMeeting(meeting)
      logEvent('Scheduled a meeting', {
        fromPublicCalendar: true,
        participantsSize: meeting.participants.length,
      })
      setIsScheduling(false)
      return true
    } catch (e) {
      if (e instanceof MeetingWithYourselfError) {
        toast({
          title: "Ops! Can't do that",
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof TimeNotAvailableError) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'The selected time is not available anymore',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GateConditionNotValidError) {
        toast({
          title: 'Failed to schedule meeting',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingCreationError) {
        toast({
          title: 'Failed to schedule meeting',
          description:
            'There was an issue scheduling your meeting. Please get in touch with us through support@meetwithwallet.xyz',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MultipleSchedulersError) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'A meeting must have only one scheduler',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof Huddle01ServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Huddle01 seems to be offline. Please select a custom meeting link, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof ZoomServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Zoom seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GoogleServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Google seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof UrlCreationError) {
        toast({
          title: 'Failed to schedule meeting',
          description:
            'There was an issue generating a meeting url for your meeting. try using a different location',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      }
    }
    setIsScheduling(false)
    return false
  }

  const _onClose = () => {
    setReset(true)
    setLastScheduledMeeting(undefined)
    setTimeout(() => setReset(false), 200)
  }

  const changeType = (typeId: string) => {
    const type = account?.preferences?.availableTypes
      ?.filter(type => !type.deleted)
      ?.find(t => t.id === typeId)
    if (!type) return
    if (!type.scheduleGate) {
      setIsGateValid(undefined)
    }
    setSelectedType(type)
    void router.push(
      `/${getAccountDomainUrl(account!)}/${type.url}`,
      undefined,
      {
        shallow: true,
      }
    )
  }

  const textToDisplayDateRange = () => {
    if (calendarType === CalendarType.TEAM) {
      if (teamMeetingRequest?.range_end) {
        return `Pick a time between ${format(
          new Date(teamMeetingRequest!.range_start),
          'PPPpp'
        )} and ${format(new Date(teamMeetingRequest!.range_end), 'PPPpp')}`
      } else if (isFuture(new Date(teamMeetingRequest!.range_start))) {
        return `Pick a time after ${format(
          new Date(teamMeetingRequest!.range_start),
          'PPPpp'
        )}`
      }
    }
    return null
  }

  const dateRangeText = textToDisplayDateRange()

  return (
    <>
      <HeadMeta
        account={account}
        teamMeetingRequest={teamMeetingRequest}
        url={url}
      />
      <VStack mb={36} gap={1}>
        <Container
          bg={lastScheduledMeeting ? 'transparent' : bgColor}
          maxW="95%"
          mt={{ md: 48, base: 60 }}
          flex={1}
          width={
            readyToSchedule || lastScheduledMeeting ? 'fit-content' : '90%'
          }
          pb={lastScheduledMeeting ? 0 : 6}
          marginX="auto"
          borderRadius="lg"
          transitionProperty="width"
          transitionDuration="2s"
          transitionTimingFunction="ease-in-out"
          position={'relative'}
        >
          {!lastScheduledMeeting ? (
            <Box>
              <Flex wrap="wrap">
                <Box
                  flex="1"
                  minW={{ base: '100%', md: '500px' }}
                  maxW={{ md: '250px', base: '100%' }}
                  px={{ md: 8, base: 0 }}
                  py={8}
                >
                  {calendarType === CalendarType.REGULAR ? (
                    <ProfileInfo
                      calendarType={calendarType}
                      isPrivateType={isPrivateType}
                      account={account!}
                      changeType={changeType}
                      selectedType={selectedType}
                      rescheduleSlotId={rescheduleSlotId}
                      readyToSchedule={readyToSchedule}
                      selectedTime={selectedTime}
                      selectedDay={selectedDay}
                      isMobile={isMobile}
                    />
                  ) : (
                    <GroupScheduleCalendarProfile
                      teamAccounts={groupAccounts}
                    />
                  )}

                  {CalendarType.REGULAR === calendarType &&
                  !rescheduleSlotId &&
                  selectedType.scheduleGate &&
                  selectedType.scheduleGate !== 'No gate' ? (
                    <TokenGateValidation
                      gate={selectedType.scheduleGate}
                      targetAccount={account!}
                      userAccount={currentAccount!}
                      setIsGateValid={setIsGateValid}
                      isGateValid={isGateValid!}
                    />
                  ) : null}
                  {dateRangeText && (
                    <Text textAlign="center" mt={4}>
                      {dateRangeText}
                    </Text>
                  )}

                  {calendarType === CalendarType.REGULAR &&
                    rescheduleSlotId && (
                      <RescheduleInfoBox
                        loading={!rescheduleSlot}
                        slot={rescheduleSlot}
                      />
                    )}
                </Box>

                {isSSR ? null : (
                  <Box flex="1" width="100%" p={{ md: 8 }}>
                    <MeetSlotPicker
                      reset={reset}
                      onMonthChange={setCurrentMonth}
                      onTimeChange={setSelectedTime}
                      isMobile={isMobile}
                      preferences={account?.preferences}
                      onDayChange={setSelectedDay}
                      onSchedule={confirmSchedule}
                      willStartScheduling={willStartScheduling => {
                        setReadyToSchedule(willStartScheduling)
                      }}
                      isSchedulingExternal={isScheduling}
                      slotDurationInMinutes={
                        CalendarType.REGULAR === calendarType
                          ? selectedType.duration
                          : teamMeetingRequest!.duration_in_minutes
                      }
                      selectedType={selectedType}
                      checkingSlots={checkingSlots}
                      showSelfAvailability={checkedSelfSlots}
                      isGateValid={isGateValid!}
                      notificationsSubs={notificationsSubs}
                      availableSlots={availableSlots}
                      selfAvailableSlots={selfAvailableSlots}
                      busySlots={busySlots}
                      selfBusySlots={selfBusySlots}
                      timezone={timezone}
                      setTimezone={setTimezone}
                    />
                  </Box>
                )}
              </Flex>
            </Box>
          ) : isSSR ? null : (
            <Flex justify="center">
              <MeetingScheduledDialog
                participants={lastScheduledMeeting!.participants}
                schedulerAccount={currentAccount!}
                scheduleType={schedulingType}
                meeting={lastScheduledMeeting}
                accountNotificationSubs={notificationsSubs}
                hasConnectedCalendar={hasConnectedCalendar}
                reset={_onClose}
              />
            </Flex>
          )}
        </Container>
        {!logged && (
          <HStack
            fontSize={{
              sm: '14px',
              md: '16px',
            }}
            maxW="90%"
            textAlign="center"
          >
            <Text>
              Have an account with us already?{' '}
              <Text
                display="inline"
                color={'primary.400'}
                textDecoration="underline"
                textUnderlineOffset={2}
                onClick={() => openConnection(undefined, false)}
                cursor={'pointer'}
              >
                Sign in
              </Text>{' '}
              to see your availability
            </Text>
          </HStack>
        )}
      </VStack>
    </>
  )
}

const RescheduleInfoBox: React.FC<{
  loading: boolean
  slot?: DBSlot
}> = ({ loading, slot }) => {
  const router = useRouter()

  const handleCancel = () => {
    // Remove the slot parameter from the URL to go back to regular calendar view
    const { slot, ...queryParams } = router.query
    router.push(
      {
        pathname: router.pathname,
        query: queryParams,
      },
      undefined,
      { shallow: true }
    )
  }

  return (
    <Flex p={4} mt={4}>
      {loading ? (
        <Spinner margin="auto" />
      ) : (
        <Box>
          <Text>
            <b>Former time</b>
          </Text>
          <Text>
            {dateToHumanReadable(
              new Date(slot!.start),
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              false
            )}
          </Text>
          <Text>{Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>

          <Text mt={2}>
            Select another time for the meeting, or{' '}
            <Button variant="link" colorScheme="primary" onClick={handleCancel}>
              cancel
            </Button>{' '}
            it
          </Text>
        </Box>
      )}
    </Flex>
  )
}

const HeadMeta: React.FC<{
  account?: Account
  teamMeetingRequest?: GroupMeetingRequest
  url: string
}> = ({ account, teamMeetingRequest, url }) => {
  const title = account
    ? `${getAccountDisplayName(
        account
      )}'s calendar on Meetwith - Schedule a meeting in #web3 style`
    : teamMeetingRequest?.title ||
      'Meetwith - Schedule a meeting in #web3 style'

  const description =
    account?.preferences?.description ||
    'Schedule a meeting by simply connecting your web3 wallet, or use your email and schedule as a guest.'

  return <Head title={title} description={description} url={url} />
}
export default PublicCalendar
