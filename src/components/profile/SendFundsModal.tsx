import {
  Box,
  Button,
  HStack,
  Icon,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { erc20Abi } from 'abitype/abis'
import React, { useEffect, useRef, useState } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { IoChevronDown } from 'react-icons/io5'
import {
  getContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb'
import { useActiveWallet } from 'thirdweb/react'
import { useOnClickOutside } from 'usehooks-ts'
import { formatUnits } from 'viem'

import { useCryptoBalance } from '@/hooks/useCryptoBalance'
import { useDebounceCallback } from '@/hooks/useDebounceCallback'
import { useSmartReconnect } from '@/hooks/useSmartReconnect'
import { useWallet } from '@/providers/WalletProvider'
import {
  AcceptedToken,
  AcceptedTokenInfo,
  ChainInfo,
  getChainInfo,
  getNetworkDisplayName,
  getTokenIcon,
  getTokenName,
  getTokenSymbol,
  SupportedChain,
  supportedChains,
} from '@/types/chains'
import {
  createCryptoTransaction,
  getNotificationSubscriptions,
  getPaymentPreferences,
  sendEnablePinLink,
  verifyPin,
  verifyVerificationCode,
} from '@/utils/api_helper'
import {
  PaymentType,
  supportedPaymentChains,
  TokenType,
} from '@/utils/constants/meeting-types'
import { handleApiError } from '@/utils/error_helper'
import { estimateGasFee, GasEstimationParams } from '@/utils/gasEstimation'
import { formatCurrency, parseUnits, zeroAddress } from '@/utils/generic_utils'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { CurrencyService } from '@/utils/services/currency.service'
import { useToastHelpers } from '@/utils/toasts'
import { getTokenDecimals, getTokenInfo } from '@/utils/token.service'
import { ellipsizeAddress, thirdWebClient } from '@/utils/user_manager'

import MagicLinkModal from './components/MagicLinkModal'
import NetworkDropdown from './components/NetworkDropdown'
import TokenDropdown from './components/TokenDropdown'
import TransactionVerificationModal from './components/TransactionVerificationModal'
import TransactionSuccessModal from './TransactionSuccessModal'

interface SendFundsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedNetwork: SupportedChain
  isFromTokenView?: boolean
  selectedCryptoNetwork?: string
}

interface Token {
  name: string
  symbol: string
  icon: string
  address: string
  chain: SupportedChain
  decimals: number
  chainId: number
}

const SendFundsModal: React.FC<SendFundsModalProps> = ({
  isOpen,
  onClose,
  selectedNetwork,
  isFromTokenView = false,
}) => {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [estimatedFee, setEstimatedFee] = useState<number>(0)
  const [isEstimatingFee, setIsEstimatingFee] = useState<boolean>(false)
  const [feeError, setFeeError] = useState<boolean>(false)

  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false)
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false)
  const tokenDropdownRef = useRef<HTMLDivElement>(null)
  const networkDropdownRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(tokenDropdownRef, () => {
    setIsTokenDropdownOpen(false)
  })

  useOnClickOutside(networkDropdownRef, () => {
    setIsNetworkDropdownOpen(false)
  })

  const NETWORK_CONFIG = supportedChains
    .filter(
      chain =>
        chain.walletSupported &&
        supportedPaymentChains.includes(chain.chain) &&
        chain.acceptableTokens.some(
          token =>
            token.walletSupported && token.contractAddress !== zeroAddress
        )
    )
    .reduce(
      (acc, chain) => {
        acc[getNetworkDisplayName(chain.chain)] = chain.chain
        return acc
      },
      {} as Record<string, SupportedChain>
    )

  const [sendNetwork, setSendNetwork] =
    useState<SupportedChain>(selectedNetwork)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isNetworkSwitchModalOpen, setIsNetworkSwitchModalOpen] =
    useState(false)
  const [networkMismatch, setNetworkMismatch] = useState<{
    expected: SupportedChain
    actual: SupportedChain | null
  } | null>(null)

  // Add success state
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [successData, setSuccessData] = useState<{
    transactionHash: string
    amount: string
    token: string
    recipient: string
    chainId: number
  } | null>(null)

  // PIN protection state
  const {
    isOpen: isMagicLinkOpen,
    onOpen: onMagicLinkOpen,
    onClose: onMagicLinkClose,
  } = useDisclosure()
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const [notificationEmail, setNotificationEmail] = useState<string | null>(
    null
  )

  const activeWallet = useActiveWallet()
  const { showSuccessToast, showErrorToast, showInfoToast } = useToastHelpers()
  const queryClient = useQueryClient()
  const { needsReconnection, attemptReconnection } = useSmartReconnect()
  const { selectedCurrency } = useWallet()

  const { balance: tokenBalance, isLoading: isBalanceLoading } =
    useCryptoBalance(selectedToken?.address || '', selectedToken?.chainId || 0)

  const { data: exchangeRate } = useQuery(
    ['exchangeRate', selectedCurrency],
    () => CurrencyService.getExchangeRate(selectedCurrency),
    {
      enabled: selectedCurrency !== 'USD',
      staleTime: 1000 * 60 * 60,
      cacheTime: 1000 * 60 * 60 * 24,
    }
  )

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

  // Fetch payment preferences to check if PIN is set
  const { data: paymentPreferences } = useQuery(
    ['paymentPreferences'],
    () => getPaymentPreferences(),
    {
      enabled: isOpen,
    }
  )

  // Fetch notification subscriptions to get email
  const { data: notificationSubscriptions } = useQuery(
    ['notificationSubscriptions'],
    () => getNotificationSubscriptions(),
    {
      enabled: isOpen,
    }
  )

  const handleClose = () => {
    setSelectedToken(null)
    setRecipientAddress('')
    setAmount('')
    setProgress(0)
    setIsLoading(false)
    setIsVerificationModalOpen(false)
    setIsNetworkSwitchModalOpen(false)
    setNetworkMismatch(null)
    setSendNetwork(selectedNetwork)
    onMagicLinkClose()
    setIsSendingMagicLink(false)
    setNotificationEmail(null)
    onClose()
  }

  useEffect(() => {
    setSendNetwork(selectedNetwork)
  }, [selectedNetwork])

  // Get chain info and available tokens
  const chain = supportedChains.find(
    val => val.chain === sendNetwork
  ) as ChainInfo

  // Get available tokens dynamically from chain configuration (excluding native tokens)
  const availableTokens = chain
    ? chain.acceptableTokens.filter(
        token => token.contractAddress !== zeroAddress
      )
    : []

  // Validate recipient address
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Validate amount
  const isValidAmount = (amount: string): boolean => {
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0
  }

  const handleGasEstimation = async () => {
    if (!selectedToken || !activeWallet || !recipientAddress || !amount) {
      setEstimatedFee(0)
      setIsEstimatingFee(false)
      setFeeError(false)
      return
    }

    setIsEstimatingFee(true)
    setFeeError(false)

    const params: GasEstimationParams = {
      selectedToken,
      recipientAddress,
      amount,
      sendNetwork,
      activeWallet,
    }

    const result = await estimateGasFee(params)

    if (!result.success && result.error) {
      handleApiError('Gas Estimation Failed', new Error(result.error))
    }

    setEstimatedFee(result.estimatedFee)
    setIsEstimatingFee(false)
    setFeeError(!result.success)
  }

  const debouncedEstimateGasFee = useDebounceCallback(handleGasEstimation, 500)

  useEffect(() => {
    if (selectedToken && recipientAddress && amount && activeWallet) {
      debouncedEstimateGasFee()
    }
  }, [selectedToken, recipientAddress, amount, sendNetwork, activeWallet])

  const handleTokenSelection = async (token: AcceptedTokenInfo) => {
    if (!chain) return

    try {
      const decimals = await getTokenDecimals(
        token.contractAddress,
        sendNetwork
      )

      setSelectedToken({
        name: getTokenName(token.token),
        symbol: getTokenSymbol(token.token),
        icon: getTokenIcon(token.token) || '/assets/chains/ethereum.svg',
        address: token.contractAddress,
        chain: sendNetwork,
        decimals: decimals,
        chainId: chain.id,
      })
    } catch (error) {
      console.error('Error fetching token decimals:', error)
      handleApiError('Token Information Failed', error)
    }
  }

  const handleNetworkSelection = (chainType: SupportedChain) => {
    setSendNetwork(chainType)
    setSelectedToken(null)
    setIsTokenDropdownOpen(false)
    setIsNetworkDropdownOpen(false)
  }

  const checkNetworkMatch = async (): Promise<boolean> => {
    if (!activeWallet) return false

    try {
      const currentChain = await activeWallet.getChain()
      const currentChainId = currentChain?.id
      const expectedChain = supportedChains.find(c => c.chain === sendNetwork)

      if (!expectedChain) return false

      if (currentChainId !== expectedChain.id) {
        const actualChain = supportedChains.find(c => c.id === currentChainId)
        setNetworkMismatch({
          expected: sendNetwork,
          actual: actualChain?.chain || null,
        })
        setIsNetworkSwitchModalOpen(true)
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking network:', error)
      return false
    }
  }

  const handleSend = async () => {
    if (!selectedToken || !recipientAddress || !amount) {
      showErrorToast(
        'Missing Required Fields',
        'Please fill in all required fields'
      )
      return
    }

    if (!isValidAddress(recipientAddress)) {
      showErrorToast(
        'Invalid Wallet Address',
        'Please enter a valid wallet address'
      )
      return
    }

    if (!isValidAmount(amount)) {
      showErrorToast(
        'Invalid Amount',
        'Please enter a valid amount greater than 0'
      )
      return
    }

    if (needsReconnection) {
      const reconnectedWallet = await attemptReconnection()
      if (!reconnectedWallet) {
        showErrorToast(
          'Wallet Reconnection Failed',
          'Please reconnect your wallet and try again'
        )
        return
      }
    }

    if (!activeWallet) {
      showErrorToast(
        'Wallet Not Connected',
        'Please connect your wallet to send funds'
      )
      return
    }

    // Check if wallet is on the correct network
    const isNetworkCorrect = await checkNetworkMatch()
    if (!isNetworkCorrect) {
      return
    }

    // Check if user has a transaction PIN set up
    if (!paymentPreferences?.hasPin) {
      // User doesn't have a PIN, show magic link modal
      if (notificationSubscriptions?.notification_types) {
        const emailSub = notificationSubscriptions.notification_types.find(
          (sub: { channel: string; disabled: boolean }) =>
            sub.channel === 'email' && !sub.disabled
        )

        if (emailSub?.destination) {
          setNotificationEmail(emailSub.destination)
          onMagicLinkOpen()
        } else {
          showErrorToast(
            'Notification Email Required',
            'You need to set up a notification email first to enable your transaction PIN'
          )
        }
      } else {
        showErrorToast(
          'Notification Email Required',
          'You need to set up a notification email first to enable your transaction PIN'
        )
      }
      return
    }

    // User has a PIN, proceed with verification
    setIsVerificationModalOpen(true)
  }

  const handleNetworkSwitch = async () => {
    if (!activeWallet || !networkMismatch) return

    try {
      const expectedChain = supportedChains.find(
        c => c.chain === networkMismatch.expected
      )
      if (!expectedChain) return

      await activeWallet.switchChain(expectedChain.thirdwebChain)

      setIsNetworkSwitchModalOpen(false)
      setNetworkMismatch(null)

      handleSend()
    } catch (error) {
      console.error('Failed to switch network:', error)
      showErrorToast(
        'Network Switch Failed',
        'Please manually switch your wallet to the correct network and try again'
      )
    }
  }

  const handleVerificationComplete = async (
    pin: string,
    verificationCode: string
  ) => {
    setIsVerifying(true)
    try {
      // First verify the PIN
      const pinVerification = await verifyPin(pin)
      if (!pinVerification.valid) {
        showErrorToast('Incorrect PIN', 'The PIN you entered is incorrect')
        return
      }

      // Verify the verification code
      try {
        const result = await verifyVerificationCode(verificationCode)

        if (!result.success) {
          showErrorToast(
            'Invalid Code',
            'The verification code you entered is incorrect or expired'
          )
          return
        }

        // Both PIN and verification code are valid
        setIsVerificationModalOpen(false)
        await processTransaction()
      } catch (error) {
        handleApiError('Code Verification Failed', error)
        return
      }
    } catch (error) {
      handleApiError('Verification Failed', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const processTransaction = async () => {
    if (!selectedToken || !activeWallet) {
      showErrorToast('Transaction Setup Failed', 'Please try again')
      return
    }

    setIsLoading(true)
    setProgress(10)

    try {
      // Get chain info
      const chainInfo = getChainInfo(sendNetwork)
      if (!chainInfo) {
        throw new Error('Unsupported network')
      }

      setProgress(20)

      // Get token info
      const tokenInfo = await getTokenInfo(
        selectedToken.address as `0x${string}`,
        sendNetwork
      )
      if (!tokenInfo?.decimals) {
        throw new Error('Unable to get token details')
      }

      // Get market price for the token
      const priceFeed = new PriceFeedService()
      const tokenMarketPrice = await priceFeed.getPrice(
        sendNetwork,
        AcceptedToken.USDC
      )

      // Convert user input to token amount using market price
      const transferAmount = parseUnits(
        `${parseFloat(amount) / tokenMarketPrice}`,
        tokenInfo.decimals
      )

      // Create contract instance
      const contract = getContract({
        client: thirdWebClient,
        chain: chainInfo.thirdwebChain,
        address: selectedToken.address as `0x${string}`,
        abi: erc20Abi,
      })

      // Prepare transaction
      const transaction = prepareContractCall({
        contract,
        method: 'transfer',
        params: [recipientAddress as `0x${string}`, transferAmount],
      })

      setProgress(40)

      // Get account
      const account = activeWallet.getAccount()
      if (!account) {
        throw new Error('No account available')
      }

      // Send transaction
      const { transactionHash } = await sendTransaction({
        account,
        transaction,
      })

      setProgress(60)

      showInfoToast(
        'Transaction Submitted',
        `Transaction hash: ${transactionHash}`
      )

      // Wait for receipt
      const receipt = await waitForReceipt({
        client: thirdWebClient,
        chain: chainInfo.thirdwebChain,
        transactionHash,
      })

      setProgress(80)

      if (receipt.status === 'success') {
        // Record transaction in database with exact blockchain amount
        await createCryptoTransaction({
          transaction_hash: transactionHash,
          amount: parseFloat(
            formatUnits(transferAmount, selectedToken.decimals)
          ),
          token_address: selectedToken.address,
          token_type: TokenType.ERC20,
          chain: sendNetwork,
          fiat_equivalent: parseFloat(amount), // Use user's input amount
          meeting_type_id: null,
          receiver_address: recipientAddress.toLowerCase(),
          payment_method: PaymentType.CRYPTO,
        })

        // Refetch wallet balance and transactions
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['total-wallet-balance'] }),
          queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] }),
          queryClient.invalidateQueries({
            queryKey: ['token-balance', selectedToken.address, sendNetwork],
          }),
        ])

        setProgress(100)

        // Set success data and show success modal
        setSuccessData({
          transactionHash,
          amount,
          token: selectedToken.symbol,
          recipient: recipientAddress,
          chainId: chainInfo.id,
        })
        setIsSuccessModalOpen(true)

        // Reset form but don't close modal yet
        setSelectedToken(null)
        setRecipientAddress('')
        setAmount('')
        setProgress(0)
        setIsLoading(false)
      } else {
        throw new Error('Transaction failed')
      }
    } catch (error: unknown) {
      console.error('Send transaction failed:', error)
      handleApiError('Transaction Failed', error)
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false)
    setSuccessData(null)
    handleClose()
  }

  return (
    <>
      {/* Main Send Funds Modal */}
      <Modal
        isOpen={isOpen && !isSuccessModalOpen}
        onClose={handleClose}
        size={{ base: 'full', md: 'md' }}
        isCentered
      >
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="bg-surface"
          borderRadius={{ base: '0', md: '12px' }}
          border="1px solid"
          borderColor="border-wallet-subtle"
          maxW={{ base: '100%', md: '500px' }}
          mx={{ base: 0, md: 'auto' }}
          my={{ base: 0, md: 'auto' }}
          boxShadow="none"
        >
          {/* Header */}
          <ModalHeader pb={{ base: 3, md: 4 }}>
            <HStack spacing={2} align="center">
              <Icon
                as={FiArrowLeft}
                color="primary.400"
                fontSize={{ base: '18px', md: '20px' }}
                cursor="pointer"
                onClick={handleClose}
                _hover={{ color: 'primary.300' }}
              />
              <Text
                color="text-primary"
                fontSize={{ base: '18px', md: '20px' }}
                fontWeight="600"
              >
                Send funds
              </Text>
            </HStack>
          </ModalHeader>

          <ModalBody pb={{ base: 4, md: 6 }}>
            <VStack spacing={{ base: 4, md: 6 }} align="stretch">
              {/* Progress Bar */}
              {isLoading && (
                <Box>
                  <HStack justify="space-between" mb={{ base: 1, md: 2 }}>
                    <Text
                      color="text-primary"
                      fontSize={{ base: '12px', md: '14px' }}
                      fontWeight="500"
                    >
                      Processing transaction...
                    </Text>
                    <Text
                      color="primary.400"
                      fontSize={{ base: '12px', md: '14px' }}
                      fontWeight="500"
                    >
                      {progress.toString()}%
                    </Text>
                  </HStack>
                  <Box
                    bg="bg-surface-tertiary"
                    borderRadius="full"
                    h={{ base: '3px', md: '4px' }}
                    overflow="hidden"
                  >
                    <Box
                      bg="primary.500"
                      h="100%"
                      borderRadius="full"
                      transition="width 0.3s ease"
                      width={`${progress}%`}
                    />
                  </Box>
                </Box>
              )}

              {/* Select Token */}
              <Box>
                <Text
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  fontWeight="600"
                  mb={{ base: 2, md: 3 }}
                >
                  Select token
                </Text>
                <Box position="relative" ref={tokenDropdownRef}>
                  <Box
                    bg="transparent"
                    borderRadius="8px"
                    px={{ base: 3, md: 4 }}
                    h="40px"
                    display="flex"
                    alignItems="center"
                    gap={3}
                    cursor="pointer"
                    onClick={() =>
                      !isLoading && setIsTokenDropdownOpen(!isTokenDropdownOpen)
                    }
                    _hover={{ opacity: isLoading ? 1 : 0.8 }}
                    border="1px solid"
                    borderColor="border-default"
                    opacity={isLoading ? 0.6 : 1}
                  >
                    {selectedToken ? (
                      <>
                        <Image
                          src={selectedToken.icon}
                          alt={selectedToken.symbol}
                          w={{ base: '20px', md: '24px' }}
                          h={{ base: '20px', md: '24px' }}
                          borderRadius="full"
                        />
                        <Text
                          color="text-primary"
                          fontSize={{ base: '14px', md: '16px' }}
                          fontWeight="500"
                        >
                          {selectedToken.symbol}
                        </Text>
                      </>
                    ) : (
                      <Text
                        color="text-muted"
                        fontSize={{ base: '14px', md: '16px' }}
                      >
                        Select a token
                      </Text>
                    )}
                    <Icon
                      as={IoChevronDown}
                      color="text-secondary"
                      fontSize={{ base: '14px', md: '16px' }}
                      ml="auto"
                      transform={
                        isTokenDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                      }
                      transition="transform 0.2s"
                    />
                  </Box>

                  {/* Token Dropdown */}
                  {isTokenDropdownOpen && (
                    <TokenDropdown
                      availableTokens={availableTokens}
                      chain={chain}
                      sendNetwork={sendNetwork}
                      onSelectToken={handleTokenSelection}
                      onClose={() => setIsTokenDropdownOpen(false)}
                    />
                  )}
                </Box>

                {/* Token balance and network info */}
                {selectedToken && (
                  <HStack justify="space-between" mt={2}>
                    <Text
                      color="text-muted"
                      fontSize={{ base: '10px', md: '12px' }}
                      fontWeight="400"
                    >
                      Token balance:
                      {isBalanceLoading
                        ? ' Loading...'
                        : ' ' + formatCurrencyDisplay(tokenBalance)}
                    </Text>
                    <Text
                      color="text-muted"
                      fontSize={{ base: '10px', md: '12px' }}
                      fontWeight="400"
                    >
                      Network: {getNetworkDisplayName(sendNetwork)}
                    </Text>
                  </HStack>
                )}
              </Box>

              {/* Select Network - Only show if not from token view */}
              {!isFromTokenView && (
                <Box>
                  <Text
                    color="text-primary"
                    fontSize={{ base: '14px', md: '16px' }}
                    fontWeight="600"
                    mb={{ base: 2, md: 3 }}
                  >
                    Select network
                  </Text>
                  <Box position="relative" ref={networkDropdownRef}>
                    <Box
                      bg="transparent"
                      borderRadius="8px"
                      px={{ base: 3, md: 4 }}
                      h="40px"
                      display="flex"
                      alignItems="center"
                      gap={3}
                      cursor="pointer"
                      onClick={() =>
                        !isLoading &&
                        setIsNetworkDropdownOpen(!isNetworkDropdownOpen)
                      }
                      _hover={{ opacity: isLoading ? 1 : 0.8 }}
                      border="1px solid"
                      borderColor="border-default"
                      opacity={isLoading ? 0.6 : 1}
                    >
                      <Text
                        color="text-primary"
                        fontSize={{ base: '14px', md: '16px' }}
                        fontWeight="500"
                      >
                        {getNetworkDisplayName(sendNetwork)}
                      </Text>
                      <Icon
                        as={IoChevronDown}
                        color="text-secondary"
                        fontSize={{ base: '14px', md: '16px' }}
                        ml="auto"
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
                      <NetworkDropdown
                        networkConfig={NETWORK_CONFIG}
                        onSelectNetwork={handleNetworkSelection}
                        onClose={() => setIsNetworkDropdownOpen(false)}
                      />
                    )}
                  </Box>
                </Box>
              )}

              {/* Recipient Address */}
              <Box>
                <Text
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  fontWeight="600"
                  mb={{ base: 2, md: 3 }}
                >
                  Receiver (enter wallet address)
                </Text>
                <Input
                  placeholder="Enter the receivers wallet address"
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  bg="transparent"
                  border="1px solid"
                  borderColor="border-default"
                  borderRadius="8px"
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  _placeholder={{ color: 'text-muted' }}
                  _focus={{
                    borderColor: 'primary.400',
                    boxShadow: 'none',
                  }}
                  isDisabled={isLoading}
                />
              </Box>

              <Box
                bg="warning-bg"
                borderRadius={{ base: '6px', md: '10px' }}
                px={{ base: 3, md: 4 }}
                py={{ base: 2, md: 3 }}
              >
                <VStack spacing={2} align="start">
                  <Text
                    color="warning-text"
                    fontSize={{ base: '12px', md: '14px' }}
                    fontWeight="500"
                  >
                    Ensure you&apos;re sending the funds to{' '}
                    {getNetworkDisplayName(sendNetwork).toLowerCase() ===
                      'arbitrum' ||
                    getNetworkDisplayName(sendNetwork).toLowerCase() ===
                      'arbitrum sepolia'
                      ? 'an'
                      : 'a'}{' '}
                    <Text as="span" color="warning-text" fontWeight="700">
                      {getNetworkDisplayName(sendNetwork)} network wallet
                      address
                    </Text>{' '}
                    to avoid loss of funds.
                  </Text>
                </VStack>
              </Box>

              {/* Amount */}
              <Box>
                <Text
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  fontWeight="600"
                  mb={{ base: 2, md: 3 }}
                >
                  Amount
                </Text>
                <Input
                  placeholder="Enter amount to send"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  bg="transparent"
                  border="1px solid"
                  borderColor="border-default"
                  borderRadius="8px"
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  _placeholder={{ color: 'text-muted' }}
                  _focus={{
                    borderColor: 'primary.400',
                    boxShadow: 'none',
                  }}
                  isDisabled={isLoading}
                />
              </Box>

              {/* Fees Summary */}
              {selectedToken && amount && parseFloat(amount) > 0 && (
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text color="text-primary" fontSize="16px" fontWeight="500">
                      Amount
                    </Text>
                    <Text color="text-primary" fontSize="16px" fontWeight="500">
                      ${amount} {selectedToken.symbol}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="text-primary" fontSize="16px" fontWeight="500">
                      Transaction fee
                    </Text>
                    <Text color="text-primary" fontSize="16px" fontWeight="500">
                      {isEstimatingFee ? (
                        <HStack spacing={1}>
                          <Spinner size="xs" />
                          <Text>Loading...</Text>
                        </HStack>
                      ) : feeError ? (
                        "Couldn't fetch"
                      ) : (
                        `$${estimatedFee.toFixed(2)}`
                      )}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="text-primary" fontSize="16px" fontWeight="500">
                      Total to be debited
                    </Text>
                    <Text color="text-primary" fontSize="16px" fontWeight="500">
                      {isEstimatingFee ? (
                        <HStack spacing={1}>
                          <Spinner size="xs" />
                          <Text>Loading...</Text>
                        </HStack>
                      ) : feeError ? (
                        "Couldn't calculate"
                      ) : (
                        `$${(parseFloat(amount) + estimatedFee).toFixed(2)} ${
                          selectedToken.symbol
                        }`
                      )}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="text-primary" fontSize="16px" fontWeight="500">
                      Recipient
                    </Text>
                    <Text color="text-muted" fontSize="16px" fontWeight="500">
                      {recipientAddress
                        ? ellipsizeAddress(recipientAddress)
                        : 'Not specified'}
                    </Text>
                  </HStack>
                </VStack>
              )}

              {/* Send Button */}
              <Button
                colorScheme="primary"
                width="fit-content"
                fontSize={{ base: '14px', md: '16px' }}
                fontWeight="600"
                py={{ base: 3, md: 5 }}
                borderRadius="8px"
                _hover={{ bg: isLoading ? 'primary.500' : 'primary.300' }}
                _active={{ bg: isLoading ? 'primary.500' : 'primary.700' }}
                onClick={handleSend}
                isDisabled={
                  !selectedToken || !recipientAddress || !amount || isLoading
                }
                isLoading={isLoading}
                loadingText="Sending..."
              >
                {isLoading ? (
                  <HStack spacing={2}>
                    <Spinner size="sm" />
                    <Text fontSize={{ base: '14px', md: '16px' }}>
                      Sending...
                    </Text>
                  </HStack>
                ) : (
                  'Send'
                )}
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Success Modal */}
      {successData && (
        <TransactionSuccessModal
          isOpen={isSuccessModalOpen}
          onClose={handleSuccessClose}
          transactionHash={successData.transactionHash}
          amount={successData.amount}
          token={successData.token}
          recipient={successData.recipient}
          chainId={successData.chainId}
        />
      )}

      {/* Transaction Verification Modal */}
      <TransactionVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onVerificationComplete={handleVerificationComplete}
        isLoading={isVerifying}
        userEmail={
          notificationSubscriptions?.notification_types?.find(
            (sub: { channel: string; disabled: boolean }) =>
              sub.channel === 'email' && !sub.disabled
          )?.destination || ''
        }
      />

      {/* Network Switch Modal */}
      <Modal
        isOpen={isNetworkSwitchModalOpen}
        onClose={() => setIsNetworkSwitchModalOpen(false)}
        size="md"
        isCentered
      >
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="bg-surface-secondary"
          borderRadius="12px"
          border="1px solid"
          borderColor="border-wallet-subtle"
          shadow="none"
        >
          <ModalHeader
            color="text-primary"
            fontSize="20px"
            fontWeight="600"
            pb={2}
          >
            Wrong Network Detected
          </ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              <Box>
                <Text color="text-primary" fontSize="16px" mb={3}>
                  Your wallet is connected to the wrong network for this
                  transaction.
                </Text>
                <VStack spacing={2} align="start">
                  <Text color="text-muted" fontSize="14px">
                    <Text as="span" color="red.400" fontWeight="600">
                      Current Network:
                    </Text>{' '}
                    {networkMismatch?.actual
                      ? getNetworkDisplayName(networkMismatch.actual)
                      : 'Unknown'}
                  </Text>
                  <Text color="text-muted" fontSize="14px">
                    <Text as="span" color="green.400" fontWeight="600">
                      Required Network:
                    </Text>{' '}
                    {getNetworkDisplayName(
                      networkMismatch?.expected || sendNetwork
                    )}
                  </Text>
                </VStack>
              </Box>

              <Box bg="warning-bg" borderRadius="8px" px={4} py={3}>
                <Text color="warning-text" fontWeight="500" fontSize="14px">
                  <Text as="span" color="warning-text" fontWeight="700">
                    ⚠️ Warning:
                  </Text>{' '}
                  Sending funds on the wrong network can result in permanent
                  loss of funds.
                </Text>
              </Box>

              <HStack spacing={4} pt={2}>
                <Button
                  bg="primary.500"
                  color="text-primary"
                  onClick={handleNetworkSwitch}
                  size="lg"
                  borderRadius="8px"
                  flex={1}
                  _hover={{ bg: 'primary.600' }}
                >
                  Switch Network
                </Button>
                <Button
                  variant="outline"
                  borderColor="border-default"
                  color="text-secondary"
                  onClick={() => setIsNetworkSwitchModalOpen(false)}
                  size="lg"
                  borderRadius="8px"
                  flex={1}
                  _hover={{ bg: 'bg-surface-tertiary' }}
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Magic Link Modal for PIN Protection */}
      <MagicLinkModal
        isOpen={isMagicLinkOpen}
        onClose={onMagicLinkClose}
        onConfirm={async () => {
          if (notificationEmail) {
            setIsSendingMagicLink(true)
            try {
              await sendEnablePinLink(notificationEmail)
              showSuccessToast(
                'Success',
                'A magic link has been sent to your email to set up your transaction PIN'
              )
              onMagicLinkClose()
            } catch (error) {
              handleApiError('Magic Link Error', error)
            } finally {
              setIsSendingMagicLink(false)
            }
          }
        }}
        title="Enable Transaction PIN"
        message="You need to set up a transaction PIN to send funds. A magic link will be sent to your notification email to set up your transaction PIN. This ensures the security of your account."
        confirmButtonText="Send Magic Link"
        isLoading={isSendingMagicLink}
      />
    </>
  )
}

export default SendFundsModal
