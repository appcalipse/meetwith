import {
  Box,
  Flex,
  HStack,
  Icon,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { OnrampWebSDK } from '@onramp.money/onramp-web-sdk'
import React, { useEffect } from 'react'
import { BsEye, BsEyeSlash } from 'react-icons/bs'
import { FiArrowLeft, FiSearch } from 'react-icons/fi'
import { GrDocumentTime } from 'react-icons/gr'
import { IoChevronDown } from 'react-icons/io5'
import {
  PiArrowCircleRight,
  PiArrowCircleUpRight,
  PiPlusCircleLight,
} from 'react-icons/pi'
import { TbWallet } from 'react-icons/tb'
import { TbSettings2 } from 'react-icons/tb'

import { useCryptoBalance } from '@/hooks/useCryptoBalance'
import { useCryptoBalances } from '@/hooks/useCryptoBalances'
import { useWalletBalance } from '@/hooks/useWalletBalance'
import { useWalletTransactions } from '@/hooks/useWalletTransactions'
import { useWallet } from '@/providers/WalletProvider'
import { Account } from '@/types/Account'
import { CURRENCIES, NETWORKS } from '@/utils/walletConfig'

import Pagination from './Pagination'
import ReceiveFundsModal from './ReceiveFundsModal'
import SendFundsModal from './SendFundsModal'
import TransactionDetailsView from './TransactionDetailsView'

interface WalletProps {
  currentAccount: Account
}

const Wallet: React.FC<WalletProps> = () => {
  const {
    // View states
    showBalance,
    setShowBalance,
    showTransactions,
    setShowTransactions,
    showTransactionDetails,
    setShowTransactionDetails,
    showCryptoDetails,
    setShowCryptoDetails,

    // Selection states
    selectedCurrency,
    setSelectedCurrency,
    selectedNetwork,
    setSelectedNetwork,
    selectedTransaction,
    setSelectedTransaction,
    selectedCrypto,
    setSelectedCrypto,

    // Modal states
    isCurrencyModalOpen,
    setIsCurrencyModalOpen,
    isNetworkModalOpen,
    setIsNetworkModalOpen,
    isSendModalOpen,
    setIsSendModalOpen,
    isReceiveModalOpen,
    setIsReceiveModalOpen,

    // Search and pagination
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    selectedCryptoCurrentPage,
    setSelectedCryptoCurrentPage,
  } = useWallet()

  const transactionsPerPage = 5
  const [onrampInstance, setOnrampInstance] =
    React.useState<OnrampWebSDK | null>(null)
  const { totalBalance, isLoading: balanceLoading } =
    useWalletBalance(selectedCurrency)

  const {
    transactions,
    isLoading: transactionsLoading,
    totalCount,
  } = useWalletTransactions(
    undefined,
    undefined,
    transactionsPerPage,
    (currentPage - 1) * transactionsPerPage
  )

  // Token-specific data for crypto details view
  const selectedCryptoBalance = useCryptoBalance(
    selectedCrypto?.tokenAddress || '',
    selectedCrypto?.chainId || 0
  )

  const {
    transactions: selectedCryptoTransactions,
    isLoading: selectedCryptoTransactionsLoading,
    totalCount: selectedCryptoTotalCount,
  } = useWalletTransactions(
    selectedCrypto?.tokenAddress,
    selectedCrypto?.chainId,
    transactionsPerPage,
    (selectedCryptoCurrentPage - 1) * transactionsPerPage
  )

  // Use centralized configurations
  const currencies = CURRENCIES
  const networks = NETWORKS

  // Use the centralized crypto balances hook
  const { cryptoAssetsWithBalances } = useCryptoBalances({ selectedNetwork })

  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    const meetingSession = tx.originalTransaction.meeting_sessions?.[0]
    const guestEmail = meetingSession?.guest_email
    const guestName = guestEmail?.split('@')[0] || 'Guest'

    return (
      tx.user.toLowerCase().includes(searchLower) ||
      guestName.toLowerCase().includes(searchLower) ||
      guestEmail?.toLowerCase().includes(searchLower) ||
      'Meeting Session'.toLowerCase().includes(searchLower)
    )
  })
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onrampInstance = new OnrampWebSDK({
        appId: parseInt(process.env.NEXT_PUBLIC_ONRAMP_MONEY_APP_ID!), // replace this with the appID you got during onboarding process
        flowType: 2, // 1 -> onramp || 2 -> offramp || 3 -> Merchant checkout,
      })
      setOnrampInstance(onrampInstance)
    }
  }, [])

  const handleShowWithdrawWidget = () => {
    if (onrampInstance) {
      onrampInstance.show()
      onrampInstance.on('TX_EVENTS', e => {
        if (e.type === 'ONRAMP_WIDGET_TX_COMPLETED') {
          // record transaction to db
        }
      })
    }
  }

  const ActionButton = ({ icon, label, isActive = false, onClick }: any) => (
    <VStack spacing={3}>
      <Box
        w="68px"
        h="54px"
        borderRadius="16px"
        bg={isActive ? 'primary.500' : 'neutral.0'}
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        position="relative"
        _hover={{ opacity: 0.8 }}
        transition="all 0.2s"
        boxShadow="0px 1px 2px rgba(0, 0, 0, 0.05)"
        border={isActive ? '2px solid' : 'none'}
        borderColor="neutral.0"
        onClick={onClick}
      >
        <Icon
          as={icon}
          color={isActive ? 'white' : 'primary.500'}
          fontSize="24px"
        />
      </Box>
      <Text fontSize="16px" color="neutral.0" fontWeight="500">
        {label}
      </Text>
    </VStack>
  )

  // Reset pagination when selected crypto changes
  React.useEffect(() => {
    setSelectedCryptoCurrentPage(1)
  }, [selectedCrypto, setSelectedCryptoCurrentPage])

  return (
    <Box maxW="685px" ml="70px" overflowY="auto" height="100%" pb={8}>
      {/* Header */}
      <VStack spacing={2} align="start" mb={6}>
        <Text fontSize="2xl" color="neutral.0" fontWeight="700">
          My Wallet
        </Text>
        <Text
          color="neutral.200"
          fontSize="16px"
          fontWeight="500"
          width="600px"
        >
          A wallet to receive session booking payments, spend your funds and
          participate in DeFi
        </Text>
      </VStack>

      {/* Transaction Details Screen - Full Container */}
      {showTransactionDetails && selectedTransaction ? (
        <TransactionDetailsView
          transaction={selectedTransaction}
          onBack={() => setShowTransactionDetails(false)}
        />
      ) : showCryptoDetails && selectedCrypto ? (
        <Box
          bg="neutral.900"
          borderRadius="12px"
          p={12}
          border="1px solid"
          borderColor="neutral.825"
        >
          {/* Header with Back Link and Title */}
          <Box position="relative" mb={8}>
            <HStack
              spacing={2}
              cursor="pointer"
              onClick={() => setShowCryptoDetails(false)}
              color="primary.400"
              _hover={{ color: 'primary.300' }}
              position="absolute"
              left={0}
              top={0}
              zIndex={1}
            >
              <Icon as={FiArrowLeft} fontSize="20px" />
              <Text fontSize="16px" fontWeight="600">
                Back
              </Text>
            </HStack>

            <Text
              fontSize="24px"
              fontWeight="700"
              color="neutral.0"
              textAlign="center"
              width="100%"
            >
              {selectedCrypto.name}
            </Text>
          </Box>

          {/* Wallet Balance Card */}
          <Box bg="neutral.825" borderRadius="12px" p={6} mb={6}>
            {/* Currency Icon */}
            <Box
              w="48px"
              h="48px"
              borderRadius="full"
              bg="neutral.800"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb={4}
              mx="auto"
            >
              <Image
                src={selectedCrypto.icon}
                alt={selectedCrypto.symbol}
                w="32px"
                h="32px"
              />
            </Box>

            {/* Balance */}
            <VStack spacing={1} mb={6}>
              {selectedCryptoBalance.isLoading ? (
                <HStack spacing={3} align="center">
                  <Spinner color="neutral.400" size="md" />
                  <Text fontSize="16px" color="neutral.400" fontWeight="500">
                    Loading balance...
                  </Text>
                </HStack>
              ) : (
                <>
                  <Text
                    fontSize="48px"
                    fontWeight="500"
                    color="white"
                    lineHeight="1"
                  >
                    {selectedCryptoBalance.balance
                      ? selectedCryptoBalance.balance.toLocaleString()
                      : '0'}
                  </Text>
                  <Text fontSize="16px" color="neutral.300" fontWeight="500">
                    $
                    {selectedCryptoBalance.balance
                      ? selectedCryptoBalance.balance.toLocaleString()
                      : '0'}
                  </Text>
                </>
              )}
            </VStack>

            {/* Action Buttons */}
            <HStack justify="center" spacing={6}>
              <ActionButton
                icon={PiArrowCircleUpRight}
                label="Withdraw funds"
                onClick={() => handleShowWithdrawWidget()}
              />
              <ActionButton
                icon={PiPlusCircleLight}
                label="Receive funds"
                isActive
                onClick={() => setIsReceiveModalOpen(true)}
              />
              <ActionButton
                icon={PiArrowCircleRight}
                label="Send funds"
                onClick={() => setIsSendModalOpen(true)}
              />
            </HStack>
          </Box>

          {/* Search Bar */}
          <Box
            bg="dark.900"
            borderRadius="6px"
            px={4}
            py={2}
            mb={6}
            width="320px"
            display="flex"
            alignItems="center"
            border="1px solid"
            borderColor="neutral.400"
          >
            <Icon as={FiSearch} color="neutral.400" fontSize="20px" mr={2} />
            <input
              type="text"
              placeholder="Search transaction by client name"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'neutral.400',
                fontSize: '16px',
                width: '100%',
                fontWeight: '500',
              }}
            />
          </Box>

          {/* Filter token-specific transactions */}
          {(() => {
            const filteredCryptoTransactions =
              selectedCryptoTransactions.filter(tx => {
                if (!searchQuery) return true
                const searchLower = searchQuery.toLowerCase()
                const meetingSession =
                  tx.originalTransaction.meeting_sessions?.[0]
                const guestEmail = meetingSession?.guest_email
                const guestName = guestEmail?.split('@')[0] || 'Guest'

                return (
                  tx.user.toLowerCase().includes(searchLower) ||
                  guestName.toLowerCase().includes(searchLower) ||
                  guestEmail?.toLowerCase().includes(searchLower) ||
                  'Meeting Session'.toLowerCase().includes(searchLower)
                )
              })
            return (
              <>
                <Text
                  fontSize="24px"
                  fontWeight="700"
                  color="neutral.0"
                  mb={4}
                  textAlign="left"
                >
                  Transaction History
                </Text>
                <VStack spacing={3}>
                  {/* Transaction History Title */}

                  {selectedCryptoTransactionsLoading ? (
                    <Box textAlign="center" py={8}>
                      <Spinner color="neutral.400" size="md" />
                      <Text color="neutral.400" fontSize="16px" mt={2}>
                        Loading transactions...
                      </Text>
                    </Box>
                  ) : filteredCryptoTransactions.length === 0 ? (
                    <Box textAlign="center" py={8}>
                      <Text color="neutral.400" fontSize="16px">
                        {searchQuery
                          ? 'No transactions found'
                          : 'No transactions yet'}
                      </Text>
                    </Box>
                  ) : (
                    <>
                      {filteredCryptoTransactions.map(transaction => (
                        <Box
                          key={transaction.id}
                          bg="neutral.825"
                          borderRadius="16px"
                          p={4}
                          width="100%"
                          cursor="pointer"
                          _hover={{ bg: 'neutral.800' }}
                          transition="all 0.2s"
                          onClick={() => {
                            // Use the original transaction directly
                            setSelectedTransaction(
                              transaction.originalTransaction
                            )
                            setShowTransactionDetails(true)
                          }}
                        >
                          <Flex justify="flex-start" gap={5} align="center">
                            <HStack spacing={3}>
                              {/* User Avatar */}
                              <Box
                                w="40px"
                                h="40px"
                                borderRadius="full"
                                overflow="hidden"
                              >
                                <Image
                                  src={transaction.userImage}
                                  alt={transaction.user}
                                  w="40px"
                                  h="40px"
                                  objectFit="cover"
                                />
                              </Box>

                              {/* Transaction Details */}
                              <Box>
                                <Text
                                  color="white"
                                  fontSize="16px"
                                  fontWeight="500"
                                >
                                  {transaction.user} {transaction.action}
                                </Text>
                              </Box>
                            </HStack>

                            {/* Status and Date */}
                            <Box
                              px={3}
                              py={1}
                              borderRadius="100px"
                              bg={
                                transaction.status === 'Successful'
                                  ? 'green.600'
                                  : 'red.700'
                              }
                            >
                              <Text
                                fontSize="14px"
                                fontWeight="500"
                                color="white"
                              >
                                {transaction.status}
                              </Text>
                            </Box>
                            <Text
                              fontSize="16px"
                              color="neutral.0"
                              fontWeight="500"
                            >
                              {transaction.date} {transaction.time}
                            </Text>
                          </Flex>
                        </Box>
                      ))}

                      {/* Pagination for Crypto Transactions */}
                      <Pagination
                        currentPage={selectedCryptoCurrentPage}
                        totalPages={Math.ceil(
                          selectedCryptoTotalCount / transactionsPerPage
                        )}
                        onPageChange={(page: number) => {
                          setSelectedCryptoCurrentPage(page)
                        }}
                        isLoading={selectedCryptoTransactionsLoading}
                      />
                    </>
                  )}
                </VStack>
              </>
            )
          })()}
        </Box>
      ) : (
        /* Main Wallet Container */
        <Box
          bg="neutral.900"
          borderRadius="12px"
          p={12}
          border="1px solid"
          borderColor="neutral.825"
        >
          {/* Top Row */}
          <Flex justify="space-between" align="center" mb={6}>
            <Box
              bg="neutral.825"
              borderRadius="12px"
              p="10px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <HStack spacing={1}>
                <Icon as={TbWallet} color="white" fontSize="20px" />
                <Text color="white" fontSize="16px" fontWeight="500">
                  Wallet
                </Text>
              </HStack>
            </Box>

            <Box
              bg="neutral.825"
              borderRadius="12px"
              px={3}
              py="10px"
              display="flex"
              alignItems="center"
              gap={2}
              cursor="pointer"
              onClick={() => setIsCurrencyModalOpen(true)}
              _hover={{ opacity: 0.8 }}
            >
              <Image
                src={currencies.find(c => c.code === selectedCurrency)?.flag}
                alt={selectedCurrency}
                w="20px"
                h="20px"
              />
              <Text color="white" fontSize="16px" fontWeight="500">
                {selectedCurrency}
              </Text>
              <Icon as={IoChevronDown} color="neutral.300" fontSize="16px" />
            </Box>

            <HStack spacing={8}>
              <Icon as={TbSettings2} color="neutral.0" fontSize="24px" />

              <Box
                w="40px"
                h="40px"
                borderRadius="full"
                overflow="hidden"
                cursor="pointer"
              >
                <Image
                  src="/assets/wallet-add.png"
                  alt="Profile"
                  w="40px"
                  h="40px"
                  objectFit="cover"
                />
              </Box>
            </HStack>
          </Flex>

          {/* Wallet Card */}
          <Box bg="neutral.825" borderRadius="12px" p={6} mb={6}>
            {/* Balance Section */}
            <VStack spacing={2} align="center" mb={4}>
              <HStack spacing={2}>
                <Text fontSize="16px" color="white" fontWeight="500">
                  Wallet balance
                </Text>
                <Icon
                  as={showBalance ? BsEye : BsEyeSlash}
                  color="neutral.400"
                  fontSize="16px"
                  cursor="pointer"
                  onClick={() => setShowBalance(!showBalance)}
                  _hover={{ color: 'neutral.300' }}
                />
              </HStack>
              {balanceLoading ? (
                <VStack spacing={2} align="center">
                  <Box
                    w="200px"
                    h="48px"
                    borderRadius="8px"
                    bg="neutral.800"
                    position="relative"
                    overflow="hidden"
                    _before={{
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background:
                        'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                      animation: 'shimmer 1.5s infinite',
                    }}
                  />
                  <Box
                    w="120px"
                    h="16px"
                    borderRadius="4px"
                    bg="neutral.800"
                    position="relative"
                    overflow="hidden"
                    _before={{
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background:
                        'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                      animation: 'shimmer 1.5s infinite',
                    }}
                  />
                </VStack>
              ) : (
                <Text
                  fontSize="48px"
                  fontWeight="500"
                  color="white"
                  lineHeight="1"
                >
                  {showBalance
                    ? `$${totalBalance.toLocaleString()}`
                    : '••••••••'}
                </Text>
              )}
            </VStack>

            {/* Action Buttons */}
            <HStack justify="center" spacing={16}>
              <ActionButton
                icon={PiArrowCircleUpRight}
                label="Withdraw funds"
                onClick={() => handleShowWithdrawWidget()}
              />
              <ActionButton
                icon={PiPlusCircleLight}
                label="Receive funds"
                isActive
                onClick={() => setIsReceiveModalOpen(true)}
              />
              <ActionButton
                icon={PiArrowCircleRight}
                label="Send funds"
                onClick={() => setIsSendModalOpen(true)}
              />
            </HStack>
          </Box>

          {/* Transaction Notification - only show when not in transaction view and there are recent transactions */}
          {!showTransactions && transactions.length > 0 && (
            <Box
              bg="neutral.825"
              borderRadius="25px"
              px={4}
              py={3}
              mb={6}
              width="516px"
              marginLeft="auto"
              marginRight="auto"
              textAlign="center"
            >
              <Text color="neutral.75" fontSize="16px" fontWeight="500">
                {transactionsLoading ? (
                  'Loading recent transactions...'
                ) : (
                  <>
                    You have {totalCount} transaction
                    {totalCount !== 1 ? 's' : ''}.{' '}
                    <Text
                      as="span"
                      color="primary.200"
                      cursor="pointer"
                      textDecoration="underline"
                      _hover={{ color: 'primary.300' }}
                      onClick={() => setShowTransactions(true)}
                    >
                      Show all transactions
                    </Text>
                  </>
                )}
              </Text>
            </Box>
          )}

          {/* Transaction History Screen */}
          {showTransactions && !showTransactionDetails ? (
            <Box mt={12}>
              <HStack justify="space-between" align="center">
                {/* Back Link */}
                <HStack
                  spacing={2}
                  mb={8}
                  cursor="pointer"
                  onClick={() => setShowTransactions(false)}
                  color="primary.400"
                  _hover={{ color: 'primary.300' }}
                >
                  <Icon as={FiArrowLeft} fontSize="20px" />
                  <Text fontSize="16px" fontWeight="600">
                    Back
                  </Text>
                </HStack>

                {/* Search Bar */}
                <Box
                  bg="dark.900"
                  borderRadius="6px"
                  px={4}
                  py={2}
                  mb={6}
                  width="320px"
                  display="flex"
                  alignItems="center"
                  border="1px solid"
                  borderColor="neutral.400"
                >
                  <Icon
                    as={FiSearch}
                    color="neutral.400"
                    fontSize="20px"
                    mr={2}
                  />
                  <input
                    type="text"
                    placeholder="Search transaction by client name"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'neutral.400',
                      fontSize: '16px',
                      width: '100%',
                      fontWeight: '500',
                    }}
                  />
                </Box>
              </HStack>

              {/* Title */}
              <Text fontSize="24px" fontWeight="700" color="neutral.0" mb={2}>
                Transaction History
              </Text>

              {/* Transactions List */}
              <VStack spacing={3}>
                {transactionsLoading ? (
                  <Box textAlign="center" py={8}>
                    <Spinner color="neutral.400" size="md" />
                    <Text color="neutral.400" fontSize="16px" mt={2}>
                      Loading transactions...
                    </Text>
                  </Box>
                ) : filteredTransactions.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Text color="neutral.400" fontSize="16px">
                      {searchQuery
                        ? 'No transactions found'
                        : 'No transactions yet'}
                    </Text>
                  </Box>
                ) : (
                  <>
                    {filteredTransactions.map(transaction => (
                      <Box
                        key={transaction.id}
                        bg="neutral.825"
                        borderRadius="16px"
                        p={4}
                        width="100%"
                        cursor="pointer"
                        _hover={{ bg: 'neutral.800' }}
                        transition="all 0.2s"
                        onClick={() => {
                          // Use the original transaction directly
                          setSelectedTransaction(
                            transaction.originalTransaction
                          )
                          setShowTransactionDetails(true)
                        }}
                      >
                        <Flex justify="flex-start" gap={5} align="center">
                          <HStack spacing={3}>
                            {/* User Avatar */}
                            <Box
                              w="40px"
                              h="40px"
                              borderRadius="full"
                              overflow="hidden"
                            >
                              <Image
                                src={transaction.userImage}
                                alt={transaction.user}
                                w="40px"
                                h="40px"
                                objectFit="cover"
                              />
                            </Box>

                            {/* Transaction Details */}
                            <Box>
                              <Text
                                color="white"
                                fontSize="16px"
                                fontWeight="500"
                              >
                                {transaction.user} {transaction.action}
                              </Text>
                            </Box>
                          </HStack>

                          {/* Status and Date */}
                          <Box
                            px={3}
                            py={1}
                            borderRadius="100px"
                            bg={
                              transaction.status === 'Successful'
                                ? 'green.600'
                                : 'red.700'
                            }
                          >
                            <Text
                              fontSize="14px"
                              fontWeight="500"
                              color="white"
                            >
                              {transaction.status}
                            </Text>
                          </Box>
                          <Text
                            fontSize="16px"
                            color="neutral.0"
                            fontWeight="500"
                          >
                            {transaction.date} {transaction.time}
                          </Text>
                        </Flex>
                      </Box>
                    ))}

                    {/* Pagination */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalCount / transactionsPerPage)}
                      onPageChange={(page: number) => {
                        setCurrentPage(page)
                      }}
                      isLoading={transactionsLoading}
                    />
                  </>
                )}
              </VStack>
            </Box>
          ) : (
            <>
              {/* Crypto Section Header */}
              <Flex justify="space-between" align="center" mb={4}>
                <Box p={1.5} bg="neutral.825" borderRadius="12px">
                  <Box
                    bg="neutral.600"
                    color="white"
                    px={5}
                    py={1.5}
                    borderRadius="12px"
                    fontSize="16px"
                    fontWeight="700"
                    _hover={{ bg: 'neutral.600', opacity: 0.8 }}
                  >
                    Crypto
                  </Box>
                </Box>

                <HStack spacing={5}>
                  <Box
                    bg="neutral.825"
                    borderRadius="12px"
                    px={4}
                    py={2}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    cursor="pointer"
                    onClick={() => setIsNetworkModalOpen(true)}
                    _hover={{ opacity: 0.8 }}
                    border="1px solid"
                    borderColor="neutral.400"
                  >
                    <Image
                      src={networks.find(n => n.name === selectedNetwork)?.icon}
                      alt={selectedNetwork}
                      borderRadius="full"
                      w="20px"
                      h="20px"
                    />
                    <Text color="white" fontSize="16px" fontWeight="700" pr={4}>
                      {selectedNetwork}
                    </Text>
                    <Icon
                      as={IoChevronDown}
                      color="neutral.0"
                      fontSize="16px"
                    />
                  </Box>

                  <Box
                    w="40px"
                    h="40px"
                    borderRadius="10px"
                    bg="primary.200"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{ opacity: 0.8 }}
                  >
                    <Icon
                      as={GrDocumentTime}
                      color="neutral.800"
                      fontSize="20px"
                    />
                  </Box>
                </HStack>
              </Flex>

              {/* Crypto Assets */}
              <VStack spacing={4} mt={5}>
                {cryptoAssetsWithBalances.length === 0
                  ? // Show skeleton cards while loading
                    Array.from({ length: 3 }).map((_, index) => (
                      <Box
                        key={`skeleton-${index}`}
                        bg="neutral.825"
                        borderRadius="12px"
                        p={4}
                        width="100%"
                        position="relative"
                        overflow="hidden"
                        _before={{
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background:
                            'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                          animation: 'shimmer 2s ease-in-out infinite',
                          zIndex: 1,
                        }}
                        sx={{
                          '@keyframes shimmer': {
                            '0%': {
                              left: '-100%',
                              opacity: 0.3,
                            },
                            '50%': {
                              left: '100%',
                              opacity: 0.8,
                            },
                            '100%': {
                              left: '100%',
                              opacity: 0.3,
                            },
                          },
                        }}
                      >
                        <Flex
                          justify="space-between"
                          align="center"
                          position="relative"
                          zIndex={2}
                        >
                          <HStack spacing={3}>
                            <Box
                              w="48px"
                              h="48px"
                              borderRadius="full"
                              bg="neutral.800"
                              position="relative"
                              overflow="hidden"
                              _before={{
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '100%',
                                height: '100%',
                                background:
                                  'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                                animation: 'shimmer 1.5s infinite',
                              }}
                            />
                            <VStack align="start" spacing={0}>
                              <Box
                                w="120px"
                                h="20px"
                                borderRadius="4px"
                                bg="neutral.800"
                                position="relative"
                                overflow="hidden"
                                _before={{
                                  content: '""',
                                  position: 'absolute',
                                  top: 0,
                                  left: '-100%',
                                  width: '100%',
                                  height: '100%',
                                  background:
                                    'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                                  animation: 'shimmer 1.5s infinite',
                                }}
                              />
                              <HStack spacing={3}>
                                <Box
                                  w="60px"
                                  h="16px"
                                  borderRadius="4px"
                                  bg="neutral.800"
                                  position="relative"
                                  overflow="hidden"
                                  _before={{
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background:
                                      'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                                    animation: 'shimmer 1.5s infinite',
                                  }}
                                />
                                <Box
                                  w="40px"
                                  h="16px"
                                  borderRadius="4px"
                                  bg="neutral.800"
                                  position="relative"
                                  overflow="hidden"
                                  _before={{
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background:
                                      'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                                    animation: 'shimmer 1.5s infinite',
                                  }}
                                />
                              </HStack>
                            </VStack>
                          </HStack>
                          <VStack align="end" spacing={0}>
                            <Box
                              w="80px"
                              h="20px"
                              borderRadius="4px"
                              bg="neutral.800"
                              position="relative"
                              overflow="hidden"
                              _before={{
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '100%',
                                height: '100%',
                                background:
                                  'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                                animation: 'shimmer 1.5s infinite',
                              }}
                            />
                            <Box
                              w="60px"
                              h="16px"
                              borderRadius="4px"
                              bg="neutral.800"
                              position="relative"
                              overflow="hidden"
                              _before={{
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '100%',
                                height: '100%',
                                background:
                                  'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                                animation: 'shimmer 1.5s infinite',
                              }}
                            />
                          </VStack>
                        </Flex>
                      </Box>
                    ))
                  : cryptoAssetsWithBalances.map((asset, index) => (
                      <Box
                        key={index}
                        bg="neutral.825"
                        borderRadius="12px"
                        p={4}
                        width="100%"
                        cursor="pointer"
                        _hover={{ bg: 'neutral.800' }}
                        transition="all 0.2s"
                        onClick={() => {
                          setSelectedCrypto(asset)
                          setShowCryptoDetails(true)
                        }}
                      >
                        <Flex justify="space-between" align="center">
                          <HStack spacing={3}>
                            <Box position="relative">
                              <Image
                                src={asset.icon}
                                alt={asset.symbol}
                                w="48px"
                                h="48px"
                                borderRadius="full"
                              />
                              {/* Network overlay icon */}
                              <Box
                                position="absolute"
                                bottom="-4px"
                                right="-5px"
                                w="24px"
                                h="24px"
                                borderRadius="full"
                                bg="neutral.900"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                border="1px solid"
                                borderColor="neutral.800"
                                zIndex={10}
                                backgroundSize="cover"
                                overflow="hidden"
                              >
                                <Image
                                  src={
                                    asset.networkName === 'Celo'
                                      ? '/assets/chains/Celo.svg'
                                      : '/assets/chains/Arbitrum.svg'
                                  }
                                  alt={asset.networkName}
                                  w="100%"
                                  h="100%"
                                  backgroundSize="cover"
                                  borderRadius="full"
                                />
                              </Box>
                            </Box>
                            <VStack align="start" spacing={0}>
                              <Text
                                color="white"
                                fontSize="20px"
                                fontWeight="700"
                              >
                                {asset.name}
                              </Text>
                              <HStack spacing={3}>
                                <Text
                                  fontSize="16px"
                                  fontWeight="500"
                                  color="white"
                                >
                                  {asset.price}
                                </Text>
                                {/* <Text
                                  fontSize="16px"
                                  fontWeight="500"
                                  color="green.400"
                                >
                                  {asset.change}
                                </Text> */}
                              </HStack>
                            </VStack>
                          </HStack>
                          <VStack align="end" spacing={0}>
                            {asset.isLoading ? (
                              <>
                                <Box
                                  w="80px"
                                  h="20px"
                                  borderRadius="4px"
                                  bg="neutral.800"
                                  position="relative"
                                  overflow="hidden"
                                  _before={{
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background:
                                      'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                                    animation: 'shimmer 1.5s infinite',
                                  }}
                                />
                                <Box
                                  w="60px"
                                  h="16px"
                                  borderRadius="4px"
                                  bg="neutral.800"
                                  position="relative"
                                  overflow="hidden"
                                  _before={{
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background:
                                      'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                                    animation: 'shimmer 1.5s infinite',
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                <Text
                                  color="white"
                                  fontSize="20px"
                                  fontWeight="700"
                                >
                                  {asset.balance}
                                </Text>
                                <Text
                                  fontSize="16px"
                                  fontWeight="500"
                                  color="white"
                                >
                                  {asset.usdValue}
                                </Text>
                              </>
                            )}
                          </VStack>
                        </Flex>
                      </Box>
                    ))}
              </VStack>
            </>
          )}
        </Box>
      )}

      {/* Currency Selection Modal */}
      <Modal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        size="md"
        isCentered
      >
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="neutral.850"
          borderRadius="12px"
          border="1px solid"
          borderColor="neutral.800"
        >
          <ModalHeader color="white" fontSize="20px" fontWeight="600" pb={2}>
            Show value in
          </ModalHeader>
          <ModalBody pb={6}>
            <RadioGroup value={selectedCurrency} onChange={setSelectedCurrency}>
              <VStack spacing={6} align="stretch">
                {currencies.map(currency => (
                  <Radio
                    key={currency.code}
                    value={currency.code}
                    colorScheme="orange"
                    size="lg"
                    variant="filled"
                    py={1}
                  >
                    <HStack spacing={3}>
                      <Image
                        src={currency.flag}
                        alt={currency.code}
                        w="24px"
                        h="24px"
                        borderRadius="full"
                      />
                      <Text color="white" fontSize="16px">
                        {currency.name}
                      </Text>
                    </HStack>
                  </Radio>
                ))}
              </VStack>
            </RadioGroup>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Network Selection Modal */}
      <Modal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        size="md"
        isCentered
      >
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="neutral.850"
          borderRadius="12px"
          border="1px solid"
          borderColor="neutral.800"
        >
          <ModalHeader color="white" fontSize="20px" fontWeight="600" pb={2}>
            Choose Network
          </ModalHeader>
          <ModalBody pb={6}>
            <RadioGroup value={selectedNetwork} onChange={setSelectedNetwork}>
              <VStack spacing={6} align="stretch">
                {networks.map(network => (
                  <Radio
                    key={network.name}
                    value={network.name}
                    colorScheme="orange"
                    size="lg"
                    variant="filled"
                    py={1}
                  >
                    <HStack spacing={3}>
                      <Box
                        w="24px"
                        h="24px"
                        borderRadius="full"
                        bg="neutral.800"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                      >
                        <Image
                          src={network.icon}
                          alt={network.name}
                          w="16px"
                          h="16px"
                        />
                      </Box>
                      <Text color="white" fontSize="16px">
                        {network.name}
                      </Text>
                    </HStack>
                  </Radio>
                ))}
              </VStack>
            </RadioGroup>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Send Funds Modal */}
      <SendFundsModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        selectedNetwork={selectedNetwork}
        isFromTokenView={showCryptoDetails && selectedCrypto !== null}
        selectedCryptoNetwork={
          showCryptoDetails && selectedCrypto !== null
            ? selectedCrypto.networkName
            : undefined
        }
      />

      {/* Receive Funds Modal */}
      <ReceiveFundsModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
      />
    </Box>
  )
}

export default Wallet
