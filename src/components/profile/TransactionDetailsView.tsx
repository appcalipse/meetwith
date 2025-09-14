import { Box, Flex, HStack, Icon, Link, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi'

import { getSupportedChainFromId } from '@/types/chains'
import { Transaction } from '@/types/Transactions'
import { formatCurrency } from '@/utils/generic_utils'
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

  const formatCurrencyDisplay = (usdAmount: number): string => {
    const convertedAmount = convertCurrency(usdAmount)
    return formatCurrency(convertedAmount, selectedCurrency, 2)
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
      bg="bg-surface"
      borderRadius="12px"
      p={{ base: 4, md: 12 }}
      border="1px solid"
      borderColor="border-wallet-subtle"
    >
      <Flex
        gap={6}
        align="center"
        mb={{ base: 2, md: 8 }}
        flexDirection={{ base: 'column', md: 'row' }}
        justifyContent="flex-start"
        alignItems={{ base: 'flex-start', md: 'center' }}
      >
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

        <Text
          fontSize={{ base: '20px', md: '24px' }}
          fontWeight="700"
          color="text-primary"
        >
          Transaction Details
        </Text>
      </Flex>

      {/* Transaction Information */}
      <VStack
        spacing={0}
        divider={<Box h="1px" bg="border-subtle" width="100%" />}
      >
        {transaction.direction === 'debit' ? (
          // For debit transactions (sent), show receiver address and host name for meetings
          <>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              justify={{ base: 'flex-start', md: 'space-between' }}
              align={{ base: 'flex-start', md: 'start' }}
              py={6}
              width="100%"
            >
              <Text
                color="text-secondary"
                fontSize="16px"
                fontWeight="700"
                width={{ base: '100%', md: '50%' }}
                mb={{ base: 2, md: 0 }}
              >
                Receiver
              </Text>
              <Text
                color="text-primary"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width={{ base: '100%', md: '50%' }}
              >
                {transaction.metadata?.receiver_address || 'N/A'}
              </Text>
            </Flex>

            {/* Host Name - show for meeting debit transactions */}
            {transaction.meeting_type_id && transaction.counterparty_name && (
              <Flex
                direction={{ base: 'column', md: 'row' }}
                justify={{ base: 'flex-start', md: 'space-between' }}
                align={{ base: 'flex-start', md: 'start' }}
                py={6}
                width="100%"
              >
                <Text
                  color="text-secondary"
                  fontSize="16px"
                  fontWeight="700"
                  width={{ base: '100%', md: '50%' }}
                  mb={{ base: 2, md: 0 }}
                >
                  Host Name
                </Text>
                <Text
                  color="text-primary"
                  fontSize="16px"
                  fontWeight="500"
                  textAlign="left"
                  width={{ base: '100%', md: '50%' }}
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
              direction={{ base: 'column', md: 'row' }}
              justify={{ base: 'flex-start', md: 'space-between' }}
              align={{ base: 'flex-start', md: 'start' }}
              py={6}
              width="100%"
            >
              <Text
                color="text-secondary"
                fontSize="16px"
                fontWeight="700"
                width={{ base: '100%', md: '50%' }}
                mb={{ base: 2, md: 0 }}
              >
                Sender
              </Text>
              <Text
                color="text-primary"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width={{ base: '100%', md: '50%' }}
              >
                {transaction.initiator_address || 'N/A'}
              </Text>
            </Flex>

            {/* Guest Name - show for meeting credit transactions */}
            {transaction.meeting_type_id && meetingSession?.guest_name && (
              <Flex
                direction={{ base: 'column', md: 'row' }}
                justify={{ base: 'flex-start', md: 'space-between' }}
                align={{ base: 'flex-start', md: 'start' }}
                py={6}
                width="100%"
                borderBottom="1px solid"
                borderColor="border-subtle"
              >
                <Text
                  color="text-secondary"
                  fontSize="16px"
                  fontWeight="700"
                  width={{ base: '100%', md: '50%' }}
                  mb={{ base: 2, md: 0 }}
                >
                  Guest Name
                </Text>
                <Text
                  color="text-primary"
                  fontSize="16px"
                  fontWeight="500"
                  textAlign="left"
                  width={{ base: '100%', md: '50%' }}
                >
                  {meetingSession.guest_name}
                </Text>
              </Flex>
            )}

            {/* Guest Email - show for meeting credit transactions */}
            {transaction.meeting_type_id && guestEmail && (
              <Flex
                direction={{ base: 'column', md: 'row' }}
                justify={{ base: 'flex-start', md: 'space-between' }}
                align={{ base: 'flex-start', md: 'start' }}
                py={6}
                width="100%"
              >
                <Text
                  color="text-secondary"
                  fontSize="16px"
                  fontWeight="700"
                  width={{ base: '100%', md: '50%' }}
                  mb={{ base: 2, md: 0 }}
                >
                  Guest Email
                </Text>
                <Text
                  color="text-primary"
                  fontSize="16px"
                  fontWeight="500"
                  textAlign="left"
                  width={{ base: '100%', md: '50%' }}
                >
                  {guestEmail}
                </Text>
              </Flex>
            )}
          </>
        )}

        {/* Plan - show only for actual meeting-related transactions */}
        {transaction.meeting_type_id && meetingTypeTitle && (
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify={{ base: 'flex-start', md: 'space-between' }}
            align={{ base: 'flex-start', md: 'start' }}
            py={6}
            width="100%"
          >
            <Text
              color="text-secondary"
              fontSize="16px"
              fontWeight="700"
              width={{ base: '100%', md: '50%' }}
              mb={{ base: 2, md: 0 }}
            >
              Plan
            </Text>
            <Text
              color="text-primary"
              fontSize="16px"
              fontWeight="500"
              textAlign="left"
              width={{ base: '100%', md: '50%' }}
            >
              {meetingTypeTitle}
            </Text>
          </Flex>
        )}

        {/* Number of Sessions - show only for actual meeting-related transactions */}
        {transaction.meeting_type_id && sessionNumber && (
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify={{ base: 'flex-start', md: 'space-between' }}
            align={{ base: 'flex-start', md: 'start' }}
            py={6}
            width="100%"
          >
            <Text
              color="text-secondary"
              fontSize="16px"
              fontWeight="700"
              width={{ base: '100%', md: '50%' }}
              mb={{ base: 2, md: 0 }}
            >
              Number of Sessions
            </Text>
            <Text
              color="text-primary"
              fontSize="16px"
              fontWeight="500"
              textAlign="left"
              width={{ base: '100%', md: '50%' }}
            >
              {sessionNumber}
            </Text>
          </Flex>
        )}

        {/* Amount */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify={{ base: 'flex-start', md: 'space-between' }}
          align={{ base: 'flex-start', md: 'start' }}
          py={6}
          width="100%"
        >
          <Text
            color="text-secondary"
            fontSize="16px"
            fontWeight="700"
            width={{ base: '100%', md: '50%' }}
            mb={{ base: 2, md: 0 }}
          >
            Amount
          </Text>
          <Text
            color="text-primary"
            fontSize="16px"
            fontWeight="500"
            textAlign="left"
            width={{ base: '100%', md: '50%' }}
          >
            {formatCurrencyDisplay(transaction.amount)}
          </Text>
        </Flex>

        {/* Direction */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify={{ base: 'flex-start', md: 'space-between' }}
          align={{ base: 'flex-start', md: 'start' }}
          py={6}
          width="100%"
        >
          <Text
            color="text-secondary"
            fontSize="16px"
            fontWeight="700"
            width={{ base: '100%', md: '50%' }}
            mb={{ base: 2, md: 0 }}
          >
            Direction
          </Text>
          <Text
            color="text-primary"
            fontSize="16px"
            fontWeight="500"
            textAlign="left"
            width={{ base: '100%', md: '50%' }}
          >
            {transaction.direction.charAt(0).toUpperCase() +
              transaction.direction.slice(1)}
          </Text>
        </Flex>

        {/* Transaction Status */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify={{ base: 'flex-start', md: 'space-between' }}
          align={{ base: 'flex-start', md: 'start' }}
          py={6}
          width="100%"
        >
          <Text
            color="text-secondary"
            fontSize="16px"
            fontWeight="700"
            width={{ base: '100%', md: '50%' }}
            mb={{ base: 2, md: 0 }}
          >
            Transaction Status
          </Text>
          <Text
            color={getStatusColor(transaction.status || 'pending')}
            fontSize="16px"
            fontWeight="500"
            textAlign="left"
            width={{ base: '100%', md: '50%' }}
          >
            {formatStatus(transaction.status || 'pending')}
          </Text>
        </Flex>

        {/* Transaction Hash */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify={{ base: 'flex-start', md: 'space-between' }}
          align={{ base: 'flex-start', md: 'start' }}
          py={6}
          width="100%"
        >
          <Text
            color="text-secondary"
            fontSize="16px"
            fontWeight="700"
            width={{ base: '100%', md: '50%' }}
            mb={{ base: 2, md: 0 }}
          >
            Transaction Hash
          </Text>
          <Box width={{ base: '100%', md: '50%' }}>
            {transaction.transaction_hash ? (
              <HStack spacing={2} align="center">
                <Text
                  color="text-primary"
                  fontSize="16px"
                  fontWeight="500"
                  textAlign="left"
                  whiteSpace="wrap"
                  wordBreak="break-word"
                >
                  {transaction.transaction_hash}
                </Text>
                {transaction.chain_id && (
                  <Link
                    href={`${
                      getSupportedChainFromId(transaction.chain_id)
                        ?.blockExplorerUrl
                    }/tx/${transaction.transaction_hash}`}
                    isExternal
                    color="primary.400"
                    _hover={{ color: 'primary.300' }}
                  >
                    <Icon as={FiExternalLink} fontSize="16px" />
                  </Link>
                )}
              </HStack>
            ) : (
              <Text
                color="text-primary"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
              >
                N/A
              </Text>
            )}
          </Box>
        </Flex>
      </VStack>
    </Box>
  )
}

export default TransactionDetailsView
