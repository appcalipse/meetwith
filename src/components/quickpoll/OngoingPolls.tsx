import { Box, Button, Flex, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FiRefreshCcw } from 'react-icons/fi'

import CustomError from '@/components/CustomError'
import CustomLoading from '@/components/CustomLoading'
import EmptyState from '@/components/EmptyState'
import Pagination from '@/components/profile/Pagination'
import { useDebounceValue } from '@/hooks/useDebounceValue'
import { PollStatus } from '@/types/QuickPoll'
import { getQuickPolls } from '@/utils/api_helper'
import { QUICKPOLL_DEFAULT_LIMIT } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'

import PollCard from './PollCard'

interface OngoingPollsProps {
  searchQuery?: string
  upgradeRequired?: boolean
}

const OngoingPolls = ({
  searchQuery = '',
  upgradeRequired = false,
}: OngoingPollsProps) => {
  const { push } = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500)

  const {
    data: ongoingPollsData,
    isLoading: isLoadingOngoing,
    error: ongoingError,
    refetch: refetchOngoing,
  } = useQuery({
    queryKey: ['ongoing-quickpolls', debouncedSearchQuery, currentPage],
    queryFn: () =>
      getQuickPolls(
        QUICKPOLL_DEFAULT_LIMIT,
        (currentPage - 1) * QUICKPOLL_DEFAULT_LIMIT,
        debouncedSearchQuery,
        PollStatus.ONGOING
      ),
    onError: (err: unknown) => {
      handleApiError('Failed to load ongoing polls', err)
    },
  })

  const currentPolls = ongoingPollsData?.polls || []
  const totalCount = ongoingPollsData?.total_count || 0
  const totalPages = Math.ceil(totalCount / QUICKPOLL_DEFAULT_LIMIT)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (isLoadingOngoing && !debouncedSearchQuery) {
    return <CustomLoading text="Loading ongoing polls..." />
  }

  // Error state
  if (ongoingError) {
    return (
      <Box width="100%" py={8}>
        <VStack spacing={6} align="stretch">
          <CustomError
            title="Failed to load ongoing polls"
            description="We couldn't load your ongoing polls. Please try again or contact support if the problem persists."
            imageAlt="Error loading ongoing polls"
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
              onClick={() => refetchOngoing()}
            >
              Try Again
            </Button>
          </Flex>
        </VStack>
      </Box>
    )
  }

  return (
    <VStack spacing={4} align="stretch">
      {upgradeRequired && currentPolls.length > 0 && (
        <Text fontSize="14px" color="neutral.400">
          Unlock unlimited QuickPolls with PRO{' '}
          <Button
            variant="link"
            colorScheme="primary"
            px={0}
            onClick={() => push('/dashboard/settings/subscriptions')}
            textDecoration="underline"
            fontSize="14px"
            height="auto"
            minW="auto"
          >
            here
          </Button>
        </Text>
      )}
      {isLoadingOngoing && debouncedSearchQuery ? (
        <CustomLoading text="Searching polls..." />
      ) : currentPolls.length > 0 ? (
        <>
          <VStack spacing={4} align="stretch">
            {currentPolls.map(poll => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </VStack>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isLoading={isLoadingOngoing}
            />
          )}
        </>
      ) : debouncedSearchQuery ? (
        <EmptyState
          title="No ongoing polls found"
          description={`No ongoing polls match "${debouncedSearchQuery}". Try a different search term.`}
        />
      ) : (
        <EmptyState
          title="No ongoing polls"
          description="You don't have any ongoing polls at the moment. Create a new poll to get started."
        />
      )}
    </VStack>
  )
}

export default OngoingPolls
