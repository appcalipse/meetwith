import { AddIcon } from '@chakra-ui/icons'
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
import React, { ReactNode, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { AvailabilityBlock } from '@/types/availability'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import {
  getAvailabilityBlocks,
  getMeetingTypes,
  listConnectedCalendars,
} from '@/utils/api_helper'
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
    queryKey: ['connectedCalendars', currentAccount?.address],
    queryFn: () => listConnectedCalendars(),
    enabled: !!currentAccount?.id,
  })
  const { data: availabilityBlocks, isLoading: isAvailabilityLoading } =
    useQuery<AvailabilityBlock[]>({
      queryKey: ['availabilityBlocks', currentAccount?.address],
      queryFn: () => getAvailabilityBlocks(),
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

  let content: ReactNode
  const refetch = async () => {
    await fetchMeetingTypes(true, meetingTypes.length + 1)
    setCreateKey(uuidv4())
    setSelectedType(null)
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
        key={selectedType?.id || createKey}
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
        canDelete={meetingTypes.length > 1}
        availabilityBlocks={availabilityBlocks || []}
        isAvailabilityLoading={isAvailabilityLoading}
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
          </HStack>
        </VStack>
        {content}
      </VStack>
    </Box>
  )
}

export default MeetingTypesConfig
