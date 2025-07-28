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
import React, { useMemo, useState } from 'react'
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
import { useWalletBalance } from '@/hooks/useWalletBalance'
import { useWalletTransactions } from '@/hooks/useWalletTransactions'
import { Account } from '@/types/Account'
import { FormattedTransaction } from '@/types/Transactions'

import ReceiveFundsModal from './ReceiveFundsModal'
import SendFundsModal from './SendFundsModal'

interface WalletProps {
  currentAccount: Account
}

interface CryptoAsset {
  name: string
  symbol: string
  icon: string
  price: string
  change: string
  balance: string
  usdValue: string
  // Additional fields for crypto details
  fullBalance?: string
  currencyIcon?: string
  tokenAddress: string
  chainId: number
}

interface Currency {
  name: string
  code: string
  flag: string
}

interface Network {
  name: string
  icon: string
  chainId: number
}

const Wallet: React.FC<WalletProps> = () => {
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [selectedNetwork, setSelectedNetwork] = useState('Celo')
  const [showBalance, setShowBalance] = useState(true)
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [showCryptoDetails, setShowCryptoDetails] = useState(false)
  const [selectedTransaction, setSelectedTransaction] =
    useState<FormattedTransaction | null>(null)
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)

  const { totalBalance, isLoading: balanceLoading } =
    useWalletBalance(selectedCurrency)

  const { transactions, isLoading: transactionsLoading } =
    useWalletTransactions()

  // Token-specific data for crypto details view
  const selectedCryptoBalance = useCryptoBalance(
    selectedCrypto?.tokenAddress || '',
    selectedCrypto?.chainId || 0
  )

  const {
    transactions: selectedCryptoTransactions,
    isLoading: selectedCryptoTransactionsLoading,
  } = useWalletTransactions(
    selectedCrypto?.tokenAddress,
    selectedCrypto?.chainId
  )

  const currencies: Currency[] = [
    { name: 'US Dollar', code: 'USD', flag: '/assets/currencies/usd.png' },
    { name: 'Euro', code: 'EUR', flag: '/assets/currencies/euro.png' },
    {
      name: 'Pounds sterling',
      code: 'GBP',
      flag: '/assets/currencies/pounds.png',
    },
  ]

  const networks: Network[] = [
    { name: 'All networks', icon: '/assets/chains/Default.svg', chainId: 0 },
    { name: 'Celo', icon: '/assets/chains/Celo.svg', chainId: 42220 },
    { name: 'Arbitrum', icon: '/assets/chains/Arbitrum.svg', chainId: 42161 },
  ]

  // Define crypto assets configuration
  const cryptoConfig = [
    {
      name: 'Celo Dollar',
      symbol: 'cUSD',
      icon: '/assets/tokens/CUSD.png',
      price: '1 USD',
      change: '+0.1%',
      tokenAddress: '0x765DE816845861e75A25fCA122bb6898B8B1282a', // Celo only
      celoChainId: 42220,
    },
    {
      name: 'US Dollar Coin',
      symbol: 'USDC',
      icon: '/assets/tokens/USDC.svg',
      price: '1 USD',
      change: '+0.1%',
      tokenAddress: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', // Celo
      celoChainId: 42220,
      arbitrumTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
      arbitrumChainId: 42161,
    },
    {
      name: 'Tether',
      symbol: 'USDT',
      icon: '/assets/tokens/USDT.svg',
      price: '1 USD',
      change: '+0.1%',
      tokenAddress: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e', // Celo
      celoChainId: 42220,
      arbitrumTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum
      arbitrumChainId: 42161,
    },
  ]

  // Generate crypto assets based on selected network
  const cryptoAssets = useMemo(() => {
    const selectedNetworkData = networks.find(n => n.name === selectedNetwork)

    if (selectedNetwork === 'All networks') {
      // Show all 6 assets (3 cryptos × 2 networks)
      return [
        ...cryptoConfig.map(crypto => ({
          ...crypto,
          balance: '0 cUSD',
          usdValue: '$0',
          fullBalance: '0',
          currencyIcon: crypto.icon,
          chainId: crypto.celoChainId,
          networkName: 'Celo',
        })),
        ...cryptoConfig.map(crypto => ({
          ...crypto,
          balance: '0 USDC',
          usdValue: '$0',
          fullBalance: '0',
          currencyIcon: crypto.icon,
          chainId: crypto.arbitrumChainId,
          networkName: 'Arbitrum',
        })),
      ]
    } else {
      // Show 3 assets for the selected network
      const chainId = selectedNetworkData?.chainId || 42220
      return cryptoConfig.map(crypto => ({
        ...crypto,
        balance: '0 ' + crypto.symbol,
        usdValue: '$0',
        fullBalance: '0',
        currencyIcon: crypto.icon,
        chainId,
        networkName: selectedNetwork,
      }))
    }
  }, [selectedNetwork])

  // Fetch balances for each crypto asset - call hooks at top level
  const cusdCeloBalance = useCryptoBalance(
    '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    42220
  )
  const usdcCeloBalance = useCryptoBalance(
    '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    42220
  )
  const usdtCeloBalance = useCryptoBalance(
    '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    42220
  )

  const usdcArbitrumBalance = useCryptoBalance(
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    42161
  )
  const usdtArbitrumBalance = useCryptoBalance(
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    42161
  )

  // Combine crypto assets with real balances
  const cryptoAssetsWithBalances = useMemo(() => {
    const selectedNetworkData = networks.find(n => n.name === selectedNetwork)

    if (selectedNetwork === 'All networks') {
      // Show Celo tokens
      const celoAssets = [
        {
          ...cryptoConfig[0], // cUSD
          tokenAddress: cryptoConfig[0].tokenAddress || '',
          chainId: cryptoConfig[0].celoChainId || 0,
          balance: cusdCeloBalance.balance
            ? `${cusdCeloBalance.balance.toLocaleString()} cUSD`
            : '0 cUSD',
          usdValue: cusdCeloBalance.balance
            ? `$${cusdCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: cusdCeloBalance.balance
            ? cusdCeloBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[0].icon,
          networkName: 'Celo',
          isLoading: cusdCeloBalance.isLoading,
        },
        {
          ...cryptoConfig[1], // USDC Celo
          tokenAddress: cryptoConfig[1].tokenAddress || '',
          chainId: cryptoConfig[1].celoChainId || 0,
          balance: usdcCeloBalance.balance
            ? `${usdcCeloBalance.balance.toLocaleString()} USDC`
            : '0 USDC',
          usdValue: usdcCeloBalance.balance
            ? `$${usdcCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdcCeloBalance.balance
            ? usdcCeloBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[1].icon,
          networkName: 'Celo',
          isLoading: usdcCeloBalance.isLoading,
        },
        {
          ...cryptoConfig[2], // USDT Celo
          tokenAddress: cryptoConfig[2].tokenAddress || '',
          chainId: cryptoConfig[2].celoChainId || 0,
          balance: usdtCeloBalance.balance
            ? `${usdtCeloBalance.balance.toLocaleString()} USDT`
            : '0 USDT',
          usdValue: usdtCeloBalance.balance
            ? `$${usdtCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdtCeloBalance.balance
            ? usdtCeloBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[2].icon,
          networkName: 'Celo',
          isLoading: usdtCeloBalance.isLoading,
        },
      ]
      // Show Arbitrum tokens (no cUSD)
      const arbitrumAssets = [
        {
          ...cryptoConfig[1], // USDC Arbitrum
          tokenAddress: cryptoConfig[1].arbitrumTokenAddress || '',
          chainId: cryptoConfig[1].arbitrumChainId || 0,
          balance: usdcArbitrumBalance.balance
            ? `${usdcArbitrumBalance.balance.toLocaleString()} USDC`
            : '0 USDC',
          usdValue: usdcArbitrumBalance.balance
            ? `$${usdcArbitrumBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdcArbitrumBalance.balance
            ? usdcArbitrumBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[1].icon,
          networkName: 'Arbitrum',
          isLoading: usdcArbitrumBalance.isLoading,
        },
        {
          ...cryptoConfig[2], // USDT Arbitrum
          tokenAddress: cryptoConfig[2].arbitrumTokenAddress || '',
          chainId: cryptoConfig[2].arbitrumChainId || 0,
          balance: usdtArbitrumBalance.balance
            ? `${usdtArbitrumBalance.balance.toLocaleString()} USDT`
            : '0 USDT',
          usdValue: usdtArbitrumBalance.balance
            ? `$${usdtArbitrumBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdtArbitrumBalance.balance
            ? usdtArbitrumBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[2].icon,
          networkName: 'Arbitrum',
          isLoading: usdtArbitrumBalance.isLoading,
        },
      ]
      return [...celoAssets, ...arbitrumAssets]
    } else if (selectedNetwork === 'Celo') {
      return [
        {
          ...cryptoConfig[0], // cUSD
          tokenAddress: cryptoConfig[0].tokenAddress || '',
          chainId: cryptoConfig[0].celoChainId || 0,
          balance: cusdCeloBalance.balance
            ? `${cusdCeloBalance.balance.toLocaleString()} cUSD`
            : '0 cUSD',
          usdValue: cusdCeloBalance.balance
            ? `$${cusdCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: cusdCeloBalance.balance
            ? cusdCeloBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[0].icon,
          networkName: 'Celo',
          isLoading: cusdCeloBalance.isLoading,
        },
        {
          ...cryptoConfig[1], // USDC Celo
          tokenAddress: cryptoConfig[1].tokenAddress || '',
          chainId: cryptoConfig[1].celoChainId || 0,
          balance: usdcCeloBalance.balance
            ? `${usdcCeloBalance.balance.toLocaleString()} USDC`
            : '0 USDC',
          usdValue: usdcCeloBalance.balance
            ? `$${usdcCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdcCeloBalance.balance
            ? usdcCeloBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[1].icon,
          networkName: 'Celo',
          isLoading: usdcCeloBalance.isLoading,
        },
        {
          ...cryptoConfig[2], // USDT Celo
          tokenAddress: cryptoConfig[2].tokenAddress || '',
          chainId: cryptoConfig[2].celoChainId || 0,
          balance: usdtCeloBalance.balance
            ? `${usdtCeloBalance.balance.toLocaleString()} USDT`
            : '0 USDT',
          usdValue: usdtCeloBalance.balance
            ? `$${usdtCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdtCeloBalance.balance
            ? usdtCeloBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[2].icon,
          networkName: 'Celo',
          isLoading: usdtCeloBalance.isLoading,
        },
      ]
    } else if (selectedNetwork === 'Arbitrum') {
      return [
        {
          ...cryptoConfig[1], // USDC Arbitrum
          tokenAddress: cryptoConfig[1].arbitrumTokenAddress || '',
          chainId: cryptoConfig[1].arbitrumChainId || 0,
          balance: usdcArbitrumBalance.balance
            ? `${usdcArbitrumBalance.balance.toLocaleString()} USDC`
            : '0 USDC',
          usdValue: usdcArbitrumBalance.balance
            ? `$${usdcArbitrumBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdcArbitrumBalance.balance
            ? usdcArbitrumBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[1].icon,
          networkName: 'Arbitrum',
          isLoading: usdcArbitrumBalance.isLoading,
        },
        {
          ...cryptoConfig[2], // USDT Arbitrum
          tokenAddress: cryptoConfig[2].arbitrumTokenAddress || '',
          chainId: cryptoConfig[2].arbitrumChainId || 0,
          balance: usdtArbitrumBalance.balance
            ? `${usdtArbitrumBalance.balance.toLocaleString()} USDT`
            : '0 USDT',
          usdValue: usdtArbitrumBalance.balance
            ? `$${usdtArbitrumBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdtArbitrumBalance.balance
            ? usdtArbitrumBalance.balance.toString()
            : '0',
          currencyIcon: cryptoConfig[2].icon,
          networkName: 'Arbitrum',
          isLoading: usdtArbitrumBalance.isLoading,
        },
      ]
    }
    return []
  }, [
    selectedNetwork,
    cusdCeloBalance,
    usdcCeloBalance,
    usdtCeloBalance,
    usdcArbitrumBalance,
    usdtArbitrumBalance,
  ])

  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      tx.user.toLowerCase().includes(searchLower) ||
      tx.fullName?.toLowerCase().includes(searchLower) ||
      tx.email?.toLowerCase().includes(searchLower) ||
      tx.plan?.toLowerCase().includes(searchLower)
    )
  })

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
        <Box
          bg="neutral.900"
          borderRadius="12px"
          p={12}
          border="1px solid"
          borderColor="neutral.825"
        >
          {/* Header with Back Link and Title */}
          <HStack gap={6} align="center" mb={8}>
            <HStack
              spacing={2}
              cursor="pointer"
              onClick={() => setShowTransactionDetails(false)}
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

          {/* Transaction Information - No inner box */}
          <VStack
            spacing={0}
            divider={<Box h="1px" bg="neutral.600" width="100%" />}
          >
            {/* Full Name */}
            <Flex justify="space-between" align="start" py={6} width="100%">
              <Text
                color="neutral.300"
                fontSize="16px"
                fontWeight="700"
                width="50%"
              >
                Full Name
              </Text>
              <Text
                color="white"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width="50%"
              >
                {selectedTransaction.fullName}
              </Text>
            </Flex>

            {/* Email Address */}
            <Flex justify="space-between" align="start" py={6} width="100%">
              <Text
                color="neutral.300"
                fontSize="16px"
                fontWeight="700"
                width="50%"
              >
                Email address
              </Text>
              <Text
                color="white"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width="50%"
              >
                {selectedTransaction.email}
              </Text>
            </Flex>

            {/* Plan */}
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
                {selectedTransaction.plan}
              </Text>
            </Flex>

            {/* Number of Sessions */}
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
                {selectedTransaction.sessions}
              </Text>
            </Flex>

            {/* Price */}
            <Flex justify="space-between" align="start" py={6} width="100%">
              <Text
                color="neutral.300"
                fontSize="16px"
                fontWeight="700"
                width="50%"
              >
                Price
              </Text>
              <Text
                color="white"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width="50%"
              >
                {selectedTransaction.price}
              </Text>
            </Flex>

            {/* Payment Method */}
            <Flex justify="space-between" align="start" py={6} width="100%">
              <Text
                color="neutral.300"
                fontSize="16px"
                fontWeight="700"
                width="50%"
              >
                Payment Method
              </Text>
              <Text
                color="white"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width="50%"
              >
                {selectedTransaction.paymentMethod}
              </Text>
            </Flex>

            {/* First Session Location */}
            <Flex justify="space-between" align="start" py={6} width="100%">
              <Text
                color="neutral.300"
                fontSize="16px"
                fontWeight="700"
                width="50%"
              >
                First Session Location
              </Text>
              <Text
                color="primary.200"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width="50%"
                textDecoration="underline"
                cursor="pointer"
              >
                {selectedTransaction.sessionLocation}
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
                Transaction status
              </Text>
              <Text
                color="yellow.400"
                fontSize="16px"
                fontWeight="500"
                textAlign="left"
                width="50%"
              >
                Pending
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
                {selectedTransaction.transactionHash}
              </Text>
            </Flex>
          </VStack>
        </Box>
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
                return (
                  tx.user.toLowerCase().includes(searchLower) ||
                  tx.fullName?.toLowerCase().includes(searchLower) ||
                  tx.email?.toLowerCase().includes(searchLower) ||
                  tx.plan?.toLowerCase().includes(searchLower)
                )
              })
            return (
              <VStack spacing={3}>
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
                  filteredCryptoTransactions.map(transaction => (
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
                        setSelectedTransaction(transaction)
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
                              {transaction.user} {transaction.action}{' '}
                              {transaction.amount}
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
                          <Text fontSize="14px" fontWeight="500" color="white">
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
                  ))
                )}
              </VStack>
            )
          })()}

          {/* Transaction History Title */}
          <Text fontSize="24px" fontWeight="700" color="neutral.0" mb={4}>
            Transaction History
          </Text>
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
                <HStack spacing={3} align="center">
                  <Spinner color="neutral.400" size="md" />
                  <Text fontSize="16px" color="neutral.400" fontWeight="500">
                    Loading balance...
                  </Text>
                </HStack>
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
                    You have {transactions.length} transaction
                    {transactions.length !== 1 ? 's' : ''}.{' '}
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
                  filteredTransactions.map(transaction => (
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
                        setSelectedTransaction(transaction)
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
                              {transaction.user} {transaction.action}{' '}
                              {transaction.amount}
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
                          <Text fontSize="14px" fontWeight="500" color="white">
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
                  ))
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
                {cryptoAssetsWithBalances.map((asset, index) => (
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
                          <Text color="white" fontSize="20px" fontWeight="700">
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
                            <Text
                              fontSize="16px"
                              fontWeight="500"
                              color="green.400"
                            >
                              {asset.change}
                            </Text>
                          </HStack>
                        </VStack>
                      </HStack>
                      <VStack align="end" spacing={0}>
                        <Text color="white" fontSize="20px" fontWeight="700">
                          {asset.balance}
                        </Text>
                        <Text fontSize="16px" fontWeight="500" color="white">
                          {asset.usdValue}
                        </Text>
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
