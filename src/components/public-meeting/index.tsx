import {
  Container,
  Flex,
  HStack,
  Image,
  Link,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import LogoModalLoading from '@components/Loading/LogoModalLoading'
import MeetingScheduledDialog from '@components/meeting/MeetingScheduledDialog'
import BasePage from '@components/public-meeting/BasePage'
import BookingComponent from '@components/public-meeting/BookingComponent'
import HeadMeta from '@components/public-meeting/HeadMeta'
import PaymentComponent from '@components/public-meeting/PaymentComponent'
import { MeetingType, PublicAccount } from '@meta/Account'
import { AccountNotifications } from '@meta/AccountNotifications'
import { ConnectedCalendarCore } from '@meta/CalendarConnections'
import { MeetingReminders } from '@meta/common'
import {
  ConferenceMeeting,
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
  TimeSlotSource,
} from '@meta/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@meta/ParticipantInfo'
import Sentry from '@sentry/nextjs'
import { logEvent } from '@utils/analytics'
import {
  decodeMeetingGuest,
  getBusySlots,
  getMeetingGuest,
  getNotificationSubscriptions,
  getSlotByMeetingId,
  listConnectedCalendars,
} from '@utils/api_helper'
import {
  PaymentRedirectType,
  PaymentStep,
  PaymentType,
  PublicSchedulingSteps,
  SessionType,
} from '@utils/constants/meeting-types'
import { TimeZoneOption } from '@utils/constants/select'
import { parseMonthAvailabilitiesToDate, timezones } from '@utils/date_helper'
import {
  AllMeetingSlotsUsedError,
  GateConditionNotValidError,
  GoogleServiceUnavailable,
  Huddle01ServiceUnavailable,
  InvalidURL,
  MeetingCreationError,
  MeetingWithYourselfError,
  MultipleSchedulersError,
  ServiceUnavailableError,
  TimeNotAvailableError,
  TransactionIsRequired,
  UrlCreationError,
  ZoomServiceUnavailable,
} from '@utils/errors'
import { mergeLuxonIntervals } from '@utils/quickpoll_helper'
import { getSignature, saveMeetingsScheduled } from '@utils/storage'
import { getAccountDisplayName } from '@utils/user_manager'
import { addMinutes } from 'date-fns'
import { DateTime, Interval } from 'luxon'
import { useRouter } from 'next/router'
import React, { FC, useEffect, useMemo, useRef, useState } from 'react'
import { v4 } from 'uuid'

import useAccountContext from '@/hooks/useAccountContext'
import { AcceptedToken, SupportedChain, supportedChains } from '@/types/chains'
import { Address, Transaction } from '@/types/Transactions'
import {
  decodeMeeting,
  getAccountDomainUrl,
  scheduleMeeting,
  selectDefaultProvider,
  updateMeeting,
  updateMeetingAsGuest,
  updateMeetingConferenceGuest,
} from '@/utils/calendar_manager'
import {
  MeetingNotificationOptions,
  MeetingRepeatOptions,
} from '@/utils/constants/schedule'
import { decryptContent } from '@/utils/cryptography'
import { isJson } from '@/utils/generic_utils'
import { ParticipantInfoForNotification } from '@/utils/notification_helper'
import { useToastHelpers } from '@/utils/toasts'

import Loading from '../Loading'

const tzs = timezones.map(tz => {
  return {
    value: String(tz.tzCode),
    label: tz.name,
    searchKeys: tz.countries,
  }
})
interface IProps {
  account: PublicAccount
  url: string
}
type ConferenceMeetingData = ConferenceMeeting & {
  participants?: Array<ParticipantInfoForNotification>
}
export type RescheduleConferenceData = MeetingDecrypted | ConferenceMeetingData
interface IContext {
  account: PublicAccount
  selectedType: MeetingType | null
  handleSetSelectedType: (
    type: MeetingType,
    step: PublicSchedulingSteps
  ) => Promise<void>
  currentStep: PublicSchedulingSteps
  setCurrentStep: React.Dispatch<React.SetStateAction<PublicSchedulingSteps>>
  paymentType?: PaymentType
  setPaymentType: React.Dispatch<React.SetStateAction<PaymentType | undefined>>
  paymentStep?: PaymentStep
  setPaymentStep: React.Dispatch<React.SetStateAction<PaymentStep | undefined>>
  handleSelectPaymentMethod: (
    type: PaymentType,
    step: PaymentStep
  ) => Promise<void>
  chain?: SupportedChain
  setChain: React.Dispatch<React.SetStateAction<SupportedChain | undefined>>
  token?: AcceptedToken
  setToken: React.Dispatch<React.SetStateAction<AcceptedToken | undefined>>
  handleSetTokenAndChain: (
    token?: AcceptedToken,
    chain?: SupportedChain
  ) => void
  tx?: Address
  handleNavigateToBook: (tx: Address) => void
  schedulingType: SchedulingType
  lastScheduledMeeting: MeetingDecrypted | undefined
  hasConnectedCalendar: boolean
  notificationsSubs: number
  isContact: boolean
  setIsContact: React.Dispatch<React.SetStateAction<boolean>>
  showHeader: boolean
  setShowHeader: React.Dispatch<React.SetStateAction<boolean>>
  isAwaitingScheduling: boolean
  setIsAwaitingScheduling: React.Dispatch<React.SetStateAction<boolean>>
}

interface IScheduleContext {
  currentMonth: Date
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>
  availableSlots: Interval[]
  selfAvailableSlots: Interval[]
  checkingSlots: boolean
  checkedSelfSlots: boolean
  isScheduling: boolean
  pickedDay: Date | null
  setPickedDay: React.Dispatch<React.SetStateAction<Date | null>>
  pickedTime: Date | null
  setPickedTime: React.Dispatch<React.SetStateAction<Date | null>>
  showConfirm: boolean
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>
  selectedMonth: Date
  setSelectedMonth: React.Dispatch<React.SetStateAction<Date>>
  busySlots: Interval[]
  selfBusySlots: Interval[]
  timezone: TimeZoneOption
  setTimezone: React.Dispatch<React.SetStateAction<TimeZoneOption>>
  getAvailableSlots: (skipCache?: boolean) => Promise<void>
  confirmSchedule: (
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
    meetingRepeat?: MeetingRepeat,
    txHash?: Address | null
  ) => Promise<boolean | undefined | null>
  participants: Array<ParticipantInfo>
  setParticipants: React.Dispatch<React.SetStateAction<Array<ParticipantInfo>>>
  meetingProvider: MeetingProvider
  setMeetingProvider: React.Dispatch<React.SetStateAction<MeetingProvider>>
  meetingNotification: Array<{ value: MeetingReminders; label?: string }>
  setMeetingNotification: React.Dispatch<
    React.SetStateAction<Array<{ value: MeetingReminders; label?: string }>>
  >
  meetingRepeat: { value: MeetingRepeat; label: string }
  setMeetingRepeat: React.Dispatch<
    React.SetStateAction<{ value: MeetingRepeat; label: string }>
  >
  content: string
  setContent: React.Dispatch<React.SetStateAction<string>>
  name: string
  setName: React.Dispatch<React.SetStateAction<string>>
  title: string
  setTitle: React.Dispatch<React.SetStateAction<string>>
  doSendEmailReminders: boolean
  setSendEmailReminders: React.Dispatch<React.SetStateAction<boolean>>
  scheduleType: SchedulingType
  setScheduleType: React.Dispatch<React.SetStateAction<SchedulingType>>
  addGuest: boolean
  setAddGuest: React.Dispatch<React.SetStateAction<boolean>>
  guestEmail: string
  setGuestEmail: React.Dispatch<React.SetStateAction<string>>
  userEmail: string
  setUserEmail: React.Dispatch<React.SetStateAction<string>>
  meetingUrl: string
  setMeetingUrl: React.Dispatch<React.SetStateAction<string>>
  isFirstGuestEmailValid: boolean
  setIsFirstGuestEmailValid: React.Dispatch<React.SetStateAction<boolean>>
  isFirstUserEmailValid: boolean
  setIsFirstUserEmailValid: React.Dispatch<React.SetStateAction<boolean>>
  showEmailConfirm: boolean
  setShowEmailConfirm: React.Dispatch<React.SetStateAction<boolean>>
  showTimeNotAvailable: boolean
  setShowTimeNotAvailable: React.Dispatch<React.SetStateAction<boolean>>
  rescheduleSlot?: RescheduleConferenceData
  rescheduleSlotLoading: boolean
  meetingSlotId?: string
  setIsCancelled: React.Dispatch<React.SetStateAction<boolean>>
  setLastScheduledMeeting: React.Dispatch<
    React.SetStateAction<MeetingDecrypted | undefined>
  >
  setShowSlots: React.Dispatch<React.SetStateAction<boolean>>
  showSlots: boolean
}

const baseState: IContext = {
  account: {} as PublicAccount,
  selectedType: null,
  handleSetSelectedType: async () => {},
  currentStep: PublicSchedulingSteps.SELECT_TYPE,
  setCurrentStep: () => {},
  paymentType: undefined,
  setPaymentType: async () => {},
  paymentStep: PaymentStep.SELECT_PAYMENT_METHOD,
  setPaymentStep: async () => {},
  handleSelectPaymentMethod: async () => {},
  chain: undefined,
  setChain: () => {},
  token: undefined,
  setToken: () => {},
  handleSetTokenAndChain: async () => {},
  tx: undefined,
  handleNavigateToBook: () => {},
  schedulingType: SchedulingType.REGULAR,
  lastScheduledMeeting: undefined,
  hasConnectedCalendar: false,
  notificationsSubs: 0,
  isContact: false,
  setIsContact: () => {},
  showHeader: true,
  setShowHeader: () => {},
  isAwaitingScheduling: false,
  setIsAwaitingScheduling: () => {},
}
const scheduleBaseState: IScheduleContext = {
  currentMonth: new Date(),
  setCurrentMonth: () => {},
  availableSlots: [],
  selfAvailableSlots: [],
  checkingSlots: false,
  checkedSelfSlots: false,
  isScheduling: false,
  pickedDay: null,
  setPickedDay: () => {},
  pickedTime: null,
  setPickedTime: () => {},
  showConfirm: false,
  setShowConfirm: () => {},
  selectedMonth: new Date(),
  setSelectedMonth: () => {},
  busySlots: [],
  selfBusySlots: [],
  timezone: { label: '', value: '', searchKeys: [] },
  setTimezone: () => {},
  getAvailableSlots: async () => {},
  confirmSchedule: async () => {
    return false
  },
  participants: [],
  setParticipants: () => {},
  meetingProvider: MeetingProvider.HUDDLE,
  setMeetingProvider: () => {},
  meetingNotification: [],
  setMeetingNotification: () => {},
  meetingRepeat: {
    value: MeetingRepeat['NO_REPEAT'],
    label: 'Does not repeat',
  },
  setMeetingRepeat: () => {},
  content: '',
  setContent: () => {},
  name: '',
  setName: () => {},
  title: '',
  setTitle: () => {},
  doSendEmailReminders: false,
  setSendEmailReminders: () => {},
  scheduleType: SchedulingType.REGULAR,
  setScheduleType: () => {},
  addGuest: false,
  setAddGuest: () => {},
  guestEmail: '',
  setGuestEmail: () => {},
  userEmail: '',
  setUserEmail: () => {},
  meetingUrl: '',
  setMeetingUrl: () => {},
  isFirstGuestEmailValid: true,
  setIsFirstGuestEmailValid: () => {},
  isFirstUserEmailValid: true,
  setIsFirstUserEmailValid: () => {},
  showEmailConfirm: false,
  setShowEmailConfirm: () => {},
  showTimeNotAvailable: false,
  setShowTimeNotAvailable: () => {},
  rescheduleSlot: undefined,
  rescheduleSlotLoading: false,
  meetingSlotId: undefined,
  setIsCancelled: () => {},
  setLastScheduledMeeting: () => {},
  setShowSlots: () => {},
  showSlots: false,
}

export const PublicScheduleContext = React.createContext<IContext>(baseState)
export const ScheduleStateContext =
  React.createContext<IScheduleContext>(scheduleBaseState)
const PublicPage: FC<IProps> = props => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const { query, push, isReady, beforePopState, replace, asPath } = useRouter()
  const [pageGettingReady, setPageGettingReady] = useState(true)
  const [schedulingType, setSchedulingType] = useState(SchedulingType.REGULAR)
  const [isAwaitingScheduling, setIsAwaitingScheduling] = useState(false)
  const [lastScheduledMeeting, setLastScheduledMeeting] = useState<
    MeetingDecrypted | undefined
  >(undefined)
  const { slotId, metadata, slot, conferenceId } = query
  const [hasConnectedCalendar, setHasConnectedCalendar] = useState(false)
  const [meetingSlotId, setMeetingSlotId] = useState<string | undefined>(
    undefined
  )
  const [notificationsSubs, setNotificationSubs] = useState(0)
  const [isContact, setIsContact] = useState(false)
  const selectedType = useMemo(() => {
    if (!isReady) return null
    const meeting_type = Array.isArray(query.address)
      ? query.address.at(-1)
      : undefined
    return (
      props.account?.meetingTypes?.find(t => t.slug === meeting_type) || null
    )
  }, [query.address, props.account, isReady])
  const [token, setToken] = useState<AcceptedToken | undefined>(undefined)
  const [chain, setChain] = useState<SupportedChain | undefined>(undefined)
  const [conferenceActor, setConferenceActor] = useState<
    'account' | 'guest' | undefined
  >(undefined)

  const [paymentType, setPaymentType] = useState<PaymentType | undefined>(
    undefined
  )
  const currentAccount = useAccountContext()

  const [timezone, setTimezone] = useState<TimeZoneOption>(
    tzs.find(
      val =>
        val.value ===
        (currentAccount?.preferences?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone)
    ) || tzs[0]
  )
  const [paymentStep, setPaymentStep] = useState<PaymentStep | undefined>(
    undefined
  )
  const [tx, setTx] = useState<Address | undefined>(undefined)
  const [key, setKey] = useState<string | undefined>(v4())
  const [isCancelled, setIsCancelled] = useState<boolean>(false)
  const [currentStep, setCurrentStep] = useState<PublicSchedulingSteps>(
    PublicSchedulingSteps.SELECT_TYPE
  )
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState<Interval[]>([])
  const [selfAvailableSlots, setSelfAvailableSlots] = useState<Interval[]>([])
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [checkedSelfSlots, setCheckedSelfSlots] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [pickedDay, setPickedDay] = useState<Date | null>(null)
  const [pickedTime, setPickedTime] = useState<Date | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSlots, setShowSlots] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [showTimeNotAvailable, setShowTimeNotAvailable] = useState(false)
  const [busySlots, setBusySlots] = useState<Interval[]>([])
  const [selfBusySlots, setSelfBusySlots] = useState<Interval[]>([])
  const [participants, setParticipants] = useState<Array<ParticipantInfo>>([])
  const [showHeader, setShowHeader] = useState(true)
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>(
    selectDefaultProvider(
      selectedType?.meeting_platforms ||
        props?.account?.preferences?.meetingProviders
    )
  )
  const [meetingNotification, setMeetingNotification] = useState<
    Array<{
      value: MeetingReminders
      label?: string
    }>
  >([])

  const [meetingRepeat, setMeetingRepeat] = useState({
    value: MeetingRepeat['NO_REPEAT'],
    label: 'Does not repeat',
  })
  const [content, setContent] = useState('')
  const [name, setName] = useState(currentAccount?.preferences?.name || '')
  const [title, setTitle] = useState('')
  const [doSendEmailReminders, setSendEmailReminders] = useState(false)
  const [scheduleType, setScheduleType] = useState(
    SchedulingType.REGULAR as SchedulingType
  )
  const [addGuest, setAddGuest] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [isFirstGuestEmailValid, setIsFirstGuestEmailValid] = useState(true)
  const [isFirstUserEmailValid, setIsFirstUserEmailValid] = useState(true)
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)
  const [cachedRange, setCachedRange] = useState<{
    startDate: Date
    endDate: Date
  } | null>(null)
  const toast = useToast()
  const [rescheduleSlot, setRescheduleSlot] = useState<
    RescheduleConferenceData | undefined
  >(undefined)
  const [rescheduleSlotLoading, setRescheduleSlotLoading] =
    useState<boolean>(false)
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const handleNavigateToBook = (tx?: Address) => {
    setTx(tx)
  }

  const handleSetTokenAndChain = (
    token?: AcceptedToken,
    chain?: SupportedChain
  ) => {
    setToken(token)
    setChain(chain)
  }

  const handleSelectPaymentMethod = async (
    type: PaymentType,
    step: PaymentStep
  ) => {
    setPaymentType(type)
    setPaymentStep(step)
  }
  const handleSetSelectedType = async (
    type: MeetingType,
    current_step: PublicSchedulingSteps
  ) => {
    delete query.address
    const queryExists = Object.keys(query).length > 0
    await push({
      pathname: `/${getAccountDomainUrl(props.account!)}/${type.slug}`,
      query: queryExists ? query : undefined,
    })
    if (type?.plan) {
      const baseDetails = supportedChains.find(
        network => network.id === type?.plan?.default_chain_id
      )
      const selectedChain = baseDetails?.chain || undefined
      const acceptedTokens = baseDetails?.acceptableTokens.find(
        token => token.token === type?.plan?.default_token
      )
      handleSetTokenAndChain(
        acceptedTokens?.token || AcceptedToken.USDC,
        selectedChain
      )
      const localStorageTransaction = localStorage.getItem(
        `${type.id}:transaction`
      )
      if (localStorageTransaction) {
        const transaction = isJson(localStorageTransaction)
          ? (JSON.parse(localStorageTransaction) as Transaction)
          : null
        if (transaction) {
          setTx(transaction.transaction_hash as Address)
          setPaymentType(transaction.method)
        }
      }
    }
    setCurrentStep(current_step)
  }

  const getSlotInfo = async () => {
    setRescheduleSlotLoading(true)
    try {
      const baseId = slot || slotId
      const rescheduleSlotId = Array.isArray(baseId) ? baseId[0] : baseId
      if (rescheduleSlotId) {
        const meeting: ConferenceMeetingData = await getMeetingGuest(
          rescheduleSlotId
        )
        if (!meeting) {
          toast({
            title: 'Meeting not found',
            status: 'error',
            description:
              'The meeting you are trying to reschedule was not found.',
          })
          await push('/404')
          return
        }
        if (metadata) {
          const guestParticipants = decryptContent(
            process.env.NEXT_PUBLIC_SERVER_PUB_KEY!,
            Array.isArray(metadata) ? metadata[0] : metadata
          )
          if (guestParticipants) {
            meeting.participants = isJson(guestParticipants)
              ? (JSON.parse(
                  guestParticipants
                ) as Array<ParticipantInfoForNotification>)
              : undefined
          }
          const actor = meeting.participants?.find(
            p => p.slot_id === meetingSlotId
          )
          if (actor) {
            setTimezone(
              tzs.find(
                val =>
                  val.value ===
                  (actor.timezone ||
                    currentAccount?.preferences?.timezone ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone)
              ) || tzs[0]
            )
          }
        }

        setMeetingSlotId(rescheduleSlotId)
        setRescheduleSlot(meeting)
      } else if (conferenceId) {
        let decryptedMeeting: MeetingDecrypted | null = null
        const slot = await getSlotByMeetingId(
          Array.isArray(conferenceId) ? conferenceId[0] : conferenceId
        )
        if (slot?.user_type === 'account') {
          decryptedMeeting = await decodeMeeting(slot, currentAccount!)
          setConferenceActor('account')
        } else if (slot?.user_type === 'guest') {
          decryptedMeeting = await decodeMeetingGuest(slot)
          setConferenceActor('guest')
        }
        if (!decryptedMeeting) {
          toast({
            title: 'Unable to load meeting details',
            status: 'error',
            description:
              'The meeting information could not be retrieved. Please try again.',
          })
          return
        } else {
          setRescheduleSlot(decryptedMeeting || undefined)
          setMeetingSlotId(slot?.id)
        }
      }
    } catch (_error) {
      toast({
        title: 'Unable to load meeting details',
        status: 'error',
        description:
          'The meeting information could not be retrieved. Please try again.',
      })
      setRescheduleSlot(undefined)
    } finally {
      setRescheduleSlotLoading(false)
    }
  }
  useEffect(() => {
    if (!isReady || ongoingRequestRef.current) return
    setPageGettingReady(true)
    if (query.address) {
      const meeting_type = Array.isArray(query.address)
        ? query.address.at(-1)
        : undefined
      if (meeting_type) {
        const type = props.account?.meetingTypes?.find(
          t => t.slug === meeting_type
        )
        if (type) {
          if (type?.type === SessionType.FREE) {
            setShowHeader(false)
          }
          !query.payment_type &&
            setCurrentStep(PublicSchedulingSteps.BOOK_SESSION)
        }
        if (type?.plan) {
          const baseDetails = supportedChains.find(
            network => network.id === type?.plan?.default_chain_id
          )
          const selectedChain = baseDetails?.chain || undefined
          const acceptedTokens = baseDetails?.acceptableTokens.find(
            token => token.token === type?.plan?.default_token
          )
          handleSetTokenAndChain(
            acceptedTokens?.token || AcceptedToken.USDC,
            selectedChain
          )
        }
      }
    }
    if (query.payment_type) {
      if (query.checkoutState === 'cancelled') {
        showErrorToast(
          'Payment cancelled',
          'Your payment was cancelled. Please try again.'
        )
      } else if (query.checkoutState === 'success') {
        showSuccessToast(
          'Payment successful',
          "Payment received, we're verifying it now. You'll be able to schedule once it's confirmed."
        )
      }
      const paymentType = query.payment_type as PaymentType
      setPaymentType(paymentType)
      setPaymentStep(
        query.type === PaymentRedirectType.INVOICE ||
          query.checkoutState === 'cancelled'
          ? PaymentStep.SELECT_PAYMENT_METHOD
          : query.type === PaymentRedirectType.CHECKOUT
          ? PaymentStep.FIAT_PAYMENT_VERIFYING
          : PaymentStep.CONFIRM_PAYMENT
      )
      setCurrentStep(PublicSchedulingSteps.PAY_FOR_SESSION)
      if (paymentType === PaymentType.CRYPTO) {
        const { chain, token } = query as {
          chain?: SupportedChain
          token?: AcceptedToken
        }
        if (typeof chain === 'string' && typeof token === 'string') {
          setChain(chain)
          setToken(token)
        }
      }
    }

    const urlParams = query as Record<string, string | string[]>

    if (urlParams.title && typeof urlParams.title === 'string') {
      setTitle(urlParams.title)
    }
    if (urlParams.name && typeof urlParams.name === 'string') {
      setName(urlParams.name)
    }
    if (urlParams.email && typeof urlParams.email === 'string') {
      setGuestEmail(urlParams.email)
    }
    if (urlParams.user_email && typeof urlParams.user_email === 'string') {
      setUserEmail(urlParams.user_email)
    }
    if (
      urlParams.schedule_type &&
      typeof urlParams.schedule_type === 'string'
    ) {
      const scheduleTypeValue =
        urlParams.schedule_type as unknown as SchedulingType
      if (Object.values(SchedulingType).includes(scheduleTypeValue)) {
        setScheduleType(scheduleTypeValue)
      }
    }
    if (
      urlParams.meeting_provider &&
      typeof urlParams.meeting_provider === 'string'
    ) {
      const providerValue = urlParams.meeting_provider as MeetingProvider
      if (Object.values(MeetingProvider).includes(providerValue)) {
        setMeetingProvider(providerValue)
      }
    }
    if (urlParams.content && typeof urlParams.content === 'string') {
      setContent(urlParams.content)
    }
    if (
      urlParams.participants &&
      typeof urlParams.participants === 'string' &&
      isJson(urlParams.participants)
    ) {
      try {
        const parsedParticipants = JSON.parse(
          urlParams.participants
        ) as ParticipantInfo[]
        setParticipants(parsedParticipants)
      } catch (error) {
        console.warn('Failed to parse participants from URL:', error)
      }
    }
    if (
      urlParams.meeting_notification &&
      typeof urlParams.meeting_notification === 'string'
    ) {
      const notifications = urlParams.meeting_notification
        .split(',')
        .map(value => value as unknown as MeetingReminders)
      setMeetingNotification(
        MeetingNotificationOptions.filter(option =>
          notifications.some(notification => notification == option.value)
        )
      )
    }
    if (
      urlParams.meeting_repeat &&
      typeof urlParams.meeting_repeat === 'string'
    ) {
      const repeatValue = urlParams.meeting_repeat as unknown as MeetingRepeat
      if (Object.values(MeetingRepeat).includes(repeatValue)) {
        setMeetingRepeat(
          MeetingRepeatOptions.find(option => option.value == repeatValue) || {
            value: repeatValue,
            label:
              repeatValue == MeetingRepeat.NO_REPEAT
                ? 'Does not repeat'
                : repeatValue,
          }
        )
      }
    }
    if (
      urlParams.do_send_email_reminders &&
      typeof urlParams.do_send_email_reminders === 'string'
    ) {
      setSendEmailReminders(urlParams.do_send_email_reminders === 'true')
    }
    if (urlParams.picked_time && typeof urlParams.picked_time === 'string') {
      try {
        const pickedTimeDate = new Date(urlParams.picked_time)
        if (!isNaN(pickedTimeDate.getTime())) {
          setPickedTime(pickedTimeDate)
          setCurrentMonth(pickedTimeDate)
          setSelectedMonth(pickedTimeDate)
          setPickedDay(
            DateTime.fromJSDate(pickedTimeDate)
              .setZone(
                (urlParams.timezone as string) ||
                  timezone.value ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone
              )
              .toJSDate()
          )
          setTimezone(
            tzs.find(
              val =>
                val.value ===
                ((urlParams.timezone as string) ||
                  timezone.value ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone)
            ) || tzs[0]
          )
          setShowSlots(true)
          setShowConfirm(true)
        }
      } catch (error) {
        console.warn('Failed to parse picked_time from URL:', error)
      }
    }
    if (urlParams.guest_email && typeof urlParams.guest_email === 'string') {
      setGuestEmail(urlParams.guest_email)
    }
    if (urlParams.meeting_url && typeof urlParams.meeting_url === 'string') {
      setMeetingUrl(urlParams.meeting_url)
    }
    void getSlotInfo()
    setPageGettingReady(false)
  }, [query])
  useEffect(() => {
    void fetchNotificationSubscriptions()
  }, [currentAccount])

  useEffect(() => {
    const handleBackButton = () => {
      if (currentStep !== PublicSchedulingSteps.SELECT_TYPE) {
        switch (currentStep) {
          case PublicSchedulingSteps.BOOK_SESSION:
            if (selectedType?.plan && paymentStep) {
              setCurrentStep(PublicSchedulingSteps.PAY_FOR_SESSION)
              replace(asPath, undefined, { shallow: true })
            } else {
              setCurrentStep(PublicSchedulingSteps.SELECT_TYPE)
            }
            break
          case PublicSchedulingSteps.PAY_FOR_SESSION:
            setCurrentStep(PublicSchedulingSteps.SELECT_TYPE)
            break
        }
        return false
      }

      return true
    }

    beforePopState(handleBackButton)

    return () => {
      beforePopState(() => true)
    }
  }, [currentStep, selectedType, beforePopState])
  const resetState = () => {
    if (
      selectedType?.type !== SessionType.FREE &&
      selectedType?.plan &&
      selectedType?.plan?.no_of_slot <= 1
    ) {
      setPaymentType(undefined)
      setPaymentStep(PaymentStep.SELECT_PAYMENT_METHOD)
      setTx(undefined)
      setSchedulingType(SchedulingType.REGULAR)
    }
    setLastScheduledMeeting(undefined)
    setSelectedMonth(new Date())
    setCurrentMonth(new Date())
    setIsScheduling(false)
    setShowSlots(false)
    setPickedDay(null)
    setPickedTime(null)
    setShowConfirm(false)
    setParticipants([])
    setTitle('')
    setContent('')
    setRescheduleSlot(undefined)
    setMeetingSlotId(undefined)
    setKey(v4())
  }
  const _onClose = async () => {
    await getAvailableSlots(true)
    await push({
      pathname: `/${getAccountDomainUrl(props.account!)}/${selectedType?.slug}`,
    })
    resetState()
  }

  const context: IContext = {
    account: props.account,
    selectedType,
    handleSetSelectedType,
    currentStep: currentStep || PublicSchedulingSteps.SELECT_TYPE,
    setCurrentStep,
    paymentType,
    setPaymentType,
    paymentStep,
    setPaymentStep,
    handleSelectPaymentMethod,
    chain,
    setChain,
    token,
    setToken,
    handleSetTokenAndChain,
    tx,
    handleNavigateToBook,
    schedulingType,
    lastScheduledMeeting,
    hasConnectedCalendar,
    notificationsSubs,
    isContact,
    setIsContact,
    showHeader,
    setShowHeader,
    isAwaitingScheduling,
    setIsAwaitingScheduling,
  }
  const getSelfAvailableSlots = async () => {
    if (currentAccount) {
      const startDate = DateTime.fromJSDate(currentMonth)
        .setZone(timezone.value || 'UTC')
        .startOf('month')
        .toJSDate()
      const endDate = DateTime.fromJSDate(currentMonth)
        .endOf('month')
        .setZone(timezone.value || 'UTC')
        .toJSDate()
      let busySlots: Interval[] = []
      try {
        busySlots = await getBusySlots(
          currentAccount?.address,
          startDate,
          endDate
        ).then(busySlots =>
          busySlots.map(slot =>
            Interval.fromDateTimes(
              DateTime.fromJSDate(new Date(slot.start)),
              DateTime.fromJSDate(new Date(slot.end))
            )
          )
        )
      } catch (error) {
        Sentry.captureException(error, {
          extra: {
            accountAddress: currentAccount?.address,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        })
        toast({
          title: 'Error fetching busy slots',
          description:
            'Unable to fetch your busy slots. Please try again later.',
          status: 'error',
          duration: 5000,
          position: 'top-right',
        })
      }
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
    getSelfAvailableSlots()
    setCheckingSlots(true)
    const startDate = DateTime.fromJSDate(currentMonth)
      .setZone(timezone.value || 'UTC')
      .startOf('month')
      .toJSDate()
    const endDate = DateTime.fromJSDate(currentMonth)
      .endOf('month')
      .setZone(timezone.value || 'UTC')
      .toJSDate()
    let busySlots: Interval[] = []

    try {
      busySlots = await getBusySlots(
        props?.account?.address,
        startDate,
        endDate
      ).then(busySlots =>
        busySlots.map(slot =>
          Interval.fromDateTimes(
            DateTime.fromJSDate(new Date(slot.start)),
            DateTime.fromJSDate(new Date(slot.end))
          )
        )
      )
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          accountAddress: props?.account?.address,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      })
      toast({
        title: 'Error fetching busy slots',
        description:
          'Unable to fetch busy slots for this account. Please try again later.',
        status: 'error',
        duration: 5000,
        position: 'top-right',
      })
    }
    const availabilities =
      selectedType?.availabilities?.flatMap(availability =>
        parseMonthAvailabilitiesToDate(
          availability.weekly_availability || [],
          startDate,
          endDate,
          availability.timezone ||
            props?.account?.preferences?.timezone ||
            'UTC'
        )
      ) || []

    const deduplicatedAvailabilities = mergeLuxonIntervals(availabilities)

    setBusySlots(busySlots)
    setAvailableSlots(deduplicatedAvailabilities)
    setCachedRange({ startDate, endDate })
    setCheckingSlots(false)
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
  const ongoingRequestRef = useRef<Promise<boolean> | null>(null)
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
    meetingRepeat?: MeetingRepeat,
    txHash?: Address | null
  ): Promise<boolean> => {
    if (ongoingRequestRef.current) {
      return ongoingRequestRef.current
    }
    if (!selectedType || isScheduling) return false
    ongoingRequestRef.current = (async () => {
      setIsScheduling(true)
      setIsScheduling(true)

      const start = new Date(startTime)
      const end = addMinutes(new Date(start), selectedType.duration_minutes)

      if (scheduleType !== SchedulingType.GUEST && !name) {
        name = getAccountDisplayName(currentAccount!)
      }

      const participants: ParticipantInfo[] = [...(otherParticipants || [])]

      participants.push({
        account_address: props.account?.address,
        name: '',
        type: ParticipantType.Owner,
        status: ParticipationStatus.Accepted,
        slot_id: '',
        meeting_id: '',
      })

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

        if (meetingSlotId) {
          meeting = await updateMeetingAsGuest(
            meetingSlotId,
            selectedType.id,
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
        } else if (conferenceId) {
          if (conferenceActor === 'account') {
            meeting = await updateMeeting(
              true,
              currentAccount!.address,
              selectedType?.id,
              start,
              end,
              rescheduleSlot as MeetingDecrypted,
              getSignature(currentAccount!.address) || '',
              participants,
              content || '',
              meetingUrl || '',
              meetingProvider || MeetingProvider.GOOGLE_MEET,
              title,
              meetingNotification.map(mn => mn.value),
              meetingRepeat
            )
          } else {
            meeting = await updateMeetingConferenceGuest(
              true,
              selectedType.id,
              start,
              end,
              rescheduleSlot as MeetingDecrypted,
              conferenceId as string,
              rescheduleSlot?.id || '',
              participants,
              content || '',
              meetingUrl || '',
              meetingProvider || MeetingProvider.GOOGLE_MEET,
              title,
              meetingNotification.map(mn => mn.value),
              meetingRepeat
            )
          }
        } else {
          meeting = await scheduleMeeting(
            false,
            scheduleType,
            selectedType?.id,
            start,
            end,
            participants,
            meetingProvider || MeetingProvider.GOOGLE_MEET,
            currentAccount,
            content,
            meetingUrl,
            emailToSendReminders,
            title,
            meetingReminders,
            undefined,
            txHash
          )
          localStorage.removeItem(
            `${selectedType?.id || ''}:transaction` // Clear the guest persisted transaction from localStorage after successful confirmation
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
        setCurrentStep(PublicSchedulingSteps.BOOK_SESSION)
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
          if (selectedType?.plan) {
            setShowTimeNotAvailable(true)
          }
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
        } else if (e instanceof AllMeetingSlotsUsedError) {
          toast({
            title: 'Failed to schedule meeting',
            description:
              'You’ve used all your available meeting slots. Please purchase a new slot to schedule a meeting.',
            status: 'error',
            duration: 5000,
            position: 'top',
            isClosable: true,
          })
        } else if (e instanceof TransactionIsRequired) {
          toast({
            title: 'Failed to schedule meeting',
            description:
              'This meeting type requires payment before scheduling. Please purchase a slot to continue.',
            status: 'error',
            duration: 5000,
            position: 'top',
            isClosable: true,
          })
        } else if (e instanceof ServiceUnavailableError) {
          toast({
            title: 'Service Unavailable',
            description:
              'We’re having trouble connecting at the moment. Please try again shortly.',
            status: 'error',
            duration: 5000,
            position: 'top',
            isClosable: true,
          })
        }
        return false
      } finally {
        setIsScheduling(false)
        ongoingRequestRef.current = null
      }
    })()
    return ongoingRequestRef.current
  }
  const scheduleContext: IScheduleContext = {
    currentMonth,
    setCurrentMonth,
    availableSlots,
    selfAvailableSlots,
    checkingSlots,
    checkedSelfSlots,
    isScheduling,
    pickedDay,
    setPickedDay,
    pickedTime,
    setPickedTime,
    showConfirm,
    setShowConfirm,
    selectedMonth,
    setSelectedMonth,
    busySlots,
    selfBusySlots,
    timezone,
    setTimezone,
    getAvailableSlots,
    confirmSchedule,
    participants,
    setParticipants,
    meetingProvider,
    setMeetingProvider,
    meetingNotification,
    setMeetingNotification,
    meetingRepeat,
    setMeetingRepeat,
    content,
    setContent,
    name,
    setName,
    title,
    setTitle,
    doSendEmailReminders,
    setSendEmailReminders,
    scheduleType,
    setScheduleType,
    addGuest,
    setAddGuest,
    guestEmail,
    setGuestEmail,
    userEmail,
    setUserEmail,
    meetingUrl,
    setMeetingUrl,
    isFirstGuestEmailValid,
    setIsFirstGuestEmailValid,
    isFirstUserEmailValid,
    setIsFirstUserEmailValid,
    showEmailConfirm,
    setShowEmailConfirm,
    showTimeNotAvailable,
    setShowTimeNotAvailable,
    rescheduleSlot,
    rescheduleSlotLoading,
    meetingSlotId,
    setIsCancelled,
    setLastScheduledMeeting,
    setShowSlots,
    showSlots,
  }
  const renderStep = () => {
    switch (currentStep) {
      case PublicSchedulingSteps.PAY_FOR_SESSION:
        return <PaymentComponent />
      case PublicSchedulingSteps.BOOK_SESSION:
        return <BookingComponent />
      case PublicSchedulingSteps.SELECT_TYPE:
      default:
        return <BasePage />
    }
  }

  return (
    <PublicScheduleContext.Provider value={context}>
      <ScheduleStateContext.Provider value={scheduleContext}>
        <LogoModalLoading isOpen={isAwaitingScheduling} />
        <HeadMeta account={props.account} url={props.url} />
        <VStack mb={36} gap={1} key={key}>
          <Container
            bg={bgColor}
            maxW={{ base: '100%', md: '95%' }}
            mt={{ md: 8, base: 0 }}
            mb={{ md: 8, base: 0 }}
            pt={24}
            width={'100%'}
            pb={8}
            marginX="auto"
            borderRadius="lg"
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
            minH="100vh"
            transitionProperty="width"
            transitionDuration="2s"
            transitionTimingFunction="ease-in-out"
            position={'relative'}
          >
            {lastScheduledMeeting ? (
              <Flex justify="center">
                <MeetingScheduledDialog
                  participants={lastScheduledMeeting?.participants}
                  hostAccount={props.account}
                  scheduleType={schedulingType}
                  meeting={lastScheduledMeeting}
                  accountNotificationSubs={notificationsSubs}
                  hasConnectedCalendar={hasConnectedCalendar}
                  isContact={isContact}
                  setIsContact={setIsContact}
                  reset={_onClose}
                  isReschedule={!!meetingSlotId}
                  isCancelled={isCancelled}
                  timezone={
                    timezone?.value ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone
                  }
                />
              </Flex>
            ) : pageGettingReady ? (
              <HStack w="100%" mt={8} mx="auto" justifyContent="center">
                <Loading label="Loading..." />
              </HStack>
            ) : (
              renderStep()
            )}

            {/* Powered by Meetwith branding */}
            <HStack spacing={2} justify="center" mt={24} mb={0}>
              <Link
                href="/"
                _hover={{ textDecoration: 'none', opacity: 0.8 }}
                cursor="pointer"
                display="flex"
                alignItems="center"
                gap={2}
                w="fit-content"
              >
                <Image
                  src="/assets/logo.svg"
                  alt="Meetwith"
                  width="36.89px"
                  height="23px"
                />
                <Text fontSize="12.8px" color="neutral.300" fontWeight={500}>
                  Powered by Meetwith
                </Text>
              </Link>
            </HStack>
          </Container>
        </VStack>
      </ScheduleStateContext.Provider>
    </PublicScheduleContext.Provider>
  )
}

export default PublicPage
