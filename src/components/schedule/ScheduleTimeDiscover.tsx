import { Flex, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { Account } from '@meta/Account'
import { useRouter } from 'next/router'
import { useContext, useEffect, useId, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import { Page, ScheduleContext } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { EditMode } from '@/types/Dashboard'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { getExistingAccounts } from '@/utils/api_helper'

import { Grid4 } from '../icons/Grid4'
import Loading from '../Loading'
import MobileScheduleParticipantModal from './schedule-time-discover/MobileScheduleParticipant'
import { ScheduleParticipants } from './schedule-time-discover/ScheduleParticipants'
import { SchedulePickTime } from './schedule-time-discover/SchedulePickTime'

export type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }

const ScheduleTimeDiscover = () => {
  const { participants, groupParticipants, setMeetingMembers } =
    useContext(ScheduleContext)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { currentAccount } = useContext(AccountContext)
  const handleClose = () => {
    let url = `/dashboard/${EditMode.MEETINGS}`
    if (router.query.ref === 'group') {
      url = `/dashboard/${EditMode.GROUPS}`
    }
    router.push(url)
  }

  const [loading, setLoading] = useState(false)
  const fetchGroupMembers = async () => {
    setLoading(true)
    const selectedParticipants = participants
      .map(participant => {
        const person = participant as ParticipantInfo
        return person.account_address
      })
      .filter(participant => participant !== undefined)
    const actualMembers = [
      ...new Set(
        Object.values(groupParticipants)
          .flat()
          .concat(selectedParticipants as string[], [
            currentAccount?.address as string,
          ])
      ),
    ]
    const members = await getExistingAccounts(actualMembers)

    setMeetingMembers(members)
    setLoading(false)
  }
  useEffect(() => {
    fetchGroupMembers()
  }, [participants, groupParticipants])

  return (
    <VStack
      width="100%"
      m="auto"
      alignItems="stretch"
      gap={3}
      p={{ base: 4, md: 0 }}
    >
      <HStack justifyContent={'space-between'}>
        <HStack mb={0} cursor="pointer" onClick={handleClose}>
          <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
          <Heading fontSize={16} color="primary.500">
            Back
          </Heading>
        </HStack>
        <Grid4
          w={8}
          h={8}
          onClick={() => setIsOpen(!isOpen)}
          cursor={'pointer'}
          display={{ base: 'block', lg: 'none' }}
        />
      </HStack>
      {loading ? (
        <Flex
          m={8}
          justifyContent="center"
          width="100%"
          justify={'center'}
          align={'center'}
        >
          <Loading />
        </Flex>
      ) : (
        <HStack
          width="100%"
          justifyContent={'flex-start'}
          align={'flex-start'}
          height={'fit-content'}
          gap={'14px'}
        >
          <MobileScheduleParticipantModal
            onClose={() => setIsOpen(false)}
            isOpen={isOpen}
          />
          <ScheduleParticipants />
          <SchedulePickTime />
        </HStack>
      )}
    </VStack>
  )
}

export default ScheduleTimeDiscover
