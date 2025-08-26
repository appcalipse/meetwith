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
  VStack,
} from '@chakra-ui/react'
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
import { formatUnits, hexToString } from 'viem'

import Loading from '@/components/Loading'
import useAccountContext from '@/hooks/useAccountContext'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { supportedChains } from '@/types/chains'
import { parseUnits } from '@/utils/generic_utils'
import { ellipsizeAddress, thirdWebClient } from '@/utils/user_manager'
import { getWalletKit } from '@/utils/wallet-kit'

const Home: NextPage = () => {
  const currentAccount = useAccountContext()
  const { openConnection } = useContext(OnboardingModalContext)
  const wallet = useActiveWallet()
  const [proposal, setProposal] =
    useState<WalletKitTypes.SessionProposal | null>(null)
  const [event, setEvent] = useState<WalletKitTypes.SessionRequest | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
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
            chains: supportedChains.map(chain => `eip155:${chain.id}`),
            methods: ['eth_sendTransaction', 'personal_sign'],
            events: ['accountsChanged', 'chainChanged'],
            accounts: supportedChains.map(
              chain => `eip155:${chain.id}:${currentAccount.address}`
            ),
          },
        },
      })
      const session = await walletKit.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      })
      window.opener.location.href = session.peer.metadata.url
    } catch (error) {
      console.error('Failed to approve session:', error)
      await walletKit.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED'),
      })
      window.opener.location.href = proposal?.verifyContext?.verified?.origin
    }
    window.close()
    setIsConnecting(false)
  }
  const executeTransaction = async () => {
    if (!event || !wallet) return
    setIsExecuting(true)
    const walletKit = await getWalletKit()

    const { topic, params, id } = event
    const { request } = params
    const { method } = request
    const account = wallet.getAccount()
    const activeSession = walletKit.getActiveSessions()
    if (!account) {
      walletKit.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED'),
      })
      window.opener.location.href = activeSession[topic].peer.metadata.url
      window.close()
      return
    }
    try {
      const requestParams = request.params[0]
      if (method === 'personal_sign') {
        const message = hexToString(requestParams)
        const signature = account?.signMessage({
          message,
        })
        const response = { id, result: signature, jsonrpc: '2.0' }

        await walletKit.respondSessionRequest({
          topic,
          response,
        })
      } else if (method === 'eth_sendTransaction') {
        const { chainId } = params
        const { data, to } = requestParams
        const sepolia = defineChain(parseInt(chainId.replace('eip155:', '')))
        const tx = await sendTransaction({
          account,
          transaction: {
            data,
            to,
            client: thirdWebClient,
            chain: sepolia,
          },
        })
        const response = { id, result: tx.transactionHash, jsonrpc: '2.0' }
        await walletKit.respondSessionRequest({
          topic,
          response,
        })
      }
    } catch (e) {
      console.error('Error handling session request:', e)
      await walletKit.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED'),
      })
    }
    window.opener.location.href = activeSession[topic].peer.metadata.url
    window.close()
    setIsExecuting(false)
  }
  const renderDetails = async () => {
    const ERC20_ABI = ['function transfer(address to, uint256 value)']

    const iface = new ethers.utils.Interface(ERC20_ABI)

    const data = event?.params?.request?.params[0]?.data

    const decoded = iface.decodeFunctionData('transfer', data)
    const sepolia = defineChain(
      parseInt(event?.params.chainId.replace('eip155:', '') || '0')
    )
    const tokenContract = getContract({
      client: thirdWebClient,
      chain: sepolia,
      address: event?.params?.request?.params[0]?.to,
      abi: erc20Abi,
    })
    const decimals = await readContract({
      contract: tokenContract,
      method: 'decimals',
    })
    return (
      <>
        <Text>Recipient: {decoded[0]}</Text>
        <Text>
          Amount: {parseFloat(formatUnits(BigInt(decoded[1]), decimals))}
        </Text>
      </>
    )
  }
  return (
    <Container
      maxW="7xl"
      mt={8}
      flex={1}
      my={{ base: 12, md: 24 }}
      justifyContent={'center'}
      alignContent="center"
      minH="70vh"
    >
      {proposal && (
        <Modal
          isOpen
          onClose={() => window.close()}
          closeOnOverlayClick={false}
          isCentered
          size="xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader
              p={'0'}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <ModalCloseButton />
            </ModalHeader>
            <ModalBody p={'10'} mt={'6'}>
              <VStack alignItems="flex-start">
                <Heading fontSize="2xl">Wallet Connection Request</Heading>
                <Text>
                  Connected as{' '}
                  {currentAccount?.preferences?.name ||
                    ellipsizeAddress(currentAccount?.address)}
                </Text>
                <Text>Please confirm the connection to your wallet.</Text>
                <Text>Origin: {proposal?.verifyContext?.verified?.origin}</Text>

                <HStack w={'fit-content'} mt={'6'} gap={'4'}>
                  <Button
                    colorScheme="primary"
                    onClick={handleConnect}
                    isLoading={isConnecting}
                    isDisabled={isConnecting}
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
          isOpen
          onClose={() => window.close()}
          closeOnOverlayClick={false}
          isCentered
          size="xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader
              p={'0'}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <ModalCloseButton />
            </ModalHeader>
            <ModalBody p={'10'} mt={'6'}>
              <VStack alignItems="flex-start">
                <Heading fontSize="2xl">Sign Transaction</Heading>
                <Text>
                  Connected as{' '}
                  {currentAccount?.preferences?.name ||
                    ellipsizeAddress(currentAccount?.address)}
                </Text>
                <Text>
                  Please sign the transaction to continue your offramp
                </Text>

                <Text>Origin: {event?.params?.request?.params[0]?.origin}</Text>
                {renderDetails()}
                <HStack w={'fit-content'} mt={'6'} gap={'4'}>
                  <Button
                    colorScheme="primary"
                    onClick={executeTransaction}
                    isLoading={isExecuting}
                    isDisabled={isExecuting}
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
