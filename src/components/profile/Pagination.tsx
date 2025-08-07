import { Box, Button, HStack, Icon, Text } from '@chakra-ui/react'
import React from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}) => {
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  const handlePrevious = () => {
    if (canGoPrevious && !isLoading) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (canGoNext && !isLoading) {
      onPageChange(currentPage + 1)
    }
  }

  // Don't render if there's only one page or no pages
  if (totalPages <= 1) {
    return null
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      py={4}
      px={6}
      bg="neutral.900"
      borderRadius="12px"
      border="1px solid"
      borderColor="neutral.825"
    >
      <HStack spacing={4} align="center">
        {/* Previous Button */}
        <Button
          onClick={handlePrevious}
          isDisabled={!canGoPrevious || isLoading}
          bg="transparent"
          color={canGoPrevious ? 'neutral.300' : 'neutral.600'}
          _hover={{
            bg: canGoPrevious ? 'neutral.800' : 'transparent',
            color: canGoPrevious ? 'neutral.200' : 'neutral.600',
          }}
          _active={{
            bg: canGoPrevious ? 'neutral.700' : 'transparent',
          }}
          borderRadius="8px"
          px={3}
          py={2}
          transition="all 0.2s"
          border="1px solid"
          borderColor={canGoPrevious ? 'neutral.700' : 'neutral.800'}
        >
          <Icon as={FiChevronLeft} fontSize="16px" />
        </Button>

        {/* Page Info */}
        <Text
          color="neutral.300"
          fontSize="14px"
          fontWeight="500"
          px={4}
          py={2}
          bg="neutral.800"
          borderRadius="8px"
          border="1px solid"
          borderColor="neutral.700"
        >
          Page {currentPage} of {totalPages}
        </Text>

        {/* Next Button */}
        <Button
          onClick={handleNext}
          isDisabled={!canGoNext || isLoading}
          bg="transparent"
          color={canGoNext ? 'neutral.300' : 'neutral.600'}
          _hover={{
            bg: canGoNext ? 'neutral.800' : 'transparent',
            color: canGoNext ? 'neutral.200' : 'neutral.600',
          }}
          _active={{
            bg: canGoNext ? 'neutral.700' : 'transparent',
          }}
          borderRadius="8px"
          px={3}
          py={2}
          transition="all 0.2s"
          border="1px solid"
          borderColor={canGoNext ? 'neutral.700' : 'neutral.800'}
        >
          <Icon as={FiChevronRight} fontSize="16px" />
        </Button>
      </HStack>
    </Box>
  )
}

export default Pagination
