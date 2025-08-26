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
import React, { useEffect, useState } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { IoChevronDown } from 'react-icons/io5'
import {
  getContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb'
import { useActiveWallet } from 'thirdweb/react'
import { formatUnits } from 'viem'

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
} from '@/utils/constants/meeting-types'
import { TokenType } from '@/utils/constants/meeting-types'
import { handleApiError } from '@/utils/error_helper'
import { parseUnits, zeroAddress } from '@/utils/generic_utils'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { useToastHelpers } from '@/utils/toasts'
import { getTokenDecimals, getTokenInfo } from '@/utils/token.service'
import { thirdWebClient } from '@/utils/user_manager'

import MagicLinkModal from './components/MagicLinkModal'
import TransactionVerificationModal from './components/TransactionVerificationModal'

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

  const NETWORK_CONFIG = supportedPaymentChains.reduce((acc, chain) => {
    acc[getNetworkDisplayName(chain)] = chain
    return acc
  }, {} as Record<string, SupportedChain>)

  const [sendNetwork, setSendNetwork] =
    useState<SupportedChain>(selectedNetwork)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

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
    onMagicLinkClose()
    setIsSendingMagicLink(false)
    setNotificationEmail(null)
    onClose()
  }

  // Update sendNetwork when selectedNetwork prop changes
  useEffect(() => {
    setSendNetwork(selectedNetwork)
  }, [selectedNetwork])

  // Get chain info and available tokens
  const chain = supportedChains.find(
    val => val.chain === sendNetwork
  ) as ChainInfo

  // Get available tokens dynamically from chain configuration (excluding native tokens)
  const availableTokens = chain
    ? chain.acceptableTokens
        .filter(token => token.contractAddress !== zeroAddress)
        .filter(token => {
          if (sendNetwork === SupportedChain.CELO) {
            return (
              token.token !== AcceptedToken.CELO &&
              token.token !== AcceptedToken.CEUR
            )
          }
          return true
        })
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

    if (!activeWallet) {
      showErrorToast(
        'Wallet Not Connected',
        'Please connect your wallet to send funds'
      )
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

        showSuccessToast(
          'Transaction Successful!',
          'Funds have been sent successfully'
        )

        // Reset form and close modal
        setSelectedToken(null)
        setRecipientAddress('')
        setAmount('')
        setProgress(0)
        handleClose()
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size={{ base: 'full', md: 'md' }}
        isCentered
      >
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="neutral.900"
          borderRadius={{ base: '0', md: '12px' }}
          border="1px solid"
          borderColor="neutral.825"
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
                color="white"
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
                      color="white"
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
                    bg="neutral.800"
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
                  color="white"
                  fontSize={{ base: '14px', md: '16px' }}
                  fontWeight="600"
                  mb={{ base: 2, md: 3 }}
                >
                  Select token
                </Text>
                <Box
                  bg="neutral.825"
                  borderRadius={{ base: '8px', md: '12px' }}
                  px={{ base: 3, md: 4 }}
                  py={{ base: 2, md: 3 }}
                  display="flex"
                  alignItems="center"
                  gap={3}
                  cursor="pointer"
                  onClick={() => !isLoading && setIsTokenModalOpen(true)}
                  _hover={{ opacity: isLoading ? 1 : 0.8 }}
                  border="1px solid"
                  borderColor="neutral.700"
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
                        color="white"
                        fontSize={{ base: '14px', md: '16px' }}
                        fontWeight="500"
                      >
                        {selectedToken.symbol}
                      </Text>
                    </>
                  ) : (
                    <Text
                      color="neutral.400"
                      fontSize={{ base: '14px', md: '16px' }}
                    >
                      Select a token
                    </Text>
                  )}
                  <Icon
                    as={IoChevronDown}
                    color="neutral.300"
                    fontSize={{ base: '14px', md: '16px' }}
                    ml="auto"
                  />
                </Box>
              </Box>

              {/* Select Network - Only show if not from token view */}
              {!isFromTokenView && (
                <Box>
                  <Text
                    color="white"
                    fontSize={{ base: '14px', md: '16px' }}
                    fontWeight="600"
                    mb={{ base: 2, md: 3 }}
                  >
                    Select network
                  </Text>
                  <Box
                    bg="neutral.825"
                    borderRadius={{ base: '8px', md: '12px' }}
                    px={{ base: 3, md: 4 }}
                    py={{ base: 2, md: 3 }}
                    display="flex"
                    alignItems="center"
                    gap={3}
                    cursor="pointer"
                    onClick={() => !isLoading && setIsNetworkModalOpen(true)}
                    _hover={{ opacity: isLoading ? 1 : 0.8 }}
                    border="1px solid"
                    borderColor="neutral.700"
                    opacity={isLoading ? 0.6 : 1}
                  >
                    <Text
                      color="white"
                      fontSize={{ base: '14px', md: '16px' }}
                      fontWeight="500"
                    >
                      {getNetworkDisplayName(sendNetwork)}
                    </Text>
                    <Icon
                      as={IoChevronDown}
                      color="neutral.300"
                      fontSize={{ base: '14px', md: '16px' }}
                      ml="auto"
                    />
                  </Box>
                </Box>
              )}

              {/* Recipient Address */}
              <Box>
                <Text
                  color="white"
                  fontSize={{ base: '14px', md: '16px' }}
                  fontWeight="600"
                  mb={{ base: 2, md: 3 }}
                >
                  Receive (enter wallet address)
                </Text>
                <Input
                  placeholder="Enter the receivers wallet address"
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  bg="neutral.825"
                  border="1px solid"
                  borderColor="neutral.700"
                  borderRadius={{ base: '8px', md: '12px' }}
                  color="white"
                  fontSize={{ base: '14px', md: '16px' }}
                  _placeholder={{ color: 'neutral.400' }}
                  _focus={{
                    borderColor: 'primary.400',
                    boxShadow: 'none',
                  }}
                  isDisabled={isLoading}
                />
              </Box>

              {/* Warning Message */}
              <Box
                bg="orange.900"
                borderRadius={{ base: '6px', md: '8px' }}
                px={{ base: 3, md: 4 }}
                py={{ base: 2, md: 3 }}
                border="1px solid"
                borderColor="orange.700"
              >
                <Text
                  color="orange.200"
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
                  <Text as="span" color="orange.100" fontWeight="700">
                    {getNetworkDisplayName(sendNetwork)}
                  </Text>{' '}
                  network wallet address to avoid loss of funds.
                </Text>
              </Box>

              {/* Amount */}
              <Box>
                <Text
                  color="white"
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
                  bg="neutral.825"
                  border="1px solid"
                  borderColor="neutral.700"
                  borderRadius={{ base: '8px', md: '12px' }}
                  color="white"
                  fontSize={{ base: '14px', md: '16px' }}
                  _placeholder={{ color: 'neutral.400' }}
                  _focus={{
                    borderColor: 'primary.400',
                    boxShadow: 'none',
                  }}
                  isDisabled={isLoading}
                />
              </Box>

              {/* Send Button */}
              <Button
                bg="primary.500"
                color="white"
                fontSize={{ base: '14px', md: '16px' }}
                fontWeight="600"
                py={{ base: 3, md: 4 }}
                borderRadius={{ base: '8px', md: '12px' }}
                _hover={{ bg: isLoading ? 'primary.500' : 'primary.600' }}
                _active={{ bg: isLoading ? 'primary.500' : 'primary.700' }}
                onClick={handleSend}
                isDisabled={
                  !selectedToken ||
                  !recipientAddress ||
                  !amount ||
                  isLoading ||
                  !activeWallet
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

      {/* Token Selection Modal */}
      <Modal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
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
            Select Token
          </ModalHeader>
          <ModalBody pb={6}>
            <RadioGroup
              value={selectedToken?.symbol || ''}
              onChange={async value => {
                const token = availableTokens.find(
                  (t: AcceptedTokenInfo) => getTokenSymbol(t.token) === value
                )

                if (token) {
                  await handleTokenSelection(token)
                }
                setIsTokenModalOpen(false)
              }}
            >
              <Stack spacing={4}>
                {availableTokens.map((token: AcceptedTokenInfo) => {
                  const tokenName = getTokenName(token.token)
                  const tokenSymbol = getTokenSymbol(token.token)

                  return (
                    <Radio
                      key={tokenSymbol}
                      value={tokenSymbol}
                      colorScheme="orange"
                      size="lg"
                      variant="filled"
                    >
                      <HStack spacing={3}>
                        <Image
                          src={
                            getTokenIcon(token.token) ||
                            '/assets/chains/ethereum.svg'
                          }
                          alt={tokenSymbol}
                          w="24px"
                          h="24px"
                          borderRadius="full"
                        />
                        <VStack align="start" spacing={0}>
                          <Text color="white" fontSize="16px" fontWeight="500">
                            {tokenName}
                          </Text>
                          <Text color="neutral.400" fontSize="14px">
                            {chain?.name || sendNetwork}
                          </Text>
                        </VStack>
                      </HStack>
                    </Radio>
                  )
                })}
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
            Select Network
          </ModalHeader>
          <ModalBody pb={6}>
            <RadioGroup
              value={sendNetwork}
              onChange={value => {
                setSendNetwork(value as SupportedChain)
                setSelectedToken(null) // Reset token when network changes
                setIsNetworkModalOpen(false)
              }}
            >
              <VStack spacing={6} align="stretch">
                {Object.entries(NETWORK_CONFIG).map(
                  ([displayName, chainType]) => {
                    const chainInfo = supportedChains.find(
                      c => c.chain === chainType
                    )
                    return (
                      <Radio
                        key={chainType}
                        value={chainType}
                        colorScheme="orange"
                        size="lg"
                        variant="filled"
                        py={1}
                      >
                        <HStack spacing={3}>
                          <Image
                            src={
                              chainInfo?.image || '/assets/chains/ethereum.svg'
                            }
                            alt={displayName}
                            w="24px"
                            h="24px"
                            borderRadius="full"
                          />
                          <VStack align="start" spacing={0}>
                            <Text
                              color="white"
                              fontSize="16px"
                              fontWeight="500"
                            >
                              {displayName}
                            </Text>
                          </VStack>
                        </HStack>
                      </Radio>
                    )
                  }
                )}
              </VStack>
            </RadioGroup>
          </ModalBody>
        </ModalContent>
      </Modal>

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
