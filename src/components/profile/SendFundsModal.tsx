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
  VStack,
} from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
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
import { createCryptoTransaction } from '@/utils/api_helper'
import { supportedPaymentChains } from '@/utils/constants/meeting-types'
import { TokenType } from '@/utils/constants/meeting-types'
import { parseUnits, zeroAddress } from '@/utils/generic_utils'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { useToastHelpers } from '@/utils/toasts'
import { getTokenDecimals, getTokenInfo } from '@/utils/token.service'
import { thirdWebClient } from '@/utils/user_manager'

interface SendFundsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedNetwork?: string
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
  const handleClose = () => {
    setSelectedToken(null)
    setRecipientAddress('')
    setAmount('')
    setProgress(0)
    setIsLoading(false)
    onClose()
  }
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)

  const NETWORK_CONFIG = supportedPaymentChains.reduce((acc, chain) => {
    acc[getNetworkDisplayName(chain)] = chain
    return acc
  }, {} as Record<string, SupportedChain>)

  const [sendNetwork, setSendNetwork] = useState<SupportedChain>(
    NETWORK_CONFIG[selectedNetwork as keyof typeof NETWORK_CONFIG] ||
      supportedPaymentChains[0] ||
      SupportedChain.CELO
  )
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const activeWallet = useActiveWallet()
  const { showSuccessToast, showErrorToast, showInfoToast } = useToastHelpers()
  const queryClient = useQueryClient()

  // Update sendNetwork when selectedNetwork prop changes
  useEffect(() => {
    const newNetwork =
      NETWORK_CONFIG[selectedNetwork as keyof typeof NETWORK_CONFIG] ||
      supportedPaymentChains[0] ||
      SupportedChain.CELO
    setSendNetwork(newNetwork)
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
      showErrorToast(
        'Token Error',
        'Failed to get token information. Please try again.'
      )
    }
  }

  const handleSend = async () => {
    if (!selectedToken || !recipientAddress || !amount) {
      showErrorToast(
        'Missing Information',
        'Please fill in all required fields'
      )
      return
    }

    if (!isValidAddress(recipientAddress)) {
      showErrorToast('Invalid Address', 'Please enter a valid wallet address')
      return
    }

    if (!isValidAmount(amount)) {
      showErrorToast('Invalid Amount', 'Please enter a valid amount')
      return
    }

    if (!activeWallet) {
      showErrorToast(
        'Wallet Not Connected',
        'Please connect your wallet to send funds'
      )
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
    } catch (error: any) {
      console.error('Send transaction failed:', error)
      showErrorToast(
        'Transaction Failed',
        error.message || 'Failed to send funds'
      )
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="md" isCentered>
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="neutral.900"
          borderRadius="12px"
          border="1px solid"
          borderColor="neutral.825"
          maxW="500px"
        >
          {/* Header */}
          <ModalHeader pb={4}>
            <HStack spacing={2} align="center">
              <Icon
                as={FiArrowLeft}
                color="primary.400"
                fontSize="20px"
                cursor="pointer"
                onClick={handleClose}
                _hover={{ color: 'primary.300' }}
              />
              <Text color="white" fontSize="20px" fontWeight="600">
                Send funds
              </Text>
            </HStack>
          </ModalHeader>

          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              {/* Progress Bar */}
              {isLoading && (
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text color="white" fontSize="14px" fontWeight="500">
                      Processing transaction...
                    </Text>
                    <Text color="primary.400" fontSize="14px" fontWeight="500">
                      {progress.toString()}%
                    </Text>
                  </HStack>
                  <Box
                    bg="neutral.800"
                    borderRadius="full"
                    h="4px"
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
                <Text color="white" fontSize="16px" fontWeight="600" mb={3}>
                  Select token
                </Text>
                <Box
                  bg="neutral.825"
                  borderRadius="12px"
                  px={4}
                  py={3}
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
                        w="24px"
                        h="24px"
                        borderRadius="full"
                      />
                      <Text color="white" fontSize="16px" fontWeight="500">
                        {selectedToken.symbol}
                      </Text>
                    </>
                  ) : (
                    <Text color="neutral.400" fontSize="16px">
                      Select a token
                    </Text>
                  )}
                  <Icon
                    as={IoChevronDown}
                    color="neutral.300"
                    fontSize="16px"
                    ml="auto"
                  />
                </Box>
              </Box>

              {/* Select Network - Only show if not from token view */}
              {!isFromTokenView && (
                <Box>
                  <Text color="white" fontSize="16px" fontWeight="600" mb={3}>
                    Select network
                  </Text>
                  <Box
                    bg="neutral.825"
                    borderRadius="12px"
                    px={4}
                    py={3}
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
                    <Text color="white" fontSize="16px" fontWeight="500">
                      {getNetworkDisplayName(sendNetwork)}
                    </Text>
                    <Icon
                      as={IoChevronDown}
                      color="neutral.300"
                      fontSize="16px"
                      ml="auto"
                    />
                  </Box>
                </Box>
              )}

              {/* Recipient Address */}
              <Box>
                <Text color="white" fontSize="16px" fontWeight="600" mb={3}>
                  Receive (enter wallet address)
                </Text>
                <Input
                  placeholder="Enter the receivers wallet address"
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  bg="neutral.825"
                  border="1px solid"
                  borderColor="neutral.700"
                  borderRadius="12px"
                  color="white"
                  fontSize="16px"
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
                borderRadius="8px"
                px={4}
                py={3}
                border="1px solid"
                borderColor="orange.700"
              >
                <Text color="orange.200" fontSize="14px" fontWeight="500">
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
                <Text color="white" fontSize="16px" fontWeight="600" mb={3}>
                  Amount
                </Text>
                <Input
                  placeholder="Enter amount to send"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  bg="neutral.825"
                  border="1px solid"
                  borderColor="neutral.700"
                  borderRadius="12px"
                  color="white"
                  fontSize="16px"
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
                fontSize="16px"
                fontWeight="600"
                py={4}
                borderRadius="12px"
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
                    <Text>Sending...</Text>
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
    </>
  )
}

export default SendFundsModal
