import {
  Button,
  Flex,
  FormControl,
  FormHelperText,
  HStack,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Text,
  useToast,
} from '@chakra-ui/react'
import { useContext, useEffect, useRef, useState } from 'react'
import { FaMinus, FaPlus } from 'react-icons/fa'
import { useActiveWallet } from 'thirdweb/react'

import { syncSubscriptions } from '@/utils/api_helper'
import { zeroAddress } from '@/utils/generic_utils'

import { AccountContext } from '../../providers/AccountProvider'
import {
  AcceptedToken,
  AcceptedTokenInfo,
  ChainInfo,
  getChainInfo,
  SupportedChain,
  supportedChains,
} from '../../types/chains'
import { Plan, Subscription } from '../../types/Subscription'
import { logEvent } from '../../utils/analytics'
import { isProduction, YEAR_DURATION_IN_SECONDS } from '../../utils/constants'
import { checkValidDomain } from '../../utils/rpc_helper_front'
import {
  approveTokenSpending,
  checkAllowance,
  getActiveProSubscription,
  subscribeToPlan,
} from '../../utils/subscription_manager'

interface IProps {
  currentSubscription?: Subscription
  isDialogOpen: boolean
  cancelDialogRef: React.MutableRefObject<any>
  onDialogClose: () => void
  onSuccessPurchase?: (sub: Subscription) => void
}
export const getChainIcon = (chain: SupportedChain) => {
  switch (chain) {
    case SupportedChain.POLYGON_MATIC:
    case SupportedChain.POLYGON_AMOY:
      return '/assets/chains/Polygon.svg'
    case SupportedChain.METIS_ANDROMEDA:
      return '/assets/chains/Metis.svg'
    case SupportedChain.ETHEREUM:
    case SupportedChain.SEPOLIA:
      return '/assets/chains/ethereum.svg'
    default:
      break
  }
}

export const getTokenIcon = (token: AcceptedToken) => {
  switch (token) {
    case AcceptedToken.DAI:
      return '/assets/chains/DAI.svg'
    case AcceptedToken.USDC:
      return '/assets/chains/USDC.svg'
    case AcceptedToken.METIS:
      return '/assets/chains/Metis.svg'
    case AcceptedToken.MATIC:
      return '/assets/chains/Polygon.svg'
    case AcceptedToken.ETHER:
      return '/assets/chains/ethereum.svg'
    default:
      return
  }
}

