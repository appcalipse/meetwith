import { Box, Flex, Text, VStack } from '@chakra-ui/layout'
import {
  Alert,
  AlertIcon,
  Button,
  Circle,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  Link,
  ListItem,
  UnorderedList,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { Textarea } from '@chakra-ui/textarea'
import * as Sentry from '@sentry/nextjs'
import { differenceInMonths, format } from 'date-fns'
import { useRouter } from 'next/router'
import { useContext, useEffect, useRef, useState } from 'react'
import { FaTag } from 'react-icons/fa'
import { useActiveWallet } from 'thirdweb/react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { Account, SocialLink, SocialLinkType } from '@/types/Account'
import { SupportedChain } from '@/types/chains'
import { EditMode, Intents } from '@/types/Dashboard'
import { getPlanInfo, Plan, PlanInfo, Subscription } from '@/types/Subscription'
import { logEvent } from '@/utils/analytics'
import {
  getUnstoppableDomainsForAddress,
  saveAccountChanges,
  syncSubscriptions,
  updateCustomSubscriptionDomain,
} from '@/utils/api_helper'
import { appUrl } from '@/utils/constants'
import { getLensHandlesForAddress } from '@/utils/lens.helper'
import { checkValidDomain, resolveENS } from '@/utils/rpc_helper_front'
import { changeDomainOnChain, isProAccount } from '@/utils/subscription_manager'
import { isValidSlug } from '@/utils/validations'

import Block from './components/Block'
import CouponUsedModal from './components/CouponUsedModal'
import HandlePicker, {
  DisplayName,
  ProfileInfoProvider,
} from './components/HandlePicker'
import Tooltip from './components/Tooltip'
import ConnectedAccounts from './ConnectedAccounts'
import SubscriptionDialog from './SubscriptionDialog'

const AccountDetails: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { login } = useContext(AccountContext)
  const { reload: reloadOnboardingInfo } = useContext(OnboardingContext)

  const cancelDialogRef = useRef<any>()

  const [loading, setLoading] = useState(false)
  const [purchased, setPurchased] = useState<Subscription | undefined>(
    undefined
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan | undefined>(undefined)

  const socialLinks = currentAccount?.preferences?.socialLinks || []

  const [description, setDescription] = useState(
    currentAccount?.preferences?.description || ''
  )
  const { query, push } = useRouter()
  const { intent, coupon } = query
  const [nameOptions, setNameOptions] = useState<DisplayName[]>([])
  const [proDomain, setProDomain] = useState<string>(
    currentAccount.subscriptions?.[0]?.domain || ''
  )
  const [newProDomain, setNewProDomain] = useState<string>(
    currentAccount.subscriptions?.[0]?.domain ?? ''
  )
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [couponCode, setCouponCode] = useState('')
  const [couponDuration, setCouponDuration] = useState(0)
  const [name, setName] = useState<DisplayName | undefined>(
    currentAccount?.preferences?.name
      ? {
          label: currentAccount.preferences.name,
          value: currentAccount.preferences.name,
          type: ProfileInfoProvider.CUSTOM,
        }
      : undefined
  )
  const wallet = useActiveWallet()
  const [twitter, setTwitter] = useState(
    socialLinks.find((link: SocialLink) => link.type === SocialLinkType.TWITTER)
      ?.url || ''
  )

  const [telegram, setTelegram] = useState(
    socialLinks.find(
      (link: SocialLink) => link.type === SocialLinkType.TELEGRAM
    )?.url || ''
  )

  const updateAccountInfo = () => {
    const socialLinks = currentAccount?.preferences?.socialLinks || []

    setTwitter(
      socialLinks.find(
        (link: SocialLink) => link.type === SocialLinkType.TWITTER
      )?.url || ''
    )
    setTelegram(
      socialLinks.find(
        (link: SocialLink) => link.type === SocialLinkType.TELEGRAM
      )?.url || ''
    )

    setDescription(currentAccount?.preferences?.description || '')
    setName(
      currentAccount?.preferences?.name
        ? {
            label: currentAccount.preferences.name,
            value: currentAccount.preferences.name,
            type: ProfileInfoProvider.CUSTOM,
          }
        : undefined
    )
    setNewProDomain(currentAccount?.subscriptions?.[0]?.domain ?? '')
  }

  const updateAccountSubs = async () => {
    setCurrentPlan(isProAccount(currentAccount!) ? Plan.PRO : undefined)
    const subscriptions = await syncSubscriptions()
    currentAccount!.subscriptions = subscriptions
    login(currentAccount!)
    setCurrentPlan(isProAccount(currentAccount!) ? Plan.PRO : undefined)
  }

  const getHandles = async () => {
    let handles: DisplayName[] = []
    const lensProfiles = async () => {
      const profiles = await getLensHandlesForAddress(currentAccount!.address)
      if (profiles) {
        handles = handles.concat(
          profiles.map(profile => {
            return {
              label: profile.handle,
              value: profile.handle,
              type: ProfileInfoProvider.LENS,
            }
          })
        )
      }
    }

    const getMWWDomains = async () => {
      if (!currentAccount?.subscriptions) {
        return
      }
      const domains = currentAccount?.subscriptions
        .filter(sub => !!sub.plan_id)
        .map(sub => sub?.domain)
      if (domains) {
        handles = handles.concat(
          domains.map(domain => {
            return {
              label: domain,
              value: domain,
              type: ProfileInfoProvider.MWW,
            }
          })
        )
        setProDomain(domains[0])
        setNewProDomain(domains[0] ?? '')
      }
    }

    const getUNHandles = async () => {
      const domains = await getUnstoppableDomainsForAddress(
        currentAccount!.address
      )

      if (domains) {
        handles = handles.concat(
          domains.map(profile => {
            return {
              label: profile.name,
              value: profile.name,
              type: ProfileInfoProvider.UNSTOPPABLE_DOAMINS,
            }
          })
        )
      }
    }

    const getENSHandle = async () => {
      const ens = await resolveENS(currentAccount!.address)
      if (ens) {
        handles.push({
          label: ens.name,
          value: ens.name,
          type: ProfileInfoProvider.ENS,
        })
      }
    }

    await Promise.all([
      getMWWDomains(),
      lensProfiles(),
      getENSHandle(),
      getUNHandles(),
    ])
    setNameOptions(handles)
  }

  useEffect(() => {
    updateAccountInfo()
    updateAccountSubs()
    getHandles()
  }, [currentAccount?.address])

  const toast = useToast()

  const saveDetails = async () => {
    setLoading(true)

    if (!(await checkValidDomain(name?.label || '', currentAccount!.address))) {
      setLoading(false)
      toast({
        title: 'You are not the owner of this domain',
        description:
          'To use ENS, Lens, Unstoppable domain, or other name services as your name you need to be the owner of it',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }

    try {
      const updatedAccount = await saveAccountChanges({
        ...currentAccount!,
        preferences: {
          ...currentAccount!.preferences!,
          name: name?.label,
          description,
          socialLinks: [
            { type: SocialLinkType.TWITTER, url: twitter },
            { type: SocialLinkType.TELEGRAM, url: telegram },
          ],
        },
      })
      logEvent('Updated account details')
      login(updatedAccount)
    } catch (e) {
      //TODO handle error
      console.error(e)
    } finally {
      reloadOnboardingInfo()
      setLoading(false)
    }
  }

  const changeDomain = async () => {
    setLoading(true)

    if (newProDomain === proDomain) {
      setLoading(false)
      toast({
        title: 'Nothing changed',
        description: "You didn't change the current link",
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }

    if (!isValidSlug(newProDomain)) {
      setLoading(false)
      toast({
        title: 'Invalid link',
        description: 'Please use only letters, numbers, underscores and dashes',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }
    if (!(await checkValidDomain(newProDomain, currentAccount!.address))) {
      setLoading(false)
      toast({
        title: 'You are not the owner of this domain',
        description:
          'To use ENS, Lens, Unstoppable domain, or other name services as your name you need to be the owner of it',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }

    try {
      const subscription = currentAccount?.subscriptions?.find(
        sub => new Date(sub.expiry_time) > new Date()
      )
      if (subscription?.chain === SupportedChain.CUSTOM) {
        await updateCustomSubscriptionDomain(newProDomain)
      } else {
        await changeDomainOnChain(
          currentAccount.address,
          proDomain,
          newProDomain,
          wallet!
        )
      }
      await updateAccountSubs()
      toast({
        title: 'Calendar link updated',
        description: 'Your calendar link has been changed',
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    } catch (e: any) {
      console.error(e)
      const isMetaMask =
        (window as any).ethereum !== undefined &&
        (window as any).ethereum.isMetaMask
      const isBrave =
        (navigator as any).brave && (await (navigator as any).brave.isBrave())

      Sentry.captureException(e)

      setLoading(false)
      toast({
        title: 'Error',
        description:
          isMetaMask && isBrave
            ? 'Please connect to the correct network (consider you must unlock your metamask and also reload the page after that).\nIf the error persists, please also try with chrome.'
            : `${e.message}`,
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }

    logEvent(
      `Account Domain Changed: old domain: ${proDomain}, new domain: ${newProDomain}`
    )

    setLoading(false)
  }

  const subsRef = useRef(null)

  const subsPurchased = (sub: Subscription, couponCode?: string) => {
    if (couponCode) {
      setCouponCode(couponCode)
      const couponExpiryDate = new Date(sub.expiry_time)
      const couponDuration = differenceInMonths(
        couponExpiryDate,
        new Date().setHours(0, 0, 0, 0)
      )
      setCouponDuration(couponDuration)
      onOpen()
    }
    setPurchased(sub)
    setCurrentPlan(sub.plan_id)
    setNewProDomain(sub?.domain)
    updateAccountSubs()
    setTimeout(
      () => window.scrollTo(0, (subsRef.current as any).offsetTop - 60),
      500
    )
    setTimeout(() => setPurchased(undefined), 10000)
  }
  useEffect(() => {
    if (intent === Intents.USE_COUPON) {
      if (!isProAccount(currentAccount!)) {
        setIsDialogOpen(true)
      } else {
        push(`/dashboard/${EditMode.DETAILS}`)
      }
    }
  }, [intent, currentAccount])
  const subscription = currentAccount?.subscriptions?.find(
    sub => new Date(sub.expiry_time) > new Date()
  )

  return (
    <VStack gap={4} mb={8} alignItems="start" flex={1}>
      <Block>
        <>
          <Heading fontSize="2xl" mb={4}>
            Account Details
          </Heading>

          <FormControl pt={2}>
            <FormLabel>
              Calendar link
              <Tooltip text="Other users can book meetings with you through this personal domain" />
            </FormLabel>
            <HStack>
              <InputGroup>
                <InputLeftAddon
                  pointerEvents="none"
                  borderRightColor="transparent !important"
                  bgColor="transparent"
                  pr={0}
                  className={subscription ? '' : 'disabled'}
                >
                  <Text opacity="0.5">{`${appUrl}/`}</Text>
                </InputLeftAddon>
                <Input
                  pl={0}
                  borderLeftColor="transparent"
                  value={newProDomain}
                  type="text"
                  disabled={!subscription}
                  placeholder={
                    subscription
                      ? 'your_custom_link'
                      : `address/${currentAccount?.address}`
                  }
                  onChange={e => setNewProDomain(e.target.value)}
                />
              </InputGroup>

              <Button
                isLoading={loading}
                colorScheme="primary"
                variant="outline"
                isDisabled={!subscription}
                onClick={changeDomain}
              >
                Update
              </Button>
            </HStack>
            <FormHelperText>
              {subscription ? (
                'There is a gas fee associated with each link change.'
              ) : (
                <>
                  Unlock custom calendar link with PRO{' '}
                  <Link href="#subscriptions">here</Link>.
                </>
              )}
            </FormHelperText>
          </FormControl>

          <Divider my={8} />

          <FormControl pb={3}>
            <FormLabel>
              Display name
              <Tooltip
                text="How do you want to be displayed to others in meetings? Leave empty
              to use you wallet address"
              />
            </FormLabel>
            <HandlePicker
              selected={name}
              setValue={option => setName(option)}
              options={nameOptions}
            />
          </FormControl>

          <FormControl py={3}>
            <FormLabel>Status message (optional)</FormLabel>
            <Textarea
              value={description}
              placeholder="Add an optional message to be displayed on your public calendar page"
              onChange={e => setDescription(e.target.value)}
            />
          </FormControl>

          <HStack>
            <FormControl py={3}>
              <FormLabel>Twitter (optional)</FormLabel>
              <Input
                value={twitter}
                type="text"
                placeholder="Twitter"
                onChange={e => setTwitter(e.target.value)}
              />
            </FormControl>

            <FormControl py={3}>
              <FormLabel>Telegram (optional)</FormLabel>
              <Input
                value={telegram}
                type="text"
                placeholder="Telegram"
                onChange={e => setTelegram(e.target.value)}
              />
            </FormControl>
          </HStack>

          <Button
            mt={8}
            isLoading={loading}
            colorScheme="primary"
            onClick={saveDetails}
          >
            Save details
          </Button>
        </>
      </Block>

      <Block>
        <ConnectedAccounts />
      </Block>

      <Block>
        <Heading ref={subsRef} fontSize="2xl" id="subscriptions" mb={8}>
          Subscription
        </Heading>

        {purchased && !isOpen && (
          <Alert status="success">
            <AlertIcon />
            Subscription successful. Enjoy your{' '}
            {getPlanInfo(purchased!.plan_id)?.name} Plan
          </Alert>
        )}

        <Flex
          width="100%"
          flexDirection={{ base: 'column', md: 'row' }}
          gridGap={2}
        >
          <SubscriptionCard
            subscription={currentAccount?.subscriptions?.find(
              sub => new Date(sub.expiry_time) > new Date()
            )}
            planInfo={getPlanInfo(Plan.PRO)}
            onClick={() => setIsDialogOpen(true)}
            active={currentPlan === Plan.PRO}
            benefits={[
              'Customizable booking link',
              'External calendar connections (Google and iCloud)',
              'Unlimited meeting configurations',
              'Email and Discord Notifications (optional)',
              'Schedule meetings with multiple participants',
              'Request payment for meeting scheduling (coming soon)',
            ]}
          />
          <SubscriptionCard
            onClick={() => setIsDialogOpen(true)}
            active={currentPlan === undefined}
            benefits={[
              'Public page for scheduling meetings',
              'Configurable availability',
              'Web3 powered meeting room',
              'Single meeting configuration',
              'Only 1:1 meetings',
            ]}
          />
        </Flex>
        <SubscriptionDialog
          isDialogOpen={isDialogOpen}
          onDialogClose={() => setIsDialogOpen(false)}
          cancelDialogRef={cancelDialogRef}
          onSuccessPurchase={subsPurchased}
          currentSubscription={currentAccount?.subscriptions?.[0]}
          defaultCoupon={Array.isArray(coupon) ? coupon[0] : coupon}
        />
        <CouponUsedModal
          couponCode={couponCode}
          couponDuration={couponDuration}
          isDialogOpen={isOpen}
          onDialogClose={onClose}
        />
      </Block>
    </VStack>
  )
}

interface SubscriptionCardProps {
  active: boolean
  benefits: string[]
  subscription?: Subscription
  planInfo?: PlanInfo
  onClick: () => void
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  active,
  subscription,
  planInfo,
  benefits,
  onClick,
}) => {
  return (
    <VStack
      shadow="sm"
      flex={1}
      bg={useColorModeValue('gray.50', 'gray.700')}
      me={4}
      borderRadius={8}
      borderWidth={2}
      p={4}
      minWidth="240px"
      maxWidth="320px"
      alignItems={'flex-start'}
      justifyContent={'flex-start'}
      borderColor={active ? '#F35826' : 'transparent'}
    >
      <HStack>
        <Circle
          size="48px"
          bg={useColorModeValue('gray.700', 'gray.500')}
          mr="2"
        >
          <FaTag color="white" />
        </Circle>
        <Text width="100%" textAlign="left" fontWeight={500}>
          {planInfo
            ? `${planInfo.name} - $${planInfo.usdPrice} / year`
            : 'Free - $0 / forever'}
        </Text>
      </HStack>
      <Box ml="24px">
        <UnorderedList fontSize="sm">
          {benefits.map((benefit, i) => (
            <ListItem key={i}>{benefit}</ListItem>
          ))}
        </UnorderedList>
      </Box>

      {subscription && (
        <Text fontSize="sm" fontWeight={500}>
          {`Valid until ${format(new Date(subscription.expiry_time), 'PPP')}`}
        </Text>
      )}

      <Box width="100%">
        {planInfo && (
          <Button
            mt={8}
            width="full"
            colorScheme="primary"
            onClick={() => onClick()}
          >
            {active ? 'Extend' : `Subscribe to ${planInfo!.name}`}
          </Button>
        )}
      </Box>
    </VStack>
  )
}

export default AccountDetails
