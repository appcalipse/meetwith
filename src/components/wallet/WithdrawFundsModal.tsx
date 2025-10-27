import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { OnrampWebSDK } from '@onramp.money/onramp-web-sdk'
import { useQuery } from '@tanstack/react-query'
import React, { useContext, useMemo, useState } from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { useSmartReconnect } from '@/hooks/useSmartReconnect'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import {
  AcceptedToken,
  getSupportedChainFromId,
  getTokenIcon,
} from '@/types/chains'
import { Address } from '@/types/Transactions'
import { getCoinConfig } from '@/utils/api_helper'
import { formatUnits } from '@/utils/generic_utils'
import { getOnRampMoneyNetworkAndCoinCode } from '@/utils/services/onramp.money'
import { getTokenBalance, getTokenInfo } from '@/utils/token.service'
import { NETWORKS } from '@/utils/walletConfig'

type Props = {
  onClose: () => void
  isOpen: boolean
  selectedNetwork: string
}

const WithdrawFundsModal = (props: Props) => {
  const currentAccount = useAccountContext()
  const { needsReconnection, attemptReconnection } = useSmartReconnect()
  const { openConnection } = useContext(OnboardingModalContext)

  const [processLoading, setProcessLoading] = useState(false)
  const { activeChainId, selectedNetworkInfo, acceptedTokens } = useMemo(() => {
    const activeChainId =
      NETWORKS.find(
        network =>
          network.name.toLowerCase() === props.selectedNetwork.toLowerCase()
      )?.chainId || 0
    const selectedNetworkInfo = getSupportedChainFromId(activeChainId)
    const acceptedTokens = selectedNetworkInfo?.acceptableTokens?.filter(
      token => ![AcceptedToken.ETHER].includes(token.token)
    )
    return { activeChainId, selectedNetworkInfo, acceptedTokens }
  }, [props.selectedNetwork])
  const [token, setToken] = React.useState<AcceptedToken>(AcceptedToken.USDC)
  const [amount, setAmount] = React.useState<string>('')
  const toast = useToast({
    position: 'top',
  })

  const selectedAssetInfo = acceptedTokens?.find(
    acceptedToken => acceptedToken.token === token
  )
  const { data, isLoading } = useQuery({
    queryKey: [
      'tokenBalance',
      currentAccount?.address,
      selectedAssetInfo?.contractAddress,
    ],
    queryFn: async () => {
      const [balance, tokenInfo] = await Promise.all([
        getTokenBalance(
          currentAccount!.address,
          selectedAssetInfo!.contractAddress as Address,
          selectedNetworkInfo!.chain
        ),
        getTokenInfo(
          selectedAssetInfo!.contractAddress as Address,
          selectedNetworkInfo!.chain
        ),
      ])
      return {
        balance,
        tokenInfo,
      }
    },
    enabled: Boolean(
      currentAccount?.address &&
        selectedAssetInfo?.contractAddress &&
        activeChainId !== 0 &&
        selectedNetworkInfo?.chain
    ),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
  const { data: tokens, isLoading: isTokenLoading } = useQuery({
    queryKey: ['allowedTokens', props.selectedNetwork, activeChainId],
    queryFn: async () => {
      const coinConfig = await getCoinConfig()
      const [networkCode] =
        Object.entries(coinConfig.networkConfig).find(
          ([_, n]) => n.networkId === activeChainId
        ) || []
      const allowedAssets = acceptedTokens?.filter(token => {
        const config = coinConfig?.allCoinConfig?.[token.token.toLowerCase()]
        return (
          config &&
          networkCode !== undefined &&
          config.networks.includes(Number(networkCode))
        )
      })

      return allowedAssets || []
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const handleShowWithdrawWidget = async () => {
    if (needsReconnection) {
      const reconnectedWallet = await attemptReconnection()
      if (!reconnectedWallet) {
        openConnection(undefined, false)
        toast({
          title: 'Wallet Not Connected',
          description: 'Please connect your wallet to proceed.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        return
      }
    }

    if (
      amount > formatUnits(data?.balance || 0n, data?.tokenInfo?.decimals || 6)
    ) {
      toast({
        title: 'Insufficient funds',
        description: 'You do not have enough funds to withdraw this amount',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }
    setProcessLoading(true)
    const offrampInfo = await getOnRampMoneyNetworkAndCoinCode(
      activeChainId,
      token
    )

    if (!offrampInfo.coinId) {
      toast({
        title: 'Error',
        description: 'Could not retrieve coin Info',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      setProcessLoading(false)
      return
    }
    const onrampInstance = new OnrampWebSDK({
      appId: parseInt(process.env.NEXT_PUBLIC_ONRAMP_MONEY_APP_ID!), // replace this with the appID you got during onboarding process
      flowType: 2, // 1 -> onramp || 2 -> offramp || 3 -> Merchant checkout,
      merchantRecognitionId: currentAccount?.address,
      coinCode: offrampInfo.coinId?.toString(),
      network: offrampInfo.network ?? undefined,
      coinAmount: Number(amount),
    })
    onrampInstance.show()
    props.onClose()
    setProcessLoading(false)
    onrampInstance.on('TX_EVENTS', e => {
      if (e.type === 'ONRAMP_WIDGET_TX_COMPLETED') {
        toast({
          title: 'Success',
          description: 'Transaction completed successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        // record transaction to db
      }
    })
  }
  return (
    <Modal
      onClose={props.onClose}
      isOpen={props.isOpen}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        p="6"
        height={{ base: '100%', md: 'auto' }}
        borderRadius={{ base: '0', md: '12px' }}
        border="1px solid"
        borderColor="border-wallet-subtle"
        boxShadow="none"
        bg="bg-surface"
      >
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'md'}>Withdraw funds</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack alignItems="flex-start" w={'100%'} spacing={2}>
            <FormControl>
              <FormLabel>Select Asset</FormLabel>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<ChevronDownIcon />}
                  w={'100%'}
                  textAlign="left"
                  variant="outline"
                  borderColor="neutral.400"
                  isLoading={isTokenLoading}
                  loadingText="Loading assets"
                >
                  {selectedAssetInfo ? (
                    <HStack>
                      <Image
                        src={getTokenIcon(selectedAssetInfo.token)}
                        alt={selectedAssetInfo.token}
                        boxSize="20px"
                        borderRadius="full"
                        mr={2}
                      />
                      <Text>{selectedAssetInfo.token}</Text>
                    </HStack>
                  ) : (
                    'Select Asset'
                  )}
                </MenuButton>
                <MenuList w="100%">
                  {tokens?.map(token => (
                    <MenuItem
                      key={token.token}
                      onClick={async () => setToken(token.token)}
                    >
                      <HStack>
                        <Image
                          src={getTokenIcon(token.token)}
                          alt={token.token}
                          boxSize="24px"
                          borderRadius="full"
                          mr={2}
                        />
                        <Text>{token.token}</Text>
                      </HStack>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
              {isLoading ? (
                <Box mt={0.5}>
                  <Spinner />
                </Box>
              ) : (
                <HStack w="100%" justifyContent="space-between" mt={0.5}>
                  {data ? (
                    <Text
                      fontSize={'sm'}
                      color={'neutral.500'}
                      _hover={{
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setAmount(
                          formatUnits(
                            data.balance,
                            data.tokenInfo?.decimals || 6
                          )
                        )
                      }}
                    >
                      Token balance: $
                      {formatUnits(
                        data?.balance,
                        data?.tokenInfo?.decimals || 6
                      )}
                    </Text>
                  ) : (
                    <Text fontSize={'sm'} color={'neutral.500'}>
                      Token balance: $0
                    </Text>
                  )}
                  <Text fontSize={'sm'} color={'neutral.500'}>
                    Network: {selectedNetworkInfo?.name}
                  </Text>
                </HStack>
              )}
            </FormControl>
            <FormControl>
              <FormLabel>Amount</FormLabel>
              <Input
                placeholder="Enter amount to withdraw"
                borderColor="neutral.400"
                width={'max-content'}
                w="100%"
                errorBorderColor="red.500"
                type={'number'}
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </FormControl>
          </VStack>
          <HStack w={'fit-content'} mt={'6'} gap={'4'}>
            <Button
              isLoading={processLoading}
              onClick={handleShowWithdrawWidget}
              colorScheme="primary"
              isDisabled={
                isLoading ||
                isTokenLoading ||
                processLoading ||
                !amount ||
                Number(amount) <= 0 ||
                amount >
                  formatUnits(
                    data?.balance || 0n,
                    data?.tokenInfo?.decimals || 6
                  )
              }
            >
              Continue to withdraw
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default WithdrawFundsModal
