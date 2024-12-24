import {
  Button,
  Flex,
  FormControl,
  FormHelperText,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftAddon,
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

import { subscribeWithCoupon, syncSubscriptions } from '@/utils/api_helper'
import {
  CouponAlreadyUsed,
  CouponExpired,
  CouponNotValid,
} from '@/utils/errors'
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
import {
  appUrl,
  isProduction,
  YEAR_DURATION_IN_SECONDS,
} from '../../utils/constants'
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
  onSuccessPurchase?: (sub: Subscription, couponCode?: string) => void
  defaultCoupon?: string
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
  defaultCoupon,
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
  const [needsApproval, setNeedsApproval] = useState(false)
  const [waitingConfirmation, setWaitingConfirmation] = useState(false)
  const [txRunning, setTxRunning] = useState(false)
  const [duration, setDuration] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [couponCode, setCouponCode] = useState(defaultCoupon || '')
  const wallet = useActiveWallet()
  const changeDuration = (duration: number) => {
    setDuration(duration)
  }

  const updateDomain = async () => {
    setDomain(getActiveProSubscription(currentAccount!)?.domain || '')
  }

  const updateSubscriptionDetails = async () => {
    setNeedsApproval(false)
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
          setNeedsApproval(true)
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
  const handleCouponSubscribe = async () => {
    setCheckingCanSubscribe(true)
    try {
      logEvent('Started Coupon subscription', {
        address: currentAccount!.address,
        domain,
        couponCode,
      })
      if (!couponCode) {
        toast({
          title: 'Invalid Coupon',
          description: 'The coupon you entered is not valid',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
        setCheckingCanSubscribe(false)
        return
      }
      if (
        domain &&
        !(await checkValidDomain(domain, currentAccount!.address))
      ) {
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
      setCheckingCanSubscribe(false)
      setWaitingConfirmation(true)
      const sub = await subscribeWithCoupon(couponCode, domain)
      setWaitingConfirmation(false)
      onSuccessPurchase && onSuccessPurchase(sub!, couponCode)
      onDialogClose()
      logEvent('Coupon Subscription', {
        address: currentAccount!.address,
        domain,
        couponCode,
      })
    } catch (e) {
      if (e instanceof CouponNotValid) {
        toast({
          title: 'Invalid Coupon',
          description: 'The coupon you entered is not valid',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof CouponExpired) {
        toast({
          title: 'Expired Coupon',
          description: 'The coupon you entered has expired',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof CouponAlreadyUsed) {
        toast({
          title: 'Coupon already used',
          description: 'The coupon you entered has already been used',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else {
        toast({
          title: 'Error',
          description:
            'An error occurred while trying to subscribe with coupon',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      }
    }
    setWaitingConfirmation(false)
    setNeedsApproval(false)
    setCheckingCanSubscribe(false)
    void updateSubscriptionDetails()
  }
  const subscribe = async () => {
    setCheckingCanSubscribe(true)
    if (couponCode) {
      return handleCouponSubscribe()
    }
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

    setNeedsApproval(false)

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
          setNeedsApproval(true)
          await approveTokenSpending(
            currentChain!.chain,
            currentToken!.token,
            neededApproval,
            wallet!
          )
          setNeedsApproval(false)
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
      setNeedsApproval(false)
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
    void updateSubscriptionDetails()
  }, [currentToken, currentChain, duration])

  const chains = supportedChains.filter(chain =>
    isProduction ? !chain.testnet : chain.testnet
  )
  const renderCouponInput = () => {
    if (_currentSubscription) return null
    return (
      <FormControl textColor={'inherit'}>
        <Text pt={2}>Enter coupon code</Text>
        <InputGroup mt={'2'}>
          <Input
            placeholder="Coupon code"
            borderColor="neutral.400 !important"
            value={couponCode}
            onChange={e => setCouponCode(e.target.value)}
            _placeholder={{
              color: 'neutral.400',
            }}
          />
          <Button
            variant={'link'}
            position={'absolute'}
            insetY={0}
            right={2}
            color="primary.500"
            onClick={handleCouponSubscribe}
            isLoading={checkingCanSubscribe || waitingConfirmation}
            zIndex={10}
          >
            Apply
          </Button>
        </InputGroup>
        <FormHelperText textColor={'inherit'}>
          Use the coupon code to claim offers from Meetwith.
        </FormHelperText>
      </FormControl>
    )
  }
  const renderBookingLink = () => {
    if (_currentSubscription) {
      return (
        <FormControl textColor={'inherit'}>
          <Text pt={2}>Booking link</Text>
          <InputGroup mt={'2'}>
            <InputLeftAddon
              border={'1px solid #7B8794'}
              bg="transparent"
              borderRightWidth={0}
              borderColor="neutral.400 !important"
              pr={0}
            >
              {appUrl}/
            </InputLeftAddon>
            <Input
              placeholder="my-group-name"
              value={domain}
              outline="none"
              _focusVisible={{
                borderColor: 'neutral.400',
                boxShadow: 'none',
              }}
              borderColor="neutral.400"
              borderLeftWidth={0}
              pl={0}
              _placeholder={{
                color: 'neutral.400',
              }}
              disabled
            />
          </InputGroup>
        </FormControl>
      )
    }

    return (
      <FormControl textColor={'inherit'}>
        <Text pt={2}>Booking link</Text>
        <InputGroup mt="2">
          <InputLeftAddon
            border={'1px solid #7B8794'}
            bg="transparent"
            borderRightWidth={0}
            borderColor="neutral.400 !important"
            pr={0}
          >
            {appUrl}/
          </InputLeftAddon>
          <Input
            placeholder="your.custom.link"
            value={domain}
            ref={inputRef}
            outline="none"
            _focusVisible={{
              borderColor: 'neutral.400',
              boxShadow: 'none',
            }}
            borderColor="neutral.400"
            borderLeftWidth={0}
            pl={0}
            _placeholder={{
              color: 'neutral.400',
            }}
            onChange={e =>
              setDomain(
                e.target.value
                  .replace(/ /g, '')
                  .replace(/[^\w.]/gi, '')
                  .toLowerCase()
              )
            }
          />
        </InputGroup>
        <FormHelperText textColor={'inherit'}>
          This is the link you will share with others, instead of your wallet
          address. It can&apos;t contain spaces or special characters. You can
          change it later on. Your calendar page will be available at{' '}
          <Text display={'inline'} textDecoration={'underline'}>
            {appUrl}/{domain || 'your.custom.link'}
          </Text>
        </FormHelperText>
      </FormControl>
    )
  }

  const renderChainInfo = (showInfo = false) => {
    if (_currentSubscription) {
      return _currentSubscription.chain === SupportedChain.CUSTOM ? (
        <Text mt="4">You are currently subscribed using a coupon.</Text>
      ) : (
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
    } else if (showInfo) {
      return (
        <>
          <Heading mt={4} size={'lg'}>
            Price summary
          </Heading>
          <Spacer />

          <DurationSelector duration={duration} onChange={changeDuration} />

          <Heading size={'lg'}>Payment method</Heading>
          <FormControl>
            <Text pt={5}>Which chain do you want your subscription at?</Text>
            <FormHelperText textColor={'inherit'}>
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
      <ModalContent backgroundColor={'neutral.900'} color={'neutral.200'}>
        <ModalHeader>
          {_currentSubscription ? 'Extend Subscription' : 'Subscribe to Pro'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {renderCouponInput()}
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
        </ModalBody>

        <ModalFooter justifyContent="center">
          <Button
            colorScheme="primary"
            alignSelf="flex-center"
            hidden={_currentSubscription?.chain === SupportedChain.CUSTOM}
            loadingText={
              txRunning
                ? waitingConfirmation
                  ? 'Waiting confirmation'
                  : 'Sending transaction'
                : 'Confirming Coupon'
            }
            ref={cancelDialogRef}
            onClick={subscribe}
            display={
              (currentChain && currentToken) || couponCode ? 'flex' : 'none'
            }
            isLoading={checkingCanSubscribe}
          >
            {couponCode
              ? 'Apply Coupon'
              : needsApproval
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
        rounded={'100%'}
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
        rounded={'100%'}
      />
      <Spacer />
      {/* <Text colorScheme="gray">aprox $30 subscription + $0.14 gas fees</Text> */}
    </Flex>
  )
}

export default SubscriptionDialog
