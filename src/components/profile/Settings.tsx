import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  useMediaQuery,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

import AccountPlansAndBilling from '@/components/profile/AccountPlansAndBilling'
import WalletAndPayment from '@/components/profile/WalletAndPayment'
import { Account } from '@/types/Account'
import { EditMode } from '@/types/Dashboard'

import NotificationsConfig from '../notifications/NotificationConfig'
import AccountDetails from './AccountDetails'
import Block from './components/Block'
import ConnectCalendar from './ConnectCalendar'
import ConnectedAccounts from './ConnectedAccounts'

enum SettingsSection {
  ACCOUNT_DETAILS = 'account-details',
  CONNECTED_CALENDARS = 'connected-calendars',
  CONNECTED_ACCOUNTS = 'connected-accounts',
  NOTIFICATIONS = 'notifications',
  ACCOUNT_PLANS_BILLING = 'account-plans-billing',
  WALLET_PAYMENT = 'wallet-payment',
}

interface SettingsNavItem {
  name: string
  section: SettingsSection
}

const settingsNavItems: SettingsNavItem[] = [
  { name: 'Account details', section: SettingsSection.ACCOUNT_DETAILS },
  { name: 'Connected calendars', section: SettingsSection.CONNECTED_CALENDARS },
  { name: 'Connected accounts', section: SettingsSection.CONNECTED_ACCOUNTS },
  { name: 'Notifications', section: SettingsSection.NOTIFICATIONS },
  {
    name: 'Account plans & Billing',
    section: SettingsSection.ACCOUNT_PLANS_BILLING,
  },
  { name: 'Wallet & Payments', section: SettingsSection.WALLET_PAYMENT },
]

const Settings: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    SettingsSection.ACCOUNT_DETAILS
  )
  const router = useRouter()
  const [isMobile] = useMediaQuery('(max-width: 1024px)')

  const renderContent = () => {
    switch (activeSection) {
      case SettingsSection.ACCOUNT_DETAILS:
        return <AccountDetails currentAccount={currentAccount} />
      case SettingsSection.CONNECTED_CALENDARS:
        return <ConnectCalendar currentAccount={currentAccount} />
      case SettingsSection.CONNECTED_ACCOUNTS:
        return (
          <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'}>
            <Block>
              <ConnectedAccounts />
            </Block>
          </VStack>
        )
      case SettingsSection.NOTIFICATIONS:
        return <NotificationsConfig currentAccount={currentAccount} />
      case SettingsSection.ACCOUNT_PLANS_BILLING:
        return <AccountPlansAndBilling currentAccount={currentAccount} />
      case SettingsSection.WALLET_PAYMENT:
        return <WalletAndPayment currentAccount={currentAccount} />
      default:
        return null
    }
  }

  const handleBack = () => {
    router.push(`/dashboard/${EditMode.MEETINGS}`)
  }

  useEffect(() => {
    const hash = router.asPath.split('#')[1] || ''

    if (hash === 'subscriptions') {
      setActiveSection(SettingsSection.ACCOUNT_PLANS_BILLING)
    } else if (hash === 'connected-accounts') {
      setActiveSection(SettingsSection.CONNECTED_ACCOUNTS)
    } else if (hash === 'connected-calendars') {
      setActiveSection(SettingsSection.CONNECTED_CALENDARS)
    } else if (hash === 'notifications') {
      setActiveSection(SettingsSection.NOTIFICATIONS)
    } else if (hash === 'wallet-payment') {
      setActiveSection(SettingsSection.WALLET_PAYMENT)
    }
  }, [router.asPath])

  return (
    <>
      {/* Fixed Settings Navigation Sidebar */}
      {!isMobile && (
        <Box
          width={{ base: '100vw', lg: '21%' }}
          height="100vh"
          position="fixed"
          left={0}
          top={0}
          zIndex={10}
          bg="neutral.900"
          borderRadius={12}
          p={6}
          pt={10}
          display="flex"
          flexDirection="column"
        >
          {/* Back inside sidebar */}
          <HStack
            spacing={2}
            color="primary.400"
            cursor="pointer"
            mb={6}
            ml={3}
            onClick={handleBack}
          >
            <Icon as={FaArrowLeft} />
            <Text fontWeight={600}>Go Back</Text>
          </HStack>

          <Heading fontSize="xl" ml={3} mb={8} color="white">
            Settings
          </Heading>

          {/* Scrollable navigation items */}
          <VStack
            spacing={2}
            align="stretch"
            flex={1}
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            {settingsNavItems.map(item => {
              const isActive = activeSection === item.section
              return (
                <Button
                  key={item.section}
                  variant="ghost"
                  justifyContent="flex-start"
                  alignItems="center"
                  onClick={() => setActiveSection(item.section)}
                  color={isActive ? 'primary.200' : 'white'}
                  fontWeight={isActive ? 'semibold' : 'normal'}
                  px={3}
                  py={2.5}
                  borderRadius="8px"
                >
                  <Text>{item.name}</Text>
                </Button>
              )
            })}
          </VStack>
        </Box>
      )}

      {/* Settings Content */}
      <Box
        flex={1}
        overflowY="auto"
        mb={10}
        pl={{ base: 0, lg: '21%' }}
        pt={{ base: '70px', lg: 0 }}
      >
        {renderContent()}
      </Box>
    </>
  )
}

export default Settings
