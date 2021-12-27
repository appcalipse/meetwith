import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import MeetSlotPicker from '../components/MeetSlotPicker'
import { AccountContext } from '../providers/AccountProvider'
import {
  durationToHumanReadable,
  isSlotAvailable,
  scheduleMeeting,
} from '../utils/calendar_manager'
import dayjs from '../utils/dayjs_extender'
import { getAccount, getMeetings } from '../utils/api_helper'
import { MeetingWithYourselfError } from '../utils/errors'
import { useToast } from '@chakra-ui/toast'
import { DBSlot, MeetingDecrypted } from '../types/Meeting'
import { Select } from '@chakra-ui/select'
import ProfileInfo from '../components/profile/ProfileInfo'
import { Account, MeetingType } from '../types/Account'
import { Flex, Box, Container } from '@chakra-ui/layout'
import MeetingScheduledDialog from '../components/meeting/MeetingScheduledDialog'
import { useDisclosure } from '@chakra-ui/hooks'
import { logEvent } from '../utils/analytics'
import { loginWithWallet } from '../utils/user_manager'
import Loading from '../components/Loading'
import * as Sentry from '@sentry/browser'

const Schedule: React.FC = () => {
  const router = useRouter()

  const { currentAccount, logged, login, setLoginIn } =
    useContext(AccountContext)

  const [account, setAccount] = useState(null as Account | null)
  const [unloggedSchedule, setUnloggedSchedule] = useState(
    null as {
      startTime: Date
      name?: string
      content?: string
      meetingUrl?: string
    } | null
  )

  useEffect(() => {
    if (!account) {
      const address = router.query.address ? router.query.address[0] : null
      if (address) {
        checkUser(address)
      }
    }
  }, [router.query])

  useEffect(() => {
    if (logged && unloggedSchedule) {
      confirmSchedule(
        unloggedSchedule.startTime,
        unloggedSchedule.name,
        unloggedSchedule.content,
        unloggedSchedule.meetingUrl
      )
    }
  }, [currentAccount])

  const handleLogin = async (): Promise<void> => {
    setLoginIn(true)
    try {
      const account = await loginWithWallet()
      if (!account) {
        setLoginIn(false)
        return
      }
      await login(account)
      logEvent('Signed in')
    } catch (error: any) {
      Sentry.captureException(error)
      toast({
        title: 'Error',
        description: error.message || error,
        status: 'error',
        duration: 7000,
        position: 'top',
        isClosable: true,
      })
      logEvent('Failed to sign in', error)
    }
    setLoginIn(false)
    return
  }

  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [meetings, setMeetings] = useState([] as DBSlot[])
  const [selectedType, setSelectedType] = useState({} as MeetingType)
  const [isScheduling, setIsScheduling] = useState(false)
  const [readyToSchedule, setReadyToSchedule] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [reset, setReset] = useState(false)
  const [lastScheduledMeeting, setLastScheduledMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )

  const toast = useToast()

  const checkUser = async (identifier: string) => {
    try {
      const _account = await getAccount(identifier)
      setAccount(_account)
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = _account.preferences!.availableTypes.find(
        t => t.url === typeOnRoute
      )
      setSelectedType(type || _account.preferences!.availableTypes[0])
      updateMeetings(_account.address)
      setLoading(false)
    } catch (e) {
      //TODO handle error
      console.error(e)
      router.push('/404')
    }
  }

  const confirmSchedule = async (
    startTime: Date,
    name?: string,
    content?: string,
    meetingUrl?: string
  ): Promise<boolean> => {
    setUnloggedSchedule(null)
    setIsScheduling(true)
    if (!logged) {
      setUnloggedSchedule({ startTime, name, content, meetingUrl })
      await handleLogin()
      return false
    }

    const start = dayjs(startTime)
    const end = dayjs(startTime).add(selectedType.duration, 'minute')
    try {
      const meeting = await scheduleMeeting(
        currentAccount!.id,
        account!.id,
        selectedType.id,
        start,
        end,
        name,
        content,
        meetingUrl
      )
      await updateMeetings(account!.address)
      setLastScheduledMeeting(meeting)
      logEvent('Scheduled a meeting')
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

  const updateMeetings = async (identifier: string) => {
    const monthStart = dayjs(currentMonth).startOf('month')
    const monthEnd = dayjs(currentMonth).endOf('month')

    const meetings = await getMeetings(
      identifier,
      monthStart.toDate(),
      monthEnd.toDate()
    )

    setMeetings(meetings)
  }

  useEffect(() => {
    account && updateMeetings(account.address)
  }, [currentMonth])

  const changeType = (typeId: string) => {
    const type = account!.preferences!.availableTypes.find(
      t => t.id === typeId
    )!
    setSelectedType(type)
    router.push(`/${account!.address}/${type.url}`, undefined, {
      shallow: true,
    })
  }

  const validateSlot = (slot: Date): boolean => {
    return isSlotAvailable(
      selectedType.duration,
      selectedType.minAdvanceTime,
      slot,
      meetings,
      account!.preferences!.availabilities,
      currentAccount?.preferences?.timezone || dayjs.tz.guess()
    )
  }

  return (
    <Container maxW="7xl" mt={8} flex={1}>
      {loading ? (
        <Flex
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
        >
          <Loading />
        </Flex>
      ) : (
        <Box>
          <Flex wrap="wrap" justifyContent="center">
            <Box
              flex="1"
              minW={{ base: '300px', md: '500px' }}
              maxW="600px"
              p={8}
            >
              <ProfileInfo account={account!} />
              <Select
                disabled={readyToSchedule}
                placeholder="Select option"
                mt={8}
                value={selectedType.id}
                onChange={e => e.target.value && changeType(e.target.value)}
              >
                {account!.preferences!.availableTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {durationToHumanReadable(type.duration)}
                  </option>
                ))}
              </Select>
            </Box>

            <Box flex="2" p={8}>
              <MeetSlotPicker
                reset={reset}
                onMonthChange={(day: Date) => setCurrentMonth(day)}
                onSchedule={confirmSchedule}
                willStartScheduling={willStartScheduling =>
                  setReadyToSchedule(willStartScheduling)
                }
                isSchedulingExternal={isScheduling}
                slotDurationInMinutes={selectedType.duration}
                timeSlotAvailability={validateSlot}
              />
            </Box>
          </Flex>
          <MeetingScheduledDialog
            targetAccount={account!}
            meeting={lastScheduledMeeting}
            isOpen={isOpen}
            onClose={_onClose}
          />
        </Box>
      )}
    </Container>
  )
}

export default Schedule
