import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useContext, useEffect, useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { HiMiniPlusCircle } from 'react-icons/hi2'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import {
  PollStatus,
  QuickPollBySlugResponse,
  QuickPollListItem,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { getQuickPollBySlug, getQuickPolls } from '@/utils/api_helper'
import { QUICKPOLL_MIN_LIMIT } from '@/utils/constants'
import { getLocalPolls } from '@/utils/storage'
import CustomLoading from '../CustomLoading'
import CountSkeleton from './CountSkeleton'
import OngoingPolls from './OngoingPolls'
import PastPolls from './PastPolls'
import PollCard from './PollCard'

type AllPollsProps = {
  isPublicMode?: boolean
}

const AllPolls = ({ isPublicMode = false }: AllPollsProps) => {
  const { push } = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500)
  const [hasLocalPollsLoaded, setHasLocalPollsLoaded] = useState(false)
  const [localPollSlugs, setLocalPollSlugs] = useState<string[]>([])

  const { data: pollsMetadata } = useQuery({
    queryKey: ['quickpolls-metadata'],
    queryFn: () =>
      getQuickPolls(QUICKPOLL_MIN_LIMIT, 0, undefined, PollStatus.ONGOING),
    staleTime: 30000,
    enabled: !isPublicMode,
  })
  const canCreateQuickPoll = isPublicMode
    ? true
    : !pollsMetadata?.upgradeRequired
  const canSchedulePolls = isPublicMode
    ? true
    : pollsMetadata?.canSchedule ?? true

  const {
    ongoingPollsCount,
    pastPollsCount,
    fetchPollCounts,
    isLoadingPollCounts,
  } = useContext(MetricStateContext)

  useEffect(() => {
    if (isPublicMode) return
    void fetchPollCounts(debouncedSearchQuery)
  }, [debouncedSearchQuery, fetchPollCounts, isPublicMode])

  useEffect(() => {
    if (!isPublicMode) return
    const slugs = getLocalPolls()
      .map(p => p.slug)
      .filter(Boolean)
    setLocalPollSlugs(slugs)
    setHasLocalPollsLoaded(true)
  }, [isPublicMode])

  const handlePublicPollRemoved = (pollId: string) => {
    setLocalPollSlugs(prev =>
      prev.filter(slug => {
        const poll = publicPollItems.find(p => p.slug === slug)
        return poll?.id !== pollId
      })
    )
  }

  const {
    data: publicPollItems = [],
    isLoading: isLoadingPublicPolls,
    isFetching: isFetchingPublicPolls,
  } = useQuery({
    queryKey: ['public-quickpolls-by-local-slug', localPollSlugs],
    queryFn: async () => {
      const settled = await Promise.allSettled(
        localPollSlugs.map(async slug => getQuickPollBySlug(slug))
      )

      const polls: QuickPollListItem[] = settled
        .filter(
          (result): result is PromiseFulfilledResult<QuickPollBySlugResponse> =>
            result.status === 'fulfilled'
        )
        .map(result => {
          const pollResponse = result.value
          const scheduler = pollResponse.poll.participants.find(
            p => p.participant_type === QuickPollParticipantType.SCHEDULER
          )
          return {
            ...pollResponse.poll,
            host_address: scheduler?.account_address,
            host_name: scheduler?.account_name || scheduler?.guest_name,
            participant_count: pollResponse.poll.participants.length,
            quick_poll_participants: pollResponse.poll.participants,
            scheduled_meeting: pollResponse.scheduled_meeting,
            user_participant_type: QuickPollParticipantType.SCHEDULER,
          } as QuickPollListItem
        })

      return polls
    },
    enabled: isPublicMode && hasLocalPollsLoaded && localPollSlugs.length > 0,
    staleTime: 30000,
  })

  const filteredPublicPollItems = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return publicPollItems
    const query = debouncedSearchQuery.toLowerCase()
    return publicPollItems.filter(
      p =>
        p.title?.toLowerCase().includes(query) ||
        p.host_name?.toLowerCase().includes(query) ||
        p.slug?.toLowerCase().includes(query)
    )
  }, [debouncedSearchQuery, publicPollItems])

  const ongoingPublicPolls = useMemo(() => {
    const now = new Date()
    return filteredPublicPollItems.filter(p => {
      const isExpired = p.expires_at !== null && new Date(p.expires_at) < now
      return p.status === PollStatus.ONGOING && !isExpired
    })
  }, [filteredPublicPollItems])

  const pastPublicPolls = useMemo(() => {
    const now = new Date()
    return filteredPublicPollItems.filter(p => {
      const isExpired = p.expires_at !== null && new Date(p.expires_at) < now
      return (
        p.status === PollStatus.COMPLETED ||
        p.status === PollStatus.CLOSED ||
        p.status === PollStatus.EXPIRED ||
        isExpired
      )
    })
  }, [filteredPublicPollItems])

  const handleTabChange = (index: number) => {
    setActiveTab(index)
  }

  return (
    <Box width="100%" bg="bg-canvas" minHeight="100vh">
      <VStack
        spacing={{ base: 4, md: 6 }}
        align="stretch"
        maxW="1200px"
        mx="auto"
        pt={{ base: 10, md: 0 }}
        pb={10}
      >
        {/* Header Section */}
        <Flex
          justify="space-between"
          align={{ base: 'stretch', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={{ base: 4, md: 0 }}
        >
          <VStack align="start" spacing={1}>
            <Heading
              as="h1"
              fontSize={{ base: '20px', md: '24px' }}
              fontWeight="700"
              color="text-primary"
              textAlign="left"
            >
              Quick Poll for Groups
            </Heading>
            <Text
              fontSize={{ base: '14px', md: '16px' }}
              color="neutral.400"
              fontWeight="500"
              textAlign="left"
            >
              Coordinate availability across teams without the email chains
            </Text>
          </VStack>

          <VStack align={{ base: 'stretch', md: 'flex-end' }} spacing={2}>
            <Button
              leftIcon={<HiMiniPlusCircle size={20} color="#323F4B" />}
              bg="primary.200"
              color="neutral.900"
              px={5}
              py={2.5}
              fontSize="15px"
              fontWeight="600"
              borderRadius="8px"
              w={{ base: '100%', md: 'auto' }}
              _hover={{
                bg: 'primary.300',
              }}
              _active={{
                bg: 'primary.400',
              }}
              onClick={() =>
                push(
                  isPublicMode ? '/quickpoll/create' : '/dashboard/create-poll'
                )
              }
              isDisabled={!canCreateQuickPoll}
              title={
                !canCreateQuickPoll
                  ? 'Upgrade to Pro to create more active polls'
                  : undefined
              }
            >
              Run new poll
            </Button>
          </VStack>
        </Flex>

        {/* Tabs with Search Section */}
        <Tabs variant="unstyled" index={activeTab} onChange={handleTabChange}>
          <Flex
            justify="space-between"
            align="center"
            direction={{ base: 'column', md: 'row' }}
            gap={{ base: 4, md: 0 }}
          >
            {/* Tabs */}
            <TabList
              bg="bg-surface-secondary"
              p={1}
              borderWidth={1}
              borderColor="neutral.400"
              rounded={6}
              width={{ base: '100%', md: 'fit-content' }}
            >
              <Tab
                rounded={4}
                px={{ base: 3, md: 4 }}
                py={2}
                fontWeight={600}
                fontSize={{ base: '13px', md: '14px' }}
                color="text-primary"
                flex={{ base: 1, md: 'none' }}
                _selected={{
                  color: 'neutral.900',
                  bg: 'primary.200',
                }}
              >
                Ongoing Polls (
                {isPublicMode ? (
                  isLoadingPublicPolls || isFetchingPublicPolls ? (
                    <CountSkeleton />
                  ) : (
                    ongoingPublicPolls.length
                  )
                ) : isLoadingPollCounts ? (
                  <CountSkeleton />
                ) : (
                  ongoingPollsCount
                )}
                )
              </Tab>
              <Tab
                rounded={4}
                px={{ base: 3, md: 4 }}
                py={2}
                fontWeight={600}
                fontSize={{ base: '13px', md: '14px' }}
                color="text-primary"
                flex={{ base: 1, md: 'none' }}
                _selected={{
                  color: 'neutral.900',
                  bg: 'primary.200',
                }}
              >
                Past Polls (
                {isPublicMode ? (
                  isLoadingPublicPolls || isFetchingPublicPolls ? (
                    <CountSkeleton />
                  ) : (
                    pastPublicPolls.length
                  )
                ) : isLoadingPollCounts ? (
                  <CountSkeleton />
                ) : (
                  pastPollsCount
                )}
                )
              </Tab>
            </TabList>

            {/* Search Input */}
            <InputGroup maxW={{ base: '100%', md: '275px' }} maxH="48px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="neutral.500" />
              </InputLeftElement>
              <Input
                placeholder="Search for Poll"
                bg="bg-surface-secondary"
                border="1px solid"
                borderColor="neutral.400"
                color="text-primary"
                _placeholder={{ color: 'neutral.400', fontSize: '15px' }}
                _hover={{
                  borderColor: 'neutral.600',
                }}
                _focus={{
                  borderColor: 'primary.400',
                  boxShadow: 'none',
                }}
                height="40px"
                borderRadius="6px"
                maxH="48px"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </Flex>

          {/* Poll Cards */}
          <TabPanels mt={6}>
            <TabPanel p={0}>
              {isPublicMode ? (
                isLoadingPublicPolls || isFetchingPublicPolls ? (
                  <CustomLoading text="Loading ongoing polls..." />
                ) : ongoingPublicPolls.length > 0 ? (
                  <VStack spacing={4} align="stretch">
                    {ongoingPublicPolls.map(poll => (
                      <PollCard
                        key={poll.id}
                        poll={poll}
                        canSchedule={canSchedulePolls}
                        hideAvailabilitySection
                        hideEditPollMenuItem
                        isPublicMode
                        onPublicPollRemoved={handlePublicPollRemoved}
                      />
                    ))}
                  </VStack>
                ) : (
                  <Text color="neutral.400">No ongoing polls</Text>
                )
              ) : (
                <OngoingPolls
                  searchQuery={debouncedSearchQuery}
                  upgradeRequired={pollsMetadata?.upgradeRequired}
                  canSchedule={canSchedulePolls}
                />
              )}
            </TabPanel>
            <TabPanel p={0}>
              {isPublicMode ? (
                isLoadingPublicPolls || isFetchingPublicPolls ? (
                  <CustomLoading text="Loading past polls..." />
                ) : pastPublicPolls.length > 0 ? (
                  <VStack spacing={4} align="stretch">
                    {pastPublicPolls.map(poll => (
                      <PollCard
                        key={poll.id}
                        poll={poll}
                        hideAvailabilitySection
                        hideEditPollMenuItem
                        isPublicMode
                        onPublicPollRemoved={handlePublicPollRemoved}
                      />
                    ))}
                  </VStack>
                ) : (
                  <Text color="neutral.400">No past polls</Text>
                )
              ) : (
                <PastPolls searchQuery={debouncedSearchQuery} />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  )
}

export default AllPolls
