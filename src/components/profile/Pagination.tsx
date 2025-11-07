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
      bg="bg-surface"
      borderRadius="12px"
      border="1px solid"
      borderColor="border-wallet-subtle"
    >
      <HStack spacing={4} align="center">
        {/* Previous Button */}
        <Button
          onClick={handlePrevious}
          isDisabled={!canGoPrevious || isLoading}
          bg="transparent"
          color={canGoPrevious ? 'text-secondary' : 'text-muted'}
          _hover={{
            bg: canGoPrevious ? 'bg-surface-tertiary' : 'transparent',
            color: canGoPrevious ? 'text-primary' : 'text-muted',
          }}
          _active={{
            bg: canGoPrevious ? 'border-default' : 'transparent',
          }}
          borderRadius="8px"
          px={3}
          py={2}
          transition="all 0.2s"
          border="1px solid"
          borderColor={
            canGoPrevious ? 'border-wallet-subtle' : 'bg-surface-tertiary'
          }
        >
          <Icon as={FiChevronLeft} fontSize="16px" />
        </Button>

        {/* Page Info */}
        <Text
          color="text-secondary"
          fontSize="14px"
          fontWeight="500"
          px={4}
          py={2}
          bg="bg-surface-tertiary"
          borderRadius="8px"
          border="1px solid"
          borderColor="border-wallet-subtle"
        >
          Page {currentPage} of {totalPages}
        </Text>

        {/* Next Button */}
        <Button
          onClick={handleNext}
          isDisabled={!canGoNext || isLoading}
          bg="transparent"
          color={canGoNext ? 'text-secondary' : 'text-muted'}
          _hover={{
            bg: canGoNext ? 'bg-surface-tertiary' : 'transparent',
            color: canGoNext ? 'text-primary' : 'text-muted',
          }}
          _active={{
            bg: canGoNext ? 'border-wallet-subtle' : 'transparent',
          }}
          borderRadius="8px"
          px={3}
          py={2}
          transition="all 0.2s"
          border="1px solid"
          borderColor={
            canGoNext ? 'border-wallet-subtle' : 'bg-surface-tertiary'
          }
        >
          <Icon as={FiChevronRight} fontSize="16px" />
        </Button>
      </HStack>
    </Box>
  )
}

export default Pagination
