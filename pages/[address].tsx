import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import MeetSlotPicker from '../components/MeetSlotPicker'
import { AccountContext } from '../providers/AccountProvider'
import { isSlotAvailable, scheduleMeeting } from '../utils/calendar_manager'
import dayjs from 'dayjs'
import { getAccount, getMeetings } from '../utils/api_helper'
import { MeetingWithYourselfError } from '../utils/errors'
import { useToast } from '@chakra-ui/toast'
import { DBSlot } from '../types/Meeting'
import { Select } from '@chakra-ui/select'
import ProfileInfo from '../components/profile/ProfileInfo'
import { Account } from '../types/Account'
import { Flex, Box, Container } from '@chakra-ui/layout'
import MeetingScheduledDialog from '../components/meeting/MeetingScheduledDialog'
import { useDisclosure } from '@chakra-ui/hooks'
import { getAccountDisplayName } from '../utils/user_manager'

const Schedule: React.FC = () => {
  const router = useRouter()
  useEffect(() => {
    const address = router.query.address as string
    if (address) {
      checkUser(address)
    }
  }, [router.query])

  const [account, setAccount] = useState(null as Account | null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [meetings, setMeetings] = useState([] as DBSlot[])
  const [duration, setDuration] = useState(15)
  const [isScheduling, setIsScheduling] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { currentAccount, logged } = useContext(AccountContext)
  const [reset, setReset] = useState(false)

  const toast = useToast()

  const checkUser = async (identifier: string) => {
    try {
      const account = await getAccount(identifier)
      setAccount(account)
      updateMeetings(account.address)
      setLoading(false)
    } catch (e) {
      //TODO handle error
      console.error(e)
      router.push('/404')
    }
  }

  const confirmSchedule = async (startTime: Date, content?: string) => {
    onOpen()

    if (logged) {
      const start = dayjs(startTime)
      const end = dayjs(startTime).add(15, 'minute')
      try {
        await scheduleMeeting(
          currentAccount!.address,
          account!.address,
          start,
          end,
          content
        )
        onOpen()
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
    } else {
      toast({
        title: 'Not connected',
        description: 'Please connect your wallet to schedule.',
        status: 'warning',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
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

  const validateSlot = (slot: Date): boolean => {
    return isSlotAvailable(
      duration,
      slot,
      meetings,
      account!.preferences!.availabilities,
      'America/New_York'
    )
  }

  return (
    <Container maxW="7xl" mt={8} flex={1}>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <Flex wrap="wrap">
            <Box flex="1" minW="500px" p={8}>
              <ProfileInfo account={account!} />
              <Select
                disabled={isScheduling}
                placeholder="Select option"
                mt={8}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
              </Select>
            </Box>

            <Box flex="2" p={8}>
              <MeetSlotPicker
                reset={reset}
                onMonthChange={(day: Date) => setCurrentMonth(day)}
                onSchedule={confirmSchedule}
                isScheduling={isScheduling => setIsScheduling(isScheduling)}
                slotDurationInMinutes={duration}
                timeSlotAvailability={validateSlot}
              />
            </Box>
          </Flex>
          <MeetingScheduledDialog
            targetAccountId={getAccountDisplayName(account!)}
            isOpen={isOpen}
            onClose={_onClose}
          />
        </>
      )}
    </Container>
  )
}

export default Schedule
