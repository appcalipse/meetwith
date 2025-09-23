import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
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
import { useMemo, useState } from 'react'
import { FiEdit3, FiRefreshCcw, FiSearch } from 'react-icons/fi'
import { HiMiniPlusCircle } from 'react-icons/hi2'

import CustomError from '@/components/CustomError'
import CustomLoading from '@/components/CustomLoading'
import EmptyState from '@/components/EmptyState'
import Loading from '@/components/Loading'
import Pagination from '@/components/profile/Pagination'
import { useDebounceValue } from '@/hooks/useDebounceValue'
import { PollStatus, QuickPollWithParticipants } from '@/types/QuickPoll'
import { getQuickPolls } from '@/utils/api_helper'
import { QUICKPOLL_DEFAULT_LIMIT, QUICKPOLL_MAX_LIMIT } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'

import PollCard from './PollCard'

const AllPolls = () => {
  const { push } = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500)

  const {
    data: pollsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['quickpolls', debouncedSearchQuery],
    queryFn: () =>
      getQuickPolls(QUICKPOLL_MAX_LIMIT, 0, undefined, debouncedSearchQuery),
    onError: (err: unknown) => {
      handleApiError('Failed to load polls', err)
    },
  })

  // Process and filter polls
  const { ongoingPolls, pastPolls } = useMemo(() => {
    const allPolls = pollsData?.polls || []
    const now = new Date()

    const ongoing: QuickPollWithParticipants[] = []
    const past: QuickPollWithParticipants[] = []

    allPolls.forEach((poll: QuickPollWithParticipants) => {
      const isExpired = new Date(poll.expires_at) < now
      const isCancelled = poll.status === PollStatus.CANCELLED
      const isCompleted = poll.status === PollStatus.COMPLETED

      if (isCancelled || isCompleted || isExpired) {
        past.push(poll)
      } else if (poll.status === PollStatus.ONGOING && !isExpired) {
        ongoing.push(poll)
      }
    })

    return { ongoingPolls: ongoing, pastPolls: past }
  }, [pollsData])

  // Get current tab's polls
  const currentPolls = activeTab === 0 ? ongoingPolls : pastPolls

  // Pagination for current tab
  const totalCount = currentPolls.length
  const totalPages = Math.ceil(totalCount / QUICKPOLL_DEFAULT_LIMIT)
  const startIndex = (currentPage - 1) * QUICKPOLL_DEFAULT_LIMIT
  const endIndex = startIndex + QUICKPOLL_DEFAULT_LIMIT
  const displayedPolls = currentPolls.slice(startIndex, endIndex)

  const handleTabChange = (index: number) => {
    setActiveTab(index)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (isLoading && !debouncedSearchQuery) {
    return <CustomLoading text="Loading polls..." />
  }

  // Error state
  if (error) {
    return (
      <Box width="100%" bg="neutral.850" minHeight="100vh" px={6} py={8}>
        <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
          <CustomError
            title="Failed to load polls"
            description="We couldn't load your polls. Please try again or contact support if the problem persists."
            imageAlt="Error loading polls"
          />
          <Flex justify="center">
            <Button
              leftIcon={<FiRefreshCcw size={16} />}
              variant="outline"
              borderColor="primary.200"
              color="primary.200"
              size="md"
              px={5}
              py={2.5}
              fontSize="14px"
              fontWeight="600"
              borderRadius="8px"
              onClick={() => refetch()}
            >
              Try Again
            </Button>
          </Flex>
        </VStack>
      </Box>
    )
  }

  return (
    <Box width="100%" bg="neutral.850" minHeight="100vh" px={6} py={8}>
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        {/* Header Section */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Heading as="h1" fontSize="24px" fontWeight="700" color="neutral.0">
              Quick Poll for Groups
            </Heading>
            <Text fontSize="16px" color="neutral.400" fontWeight="500">
              Coordinate availability across teams without the email chains
            </Text>
          </VStack>

          <Button
            leftIcon={<HiMiniPlusCircle size={20} color="#323F4B" />}
            bg="primary.200"
            color="neutral.900"
            px={5}
            py={2.5}
            fontSize="15px"
            fontWeight="600"
            borderRadius="8px"
            _hover={{
              bg: 'primary.300',
            }}
            _active={{
              bg: 'primary.400',
            }}
            onClick={() => push('/dashboard/create-poll')}
          >
            Run new poll
          </Button>
        </Flex>

        {/* Tabs with Search Section */}
        <Tabs variant="unstyled" index={activeTab} onChange={handleTabChange}>
          <Flex justify="space-between" align="center">
            {/* Tabs */}
            <TabList
              bg="bg-surface-secondary"
              p={1}
              borderWidth={1}
              borderColor="neutral.400"
              rounded={6}
              width="fit-content"
            >
              <Tab
                rounded={4}
                px={4}
                py={2}
                fontWeight={600}
                fontSize="14px"
                color="neutral.0"
                _selected={{
                  color: 'neutral.900',
                  bg: 'primary.200',
                }}
              >
                Ongoing Polls ({ongoingPolls.length})
              </Tab>
              <Tab
                rounded={4}
                px={4}
                py={2}
                fontWeight={600}
                fontSize="14px"
                color="neutral.0"
                _selected={{
                  color: 'neutral.900',
                  bg: 'primary.200',
                }}
              >
                Past Polls ({pastPolls.length})
              </Tab>
            </TabList>

            {/* Search Input */}
            <InputGroup maxW="275px" maxH="48px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="neutral.500" />
              </InputLeftElement>
              <Input
                placeholder="Search for Poll"
                bg="bg-surface-secondary"
                border="1px solid"
                borderColor="neutral.400"
                color="neutral.200"
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
              {isLoading && debouncedSearchQuery ? (
                <Flex justify="center" align="center" py={8}>
                  <VStack spacing={4}>
                    <Spinner size="lg" color="primary.400" />
                    <Text color="neutral.400" fontSize="sm">
                      Searching polls...
                    </Text>
                  </VStack>
                </Flex>
              ) : displayedPolls.length > 0 ? (
                <VStack spacing={4} align="stretch">
                  {displayedPolls.map(poll => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </VStack>
              ) : debouncedSearchQuery ? (
                <EmptyState
                  title="No polls found"
                  description={`No polls match "${debouncedSearchQuery}". Try a different search term.`}
                />
              ) : (
                <EmptyState
                  title="No ongoing polls"
                  description="You don't have any ongoing polls at the moment. Create a new poll to get started."
                />
              )}
            </TabPanel>
            <TabPanel p={0}>
              {isLoading && debouncedSearchQuery ? (
                <Flex justify="center" align="center" py={8}>
                  <VStack spacing={4}>
                    <Spinner size="lg" color="primary.400" />
                    <Text color="neutral.400" fontSize="sm">
                      Searching polls...
                    </Text>
                  </VStack>
                </Flex>
              ) : displayedPolls.length > 0 ? (
                <VStack spacing={4} align="stretch">
                  {displayedPolls.map(poll => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </VStack>
              ) : debouncedSearchQuery ? (
                <EmptyState
                  title="No polls found"
                  description={`No polls match "${debouncedSearchQuery}". Try a different search term.`}
                />
              ) : (
                <EmptyState
                  title="No past polls"
                  description="You don't have any completed or cancelled polls yet."
                />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        )}
      </VStack>
    </Box>
  )
}

export default AllPolls
