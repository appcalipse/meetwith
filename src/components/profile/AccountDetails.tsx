import { Box, Flex, Spacer, Text, VStack } from '@chakra-ui/layout'
import {
  Button,
  Input,
  List,
  ListIcon,
  ListItem,
  OrderedList,
  UnorderedList,
  useColorModeValue,
} from '@chakra-ui/react'
import { Textarea } from '@chakra-ui/textarea'
import { useContext, useEffect, useRef, useState } from 'react'

import { AccountContext } from '../../providers/AccountProvider'
import { SocialLinkType } from '../../types/Account'
import { AcceptedToken, SupportedChain } from '../../types/chains'
import { Plan } from '../../types/Subscription'
import { logEvent } from '../../utils/analytics'
import { saveAccountChanges, syncSubscriptions } from '../../utils/api_helper'
import { subscribeToPlan } from '../../utils/subscription_manager'
import SubscriptionDialog from './SubscriptionDialog'

const AccountDetails: React.FC = () => {
  const { currentAccount, login } = useContext(AccountContext)
  const cancelDialogRef = useRef<any>()

  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const socialLinks = currentAccount?.preferences?.socialLinks || []

  const [description, setDescription] = useState(
    currentAccount?.preferences?.description || ''
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

  const getSubs = async () => {
    const subscriptions = await syncSubscriptions()
  }

  useEffect(() => {
    getSubs()
  }, [])

  const saveDetails = async () => {
    setLoading(true)

    try {
      const updatedAccount = await saveAccountChanges({
        ...currentAccount!,
        preferences: {
          ...currentAccount!.preferences!,
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

  return (
    <VStack p={4} mb={10} alignItems="start">
      <Text>Description (optional)</Text>
      <Textarea
        value={description}
        placeholder="Add an optional message to be displayed on your public calendar page"
        onChange={e => setDescription(e.target.value)}
      />

      <Text pt={2}>Twitter (optional)</Text>
      <Input
        value={twitter}
        type="text"
        placeholder="Twitter"
        onChange={e => setTwitter(e.target.value)}
      />

      <Text pt={2}>Discord (optional)</Text>
      <Input
        value={discord}
        type="text"
        placeholder="Discord"
        onChange={e => setDiscord(e.target.value)}
      />

      <Text pt={2}>Telegram (optional)</Text>
      <Input
        value={telegram}
        type="text"
        placeholder="Telegram"
        onChange={e => setTelegram(e.target.value)}
      />

      <Spacer />
      <Button
        isLoading={loading}
        alignSelf="flex-end"
        colorScheme="orange"
        onClick={saveDetails}
      >
        Save details
      </Button>
      <Text mt={10} fontSize="2xl" color="#323F4B" fontWeight="medium">
        Subscription
      </Text>
      <Flex mt={10} width="100%">
        <VStack
          shadow="sm"
          bg={useColorModeValue('gray.50', 'gray.700')}
          width="49%"
          height="300px"
          py={5}
          borderRadius={10}
        >
          <Text width="100%" textAlign="left" ml={30} fontWeight="medium">
            Pro - $30 / year
          </Text>
          <UnorderedList fontSize="12px" width="75%" textAlign="left" ml={30}>
            <ListItem>Customizable booking link</ListItem>
            <ListItem>
              External calendar connections (Google and iCloud)
            </ListItem>
            <ListItem>Unlimited meeting configurations</ListItem>
            <ListItem>
              Email, Push, EPNS and Discord Notifications (optional)
            </ListItem>
            <ListItem>Schedule meetings with multiple participants</ListItem>
            <ListItem>
              Request payment for meeting scheduling (coming soon)
            </ListItem>
          </UnorderedList>
          <Button
            width="90%"
            mt={50}
            colorScheme="orange"
            onClick={() => setIsDialogOpen(true)}
          >
            Subscribe to Pro
          </Button>
        </VStack>
        <Spacer />
        <VStack
          borderColor="#F35826"
          borderWidth={2}
          bg={useColorModeValue('white', 'gray.700')}
          width="47%"
          height="300px"
          py={5}
          borderRadius={10}
        >
          <Text width="100%" textAlign="left" ml={30} fontWeight="medium">
            Free - $0 / forever
          </Text>
          <UnorderedList fontSize="12px" width="75%" textAlign="left" ml={30}>
            <ListItem>Public page for scheduling meetings</ListItem>
            <ListItem>Configurable availability</ListItem>
            <ListItem>Web3 powered meeting room</ListItem>
            <ListItem>Single meeting configuration</ListItem>
            <ListItem>Only 1:1 meetings</ListItem>
          </UnorderedList>
        </VStack>
        <SubscriptionDialog
          isDialogOpen={isDialogOpen}
          onDialogClose={() => setIsDialogOpen(false)}
          cancelDialogRef={cancelDialogRef}
        />
      </Flex>
    </VStack>
  )
}

export default AccountDetails
