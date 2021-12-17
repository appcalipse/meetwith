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
import { DBSlot } from '../types/Meeting'
import { Select } from '@chakra-ui/select'
import ProfileInfo from '../components/profile/ProfileInfo'
import { Account, MeetingType } from '../types/Account'
import { Flex, Box, Container } from '@chakra-ui/layout'
import MeetingScheduledDialog from '../components/meeting/MeetingScheduledDialog'
import { useDisclosure } from '@chakra-ui/hooks'
import { getAccountDisplayName } from '../utils/user_manager'

const Schedule: React.FC = () => {
  const router = useRouter()

  const [account, setAccount] = useState(null as Account | null)

  useEffect(() => {
    if (!account) {
      const address = router.query.address ? router.query.address[0] : null
      if (address) {
        checkUser(address)
      }
    }
  }, [router.query])

  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [meetings, setMeetings] = useState([] as DBSlot[])
  const [selectedType, setSelectedType] = useState({} as MeetingType)
  const [isScheduling, setIsScheduling] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { currentAccount, logged } = useContext(AccountContext)
  const [reset, setReset] = useState(false)

  const toast = useToast()

  const checkUser = async (identifier: string) => {
    try {
      const account = await getAccount(identifier)
      setAccount(account)
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = account.preferences!.availableTypes.find(
        t => t.url === typeOnRoute
      )
      setSelectedType(type || account.preferences!.availableTypes[0])
      updateMeetings(account.address)
      setLoading(false)
    } catch (e) {
      //TODO handle error
      console.error(e)
      router.push('/404')
    }
  }

  const confirmSchedule = async (startTime: Date, content?: string) => {
    if (logged) {
      const start = dayjs(startTime)
      const end = dayjs(startTime).add(selectedType.duration, 'minute')
      try {
        await scheduleMeeting(
          currentAccount!.address,
          account!.address,
          selectedType.id,
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

  const changeType = (typeId: string) => {
    const type = account!
      .preferences!.availableTypes
      .find(t => t.id === typeId)!
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
                value={selectedType.id}
                onChange={e => e.target.value && changeType(e.target.value)}
              >
                {account!
                  .preferences!.availableTypes
                  .map(type => (
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
                isScheduling={isScheduling => setIsScheduling(isScheduling)}
                slotDurationInMinutes={selectedType.duration}
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
