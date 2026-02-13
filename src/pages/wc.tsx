import {
  Button,
  Container,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { Result } from '@ethersproject/abi'
import { WalletKitTypes } from '@reown/walletkit'
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils'
import { erc20Abi } from 'abitype/abis'
import { ethers } from 'ethers'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import {
  defineChain,
  getContract,
  readContract,
  sendTransaction,
} from 'thirdweb'
import { useActiveWallet } from 'thirdweb/react'
import { Wallet, WalletId } from 'thirdweb/wallets'
import { formatEther, formatUnits, hexToString } from 'viem'

import Loading from '@/components/Loading'
import useAccountContext from '@/hooks/useAccountContext'
import { useSmartReconnect } from '@/hooks/useSmartReconnect'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { getSupportedChainFromId, supportedChains } from '@/types/chains'
import { ellipsizeAddress, thirdWebClient } from '@/utils/user_manager'
import { getWalletKit } from '@/utils/wallet-kit'

const Home: NextPage = () => {
  const currentAccount = useAccountContext()
  const { openConnection } = useContext(OnboardingModalContext)
  let wallet: Wallet<WalletId> | Wallet | null | undefined = useActiveWallet()
  const { needsReconnection, attemptReconnection } = useSmartReconnect()
  const [proposal, setProposal] =
    useState<WalletKitTypes.SessionProposal | null>(null)
  const [event, setEvent] = useState<WalletKitTypes.SessionRequest | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const toast = useToast()
  const { query } = useRouter()
  useEffect(() => {
    if (!currentAccount || !wallet) {
      openConnection(undefined, false)
    } else if (query.uri) {
      void handleWalletConnect()
    } else {
      void handleAccountConnected()
    }
  }, [currentAccount, wallet, query])
  const handleAccountConnected = async () => {
    if (!wallet) return
    const walletKit = await getWalletKit()

    walletKit.on(
      'session_request',
      async (event: WalletKitTypes.SessionRequest) => setEvent(event)
    )
  }
  const handleWalletConnect = async () => {
    const walletKit = await getWalletKit()
    walletKit.on(
      'session_proposal',
      (proposal: WalletKitTypes.SessionProposal) => setProposal(proposal)
    )
    await walletKit.pair({ uri: query.uri as string })
  }
  const handleConnect = async () => {
    if (!currentAccount || !proposal) return
    setIsConnecting(true)
    const walletKit = await getWalletKit()
    try {
      const approvedNamespaces = buildApprovedNamespaces({
        proposal: proposal.params,
        supportedNamespaces: {
          eip155: {
            accounts: supportedChains.map(
              chain => `eip155:${chain.id}:${currentAccount.address}`
            ),
            chains: supportedChains.map(chain => `eip155:${chain.id}`),
            events: ['accountsChanged', 'chainChanged'],
            methods: ['eth_sendTransaction', 'personal_sign'],
          },
        },
      })
      const session = await walletKit.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      })
      if (window.opener) {
        window.opener.location.href = session.peer.metadata.url
      }
      window.close()
    } catch (error) {
      console.error('Failed to approve session:', error)
      try {
        await walletKit.rejectSession({
          id: proposal.id,
          reason: getSdkError('USER_REJECTED'),
        })
      } catch (error) {
        console.error('Failed to reject session:', error)
      }
      if (window.opener) {
        window.opener.location.href = proposal?.verifyContext?.verified?.origin
      }
    }
    window.close()
    setIsConnecting(false)
  }
  const executeTransaction = async () => {
    if (!event || !wallet) return
    setIsExecuting(true)
    const walletKit = await getWalletKit()

    const { topic, params, id } = event
    const { request, chainId } = params
    const chain = getSupportedChainFromId(
      Number(chainId.replace('eip155:', ''))
    )
    const { method } = request
    if (needsReconnection) {
      wallet = await attemptReconnection()
      if (!wallet) {
        openConnection(undefined, false)
        toast({
          description: 'Please connect your wallet to proceed.',
          duration: 5000,
          isClosable: true,
          status: 'error',
          title: 'Wallet Not Connected',
        })
        return
      }
    }
    const account = wallet?.getAccount()
    if (wallet && chain) {
      const currentChainId = await wallet?.getChain()?.id
      if (currentChainId !== chain.id) {
        await wallet?.switchChain(chain.thirdwebChain)
      }
    }
    const activeSession = walletKit.getActiveSessions()
    if (!account) {
      walletKit.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED'),
      })
      if (window.opener) {
        window.opener.location.href = activeSession[topic].peer.metadata.url
      }
      window.close()
      return
    }
    try {
      const requestParams = request.params[0]
      if (method === 'personal_sign') {
        const message = hexToString(requestParams)
        const signature = await account?.signMessage({
          message,
        })
        const response = { id, jsonrpc: '2.0', result: signature }

        await walletKit.respondSessionRequest({
          response,
          topic,
        })
      } else if (method === 'eth_sendTransaction') {
        const { chainId } = params
        const { data, to, value } = requestParams
        const chain = defineChain(parseInt(chainId.replace('eip155:', '')))
        const tx = await sendTransaction({
          account,
          transaction: {
            chain: chain,
            client: thirdWebClient,
            data,
            gas: requestParams.gas,
            gasPrice: requestParams.gasPrice,
            maxFeePerGas: requestParams.maxFeePerGas,
            maxPriorityFeePerGas: requestParams.maxPriorityFeePerGas,
            nonce: requestParams.nonce,
            to,
            value: value || '0',
          },
        })
        const response = { id, jsonrpc: '2.0', result: tx.transactionHash }
        await walletKit.respondSessionRequest({
          response,
          topic,
        })
      } else if (
        method === 'eth_signTypedData' ||
        method === 'eth_signTypedData_v4'
      ) {
        const [_, typedData] = request.params
        const typedSignature = await account?.signTypedData(
          JSON.parse(typedData)
        )
        const response = { id, jsonrpc: '2.0', result: typedSignature }
        await walletKit.respondSessionRequest({
          response,
          topic,
        })
      } else if (method === 'wallet_switchEthereumChain') {
        const chainId = parseInt(request.params[0].chainId, 16)
        await wallet?.switchChain(defineChain(chainId))
        const response = { id, jsonrpc: '2.0', result: null }
        await walletKit.respondSessionRequest({
          response,
          topic,
        })
      }
    } catch (e) {
      console.error('Error handling session request:', e)
      try {
        await walletKit.respondSessionRequest({
          response: {
            error: {
              code: -32000,
              message: e instanceof Error ? e.message : 'Transaction failed',
            },
            id,
            jsonrpc: '2.0',
          },
          topic,
        })
      } catch (rejectError) {
        console.error('Error responding to session request:', rejectError)
      }
    }

    if (window.opener) {
      window.opener.location.href = activeSession[topic].peer.metadata.url
    }
    window.close()
    setIsExecuting(false)
  }
  const RenderDetails = () => {
    const [transactionType, setTransactionType] = useState('')
    const [transferDetails, setTransferDetails] = useState<{
      to: string
      value: string
      symbol: string
    } | null>(null)
    const [tokenDetails, setTokenDetails] = useState<{
      functionName: string
      decoded: Result
      decimals: number
      symbol: string
      name: string
      contractAddress: string
    } | null>(null)
    const [contractDetails, setContractDetails] = useState<{
      to: string
      data: string
    } | null>(null)
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const displayTransactionDetails = async () => {
      if (!event) return
      setLoading(true)
      const { request } = event.params
      const { method } = request

      if (method === 'personal_sign') {
        const requestParams = request.params[0]
        const message = hexToString(requestParams)
        setMessage(message)
        setTransactionType('sign')
      } else if (method === 'eth_sendTransaction') {
        const txData = request.params[0]
        const { data, to, value } = txData
        if (!data || data === '0x') {
          setTransactionType('eth_transfer')
          const cleanValue = value?.toString().startsWith('0x')
            ? value.toString()
            : `0x${BigInt(value || '0').toString(16)}`
          setTransferDetails({
            symbol: 'ETH',
            to,
            value: value ? formatEther(BigInt(cleanValue), 'wei') : '0',
          })
        } else {
          try {
            const ERC20_ABI = [
              'function transfer(address to, uint256 value)',
              'function approve(address spender, uint256 value)',
              'function transferFrom(address from, address to, uint256 value)',
            ]

            const iface = new ethers.utils.Interface(ERC20_ABI)

            let decoded: Result
            let functionName: string

            try {
              decoded = iface.decodeFunctionData('transfer', data)
              functionName = 'transfer'
            } catch {
              try {
                decoded = iface.decodeFunctionData('approve', data)
                functionName = 'approve'
              } catch {
                try {
                  decoded = iface.decodeFunctionData('transferFrom', data)
                  functionName = 'transferFrom'
                } catch {
                  setTransactionType('contract_call')
                  setContractDetails({ data, to })
                  setLoading(false)
                  return
                }
              }
            }

            // Get token details
            const chain = defineChain(
              parseInt(event.params.chainId.replace('eip155:', '') || '0')
            )

            const tokenContract = getContract({
              abi: erc20Abi,
              address: to,
              chain,
              client: thirdWebClient,
            })

            const [decimals, symbol, name] = await Promise.all([
              readContract({ contract: tokenContract, method: 'decimals' }),
              readContract({ contract: tokenContract, method: 'symbol' }),
              readContract({ contract: tokenContract, method: 'name' }),
            ])

            setTransactionType('token_transaction')
            setTokenDetails({
              contractAddress: to,
              decimals,
              decoded,
              functionName,
              name,
              symbol,
            })
          } catch (_error) {
            // Fallback to raw contract call
            setTransactionType('contract_call')
            setContractDetails({ data, to })
          }
        }
      }

      setLoading(false)
    }
    useEffect(() => {
      void displayTransactionDetails()
    }, [])
    const renderTransactionDetails = () => {
      switch (transactionType) {
        case 'sign':
          return (
            <VStack alignItems="flex-start" spacing={2}>
              <Heading fontSize="lg" fontWeight="bold">
                Message Signing
              </Heading>
              <Text fontSize="sm" rounded="md">
                Message: {message}
              </Text>
            </VStack>
          )
        case 'eth_transfer':
          return (
            <VStack alignItems="flex-start" spacing={2}>
              <Heading fontSize="lg" fontWeight="bold">
                ETH Transfer
              </Heading>
              <Text>To: {ellipsizeAddress(transferDetails?.to)}</Text>
              <Text>Amount: {transferDetails?.value} ETH</Text>
            </VStack>
          )
        case 'token_transaction':
          return (
            tokenDetails && (
              <VStack alignItems="flex-start" spacing={2}>
                <Heading fontSize="lg" fontWeight="bold">
                  Token {tokenDetails.functionName}
                </Heading>
                <Text>
                  Token: {tokenDetails.name} ({tokenDetails.symbol})
                </Text>
                <Text>
                  Contract: {ellipsizeAddress(tokenDetails.contractAddress)}
                </Text>
                {tokenDetails.functionName === 'transfer' && (
                  <>
                    <Text>To: {ellipsizeAddress(tokenDetails.decoded[0])}</Text>
                    <Text>
                      Amount:{' '}
                      {formatUnits(
                        tokenDetails.decoded[1],
                        tokenDetails?.decimals
                      )}{' '}
                      {tokenDetails.symbol}
                    </Text>
                  </>
                )}
                {tokenDetails.functionName === 'approve' && (
                  <>
                    <Text>
                      Spender: {ellipsizeAddress(tokenDetails.decoded[0])}
                    </Text>
                    <Text>
                      Amount:{' '}
                      {formatUnits(
                        tokenDetails.decoded[1],
                        tokenDetails.decimals
                      )}{' '}
                      {tokenDetails.symbol}
                    </Text>
                  </>
                )}
              </VStack>
            )
          )
        case 'contract_call':
          return (
            <VStack alignItems="flex-start" spacing={2}>
              <Heading fontSize="lg" fontWeight="bold">
                Contract Interaction
              </Heading>
              <Text>Contract: {ellipsizeAddress(contractDetails?.to)}</Text>
              <Text fontSize="xs">
                Data: {contractDetails?.data.slice(0, 20)}...
              </Text>
            </VStack>
          )
        default:
          return <Text>Unknown transaction type</Text>
      }
    }
    return loading ? <Loading /> : renderTransactionDetails()
  }
  return (
    <Container
      alignContent="center"
      flex={1}
      justifyContent={'center'}
      maxW="7xl"
      minH="70vh"
      mt={8}
      my={{ base: 12, md: 24 }}
    >
      {proposal && (
        <Modal
          closeOnOverlayClick={false}
          isCentered
          isOpen
          onClose={() => window.close()}
          size="xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader
              alignItems="center"
              display="flex"
              justifyContent="space-between"
              p={'0'}
            >
              <ModalCloseButton />
            </ModalHeader>
            <ModalBody mt={'6'} p={'10'}>
              <VStack alignItems="flex-start">
                <Heading fontSize="2xl">Wallet Connection Request</Heading>
                <Text>
                  Connected as{' '}
                  {currentAccount?.preferences?.name ||
                    ellipsizeAddress(currentAccount?.address)}
                </Text>
                <Text>Please confirm the connection to your wallet.</Text>
                <Text>Origin: {proposal?.verifyContext?.verified?.origin}</Text>

                <HStack gap={'4'} mt={'6'} w={'fit-content'}>
                  <Button
                    colorScheme="primary"
                    isDisabled={isConnecting}
                    isLoading={isConnecting}
                    onClick={handleConnect}
                  >
                    Continue
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
      {event && (
        <Modal
          closeOnOverlayClick={false}
          isCentered
          isOpen
          onClose={() => window.close()}
          size="xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader
              alignItems="center"
              display="flex"
              justifyContent="space-between"
              p={'0'}
            >
              <ModalCloseButton />
            </ModalHeader>
            <ModalBody mt={'6'} p={'10'}>
              <VStack alignItems="flex-start">
                <Heading fontSize="2xl">Sign Transaction</Heading>
                <Text>
                  Connected as{' '}
                  {currentAccount?.preferences?.name ||
                    ellipsizeAddress(currentAccount?.address)}
                </Text>
                <Text>Please sign the transaction to continue.</Text>

                <Text>Origin: {event?.verifyContext?.verified?.origin}</Text>
                <RenderDetails />
                <HStack gap={'4'} mt={'6'} w={'fit-content'}>
                  <Button
                    colorScheme="primary"
                    isDisabled={isExecuting}
                    isLoading={isExecuting}
                    onClick={executeTransaction}
                  >
                    Continue
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
      {!currentAccount ? (
        <VStack>
          <Text>Not connected</Text>
          <Button onClick={() => openConnection(undefined, false)}>
            Connect Wallet
          </Button>
        </VStack>
      ) : (
        <VStack>
          <Loading />
        </VStack>
      )}
    </Container>
  )
}

export default Home
