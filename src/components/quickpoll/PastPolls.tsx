import { Box, Button, Flex, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
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

interface PastPollsProps {
  searchQuery?: string
}

const PastPolls = ({ searchQuery = '' }: PastPollsProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500)

  const {
    data: pastPollsData,
    isLoading: isLoadingPast,
    error: pastError,
    refetch: refetchPast,
  } = useQuery({
    queryKey: ['past-quickpolls', debouncedSearchQuery, currentPage],
    queryFn: () =>
      getQuickPolls(
        QUICKPOLL_DEFAULT_LIMIT,
        (currentPage - 1) * QUICKPOLL_DEFAULT_LIMIT,
        [PollStatus.COMPLETED, PollStatus.CANCELLED],
        debouncedSearchQuery
      ),
    onError: (err: unknown) => {
      handleApiError('Failed to load past polls', err)
    },
  })

  const currentPolls = pastPollsData?.polls || []
  const totalCount = pastPollsData?.total_count || 0
  const totalPages = Math.ceil(totalCount / QUICKPOLL_DEFAULT_LIMIT)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (isLoadingPast && !debouncedSearchQuery) {
    return <CustomLoading text="Loading past polls..." />
  }

  // Error state
  if (pastError) {
    return (
      <Box width="100%" py={8}>
        <VStack spacing={6} align="stretch">
          <CustomError
            title="Failed to load past polls"
            description="We couldn't load your past polls. Please try again or contact support if the problem persists."
            imageAlt="Error loading past polls"
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
              onClick={() => refetchPast()}
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
      {isLoadingPast && debouncedSearchQuery ? (
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
              isLoading={isLoadingPast}
            />
          )}
        </>
      ) : debouncedSearchQuery ? (
        <EmptyState
          title="No past polls found"
          description={`No past polls match "${debouncedSearchQuery}". Try a different search term.`}
        />
      ) : (
        <EmptyState
          title="No past polls"
          description="You don't have any completed or cancelled polls yet."
        />
      )}
    </VStack>
  )
}

export default PastPolls
