import { AddIcon } from '@chakra-ui/icons'
import { Link } from '@chakra-ui/next-js'
import {
  Box,
  Button,
  Heading,
  HStack,
  Spacer,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import Loading from '@components/Loading'
import DeleteMeetingTypeConfirmation from '@components/meeting-settings/DeleteMeetingTypeConfirmation'
import MeetingTypeCard from '@components/meeting-settings/MeetingTypeCard'
import { Account, MeetingType } from '@meta/Account'
import { useQuery } from '@tanstack/react-query'
import { getAccountCalendarUrl } from '@utils/calendar_manager'
import { isProAccount } from '@utils/subscription_manager'
import React, { ReactNode, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { getMeetingTypes, listConnectedCalendars } from '@/utils/api_helper'
import { getDefaultValues } from '@/utils/constants/meeting-types'

import MeetingTypeModal from '../meeting-settings/MeetingTypeModal'
const MeetingTypesConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null)
  const [createKey, setCreateKey] = useState<string>(uuidv4())

  const {
    isOpen: isModalOpen,
    onOpen: openModal,
    onClose: closeModal,
  } = useDisclosure()

  const {
    isOpen: isDeleteConfirmationModalOpen,
    onOpen: openDeleteConfirmationModal,
    onClose: closeDeleteConfirmationModal,
  } = useDisclosure()

  const { data: connectedCalendar, isLoading: isQueryLoading } = useQuery<
    ConnectedCalendarCore[]
  >({
    queryKey: ['connectedCalendars', currentAccount?.id],
    queryFn: () => listConnectedCalendars(),
    enabled: !!currentAccount?.id,
  })

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])

  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)
  const fetchMeetingTypes = async (reset?: boolean, limit = 10) => {
    const PAGE_SIZE = limit
    setIsLoading(true)
    const netMeetingTypes = await getMeetingTypes(
      PAGE_SIZE,
      reset ? 0 : meetingTypes.length
    )

    if (netMeetingTypes.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setMeetingTypes((reset ? [] : [...meetingTypes]).concat(netMeetingTypes))
    setIsLoading(false)
    setFirstFetch(false)
  }
  useEffect(() => {
    fetchMeetingTypes(true, 10)
  }, [currentAccount?.address])

  const isPro = isProAccount(currentAccount!)
  let content: ReactNode
  const refetch = async () => {
    await fetchMeetingTypes(true, meetingTypes.length + 1)
    setCreateKey(uuidv4())
  }
  if (firstFetch) {
    content = (
      <Box mx="auto">
        <Loading />
      </Box>
    )
  } else if (meetingTypes.length === 0) {
    content = (
      <Text textAlign="center" w="100%" mx="auto" py={4}>
        No meeting types found
      </Text>
    )
  } else {
    content = (
      <VStack w={'100%'}>
        <Box
          justifyContent="space-between"
          flexWrap="wrap"
          width="100%"
          display="flex"
          flexDirection="row"
          mt={{ md: 6 }}
          rowGap={'1vw'}
        >
          {meetingTypes.map(type => {
            const url = `${getAccountCalendarUrl(currentAccount, false)}/${
              type.slug
            }`
            return (
              <MeetingTypeCard
                {...type}
                key={type.id}
                onSelect={(type: MeetingType) => {
                  setSelectedType(type)
                  openModal()
                }}
                url={url}
              />
            )
          })}
        </Box>
        {!noMoreFetch && !firstFetch && (
          <VStack mb={8}>
            <Button
              isLoading={isLoading}
              colorScheme="primary"
              variant="outline"
              alignSelf="center"
              my={4}
              onClick={() => fetchMeetingTypes()}
            >
              Load more
            </Button>
            <Spacer />
          </VStack>
        )}
      </VStack>
    )
  }
  return (
    <Box width="100%" bg={bgColor} p={8} borderRadius={12}>
      <MeetingTypeModal
        isOpen={isModalOpen}
        onClose={() => {
          closeModal()
          setSelectedType(null)
          setCreateKey(uuidv4())
        }}
        calendarOptions={connectedCalendar || []}
        isCalendarLoading={isQueryLoading}
        refetch={refetch}
        initialValues={selectedType || getDefaultValues()}
        key={selectedType?.id || createKey}
        canDelete={meetingTypes.length > 1}
        onDelete={() => {
          openDeleteConfirmationModal()
          closeModal()
        }}
      />
      <DeleteMeetingTypeConfirmation
        isOpen={isDeleteConfirmationModalOpen}
        onClose={closeDeleteConfirmationModal}
        meetingTypeId={selectedType?.id}
        refetch={refetch}
      />

      <VStack width="100%" maxW="100%" alignItems={'flex-start'}>
        <VStack alignItems="flex-start" width="100%" maxW="100%" gap={2}>
          <HStack
            width="100%"
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Heading fontSize="2xl">Meeting Types</Heading>
            <Button
              isDisabled={!isPro}
              colorScheme="primary"
              onClick={openModal}
              leftIcon={<AddIcon width={15} height={15} />}
            >
              New Meeting Type
            </Button>
          </HStack>
          <HStack
            width="100%"
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Text color="neutral.400">Here are your meeting types</Text>
            {!isPro && (
              <Text pb="6">
                <Link
                  href="/dashboard/details#subscriptions"
                  colorScheme="primary"
                  fontWeight="bold"
                >
                  Go PRO
                </Link>{' '}
                to add as many meeting types as you want
              </Text>
            )}
          </HStack>
        </VStack>
        {content}
      </VStack>
    </Box>
  )
}

export default MeetingTypesConfig