const SubscriptionDialog: React.FC<IProps> = ({
  currentSubscription,
  isDialogOpen,
  cancelDialogRef,
  onDialogClose,
  onSuccessPurchase,
}) => {
  const _currentSubscription = currentSubscription
    ? new Date(currentSubscription?.expiry_time) > new Date()
      ? currentSubscription
      : undefined
    : undefined

  const { currentAccount } = useContext(AccountContext)
  const [domain, setDomain] = useState<string>('')
  const [currentChain, setCurrentChain] = useState<ChainInfo | undefined>(
    _currentSubscription ? getChainInfo(_currentSubscription.chain) : undefined
  )
  const [currentToken, setCurrentToken] = useState<
    AcceptedTokenInfo | undefined
  >(undefined)
  const [checkingCanSubscribe, setCheckingCanSubscribe] = useState(false)
  const [needsApproval, setNeedsAproval] = useState(false)
  const [waitingConfirmation, setWaitingConfirmation] = useState(false)
  const [txRunning, setTxRunning] = useState(false)
  const [duration, setDuration] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const wallet = useActiveWallet()

  const changeDuration = (duration: number) => {
    setDuration(duration)
  }

  const updateDomain = async () => {
    setDomain((await getActiveProSubscription(currentAccount!))?.domain || '')
  }

  const updateSubscriptionDetails = async () => {
    setNeedsAproval(false)
    setCheckingCanSubscribe(false)
    if (currentToken && currentToken.contractAddress !== zeroAddress) {
      setCheckingCanSubscribe(true)
      try {
        const neededApproval = await checkAllowance(
          currentAccount!.address as `0x${string}`,
          Plan.PRO,
          currentChain!.chain,
          currentToken!.token,
          duration * YEAR_DURATION_IN_SECONDS,
          wallet!
        )
        if (neededApproval != 0n) {
          setNeedsAproval(true)
        }
      } catch (e: any) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      }
      setCheckingCanSubscribe(false)
    }
  }

  const subscribe = async () => {
    setCheckingCanSubscribe(true)

    if (!currentChain || !currentToken) {
      toast({
        title: 'Missing information',
        description: 'Please select the blockchain and token you want to use',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      setCheckingCanSubscribe(false)
      return
    } else if (!domain) {
      toast({
        title: 'Missing information',
        description: 'Please fill your booking link',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      setCheckingCanSubscribe(false)
      return
    } else if (duration * YEAR_DURATION_IN_SECONDS < YEAR_DURATION_IN_SECONDS) {
      toast({
        title: 'Error',
        description: 'You must subscribe for at least 1 year',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      setCheckingCanSubscribe(false)
      return
    } else if (!(await checkValidDomain(domain, currentAccount!.address))) {
      toast({
        title: 'You are not the owner of this domain',
        description:
          'To use ENS, Lens, Unstoppable domain, or other name services as your name you need to be the owner of it',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      setCheckingCanSubscribe(false)
      return
    }

    logEvent('Started subscription', { currentChain, currentToken, domain })

    setNeedsAproval(false)

    try {
      if (currentToken && currentToken.contractAddress !== zeroAddress) {
        const neededApproval = await checkAllowance(
          currentAccount!.address as `0x${string}`,
          Plan.PRO,
          currentChain!.chain,
          currentToken!.token,
          duration * YEAR_DURATION_IN_SECONDS,
          wallet!
        )
        if (neededApproval != 0n) {
          setNeedsAproval(true)
          await approveTokenSpending(
            currentChain!.chain,
            currentToken!.token,
            neededApproval,
            wallet!
          )
          setNeedsAproval(false)
        }
      }

      setTxRunning(true)

      const tx = await subscribeToPlan(
        currentAccount!.address,
        Plan.PRO,
        currentChain!.chain,
        duration * YEAR_DURATION_IN_SECONDS,
        domain,
        currentToken!.token,
        wallet!
      )
      setWaitingConfirmation(true)
      const subscriptions = await syncSubscriptions()
      const sub = subscriptions.find(sub => sub.domain === domain)
      setTxRunning(false)
      setWaitingConfirmation(false)
      setCheckingCanSubscribe(false)
      onSuccessPurchase && onSuccessPurchase(sub!)
      logEvent('Subscription', { currentChain, currentToken, domain })
      onDialogClose()
    } catch (e: any) {
      setTxRunning(false)
      setWaitingConfirmation(false)
      setNeedsAproval(false)
      setCheckingCanSubscribe(false)
      toast({
        title: 'Error',
        description: e.message,
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      updateSubscriptionDetails()
    }
  }

  useEffect(() => {
    if (_currentSubscription) {
      !domain && updateDomain()
      setCurrentChain(getChainInfo(_currentSubscription.chain))
    }
  }, [_currentSubscription])

  useEffect(() => {
    isDialogOpen && logEvent('Opened subscription dialog')
  }, [isDialogOpen])

  useEffect(() => {
    updateSubscriptionDetails()
  }, [currentToken, currentChain, duration])

  const chains = supportedChains.filter(chain =>
    isProduction ? !chain.testnet : chain.testnet
  )

  const renderBookingLink = () => {
    if (_currentSubscription) {
      return (
        <FormControl>
          <Text pt={2}>Booking link</Text>
          <Input value={domain} type="text" disabled />
        </FormControl>
      )
    }

    return (
      <FormControl>
        <Text pt={2}>Booking link</Text>
        <Input
          value={domain}
          ref={inputRef}
          type="text"
          placeholder="your.custom.link"
          onChange={e =>
            setDomain(
              e.target.value
                .replace(/ /g, '')
                .replace(/[^\w.]/gi, '')
                .toLowerCase()
            )
          }
        />
        <FormHelperText>
          This is the link you will share with others, instead of your wallet
          address. It can&apos;t contain spaces or special characters. You can
          change it later on. Your calendar page will be available at
          https://meetwithwallet.xyz/
          {domain || 'your.custom.link'}
        </FormHelperText>
      </FormControl>
    )
  }

  const renderChainInfo = () => {
    if (_currentSubscription) {
      return (
        <>
          <FormControl>
            <Text pt={5}>You subscription lives in</Text>
          </FormControl>

          <HStack justify="flex-start" pt={4}>
            <Button
              key={_currentSubscription.chain}
              leftIcon={
                <Image src={getChainIcon(_currentSubscription.chain)} />
              }
              variant="outline"
            >
              {currentChain?.name}
            </Button>
          </HStack>
        </>
      )
    } else {
      return (
        <>
          <FormControl>
            <Text pt={5}>Which chain do you want your subscription at?</Text>
            <FormHelperText>
              This is the chain where your subscription will live, be paid from
              and where you will be able to make changes to it. It also is the
              chain where your paid meeting will accept payments from.
            </FormHelperText>
          </FormControl>

          <HStack justify="center" pt={4}>
            {chains.map(chain => {
              return (
                <Button
                  key={chain.chain}
                  isActive={currentChain === chain}
                  leftIcon={<Image src={getChainIcon(chain.chain)} />}
                  variant="outline"
                  onClick={e => {
                    e.preventDefault()
                    setCurrentChain(chain)
                    setCurrentToken(undefined)
                  }}
                >
                  {chain.name}
                </Button>
              )
            })}
          </HStack>
        </>
      )
    }
  }

  return (
    <Modal
      blockScrollOnMount={false}
      size={'xl'}
      isOpen={isDialogOpen}
      onClose={onDialogClose}
      initialFocusRef={inputRef}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {_currentSubscription ? 'Extend Subscription' : 'Subscribe to Pro'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {renderBookingLink()}
          {renderChainInfo()}
          {currentChain && (
            <>
              <Text pt={5} pb={5}>
                Which token do you want to pay with?
              </Text>
              <HStack justify="center">
                {currentChain.acceptableTokens.map(token => {
                  return (
                    <Button
                      key={token.token}
                      isActive={currentToken === token}
                      variant="outline"
                      onClick={e => {
                        e.preventDefault()
                        setCurrentToken(token)
                      }}
                      leftIcon={<Image src={getTokenIcon(token.token)} />}
                    >
                      {token.token}
                    </Button>
                  )
                })}
              </HStack>
            </>
          )}

          {currentChain && currentToken && (
            <>
              <Spacer />
              <DurationSelector duration={duration} onChange={changeDuration} />
            </>
          )}
        </ModalBody>

        <ModalFooter justifyContent="center">
          <Button
            colorScheme="primary"
            alignSelf="flex-center"
            loadingText={
              txRunning
                ? waitingConfirmation
                  ? 'Waiting confirmation'
                  : 'Sending transaction'
                : ''
            }
            ref={cancelDialogRef}
            onClick={subscribe}
            display={currentChain && currentToken ? 'flex' : 'none'}
            isLoading={checkingCanSubscribe}
          >
            {needsApproval
              ? `Approve ${currentToken?.token} to be spent`
              : _currentSubscription
              ? 'Extend'
              : 'Subscribe'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

interface DurationSelectorProps {
  onChange: (duration: number) => void
  duration: number
}

const DurationSelector: React.FC<DurationSelectorProps> = ({
  onChange,
  duration,
}) => {
  const manualChange = (amount: number) => {
    if (amount < 1) {
      onChange(1)
    } else {
      onChange(Math.round(amount))
    }
  }
  const changeInternal = (adding: boolean) => {
    if (!adding && duration === 1) {
      return
    }
    onChange(duration + (adding ? 1 : -1))
  }
  return (
    <Flex wrap={'wrap'} direction="row" alignItems="center" my={4}>
      <Text fontWeight={500}>Duration</Text>
      <Spacer />
      <IconButton
        variant="outline"
        aria-label="Decrease"
        icon={<FaMinus />}
        onClick={() => changeInternal(false)}
      />
      <Spacer />
      <Input
        min={1}
        variant="flushed"
        w="40px"
        type="number"
        value={duration}
        onChange={e => manualChange(parseInt(e.target.value))}
      />
      <Spacer />
      <Text>year(s)</Text>
      <Spacer />
      <IconButton
        variant="outline"
        aria-label="Increase"
        icon={<FaPlus />}
        onClick={() => changeInternal(true)}
      />
      <Spacer />
      {/* <Text colorScheme="gray">aprox $30 subscription + $0.14 gas fees</Text> */}
    </Flex>
  )
}

export default SubscriptionDialog
