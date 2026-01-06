import {
  Box,
  Flex,
  HStack,
  Icon,
  Image,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useRef, useState } from 'react'
import React from 'react'
import { BsEye, BsEyeSlash } from 'react-icons/bs'
import { FaCircleInfo } from 'react-icons/fa6'
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
import { useOnClickOutside } from 'usehooks-ts'

import { useCryptoBalance } from '@/hooks/useCryptoBalance'
import { useCryptoBalances } from '@/hooks/useCryptoBalances'
import { useDebounceValue } from '@/hooks/useDebounceValue'
import { useWalletBalance } from '@/hooks/useWalletBalance'
import { useWalletTransactions } from '@/hooks/useWalletTransactions'
import { useWallet } from '@/providers/WalletProvider'
import { Account } from '@/types/Account'
import { getChainId, SupportedChain, supportedChains } from '@/types/chains'
import { SettingsSection } from '@/types/Dashboard'
import { getPaymentPreferences } from '@/utils/api_helper'
import { sendEnablePinLink } from '@/utils/api_helper'
import { getNotificationSubscriptions } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { formatCurrency } from '@/utils/generic_utils'
import { CurrencyService } from '@/utils/services/currency.service'
import { useToastHelpers } from '@/utils/toasts'
import { getAccountDisplayName } from '@/utils/user_manager'
import { CURRENCIES, NETWORKS } from '@/utils/walletConfig'

import WithdrawFundsModal from '../wallet/WithdrawFundsModal'
import { Avatar } from './components/Avatar'
import CurrencySelector from './components/CurrencySelector'
import MagicLinkModal from './components/MagicLinkModal'
import NetworkSelector from './components/NetworkSelector'
import WalletActionButton from './components/WalletActionButton'
import Pagination from './Pagination'
import ReceiveFundsModal from './ReceiveFundsModal'
import SendFundsModal from './SendFundsModal'
import TransactionDetailsView from './TransactionDetailsView'

interface WalletProps {
  currentAccount: Account
}

