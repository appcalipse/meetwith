import { useDisclosure } from '@chakra-ui/hooks'
import { Box, Container, Flex, Text } from '@chakra-ui/layout'
import { Select } from '@chakra-ui/select'
import { useToast } from '@chakra-ui/toast'
import * as Sentry from '@sentry/nextjs'
import {
  addMinutes,
  endOfMonth,
  format,
  Interval,
  isAfter,
  isBefore,
  isEqual,
  isFuture,
  startOfMonth,
  subMinutes,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { Account, MeetingType } from '@/types/Account'
import { ConditionRelation } from '@/types/common'
import {
  GroupMeetingRequest,
  GroupMeetingType,
  MeetingDecrypted,
  SchedulingType,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import {
  fetchBusySlotsForMultipleAccounts,
  getAccount,
  getBusySlots,
  getNotificationSubscriptions,
} from '@/utils/api_helper'
import {
  durationToHumanReadable,
  getAccountDomainUrl,
  scheduleMeeting,
} from '@/utils/calendar_manager'
import {
  GateConditionNotValidError,
  InvalidURL,
  MeetingCreationError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from '@/utils/errors'
import { isSlotAvailable } from '@/utils/slots.helper'
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
  content?: string
  meetingUrl?: string
}

interface PublicCalendarProps {
  url: string
  account?: Account
  teamMeetingRequest?: GroupMeetingRequest
  serverSideRender: boolean
}

enum CalendarType {
  REGULAR,
  TEAM,
}
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

  const router = useRouter()

  const { currentAccount, logged } = useContext(AccountContext)

  const calendarType =
    account !== undefined ? CalendarType.REGULAR : CalendarType.TEAM

  const [schedulingType, setSchedulingType] = useState(SchedulingType.REGULAR)
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [checkedSelfSlots, setCheckedSelfSlots] = useState(false)
  const [unloggedSchedule, setUnloggedSchedule] = useState(
    null as InternalSchedule | null
  )
  const [groupAccounts, setTeamAccounts] = useState<Account[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [busySlots, setBusyslots] = useState([] as Interval[])
  const [selfBusySlots, setSelfBusyslots] = useState([] as Interval[])
  const [selectedType, setSelectedType] = useState({} as MeetingType)
  const [isPrivateType, setPrivateType] = useState(false)
  const [isGateValid, setIsGateValid] = useState<boolean | undefined>(undefined)
  const [isScheduling, setIsScheduling] = useState(false)
  const [readyToSchedule, setReadyToSchedule] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [reset, setReset] = useState(false)
  const [lastScheduledMeeting, setLastScheduledMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )
  const [notificationsSubs, setNotificationSubs] = useState(0)

  const toast = useToast()

  const hidrateTeamAccounts = async () => {
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

  useEffect(() => {
    if (calendarType === CalendarType.REGULAR) {
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = account!
        .preferences!.availableTypes.filter(type => !type.deleted)
        .find(t => t.url === typeOnRoute)
      setPrivateType(!!type?.private)
    }
  }, [])

  useEffect(() => {
    if (calendarType === CalendarType.TEAM) {
      hidrateTeamAccounts()
    }
  }, [calendarType])

  useEffect(() => {
    if (calendarType === CalendarType.REGULAR) {
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = account!
        .preferences!.availableTypes.filter(type => !type.deleted)
        .find(t => t.url === typeOnRoute)
      setSelectedType(type || account!.preferences!.availableTypes[0])
      updateSlots()
    }
  }, [account, router.query.address])

  useEffect(() => {
    logged && updateSelfSlots()
    if (logged && unloggedSchedule) {
      confirmSchedule(
        unloggedSchedule.scheduleType,
        unloggedSchedule.startTime,
        unloggedSchedule.guestEmail,
        unloggedSchedule.name,
        unloggedSchedule.content,
        unloggedSchedule.meetingUrl
      )
    }
  }, [currentAccount])

  const fetchNotificationSubscriptions = async () => {
    const subs = await getNotificationSubscriptions()
    setNotificationSubs(subs.notification_types.length)
  }

  const confirmSchedule = async (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string
  ): Promise<boolean> => {
    setUnloggedSchedule(null)
    setIsScheduling(true)

    const start = zonedTimeToUtc(
      startTime,
      Intl.DateTimeFormat().resolvedOptions().timeZone
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

    const participants: ParticipantInfo[] = []

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

    if (scheduleType === SchedulingType.GUEST) {
      participants.push({
        guest_email: guestEmail!,
        name,
        type: ParticipantType.Scheduler,
        status: ParticipationStatus.Accepted,
        slot_id: '',
        meeting_id: '',
      })
    }

    try {
      const meeting = await scheduleMeeting(
        scheduleType,
        'no_type',
        start,
        end,
        participants,
        currentAccount,
        content,
        meetingUrl
      )
      await updateSlots()
      currentAccount && saveMeetingsScheduled(currentAccount!.address)
      currentAccount && (await fetchNotificationSubscriptions())
      setLastScheduledMeeting(meeting)
      logEvent('Scheduled a meeting', {
        fromPublicCalendar: true,
        participantsSize: meeting.participants.length,
      })
      onOpen()
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
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else throw e
    }
    setIsScheduling(false)
    return false
  }

  const _onClose = () => {
    setReset(true)
    onClose()
    setTimeout(() => setReset(false), 200)
  }

  const updateSelfSlots = async () => {
    if (currentAccount) {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      try {
        const busySlots = await getBusySlots(
          currentAccount!.address,
          monthStart,
          monthEnd
        )
        setSelfBusyslots(busySlots)
        setCheckedSelfSlots(true)
      } catch (e) {}
    }
  }

  const updateSlots = async () => {
    updateSelfSlots()
    setCheckingSlots(true)
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    try {
      if (calendarType === CalendarType.REGULAR) {
        const busySlots = await getBusySlots(
          account!.address,
          monthStart,
          monthEnd
        )
        setBusyslots(busySlots)
      } else {
        let accounts: string[] = []
        if (teamMeetingRequest!.team_structure.type === GroupMeetingType.TEAM) {
          // to be implemented
        } else {
          accounts = teamMeetingRequest!.team_structure.participants_accounts!
        }

        const busySlots = await fetchBusySlotsForMultipleAccounts(
          accounts,
          monthStart,
          monthEnd,
          teamMeetingRequest!.team_structure.relationship
        )
        setBusyslots(busySlots)
      }
    } catch (e) {
      Sentry.captureException(e)
      toast({
        title: 'Ops!',
        description: 'Something went wrong :(',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      router.push('/404')
      return
    }

    setCheckingSlots(false)
  }

  useEffect(() => {
    updateSlots()
  }, [currentMonth])

  const changeType = (typeId: string) => {
    const type = account!
      .preferences!.availableTypes.filter(type => !type.deleted)
      .find(t => t.id === typeId)!
    if (!type.scheduleGate) {
      setIsGateValid(undefined)
    }
    setSelectedType(type)
    router.push(`/${getAccountDomainUrl(account!)}/${type.url}`, undefined, {
      shallow: true,
    })
  }

  const validateSlot = (slot: Date): boolean => {
    if (calendarType === CalendarType.REGULAR) {
      return isSlotAvailable(
        selectedType.duration,
        selectedType.minAdvanceTime,
        slot,
        busySlots,
        account!.preferences!.availabilities,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        account!.preferences!.timezone
      )
    } else {
      if (
        !isAfter(slot, new Date(teamMeetingRequest!.range_start)) &&
        !isEqual(slot, new Date(teamMeetingRequest!.range_start))
      ) {
        return false
      }

      if (
        teamMeetingRequest!.range_end &&
        !isBefore(
          slot,
          subMinutes(
            new Date(teamMeetingRequest!.range_end),
            teamMeetingRequest!.duration_in_minutes
          )
        ) &&
        !isEqual(
          slot,
          subMinutes(
            new Date(teamMeetingRequest!.range_end),
            teamMeetingRequest!.duration_in_minutes
          )
        )
      ) {
        return false
      }

      if (
        teamMeetingRequest!.team_structure.relationship ===
        ConditionRelation.AND
      ) {
        for (const eachAccount of groupAccounts) {
          if (
            !isSlotAvailable(
              teamMeetingRequest!.duration_in_minutes,
              0,
              slot,
              busySlots,
              eachAccount.preferences!.availabilities,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              eachAccount!.preferences!.timezone
            )
          ) {
            return false
          }
        }
        return true
      } else {
        for (const eachAccount of groupAccounts) {
          if (
            isSlotAvailable(
              teamMeetingRequest!.duration_in_minutes,
              0,
              slot,
              busySlots,
              eachAccount.preferences!.availabilities,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              eachAccount!.preferences!.timezone
            )
          ) {
            return true
          }
        }
        return false
      }
    }
  }

  const textToDisplayDateRange = () => {
    if (calendarType === CalendarType.TEAM) {
      if (teamMeetingRequest?.range_end) {
        return `Pick a slot between ${format(
          new Date(teamMeetingRequest!.range_start),
          'PPPpp'
        )} and ${format(new Date(teamMeetingRequest!.range_end), 'PPPpp')}`
      } else if (isFuture(new Date(teamMeetingRequest!.range_start))) {
        return `Pick a slot after ${format(
          new Date(teamMeetingRequest!.range_start),
          'PPPpp'
        )}`
      }
    }
    return null
  }

  const selfAvailabilityCheck = (slot: Date): boolean => {
    let duration
    let minAdvanceTime

    if (calendarType === CalendarType.REGULAR) {
      duration = selectedType.duration
      minAdvanceTime = selectedType.minAdvanceTime
    } else {
      duration = teamMeetingRequest!.duration_in_minutes
      minAdvanceTime = 0
    }

    return isSlotAvailable(
      duration,
      minAdvanceTime,
      slot,
      selfBusySlots,
      currentAccount!.preferences!.availabilities,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentAccount!.preferences!.timezone
    )
  }

  const dateRangeText = textToDisplayDateRange()

  return (
    <>
      <HeadMeta
        account={account}
        teamMeetingRequest={teamMeetingRequest}
        url={url}
      />
      <Container maxW="7xl" mt={8} flex={1}>
        <Box>
          <Flex wrap="wrap" justifyContent="center">
            <Box
              flex="1"
              minW={{ base: '300px', md: '500px' }}
              maxW="600px"
              p={8}
            >
              {calendarType === CalendarType.REGULAR ? (
                <ProfileInfo account={account!} />
              ) : (
                <GroupScheduleCalendarProfile teamAccounts={groupAccounts} />
              )}
              {calendarType === CalendarType.REGULAR && (
                <Select
                  disabled={readyToSchedule}
                  placeholder="Select option"
                  mt={8}
                  value={selectedType.id}
                  onChange={e => e.target.value && changeType(e.target.value)}
                >
                  {account!
                    .preferences!.availableTypes.filter(
                      type => !type.deleted && (!type.private || isPrivateType)
                    )
                    .map(type => (
                      <option key={type.id} value={type.id}>
                        {type.title ? `${type.title} - ` : ''}
                        {durationToHumanReadable(type.duration)}
                      </option>
                    ))}
                </Select>
              )}
              {selectedType.description && (
                <Text p={2}>{selectedType.description}</Text>
              )}
              {CalendarType.REGULAR === calendarType &&
              selectedType.scheduleGate ? (
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
            </Box>
            {isSSR ? null : (
              <Box flex="2" p={8}>
                <MeetSlotPicker
                  reset={reset}
                  onMonthChange={(day: Date) => setCurrentMonth(day)}
                  availabilityInterval={
                    teamMeetingRequest
                      ? {
                          start: new Date(teamMeetingRequest.range_start),
                          end: new Date(
                            teamMeetingRequest.range_end || '2999-01-01'
                          ),
                        }
                      : undefined
                  }
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
                  checkingSlots={checkingSlots}
                  timeSlotAvailability={validateSlot}
                  selfAvailabilityCheck={selfAvailabilityCheck}
                  showSelfAvailability={checkedSelfSlots}
                  isGateValid={isGateValid!}
                />
              </Box>
            )}
          </Flex>
          {isSSR
            ? null
            : lastScheduledMeeting && (
                <MeetingScheduledDialog
                  participants={lastScheduledMeeting!.participants}
                  schedulerAccount={currentAccount!}
                  scheduleType={schedulingType}
                  meeting={lastScheduledMeeting}
                  accountNotificationSubs={notificationsSubs}
                  isOpen={isOpen}
                  onClose={_onClose}
                />
              )}
        </Box>
      </Container>
    </>
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
      )}'s calendar on Meet with Wallet - Schedule a meeting in #web3 style`
    : teamMeetingRequest?.title ||
      'Meet with Wallet - Schedule a meeting in #web3 style'

  const description =
    account?.preferences?.description ||
    'Schedule a meeting by simply connecting your web3 wallet, or use your email and schedule as a guest.'

  return <Head title={title} description={description} url={url} />
}
export default PublicCalendar
