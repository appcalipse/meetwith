import { AddIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
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
import { SessionType } from '@utils/constants/meeting-types'
import { useRouter } from 'next/router'
import React, { ReactNode, useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { AvailabilityBlock } from '@/types/availability'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { PaymentAccountStatus } from '@/types/PaymentAccount'
import {
  getAvailabilityBlocks,
  getMeetingTypesWithMetadata,
  getStripeStatus,
  listConnectedCalendars,
} from '@/utils/api_helper'
import { getDefaultValues } from '@/utils/constants/meeting-types'
import { isTrialEligible } from '@/utils/subscription_manager'

import MeetingTypeModal from '../meeting-settings/MeetingTypeModal'

const MeetingTypesConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const router = useRouter()
  const bgColor = useColorModeValue('white', 'neutral.900')
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null)
  const [createKey, setCreateKey] = useState<string>(uuidv4())
  const [canCreateMeetingType, setCanCreateMeetingType] = useState(true)
  const [isPro, setIsPro] = useState(true)

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

  // Trial eligibility from account context
  const trialEligible = isTrialEligible(currentAccount)
  const { data: availabilityBlocks, isLoading: isAvailabilityLoading } =
    useQuery<AvailabilityBlock[]>({
      queryKey: ['availabilityBlocks', currentAccount?.address],
      queryFn: () => getAvailabilityBlocks(),
      enabled: !!currentAccount?.id,
    })
  const { data: stripeStatus, isLoading: isStripeLoading } =
    useQuery<PaymentAccountStatus>({
      queryKey: ['stripeStatus', currentAccount?.address],
      queryFn: () => getStripeStatus(),
      enabled: !!currentAccount?.id,
    })

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])

  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)

  const fetchMeetingTypes = async (reset?: boolean, limit = 10) => {
    const PAGE_SIZE = limit
    setIsLoading(true)
    const response = await getMeetingTypesWithMetadata(
      PAGE_SIZE,
      reset ? 0 : meetingTypes.length
    )

    const netMeetingTypes = response.meetingTypes || []

    if (netMeetingTypes.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setMeetingTypes((reset ? [] : [...meetingTypes]).concat(netMeetingTypes))
    setCanCreateMeetingType(!response.upgradeRequired)
    setIsPro(response.isPro)
    setIsLoading(false)
    setFirstFetch(false)
  }

  useEffect(() => {
    fetchMeetingTypes(true, 10)
  }, [currentAccount?.address])

  // Separate free and paid meeting types for free users
  const { freeMeetingTypes, paidMeetingTypes } = useMemo(() => {
    const free = meetingTypes.filter(mt => mt.type === SessionType.FREE)
    const paid = meetingTypes.filter(mt => mt.type === SessionType.PAID)
    return { freeMeetingTypes: free, paidMeetingTypes: paid }
  }, [meetingTypes])

  const refetch = async () => {
    await fetchMeetingTypes(true, meetingTypes.length + 1)
    setCreateKey(uuidv4())
    setSelectedType(null)
  }

  // Render meeting type cards
  const renderMeetingTypeCards = (
    types: MeetingType[],
    isRestricted = false
  ) => {
    return (
      <Box
        justifyContent="space-between"
        flexWrap="wrap"
        width="100%"
        display="flex"
        flexDirection="row"
        rowGap={'1vw'}
        opacity={isRestricted ? 0.7 : 1}
        pointerEvents={isRestricted ? 'none' : 'auto'}
      >
        {types.map(type => {
          const url = `${getAccountCalendarUrl(currentAccount, false)}/${
            type.slug
          }`
          return (
            <MeetingTypeCard
              {...type}
              key={type.id}
              onSelect={(type: MeetingType) => {
                if (!isRestricted) {
                  setSelectedType(type)
                  openModal()
                }
              }}
              url={url}
            />
          )
        })}
      </Box>
    )
  }

  let content: ReactNode
  if (firstFetch) {
    content = (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="200px"
        w="100%"
      >
        <Loading />
      </Box>
    )
  } else if (meetingTypes.length === 0) {
    content = (
      <Text textAlign="center" w="100%" mx="auto" py={4}>
        No meeting types found
      </Text>
    )
  } else if (isPro) {
    content = (
      <VStack w={'100%'}>
        {renderMeetingTypeCards(meetingTypes)}
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
  } else {
    content = (
      <VStack w={'100%'} spacing={6}>
        {freeMeetingTypes.length > 0 && (
          <>{renderMeetingTypeCards(freeMeetingTypes)}</>
        )}

        {paidMeetingTypes.length > 0 && (
          <>
            {freeMeetingTypes.length > 0 && (
              <Divider borderColor="neutral.600" my={4} />
            )}

            <Text fontSize="md" color="neutral.400" w="100%">
              The session types below are no longer visible on your public page
              because you&apos;re on the free plan.{' '}
              <Button
                variant="link"
                colorScheme="primary"
                px={0}
                onClick={() => router.push('/dashboard/settings/subscriptions')}
                textDecoration="underline"
                fontSize="md"
                height="auto"
                minW="auto"
              >
                {trialEligible ? 'Try PRO for free' : 'Upgrade to PRO'}
              </Button>{' '}
              to restore them.
            </Text>

            {renderMeetingTypeCards(paidMeetingTypes, true)}
          </>
        )}

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
        stripeStatus={stripeStatus}
        isStripeLoading={isStripeLoading}
        isPro={isPro}
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
            alignItems={{ base: 'center', md: 'flex-start' }}
            justifyContent="space-between"
          >
            <Heading fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}>
              Meeting Types
            </Heading>
            <Button
              colorScheme="primary"
              onClick={openModal}
              leftIcon={<AddIcon width={15} height={15} />}
              fontSize={{
                base: 'xs',
                md: 'md',
              }}
              isDisabled={!canCreateMeetingType}
              title={
                !canCreateMeetingType
                  ? 'Upgrade to Pro to create more meeting types'
                  : undefined
              }
            >
              New Meeting Type
            </Button>
          </HStack>
          <HStack
            width="100%"
            alignItems="flex-start"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
          >
            <Text color="neutral.400">Here are your created session</Text>
            {!isPro && (
              <Text fontSize="14px" color="neutral.400">
                <Button
                  variant="link"
                  colorScheme="primary"
                  px={0}
                  onClick={() =>
                    router.push('/dashboard/settings/subscriptions')
                  }
                  textDecoration="none"
                  fontSize="14px"
                  height="auto"
                  minW="auto"
                >
                  {trialEligible ? 'Try PRO for free' : 'Go PRO'}
                </Button>{' '}
                to add as many plan types as you want
              </Text>
            )}
          </HStack>
        </VStack>

        <Box mt={{ md: 6 }} width="100%">
          {content}
        </Box>
      </VStack>
    </Box>
  )
}

export default MeetingTypesConfig
