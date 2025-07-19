import {
  Box,
  Button,
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
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'
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

import { Account } from '@/types/Account'

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
}

interface Currency {
  name: string
  code: string
  flag: string
}

interface Network {
  name: string
  icon: string
}

interface Transaction {
  id: string
  user: string
  userImage?: string
  action: string // "sent you" or "You sent" etc
  amount: string
  status: 'Successful' | 'Failed'
  date: string
  time: string
  // Additional fields for transaction details
  fullName?: string
  email?: string
  plan?: string
  sessions?: string
  price?: string
  paymentMethod?: string
  sessionLocation?: string
  transactionHash?: string
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
    useState<Transaction | null>(null)
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
    { name: 'All networks', icon: '/assets/chains/Default.svg' },
    { name: 'Celo', icon: '/assets/chains/Celo.svg' },
    { name: 'Arbitrum', icon: '/assets/chains/Arbitrum.svg' },
  ]

  const cryptoAssets: CryptoAsset[] = [
    {
      name: 'Celo Dollar',
      symbol: 'cUSD',
      icon: '/assets/tokens/CUSD.png',
      price: '1 USD',
      change: '+3.6%',
      balance: '1,230 cUSD',
      usdValue: '1,230 USD',
      fullBalance: '30,454.34',
      currencyIcon: '/assets/tokens/CUSD.png',
    },
    {
      name: 'US Dollar Coin',
      symbol: 'USDC',
      icon: '/assets/tokens/USDC.svg',
      price: '1 USD',
      change: '+3.6%',
      balance: '1,230 USDC',
      usdValue: '1,230 USD',
      fullBalance: '25,000.00',
      currencyIcon: '/assets/tokens/USDC.svg',
    },
    {
      name: 'US Dollar Coin',
      symbol: 'USDC',
      icon: '/assets/tokens/USDC.svg',
      price: '1 USD',
      change: '+3.6%',
      balance: '1,230 USDC',
      usdValue: '1,230 USD',
      fullBalance: '15,000.00',
      currencyIcon: '/assets/tokens/USDC.svg',
    },
  ]

  const transactions: Transaction[] = [
    {
      id: '1',
      user: 'Joseph Yu',
      userImage: '/assets/wallet-add.png',
      action: 'sent you',
      amount: '$200',
      status: 'Successful',
      date: '4 Feb',
      time: '02:00 GMT+1',
      fullName: 'Osinachi Patrick',
      email: 'sinachpat@gmail.com',
      plan: 'Personalized Figma and design system training, for individuals, teams, and companies.',
      sessions: '5 sessions',
      price: '$3,000',
      paymentMethod: 'Pay with Card',
      sessionLocation: "Go to client's page",
      transactionHash: 'vf45dfdfsldhguelds',
    },
    {
      id: '2',
      user: 'Joseph Yu',
      userImage: '/assets/wallet-add.png',
      action: 'sent you',
      amount: '$200',
      status: 'Failed',
      date: '4 Feb',
      time: '02:00 GMT+1',
      fullName: 'Osinachi Patrick',
      email: 'sinachpat@gmail.com',
      plan: 'Personalized Figma and design system training, for individuals, teams, and companies.',
      sessions: '5 sessions',
      price: '$3,000',
      paymentMethod: 'Pay with Card',
      sessionLocation: "Go to client's page",
      transactionHash: 'vf45dfdfsldhguelds',
    },
    {
      id: '3',
      user: 'Aanura Ven',
      userImage: '/assets/wallet-add.png',
      action: 'You sent',
      amount: '$200',
      status: 'Successful',
      date: '4 Feb',
      time: '02:00 GMT+1',
      fullName: 'Osinachi Patrick',
      email: 'sinachpat@gmail.com',
      plan: 'Personalized Figma and design system training, for individuals, teams, and companies.',
      sessions: '5 sessions',
      price: '$3,000',
      paymentMethod: 'Pay with Card',
      sessionLocation: "Go to client's page",
      transactionHash: 'vf45dfdfsldhguelds',
    },
  ]

  const ActionButton = ({ icon, label, isActive = false }: any) => (
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
              <Text
                fontSize="48px"
                fontWeight="500"
                color="white"
                lineHeight="1"
              >
                {selectedCrypto.fullBalance}
              </Text>
              <Text fontSize="16px" color="neutral.300" fontWeight="500">
                ${selectedCrypto.fullBalance}
              </Text>
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
              />
              <ActionButton icon={PiArrowCircleRight} label="Send funds" />
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

          {/* Transaction History Title */}
          <Text fontSize="24px" fontWeight="700" color="neutral.0" mb={4}>
            Transaction History
          </Text>

          {/* Transactions List */}
          <VStack spacing={3}>
            {transactions.map(transaction => (
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
                      <Text color="white" fontSize="16px" fontWeight="500">
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
                  <Text fontSize="16px" color="neutral.0" fontWeight="500">
                    {transaction.date} {transaction.time}
                  </Text>
                </Flex>
              </Box>
            ))}
          </VStack>
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
              <Text
                fontSize="48px"
                fontWeight="500"
                color="white"
                lineHeight="1"
              >
                {showBalance ? '$30,454.34' : '••••••••'}
              </Text>
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
              />
              <ActionButton icon={PiArrowCircleRight} label="Send funds" />
            </HStack>
          </Box>

          {/* Transaction Notification - only show when not in transaction view */}
          {!showTransactions && (
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
                You just received $3,000 USDC from Una.{' '}
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
                {transactions.map(transaction => (
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
                          <Text color="white" fontSize="16px" fontWeight="500">
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
                      <Text fontSize="16px" color="neutral.0" fontWeight="500">
                        {transaction.date} {transaction.time}
                      </Text>
                    </Flex>
                  </Box>
                ))}
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
                {cryptoAssets.map((asset, index) => (
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
                        <Box
                          w="48px"
                          h="48px"
                          borderRadius="full"
                          bg="neutral.800"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          overflow="hidden"
                        >
                          <Image
                            src={asset.icon}
                            alt={asset.symbol}
                            w="32px"
                            h="32px"
                          />
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
              <Stack spacing={4}>
                {currencies.map(currency => (
                  <Radio
                    key={currency.code}
                    value={currency.code}
                    colorScheme="orange"
                    size="lg"
                    _checked={{
                      '& .chakra-radio__control': {
                        bg: 'primary.400',
                        borderColor: 'primary.400',
                      },
                    }}
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
              </Stack>
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
              <Stack spacing={4}>
                {networks.map(network => (
                  <Radio
                    key={network.name}
                    value={network.name}
                    colorScheme="orange"
                    size="lg"
                    _checked={{
                      '& .chakra-radio__control': {
                        bg: 'primary.400',
                        borderColor: 'primary.400',
                      },
                    }}
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
              </Stack>
            </RadioGroup>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export default Wallet
