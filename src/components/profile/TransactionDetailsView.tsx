import { Box, Flex, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { FiArrowLeft } from 'react-icons/fi'

import { Transaction } from '@/types/Transactions'
import { CurrencySymbol } from '@/utils/constants'
import { CurrencyService } from '@/utils/services/currency.service'

interface TransactionDetailsViewProps {
  transaction: Transaction
  onBack: () => void
  selectedCurrency?: string
}

const TransactionDetailsView: React.FC<TransactionDetailsViewProps> = ({
  transaction,
  onBack,
  selectedCurrency = 'USD',
}) => {
  // Currency conversion hook
  const { data: exchangeRate } = useQuery(
    ['exchangeRate', selectedCurrency],
    () => CurrencyService.getExchangeRate(selectedCurrency),
    {
      enabled: selectedCurrency !== 'USD',
      staleTime: 1000 * 60 * 60,
      cacheTime: 1000 * 60 * 60 * 24,
    }
  )

  // Convert USD amount to selected currency
  const convertCurrency = (usdAmount: number): number => {
    if (selectedCurrency === 'USD' || !exchangeRate) {
      return usdAmount
    }
    return usdAmount * exchangeRate
  }

  // Format currency display
  const formatCurrencyDisplay = (usdAmount: number): string => {
    const convertedAmount = convertCurrency(usdAmount)
    const currencySymbol =
      CurrencySymbol[selectedCurrency as keyof typeof CurrencySymbol] ||
      selectedCurrency

    return `${currencySymbol}${convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Get guest information from meeting sessions
  const meetingSession = transaction.meeting_sessions?.[0]
  const guestEmail = meetingSession?.guest_email
  const sessionNumber = meetingSession?.session_number

  // Get meeting type information from joined data
  const meetingType = transaction.meeting_types?.[0]
  const meetingTypeTitle = meetingType?.title

  // Get status color based on transaction status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green.400'
      case 'pending':
        return 'yellow.400'
      case 'failed':
        return 'red.400'
      case 'cancelled':
        return 'gray.400'
      default:
        return 'yellow.400'
    }
  }

  // Format status for display
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <Box
      bg="neutral.900"
      borderRadius="12px"
      p={12}
      border="1px solid"
      borderColor="neutral.825"
    >
      <HStack gap={6} align="center" mb={8}>
        <HStack
          spacing={2}
          cursor="pointer"
          onClick={onBack}
          color="primary.400"
          _hover={{ color: 'primary.300' }}
        >
          <Icon as={FiArrowLeft} fontSize="20px" />
          <Text fontSize="16px" fontWeight="600">
            Back
          </Text>
        </HStack>

        <Text fontSize="24px" fontWeight="700" color="neutral.0">
          Transaction Details
        </Text>
      </HStack>

      {/* Transaction Information */}
      <VStack
        spacing={0}
        divider={<Box h="1px" bg="neutral.600" width="100%" />}
      >
        {transaction.direction === 'debit' ? (
          // For debit transactions (sent), show receiver address and host name for meetings
          <>
            <Flex
              justify="space-between"
              align="start"
              py={6}
              width="100%"
              borderBottom="1px solid"
              borderColor="neutral.600"
            >
              <Text
                color="neutral.300"
                fontSize="16px"
                fontWeight="700"
                width="50%"
              >
                Receiver
              </Text>
              <Text
                color="white"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width="50%"
              >
                {transaction.metadata?.receiver_address || 'N/A'}
              </Text>
            </Flex>

            {/* Host Name - show for meeting debit transactions */}
            {transaction.meeting_type_id && transaction.counterparty_name && (
              <Flex justify="space-between" align="start" py={6} width="100%">
                <Text
                  color="neutral.300"
                  fontSize="16px"
                  fontWeight="700"
                  width="50%"
                >
                  Host Name
                </Text>
                <Text
                  color="white"
                  fontSize="16px"
                  fontWeight="500"
                  textAlign="left"
                  width="50%"
                >
                  {transaction.counterparty_name}
                </Text>
              </Flex>
            )}
          </>
        ) : (
          // For credit transactions (received), show sender and meeting-related fields
          <>
            {/* Sender - show for all credit transactions */}
            <Flex
              justify="space-between"
              align="start"
              py={6}
              width="100%"
              borderBottom="1px solid"
              borderColor="neutral.600"
            >
              <Text
                color="neutral.300"
                fontSize="16px"
                fontWeight="700"
                width="50%"
              >
                Sender
              </Text>
              <Text
                color="white"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width="50%"
              >
                {transaction.initiator_address || 'N/A'}
              </Text>
            </Flex>

            {/* Guest Name - show for meeting credit transactions */}
            {transaction.meeting_type_id && meetingSession?.guest_name && (
              <Flex
                justify="space-between"
                align="start"
                py={6}
                width="100%"
                borderBottom="1px solid"
                borderColor="neutral.600"
              >
                <Text
                  color="neutral.300"
                  fontSize="16px"
                  fontWeight="700"
                  width="50%"
                >
                  Guest Name
                </Text>
                <Text
                  color="white"
                  fontSize="16px"
                  fontWeight="500"
                  textAlign="left"
                  width="50%"
                >
                  {meetingSession.guest_name}
                </Text>
              </Flex>
            )}

            {/* Guest Email - show for meeting credit transactions */}
            {transaction.meeting_type_id && guestEmail && (
              <Flex justify="space-between" align="start" py={6} width="100%">
                <Text
                  color="neutral.300"
                  fontSize="16px"
                  fontWeight="700"
                  width="50%"
                >
                  Guest Email
                </Text>
                <Text
                  color="white"
                  fontSize="16px"
                  fontWeight="500"
                  textAlign="left"
                  width="50%"
                >
                  {guestEmail}
                </Text>
              </Flex>
            )}
          </>
        )}

        {/* Plan - show only for actual meeting-related transactions */}
        {transaction.meeting_type_id && meetingTypeTitle && (
          <Flex justify="space-between" align="start" py={6} width="100%">
            <Text
              color="neutral.300"
              fontSize="16px"
              fontWeight="700"
              width="50%"
            >
              Plan
            </Text>
            <Text
              color="white"
              fontSize="16px"
              fontWeight="500"
              textAlign="left"
              width="50%"
            >
              {meetingTypeTitle}
            </Text>
          </Flex>
        )}

        {/* Number of Sessions - show only for actual meeting-related transactions */}
        {transaction.meeting_type_id && sessionNumber && (
          <Flex justify="space-between" align="start" py={6} width="100%">
            <Text
              color="neutral.300"
              fontSize="16px"
              fontWeight="700"
              width="50%"
            >
              Number of Sessions
            </Text>
            <Text
              color="white"
              fontSize="16px"
              fontWeight="500"
              textAlign="left"
              width="50%"
            >
              {sessionNumber}
            </Text>
          </Flex>
        )}

        {/* Amount */}
        <Flex justify="space-between" align="start" py={6} width="100%">
          <Text
            color="neutral.300"
            fontSize="16px"
            fontWeight="700"
            width="50%"
          >
            Amount
          </Text>
          <Text
            color="white"
            fontSize="16px"
            fontWeight="500"
            textAlign="left"
            width="50%"
          >
            {formatCurrencyDisplay(transaction.amount)}
          </Text>
        </Flex>

        {/* Direction */}
        <Flex justify="space-between" align="start" py={6} width="100%">
          <Text
            color="neutral.300"
            fontSize="16px"
            fontWeight="700"
            width="50%"
          >
            Direction
          </Text>
          <Text
            color="white"
            fontSize="16px"
            fontWeight="500"
            textAlign="left"
            width="50%"
          >
            {transaction.direction.charAt(0).toUpperCase() +
              transaction.direction.slice(1)}
          </Text>
        </Flex>

        {/* Transaction Status */}
        <Flex justify="space-between" align="start" py={6} width="100%">
          <Text
            color="neutral.300"
            fontSize="16px"
            fontWeight="700"
            width="50%"
          >
            Transaction Status
          </Text>
          <Text
            color={getStatusColor(transaction.status || 'pending')}
            fontSize="16px"
            fontWeight="500"
            textAlign="left"
            width="50%"
          >
            {formatStatus(transaction.status || 'pending')}
          </Text>
        </Flex>

        {/* Transaction Hash */}
        <Flex justify="space-between" align="start" py={6} width="100%">
          <Text
            color="neutral.300"
            fontSize="16px"
            fontWeight="700"
            width="50%"
          >
            Transaction Hash
          </Text>
          <Text
            color="white"
            fontSize="16px"
            fontWeight="500"
            textAlign="left"
            width="50%"
          >
            {transaction.transaction_hash || 'N/A'}
          </Text>
        </Flex>
      </VStack>
    </Box>
  )
}

export default TransactionDetailsView