const Wallet: React.FC<WalletProps> = ({ currentAccount }) => {
  const router = useRouter()
  const { showSuccessToast } = useToastHelpers()

  // Network dropdown state
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false)
  const networkDropdownRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(networkDropdownRef, () => {
    setIsNetworkDropdownOpen(false)
  })

  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false)
  const currencyDropdownRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(currencyDropdownRef, () => {
    setIsCurrencyDropdownOpen(false)
  })

  // PIN protection state
  const {
    isOpen: isMagicLinkOpen,
    onOpen: _onMagicLinkOpen,
    onClose: onMagicLinkClose,
  } = useDisclosure()
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const [notificationEmail, _setNotificationEmail] = useState<string | null>(
    null
  )

  // Fetch payment preferences to check if PIN is set
  const { data: _paymentPreferences } = useQuery(
    ['paymentPreferences', currentAccount?.address],
    () => getPaymentPreferences(),
    {
      enabled: !!currentAccount?.address,
    }
  )

  // Fetch notification subscriptions to get email
  const { data: _notificationSubscriptions } = useQuery(
    ['notificationSubscriptions', currentAccount?.address],
    () => getNotificationSubscriptions(),
    {
      enabled: !!currentAccount?.address,
    }
  )

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

    // Loading state
    isNetworkLoading,

    // Modal states
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
  const { isOpen, onClose, onOpen } = useDisclosure()
  const { totalBalance, isLoading: balanceLoading } = useWalletBalance('USD')

  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500)

  const {
    transactions,
    isLoading: transactionsLoading,
    totalCount,
  } = useWalletTransactions(
    undefined,
    undefined,
    transactionsPerPage,
    (currentPage - 1) * transactionsPerPage,
    selectedCurrency,
    debouncedSearchQuery
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
    (selectedCryptoCurrentPage - 1) * transactionsPerPage,
    selectedCurrency,
    debouncedSearchQuery
  )

  // Use centralized configurations
  const currencies = CURRENCIES
  const networks = NETWORKS

  // Use the centralized crypto balances hook
  const { cryptoAssetsWithBalances } = useCryptoBalances({
    selectedChain: selectedNetwork || SupportedChain.ARBITRUM,
  })

  // Currency conversion hooks
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

  const handleShowWithdrawWidget = () => onOpen()

  const handleSettingsClick = () => {
    router.push(`/dashboard/settings/${SettingsSection.WALLET_PAYMENT}`)
  }

  const handleCurrencyChange = (value: string) => {
    setSelectedCurrency(value)
    setIsCurrencyDropdownOpen(false)
  }

  // Reset pagination when selected crypto changes
  React.useEffect(() => {
    setSelectedCryptoCurrentPage(1)
  }, [selectedCrypto, setSelectedCryptoCurrentPage])

  if (!currentAccount) return null

  return (
    <Box
      maxW={{ base: '100%', md: '685px' }}
      mx="auto"
      overflowY="auto"
      height="100%"
      pb={{ base: 4, md: 8 }}
      px={0}
    >
      <WithdrawFundsModal
        selectedNetwork={selectedNetwork || SupportedChain.ARBITRUM}
        isOpen={isOpen}
        onClose={onClose}
      />
      {/* Header */}
      <VStack
        spacing={{ base: 1, md: 2 }}
        align="start"
        mb={{ base: 4, md: 6 }}
      >
        <Text
          fontSize={{ base: 'xl', md: '2xl' }}
          color="text-primary"
          fontWeight="700"
        >
          My Wallet
        </Text>
        <Text
          color="text-tertiary"
          fontSize={{ base: '14px', md: '16px' }}
          fontWeight="500"
          width={{ base: '100%', md: '600px' }}
        >
          A wallet to receive session booking payments, and spend your funds.
        </Text>
      </VStack>

      {/* Transaction Details Screen - Full Container */}
      {showTransactionDetails && selectedTransaction ? (
        <TransactionDetailsView
          transaction={selectedTransaction}
          onBack={() => setShowTransactionDetails(false)}
          selectedCurrency={selectedCurrency}
        />
      ) : showCryptoDetails && selectedCrypto ? (
        <Box
          bg="bg-surface"
          borderRadius={{ base: '8px', md: '12px' }}
          p={{ base: 6, md: 12 }}
          border="1px solid"
          borderColor="border-wallet-subtle"
        >
          {/* Header with Back Link and Title */}
          <Box position="relative" mb={{ base: 6, md: 8 }}>
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
              <Icon as={FiArrowLeft} fontSize={{ base: '16px', md: '20px' }} />
              <Text fontSize={{ base: '14px', md: '16px' }} fontWeight="600">
                Back
              </Text>
            </HStack>

            <Text
              fontSize={{ base: '20px', md: '24px' }}
              fontWeight="700"
              color="text-primary"
              textAlign="center"
              width="100%"
            >
              {selectedCrypto.name}
            </Text>
          </Box>

          {/* Wallet Balance Card */}
          <Box
            bg="bg-surface-tertiary"
            borderRadius={{ base: '8px', md: '12px' }}
            p={{ base: 4, md: 6 }}
            mb={{ base: 4, md: 6 }}
          >
            {/* Currency Icon */}
            <Box
              w={{ base: '40px', md: '48px' }}
              h={{ base: '40px', md: '48px' }}
              borderRadius="full"
              bg="bg-surface-tertiary-2"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb={{ base: 3, md: 4 }}
              mx="auto"
            >
              <Image
                src={selectedCrypto.icon}
                alt={selectedCrypto.symbol}
                w={{ base: '24px', md: '32px' }}
                h={{ base: '24px', md: '32px' }}
              />
            </Box>

            {/* Balance */}
            <VStack spacing={1} mb={{ base: 4, md: 6 }}>
              {selectedCryptoBalance.isLoading ? (
                <HStack spacing={3} align="center">
                  <Spinner color="text-muted" size={{ base: 'sm', md: 'md' }} />
                  <Text
                    fontSize={{ base: '14px', md: '16px' }}
                    color="text-muted"
                    fontWeight="500"
                  >
                    Loading balance...
                  </Text>
                </HStack>
              ) : (
                <>
                  <Text
                    fontSize={{ base: '32px', md: '48px' }}
                    fontWeight="500"
                    color="text-primary"
                    lineHeight="1"
                  >
                    {selectedCryptoBalance.balance
                      ? selectedCryptoBalance.balance.toLocaleString()
                      : '0'}
                  </Text>
                  <Text
                    fontSize={{ base: '14px', md: '16px' }}
                    color="text-secondary"
                    fontWeight="500"
                  >
                    {selectedCryptoBalance.balance
                      ? formatCurrencyDisplay(selectedCryptoBalance.balance)
                      : formatCurrencyDisplay(0)}
                  </Text>
                </>
              )}
            </VStack>

            {/* Action Buttons */}
            <HStack justify="center" spacing={{ base: 3, md: 6 }}>
              <WalletActionButton
                icon={PiArrowCircleUpRight}
                label="Withdraw"
                onClick={() => handleShowWithdrawWidget()}
              />
              <WalletActionButton
                icon={PiPlusCircleLight}
                label="Receive"
                isActive
                onClick={() => setIsReceiveModalOpen(true)}
              />
              <WalletActionButton
                icon={PiArrowCircleRight}
                label="Send"
                onClick={() => setIsSendModalOpen(true)}
              />
            </HStack>
          </Box>

          {/* Search Bar */}
          <Box
            bg="bg-surface-tertiary"
            borderRadius="6px"
            px={{ base: 3, md: 4 }}
            py={{ base: 2, md: 2 }}
            mb={{ base: 4, md: 6 }}
            width={{ base: '100%', md: '320px' }}
            display="flex"
            alignItems="center"
            border="1px solid"
            borderColor="border-subtle"
          >
            <Icon
              as={FiSearch}
              color="text-muted"
              fontSize={{ base: '16px', md: '20px' }}
              mr={{ base: 1, md: 2 }}
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
                color: 'text-muted',
                fontSize: '14px',
                width: '100%',
                fontWeight: '500',
              }}
            />
          </Box>

          {(() => {
            return (
              <>
                <Text
                  fontSize={{ base: '20px', md: '24px' }}
                  fontWeight="700"
                  color="text-primary"
                  mb={{ base: 3, md: 4 }}
                  textAlign="left"
                >
                  Transaction History
                </Text>
                <VStack spacing={{ base: 2, md: 3 }}>
                  {/* Transaction History Title */}

                  {selectedCryptoTransactionsLoading ? (
                    <Box textAlign="center" py={{ base: 6, md: 8 }}>
                      <Spinner
                        color="text-muted"
                        size={{ base: 'sm', md: 'md' }}
                      />
                      <Text
                        color="text-muted"
                        fontSize={{ base: '14px', md: '16px' }}
                        mt={2}
                      >
                        Loading transactions...
                      </Text>
                    </Box>
                  ) : selectedCryptoTransactions.length === 0 ? (
                    <Box textAlign="center" py={{ base: 6, md: 8 }}>
                      <Text
                        color="text-muted"
                        fontSize={{ base: '14px', md: '16px' }}
                      >
                        {searchQuery
                          ? 'No transactions found'
                          : 'No transactions yet'}
                      </Text>
                    </Box>
                  ) : (
                    <>
                      {selectedCryptoTransactions.map(transaction => (
                        <Box
                          key={transaction.id}
                          bg="bg-surface-tertiary"
                          borderRadius={{ base: '12px', md: '16px' }}
                          p={{ base: 3, md: 4 }}
                          width="100%"
                          cursor="pointer"
                          _hover={{ bg: 'bg-surface-tertiary-2' }}
                          transition="all 0.2s"
                          onClick={() => {
                            // Use the original transaction directly
                            setSelectedTransaction(
                              transaction.originalTransaction
                            )
                            setShowTransactionDetails(true)
                          }}
                        >
                          <VStack
                            spacing={{ base: 2, md: 0 }}
                            align="stretch"
                            width="100%"
                          >
                            {/* Top row: User info and status */}
                            <Flex
                              justify="flex-start"
                              align="center"
                              width="100%"
                              gap={{ base: 3, md: '18px' }}
                            >
                              <HStack spacing={3}>
                                {/* User Avatar */}
                                <Box
                                  w={{ base: '32px', md: '40px' }}
                                  h={{ base: '32px', md: '40px' }}
                                  borderRadius="full"
                                  overflow="hidden"
                                  flexShrink={0}
                                >
                                  <Avatar
                                    address={currentAccount.address || ''}
                                    avatar_url={
                                      currentAccount.preferences?.avatar_url ||
                                      ''
                                    }
                                    name={getAccountDisplayName(currentAccount)}
                                  />
                                </Box>

                                {/* Transaction Details */}
                                <Box>
                                  <Text
                                    color="text-primary"
                                    fontSize={{ base: '14px', md: '16px' }}
                                    fontWeight="500"
                                  >
                                    {transaction.user} {transaction.action}
                                  </Text>
                                </Box>
                              </HStack>
                              {/* Status + Date (right aligned) */}
                              <VStack spacing={1} align="end" ml="auto">
                                <Box
                                  px={{ base: 2, md: 3 }}
                                  py={{ base: 1, md: 1 }}
                                  borderRadius="100px"
                                  bg={
                                    transaction.status === 'Successful'
                                      ? 'green.600'
                                      : 'red.700'
                                  }
                                >
                                  <Text
                                    fontSize={{ base: '12px', md: '14px' }}
                                    fontWeight="500"
                                    color="text-primary"
                                  >
                                    {transaction.status}
                                  </Text>
                                </Box>
                                <Text
                                  fontSize={{ base: '14px', md: '16px' }}
                                  color="text-primary"
                                  fontWeight="500"
                                  textAlign="right"
                                >
                                  {transaction.date} {transaction.time}
                                </Text>
                              </VStack>
                            </Flex>
                          </VStack>
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
          bg="bg-surface"
          borderRadius={{ base: '8px', md: '12px' }}
          p={{ base: 6, md: 12 }}
          border="1px solid"
          borderColor="border-wallet-subtle"
        >
          {/* Top Row */}
          <VStack
            spacing={{ base: 3, md: 0 }}
            align="stretch"
            mb={{ base: 4, md: 6 }}
          >
            <Flex
              direction="row"
              justify="space-between"
              align="center"
              width="100%"
            >
              <Box
                bg="bg-surface-tertiary-4"
                borderRadius={{ base: '8px', md: '12px' }}
                p={{ base: '8px', md: '10px' }}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <HStack spacing={1}>
                  <Icon
                    as={TbWallet}
                    color="text-primary"
                    fontSize={{ base: '16px', md: '20px' }}
                  />
                  <Text
                    color="text-primary"
                    fontSize={{ base: '14px', md: '16px' }}
                    fontWeight="500"
                  >
                    Wallet
                  </Text>
                </HStack>
              </Box>

              <Box position="relative" ref={currencyDropdownRef}>
                <CurrencySelector
                  currencies={currencies}
                  selectedCurrency={selectedCurrency}
                  isCurrencyDropdownOpen={isCurrencyDropdownOpen}
                  exchangeRate={exchangeRate}
                  setIsCurrencyDropdownOpen={setIsCurrencyDropdownOpen}
                  onCurrencyChange={handleCurrencyChange}
                />
              </Box>

              <Box
                display={{ base: 'flex', md: 'flex' }}
                justifyContent="flex-end"
                width={{ base: '20px', md: '70px' }}
              >
                <Tooltip label="Go to wallet settings" placement="top">
                  <Box display="inline-flex">
                    <Icon
                      as={TbSettings2}
                      color="text-primary"
                      cursor="pointer"
                      fontSize={{ base: '20px', md: '24px' }}
                      onClick={handleSettingsClick}
                      _hover={{ opacity: 0.8 }}
                      transition="color 0.2s"
                    />
                  </Box>
                </Tooltip>
              </Box>
            </Flex>
          </VStack>

          {/* Wallet Card */}
          <Box
            bg="bg-surface-tertiary-3"
            borderRadius={{ base: '8px', md: '12px' }}
            p={{ base: 4, md: 6 }}
            mb={{ base: 4, md: 6 }}
          >
            {/* Balance Section */}
            <VStack
              spacing={{ base: 1, md: 2 }}
              align="center"
              mb={{ base: 3, md: 4 }}
            >
              <HStack spacing={2}>
                <Text
                  fontSize={{ base: '14px', md: '16px' }}
                  color="text-primary"
                  fontWeight="500"
                >
                  Wallet balance
                  {selectedCurrency !== 'USD' && (
                    <Text as="span" color="text-muted" fontSize="12px" ml={2}>
                      (in {selectedCurrency})
                    </Text>
                  )}
                </Text>
                <Icon
                  as={showBalance ? BsEye : BsEyeSlash}
                  color="text-muted"
                  fontSize={{ base: '14px', md: '16px' }}
                  cursor="pointer"
                  onClick={() => setShowBalance(!showBalance)}
                  _hover={{ color: 'text-secondary' }}
                />
              </HStack>
              {balanceLoading ||
              (selectedCurrency !== 'USD' && !exchangeRate) ? (
                <VStack spacing={2} align="center">
                  <Box
                    w={{ base: '160px', md: '200px' }}
                    h={{ base: '36px', md: '48px' }}
                    borderRadius={{ base: '6px', md: '8px' }}
                    bg="bg-surface-tertiary-2"
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
                    w={{ base: '100px', md: '120px' }}
                    h={{ base: '12px', md: '16px' }}
                    borderRadius={{ base: '3px', md: '4px' }}
                    bg="bg-surface-tertiary-2"
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
                  fontSize={{ base: '32px', md: '48px' }}
                  fontWeight="500"
                  color="text-primary"
                  lineHeight="1"
                >
                  {showBalance
                    ? formatCurrencyDisplay(totalBalance)
                    : '••••••••'}
                </Text>
              )}
            </VStack>

            {/* Action Buttons */}
            <HStack justify="center" spacing={{ base: 8, md: 16 }}>
              <WalletActionButton
                icon={PiArrowCircleUpRight}
                label="Withdraw"
                onClick={() => handleShowWithdrawWidget()}
              />
              <WalletActionButton
                icon={PiPlusCircleLight}
                label="Receive"
                isActive
                onClick={() => setIsReceiveModalOpen(true)}
              />
              <WalletActionButton
                icon={PiArrowCircleRight}
                label="Send"
                onClick={() => setIsSendModalOpen(true)}
              />
            </HStack>
          </Box>

          {/* Transaction History Screen */}
          {showTransactions && !showTransactionDetails ? (
            <Box mt={{ base: 8, md: 12 }}>
              <Flex
                direction={{ base: 'column', md: 'row' }}
                justify={{ base: 'flex-start', md: 'space-between' }}
                align={{ base: 'flex-start', md: 'center' }}
                mb={{ base: 0, md: 6 }}
              >
                {/* Back Link */}
                <HStack
                  spacing={2}
                  mb={{ base: 4, md: 0 }}
                  cursor="pointer"
                  onClick={() => setShowTransactions(false)}
                  color="primary.400"
                  _hover={{ color: 'primary.300' }}
                >
                  <Icon
                    as={FiArrowLeft}
                    fontSize={{ base: '18px', md: '20px' }}
                  />
                  <Text
                    fontSize={{ base: '14px', md: '16px' }}
                    fontWeight="600"
                  >
                    Back
                  </Text>
                </HStack>

                {/* Search Bar */}
                <Box
                  bg="bg-surface-tertiary"
                  borderRadius="6px"
                  px={{ base: 3, md: 4 }}
                  py={{ base: 2, md: 2 }}
                  mb={{ base: 4, md: 0 }}
                  width={{ base: '100%', md: '320px' }}
                  display="flex"
                  alignItems="center"
                  border="1px solid"
                  borderColor="border-subtle"
                >
                  <Icon
                    as={FiSearch}
                    color="text-muted"
                    fontSize={{ base: '16px', md: '20px' }}
                    mr={{ base: 1, md: 2 }}
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
                      color: 'text-muted',
                      fontSize: '14px',
                      width: '100%',
                      fontWeight: '500',
                    }}
                  />
                </Box>
              </Flex>

              {/* Title */}
              <Text
                fontSize={{ base: '20px', md: '24px' }}
                fontWeight="700"
                color="text-primary"
                mb={{ base: 1, md: 2 }}
              >
                Transaction History
              </Text>

              {/* Transactions List */}
              <VStack spacing={3}>
                {transactionsLoading ? (
                  <Box textAlign="center" py={8}>
                    <Spinner color="text-muted" size="md" />
                    <Text color="text-muted" fontSize="16px" mt={2}>
                      Loading transactions...
                    </Text>
                  </Box>
                ) : transactions.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Text color="text-muted" fontSize="16px">
                      {searchQuery
                        ? 'No transactions found'
                        : 'No transactions yet'}
                    </Text>
                  </Box>
                ) : (
                  <>
                    {transactions.map(transaction => (
                      <Box
                        key={transaction.id}
                        bg="bg-surface-tertiary"
                        borderRadius={{ base: '12px', md: '16px' }}
                        p={{ base: 3, md: 4 }}
                        width="100%"
                        cursor="pointer"
                        _hover={{ bg: 'bg-surface-tertiary-2' }}
                        transition="all 0.2s"
                        onClick={() => {
                          // Use the original transaction directly
                          setSelectedTransaction(
                            transaction.originalTransaction
                          )
                          setShowTransactionDetails(true)
                        }}
                      >
                        <VStack
                          spacing={{ base: 2, md: 0 }}
                          align="stretch"
                          width="100%"
                        >
                          {/* Top row: User info and status */}
                          <Flex
                            justify="flex-start"
                            align="center"
                            width="100%"
                            gap={{ base: 3, md: '18px' }}
                          >
                            <HStack spacing={3}>
                              {/* User Avatar */}
                              <Box
                                w={{ base: '32px', md: '40px' }}
                                h={{ base: '32px', md: '40px' }}
                                borderRadius="full"
                                overflow="hidden"
                                flexShrink={0}
                              >
                                <Avatar
                                  address={currentAccount.address || ''}
                                  avatar_url={
                                    currentAccount.preferences?.avatar_url || ''
                                  }
                                  name={getAccountDisplayName(currentAccount)}
                                />
                              </Box>

                              {/* Transaction Details */}
                              <Box>
                                <Text
                                  color="text-primary"
                                  fontSize={{ base: '14px', md: '16px' }}
                                  fontWeight="500"
                                >
                                  {transaction.user} {transaction.action}
                                </Text>
                              </Box>
                            </HStack>
                            {/* Status + Date (right aligned) */}
                            <VStack spacing={1} align="end" ml="auto">
                              <Box
                                px={{ base: 2, md: 3 }}
                                py={{ base: 1, md: 1 }}
                                borderRadius="100px"
                                bg={
                                  transaction.status === 'Successful'
                                    ? 'green.600'
                                    : 'red.700'
                                }
                              >
                                <Text
                                  fontSize={{ base: '12px', md: '14px' }}
                                  fontWeight="500"
                                  color="text-primary"
                                >
                                  {transaction.status}
                                </Text>
                              </Box>
                              <Text
                                fontSize={{ base: '14px', md: '16px' }}
                                color="text-primary"
                                fontWeight="500"
                                textAlign="right"
                              >
                                {transaction.date} {transaction.time}
                              </Text>
                            </VStack>
                          </Flex>
                        </VStack>
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
            <Box>
              {/* Crypto Section Header */}
              <VStack
                spacing={{ base: 3, md: 0 }}
                align="stretch"
                mb={{ base: 3, md: 4 }}
              >
                {/* Mobile: Stack vertically, Desktop: Keep horizontal */}
                <VStack
                  spacing={{ base: 3, md: 0 }}
                  align={{ base: 'stretch', md: 'center' }}
                >
                  <Flex
                    direction="row"
                    justify="space-between"
                    align={{ base: 'stretch', md: 'center' }}
                    width="100%"
                  >
                    <Box
                      p={1.5}
                      bg="bg-surface-tertiary"
                      borderRadius={{ base: '8px', md: '12px' }}
                      display={{ base: 'none', md: 'block' }}
                    >
                      <Box
                        bg="bg-surface-tertiary-2"
                        color="text-primary"
                        px={{ base: 4, md: 5 }}
                        py={1.5}
                        borderRadius={{ base: '8px', md: '12px' }}
                        fontSize={{ base: '14px', md: '16px' }}
                        fontWeight="700"
                        _hover={{ bg: 'bg-surface-tertiary-2', opacity: 0.8 }}
                        display={{ base: 'none', md: 'block' }}
                      >
                        Crypto
                      </Box>
                    </Box>

                    <Flex
                      width={{ base: '100%', md: 'auto' }}
                      justify={{ base: 'space-between', md: 'flex-start' }}
                      align="center"
                      gap={{ base: 3, md: 5 }}
                    >
                      {isNetworkLoading ? (
                        <Box
                          bg="bg-surface-tertiary"
                          borderRadius={{ base: '8px', md: '12px' }}
                          px={{ base: 3, md: 4 }}
                          py={2}
                          display="flex"
                          alignItems="center"
                          gap={2}
                          border="1px solid"
                          borderColor="border-subtle"
                        >
                          <Spinner size="sm" color="text-muted" />
                          <Text
                            color="text-muted"
                            fontSize={{ base: '14px', md: '16px' }}
                            fontWeight="700"
                            pr={{ base: 2, md: 4 }}
                          >
                            Loading network...
                          </Text>
                        </Box>
                      ) : selectedNetwork ? (
                        <HStack spacing={2}>
                          <Box position="relative" ref={networkDropdownRef}>
                            <NetworkSelector
                              networks={networks}
                              selectedNetwork={selectedNetwork}
                              isNetworkDropdownOpen={isNetworkDropdownOpen}
                              isNetworkLoading={isNetworkLoading}
                              setIsNetworkDropdownOpen={
                                setIsNetworkDropdownOpen
                              }
                              setSelectedNetwork={setSelectedNetwork}
                            />
                          </Box>

                          <Tooltip
                            label="Switch between blockchain networks. Each network operates independently with its own tokens, fees, and supported features. Make sure you're on the correct network for your transaction."
                            placement="top"
                          >
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              cursor="pointer"
                              _hover={{ opacity: 0.8 }}
                            >
                              <FaCircleInfo color="text-primary" />
                            </Box>
                          </Tooltip>
                        </HStack>
                      ) : (
                        <Box position="relative" ref={networkDropdownRef}>
                          <Box
                            bg="bg-surface-tertiary"
                            borderRadius={{ base: '8px', md: '12px' }}
                            px={{ base: 3, md: 4 }}
                            py={2}
                            display="flex"
                            alignItems="center"
                            gap={2}
                            border="1px solid"
                            borderColor="border-subtle"
                            cursor="pointer"
                            onClick={() =>
                              !isNetworkLoading &&
                              setIsNetworkDropdownOpen(!isNetworkDropdownOpen)
                            }
                            _hover={{ opacity: 0.8 }}
                          >
                            <Text
                              color="text-muted"
                              fontSize={{ base: '14px', md: '16px' }}
                              fontWeight="700"
                              pr={{ base: 2, md: 4 }}
                            >
                              Select network
                            </Text>
                            <Icon
                              as={IoChevronDown}
                              color="text-muted"
                              fontSize={{ base: '16px', md: '16px' }}
                              transform={
                                isNetworkDropdownOpen
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)'
                              }
                              transition="transform 0.2s"
                            />
                          </Box>

                          {/* Network Dropdown */}
                          {isNetworkDropdownOpen && (
                            <Box
                              position="absolute"
                              top="100%"
                              left={0}
                              width="max-content"
                              minWidth="250px"
                              mt={2}
                              bg="bg-surface-secondary"
                              borderRadius="12px"
                              border="1px solid"
                              borderColor="border-wallet-subtle"
                              shadow="none"
                              zIndex={1000}
                              overflow="hidden"
                              boxShadow="none"
                            >
                              <VStack spacing={0} align="stretch">
                                {networks.map(network => (
                                  <Box
                                    key={network.name}
                                    px={4}
                                    py={3}
                                    cursor="pointer"
                                    _hover={{ bg: 'dropdown-hover' }}
                                    onClick={() => {
                                      const supportedChain =
                                        supportedChains.find(
                                          c => c.name === network.name
                                        )
                                      if (supportedChain) {
                                        setSelectedNetwork(supportedChain.chain)
                                        setIsNetworkDropdownOpen(false)
                                      }
                                    }}
                                  >
                                    <HStack spacing={3}>
                                      <Box
                                        w="24px"
                                        h="24px"
                                        borderRadius="full"
                                        bg="bg-surface-tertiary-2"
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
                                      <Text
                                        color="text-primary"
                                        fontSize="16px"
                                      >
                                        {network.name}
                                      </Text>
                                    </HStack>
                                  </Box>
                                ))}
                              </VStack>
                            </Box>
                          )}
                        </Box>
                      )}

                      <Tooltip label="Show all transactions" placement="top">
                        <Box
                          w={{ base: '32px', md: '40px' }}
                          h={{ base: '32px', md: '40px' }}
                          borderRadius={{ base: '8px', md: '10px' }}
                          bg="primary.200"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          cursor="pointer"
                          _hover={{ opacity: 0.8 }}
                          onClick={() => setShowTransactions(true)}
                        >
                          <Icon
                            as={GrDocumentTime}
                            color="neutral.800"
                            fontSize={{ base: '16px', md: '20px' }}
                          />
                        </Box>
                      </Tooltip>
                    </Flex>
                  </Flex>
                </VStack>
              </VStack>

              {/* Crypto Assets */}
              <VStack spacing={4} mt={5}>
                {isNetworkLoading
                  ? // Show skeleton cards while loading network
                    Array.from({ length: 3 }).map((_, index) => (
                      <Box
                        key={`skeleton-${index}`}
                        bg="bg-surface-tertiary"
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
                              bg="bg-surface-tertiary-2"
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
                                bg="bg-surface-tertiary-2"
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
                                  bg="bg-surface-tertiary-2"
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
                                  bg="bg-surface-tertiary-2"
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
                              bg="bg-surface-tertiary-2"
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
                              bg="bg-surface-tertiary-2"
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
                  : cryptoAssetsWithBalances.length === 0
                  ? // Show skeleton cards while loading
                    Array.from({ length: 3 }).map((_, index) => (
                      <Box
                        key={`skeleton-${index}`}
                        bg="bg-surface-tertiary"
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
                              bg="bg-surface-tertiary-2"
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
                                bg="bg-surface-tertiary-2"
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
                                  bg="bg-surface-tertiary-2"
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
                                  bg="bg-surface-tertiary-2"
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
                              bg="bg-surface-tertiary-2"
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
                              bg="bg-surface-tertiary-2"
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
                        bg="bg-surface-tertiary-3"
                        borderRadius="12px"
                        px={{ base: 2, md: 4 }}
                        py={4}
                        width="100%"
                        cursor="pointer"
                        _hover={{ bg: 'bg-surface-tertiary-2' }}
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
                                bg="bg-surface"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                border="1px solid"
                                borderColor="border-wallet-subtle"
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
                                color="text-primary"
                                fontSize={{ base: '16px', md: '20px' }}
                                fontWeight="700"
                              >
                                {asset.name}
                              </Text>
                              <HStack spacing={3}>
                                <Text
                                  fontSize={{ base: '12px', md: '16px' }}
                                  fontWeight="500"
                                  color="text-primary"
                                >
                                  {asset.price}
                                </Text>
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
                                  bg="bg-surface-tertiary-2"
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
                                  bg="bg-surface-tertiary-2"
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
                                  color="text-primary"
                                  fontSize={{ base: '16px', md: '20px' }}
                                  fontWeight="700"
                                  textAlign="right"
                                >
                                  {asset.balance}
                                </Text>
                                <Text
                                  fontSize={{ base: '12px', md: '16px' }}
                                  fontWeight="500"
                                  color="text-primary"
                                  textAlign="right"
                                >
                                  {asset.usdValue
                                    ? formatCurrencyDisplay(
                                        parseFloat(
                                          asset.usdValue.replace('$', '')
                                        )
                                      )
                                    : 'N/A'}
                                </Text>
                              </>
                            )}
                          </VStack>
                        </Flex>
                      </Box>
                    ))}
              </VStack>
            </Box>
          )}
        </Box>
      )}

      {/* Send Funds Modal */}
      <SendFundsModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        selectedNetwork={selectedNetwork || SupportedChain.ARBITRUM}
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

      {/* Magic Link Modal */}
      <MagicLinkModal
        isOpen={isMagicLinkOpen}
        onClose={onMagicLinkClose}
        onConfirm={async () => {
          if (notificationEmail) {
            setIsSendingMagicLink(true)
            try {
              await sendEnablePinLink(notificationEmail)
              showSuccessToast(
                'Enable PIN Link Sent',
                'A magic link has been sent to your email to set up your transaction PIN'
              )
              onMagicLinkClose()
            } catch (error) {
              handleApiError('Magic Link Failed', error)
            } finally {
              setIsSendingMagicLink(false)
            }
          }
        }}
        title="Enable Transaction PIN"
        message="A magic link will be sent to your notification email to set up your transaction PIN. This ensures the security of your account."
        confirmButtonText="Send Magic Link"
        isLoading={isSendingMagicLink}
      />
    </Box>
  )
}

export default Wallet
