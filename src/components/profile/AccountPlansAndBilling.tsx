import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  ListItem,
  Text,
  UnorderedList,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { differenceInMonths, format } from 'date-fns'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { FaTag } from 'react-icons/fa'
import { useActiveWallet } from 'thirdweb/react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { Account } from '@/types/Account'
import { EditMode, Intents } from '@/types/Dashboard'
import { getPlanInfo, Plan, PlanInfo, Subscription } from '@/types/Subscription'
import { logEvent } from '@/utils/analytics'
import { syncSubscriptions } from '@/utils/api_helper'
import { isProAccount } from '@/utils/subscription_manager'

import Block from './components/Block'
import CouponUsedModal from './components/CouponUsedModal'
import SubscriptionDialog from './SubscriptionDialog'

const AccountPlansAndBilling: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  // Constants
  const DEFAULT_COUPON_DURATION_MONTHS = 3
  const PURCHASE_SUCCESS_TIMEOUT_MS = 10000

  const { login } = useContext(AccountContext)
  const { reload: reloadOnboardingInfo } = useContext(OnboardingContext)
  const toast = useToast()
  const { query, push } = useRouter()
  const { intent, coupon } = query
  const activeWallet = useActiveWallet()

  const cancelDialogRef = useRef<any>()
  const subsRef = useRef<any>(null)

  const [loading, setLoading] = useState(false)
  const [purchased, setPurchased] = useState<Subscription | undefined>(
    undefined
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan | undefined>(undefined)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [couponCode, setCouponCode] = useState('')
  const [couponDuration, setCouponDuration] = useState(0)

  const handleIntents = () => {
    if (intent === Intents.USE_COUPON) {
      subsRef.current?.scrollIntoView({ behavior: 'smooth' })
      if (coupon) {
        setCouponCode(coupon.toString())
        setCouponDuration(DEFAULT_COUPON_DURATION_MONTHS)
        void push(`/dashboard/${EditMode.DETAILS}`)
        onOpen()
      }
    } else if (intent === Intents.SUBSCRIBE_PRO) {
      subsRef.current?.scrollIntoView({ behavior: 'smooth' })
      setIsDialogOpen(true)
      void push(`/dashboard/subscriptions`, undefined, {
        shallow: true,
      })
    }
  }

  useEffect(() => {
    handleIntents()
  }, [intent])

  useEffect(() => {
    syncCurrentSubscriptions()
  }, [currentAccount])

  const syncCurrentSubscriptions = async () => {
    const subs = await syncSubscriptions()
    if (subs?.length) {
      if (subs[0].plan_id === Plan.PRO) {
        setCurrentPlan(Plan.PRO)
      }
    }
  }

  const subsPurchased = (sub: Subscription, couponCodeArg?: string) => {
    if (couponCodeArg) {
      setCouponCode(couponCodeArg)
      const couponExpiryDate = new Date(sub.expiry_time)
      const duration = differenceInMonths(
        couponExpiryDate,
        new Date().setHours(0, 0, 0, 0)
      )
      setCouponDuration(duration)
      onOpen()
    }
    setPurchased(sub)
    setCurrentPlan(Plan.PRO)
    void syncCurrentSubscriptions()
    setTimeout(() => setPurchased(undefined), PURCHASE_SUCCESS_TIMEOUT_MS)
  }

  return (
    <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'}>
      <Heading fontSize="2xl">Account Plans & Billing</Heading>

      <Block>
        <Heading ref={subsRef} fontSize="2xl" id="subscriptions" mb={8}>
          Subscription
        </Heading>

        {purchased && !isOpen && (
          <Alert status="success">
            <AlertIcon />
            Subscription successful. Enjoy your {
              getPlanInfo(Plan.PRO)?.name
            }{' '}
            Plan
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
              'Everything in Free plus (+)',
              'Unlimited scheduling groups',
              'Payments & Invoicing',
              'Unlimited integrations (Google calendar, iCloud, Office 365 and WebDAV)',
              'Unlimited QuickPolls',
              'Unlimited meeting types - Free & Paid',
              '24/7 priority support',
            ]}
          />
          <SubscriptionCard
            onClick={() => setIsDialogOpen(true)}
            active={currentPlan === undefined}
            benefits={[
              'Personal scheduling page',
              '1 Meeting type - FREE meetings',
              'Custom account handle',
              '5 scheduling groups',
              'Limited QuickPolls (max. 2 active polls per time)',
              'Basic calendar sync - 1 calendar sync only',
              'Smart notifications — Email, Discord, and Telegram let you set the cadence for each meeting type.',
              'Unlimited contact connection',
              'Email support',
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
      maxWidth="350px"
      alignItems={'flex-start'}
      justifyContent={'flex-start'}
      borderColor={active ? '#F35826' : 'transparent'}
    >
      <HStack>
        <Box>
          <FaTag color={useColorModeValue('#fff', '#fff')} />
        </Box>
        <Text width="100%" textAlign="left" fontWeight={500}>
          {planInfo
            ? `${planInfo.name} - $${planInfo.usdPrice} / month`
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
          <Button mt={8} width="full" colorScheme="primary" onClick={onClick}>
            {active ? 'Extend' : `Subscribe to ${planInfo!.name}`}
          </Button>
        )}
      </Box>
    </VStack>
  )
}

export default AccountPlansAndBilling
