import { Box, Flex, Spacer, Text, VStack } from '@chakra-ui/layout'
import {
  Alert,
  AlertIcon,
  Button,
  Circle,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  ListItem,
  UnorderedList,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { Textarea } from '@chakra-ui/textarea'
import { format } from 'date-fns'
import { useContext, useEffect, useRef, useState } from 'react'
import { FaTag } from 'react-icons/fa'

import lensHelper from '@/utils/lens.helper'
import { checkValidDomain, resolveENS } from '@/utils/rpc_helper_front'

import { AccountContext } from '../../providers/AccountProvider'
import { SocialLinkType } from '../../types/Account'
import {
  getPlanInfo,
  Plan,
  PlanInfo,
  Subscription,
} from '../../types/Subscription'
import { logEvent } from '../../utils/analytics'
import {
  getUnstoppableDomainsForAddress,
  saveAccountChanges,
  syncSubscriptions,
} from '../../utils/api_helper'
import { isProAccount } from '../../utils/subscription_manager'
import IPFSLink from '../IPFSLink'
import HandlePicker, {
  DisplayName,
  ProfileInfoProvider,
} from './components/HandlePicker'
import SubscriptionDialog from './SubscriptionDialog'

const AccountDetails: React.FC = () => {
  const { currentAccount, login } = useContext(AccountContext)
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

  const [nameOptions, setNameOptions] = useState<DisplayName[]>([])
  const [name, setName] = useState<DisplayName | undefined>(
    currentAccount?.preferences?.name
      ? {
          label: currentAccount.preferences.name,
          value: currentAccount.preferences.name,
          type: ProfileInfoProvider.CUSTOM,
        }
      : undefined
  )

  const [twitter, setTwitter] = useState(
    socialLinks.filter(link => link.type === SocialLinkType.TWITTER)[0]?.url ||
      ''
  )
  const [discord, setDiscord] = useState(
    socialLinks.filter(link => link.type === SocialLinkType.DISCORD)[0]?.url ||
      ''
  )
  const [telegram, setTelegram] = useState(
    socialLinks.filter(link => link.type === SocialLinkType.TELEGRAM)[0]?.url ||
      ''
  )

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
      const profiles = await lensHelper.getLensHandlesForAddress(
        currentAccount!.address
      )
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
      const domains = currentAccount?.subscriptions
        .filter(sub => sub.plan_id === Plan.PRO)
        .map(sub => sub.domain)
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
    updateAccountSubs()
    getHandles()
  }, [])

  const toast = useToast()

  const saveDetails = async () => {
    setLoading(true)

    if (!(await checkValidDomain(name?.label || '', currentAccount!.address))) {
      setLoading(false)
      toast({
        title: 'You are not the owner of this name',
        description:
          'To use ENS, Lens, or Unstoppable domain as your name you need to be the owner of it',
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
            { type: SocialLinkType.DISCORD, url: discord },
            { type: SocialLinkType.TELEGRAM, url: telegram },
          ],
        },
      })
      logEvent('Updated account details')
      login(updatedAccount)
    } catch (e) {
      //TODO handle error
      console.error(e)
    }

    setLoading(false)
  }

  const subsRef = useRef(null)

  const subsPurchased = (sub: Subscription) => {
    setPurchased(sub)
    setCurrentPlan(sub.plan_id)
    updateAccountSubs()
    setTimeout(
      () => window.scrollTo(0, (subsRef.current as any).offsetTop - 60),
      500
    )
    setTimeout(() => setPurchased(undefined), 10000)
  }

  return (
    <VStack mb={8} alignItems="start" flex={1}>
      <Heading fontSize="2xl">Account Details</Heading>
      <IPFSLink
        ipfsHash={currentAccount!.preferences_path}
        title="Your account information is public and stored on IPFS. Your current IPFS link is"
      />

      <FormControl pt={2}>
        <FormLabel>Display name (optional)</FormLabel>
        <HandlePicker
          selected={name}
          setValue={option => setName(option)}
          options={nameOptions}
        />
        <FormHelperText>
          How do you want to be displayed to others in meetings? Leave empty to
          use you wallet address
        </FormHelperText>
      </FormControl>

      <FormControl pt={2}>
        <FormLabel>Description (optional)</FormLabel>
        <Textarea
          value={description}
          placeholder="Add an optional message to be displayed on your public calendar page"
          onChange={e => setDescription(e.target.value)}
        />
      </FormControl>

      <FormControl pt={2}>
        <FormLabel>Twitter (optional)</FormLabel>
        <Input
          value={twitter}
          type="text"
          placeholder="Twitter"
          onChange={e => setTwitter(e.target.value)}
        />
      </FormControl>

      <FormControl pt={2}>
        <FormLabel>Discord (optional)</FormLabel>
        <Input
          value={discord}
          type="text"
          placeholder="Discord"
          onChange={e => setDiscord(e.target.value)}
        />
      </FormControl>

      <FormControl pt={2}>
        <FormLabel>Telegram (optional)</FormLabel>
        <Input
          value={telegram}
          type="text"
          placeholder="Telegram"
          onChange={e => setTelegram(e.target.value)}
        />
      </FormControl>

      <Spacer />
      <Button isLoading={loading} colorScheme="orange" onClick={saveDetails}>
        Save details
      </Button>
      <Spacer />
      <Spacer />
      <Spacer />
      <Spacer />

      <Heading ref={subsRef} fontSize="2xl" id="subscriptions">
        Subscription
      </Heading>

      {purchased && (
        <Alert status="success">
          <AlertIcon />
          Subscription succesfull. Enjoy your{' '}
          {getPlanInfo(purchased!.plan_id)!.name} Plan
        </Alert>
      )}

      <Flex
        width="100%"
        flexDirection={{ base: 'column', md: 'row' }}
        gridGap={2}
      >
        <SubscriptionCard
          subscription={
            currentAccount?.subscriptions?.filter(
              sub => sub.plan_id === Plan.PRO
            )[0]
          }
          planInfo={getPlanInfo(Plan.PRO)}
          onClick={() => setIsDialogOpen(true)}
          active={currentPlan === Plan.PRO}
          benefits={[
            'Customizable booking link',
            'External calendar connections (Google and iCloud)',
            'Unlimited meeting configurations',
            'Email, Push, EPNS and Discord Notifications (optional)',
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
      />
    </VStack>
  )
}

interface SubscriptioCardProps {
  active: boolean
  benefits: string[]
  subscription?: Subscription
  planInfo?: PlanInfo
  onClick: () => void
}

export const SubscriptionCard: React.FC<SubscriptioCardProps> = ({
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
            isFullWidth
            colorScheme="orange"
            disabled={active}
            onClick={() => onClick()}
          >
            {active ? 'Extend (coming soon)' : `Subscribe to ${planInfo!.name}`}
          </Button>
        )}
      </Box>
    </VStack>
  )
}

export default AccountDetails
