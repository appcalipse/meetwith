import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Heading,
  HStack,
  Icon,
  IconButton,
  Text,
  useMediaQuery,
  VStack,
} from '@chakra-ui/react'
import { useToastHelpers } from '@utils/toasts'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'
import { HiOutlineMenuAlt2 } from 'react-icons/hi'
import { IoCloseOutline } from 'react-icons/io5'

import AccountPlansAndBilling from '@/components/profile/AccountPlansAndBilling'
import WalletAndPayment from '@/components/profile/WalletAndPayment'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { Account } from '@/types/Account'
import { EditMode, SettingsSection } from '@/types/Dashboard'

import NotificationsConfig from '../notifications/NotificationConfig'
import AccountDetails from './AccountDetails'
import Block from './components/Block'
import ConnectCalendar from './ConnectCalendar'
import ConnectedAccounts from './ConnectedAccounts'

interface SettingsNavItem {
  name: string
  section: SettingsSection
}

const Settings: React.FC<{
  currentAccount: Account
}> = ({ currentAccount }) => {
  const { showSuccessToast, showErrorToast, showInfoToast } = useToastHelpers()
  const settingsNavItems: SettingsNavItem[] = useMemo(() => {
    const tabs = [
      { name: 'Account details', section: SettingsSection.DETAILS },
      {
        name: 'Connected calendars',
        section: SettingsSection.CONNECTED_CALENDARS,
      },
      {
        name: 'Connected accounts',
        section: SettingsSection.CONNECTED_ACCOUNTS,
      },
      { name: 'Notifications', section: SettingsSection.NOTIFICATIONS },
      {
        name: 'Account plans & Billing',
        section: SettingsSection.SUBSCRIPTIONS,
      },
      {
        name: 'Wallet & Payments',
        section: SettingsSection.WALLET_PAYMENT,
      },
    ]
    return tabs
  }, [])
  const [activeSection, setActiveSection] = useState<
    SettingsSection | undefined
  >(undefined)
  const { reload: reloadOnboardingInfo } = useContext(OnboardingContext)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { calendarResult, stripeResult } = router.query
  const [isMobile] = useMediaQuery('(max-width: 1024px)')

  const renderContent = () => {
    switch (activeSection) {
      case SettingsSection.DETAILS:
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
      case SettingsSection.SUBSCRIPTIONS:
        return <AccountPlansAndBilling currentAccount={currentAccount} />
      case SettingsSection.WALLET_PAYMENT:
        return <WalletAndPayment currentAccount={currentAccount} />
      default:
        return <AccountDetails currentAccount={currentAccount} />
    }
  }

  const handleBack = () => {
    router.push(`/dashboard/${EditMode.MEETINGS}`)
  }

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

  const handleMobileMenuItemClick = (section: SettingsSection) => {
    handleSectionNavigation(section)
    setIsMobileMenuOpen(false)
  }

  const handleSectionNavigation = (section: SettingsSection) => {
    setActiveSection(section)

    const sectionPath: Record<SettingsSection, string> = {
      [SettingsSection.DETAILS]: '/dashboard/settings/details',
      [SettingsSection.CONNECTED_CALENDARS]:
        '/dashboard/settings/connected-calendars',
      [SettingsSection.CONNECTED_ACCOUNTS]:
        '/dashboard/settings/connected-accounts',
      [SettingsSection.NOTIFICATIONS]: '/dashboard/settings/notifications',
      [SettingsSection.SUBSCRIPTIONS]: '/dashboard/settings/subscriptions',
      [SettingsSection.WALLET_PAYMENT]: '/dashboard/settings/wallet-payment',
    }

    const { section: _omit, ...restQuery } = router.query ?? {}

    const query: Record<string, string> = {}
    Object.entries(restQuery).forEach(([k, v]) => {
      if (typeof v === 'string') query[k] = v
      else if (Array.isArray(v) && v.length) query[k] = v.join(',')
    })

    router.replace(
      {
        pathname: sectionPath[section],
        query,
      },
      undefined,
      { shallow: true }
    )
  }
  useEffect(() => {
    if (calendarResult || stripeResult) {
      if (calendarResult === 'error') {
        showErrorToast(
          'Error connecting calendar',
          'Please make sure to give access to Meetwith within your calendar provider page.',
          15000
        )
      } else if (calendarResult === 'success') {
        reloadOnboardingInfo()
        showSuccessToast(
          'Calendar connected',
          "You've just connected a new calendar.",
          15000
        )
      } else if (stripeResult === 'error') {
        showErrorToast(
          'Error connecting Stripe account',
          'Please make sure to complete all required fields within your Stripe dashboard.',
          15000
        )
      } else if (stripeResult === 'success') {
        showSuccessToast(
          'Stripe account connected',
          "You've just connected your Stripe account.",
          15000
        )
      } else if (stripeResult === 'pending') {
        showInfoToast(
          'Stripe account pending',
          'Your Stripe account is almost ready! Please complete any remaining steps in your Stripe dashboard.',
          15000
        )
      }
      const {
        section: _omit,
        calendarResult: _omit2,
        stripeResult: _omit3,
        ...restQuery
      } = router.query ?? {}

      const query: Record<string, string> = {}
      Object.entries(restQuery).forEach(([k, v]) => {
        if (typeof v === 'string') query[k] = v
        else if (Array.isArray(v) && v.length) query[k] = v.join(',')
      })

      void router.replace(
        {
          pathname: calendarResult
            ? '/dashboard/settings/connected-calendars'
            : '/dashboard/settings/connected-accounts',
          query,
        },
        undefined
      )
    }
  }, [calendarResult, stripeResult])
  useEffect(() => {
    if (!router.isReady) return
    const path = router.asPath.split('?')[0]
    const sectionSlug = path.replace('/dashboard/settings/', '')

    switch (sectionSlug) {
      case SettingsSection.SUBSCRIPTIONS:
        setActiveSection(SettingsSection.SUBSCRIPTIONS)
        break
      case SettingsSection.CONNECTED_ACCOUNTS:
        setActiveSection(SettingsSection.CONNECTED_ACCOUNTS)
        break
      case SettingsSection.CONNECTED_CALENDARS:
        setActiveSection(SettingsSection.CONNECTED_CALENDARS)
        break
      case SettingsSection.NOTIFICATIONS:
        setActiveSection(SettingsSection.NOTIFICATIONS)
        break
      case SettingsSection.WALLET_PAYMENT:
        setActiveSection(SettingsSection.WALLET_PAYMENT)
        break
      case SettingsSection.DETAILS:
      default:
        setActiveSection(SettingsSection.DETAILS)
        break
    }
  }, [router.asPath, router.isReady])
  useEffect(() => {
    if (router.query.code) {
      handleSectionNavigation(SettingsSection.CONNECTED_ACCOUNTS)
    }
  }, [router.query.code])

  return (
    <>
      {/* Mobile Settings Menu Drawer */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
        placement="left"
        size="full"
      >
        <DrawerOverlay />
        <DrawerContent bg="bg-surface">
          <DrawerBody p={0}>
            <Box
              width="100%"
              height="100vh"
              p={6}
              pt={10}
              display="flex"
              flexDirection="column"
            >
              {/* Close button */}
              <HStack justify="flex-end" mb={6}>
                <IconButton
                  aria-label="Close settings menu"
                  icon={<IoCloseOutline size={32} color="#F46739" />}
                  variant="ghost"
                  onClick={handleMobileMenuClose}
                  color="text-primary"
                />
              </HStack>

              <Heading
                fontSize="26px"
                fontWeight="700"
                mb={10}
                color="text-primary"
                pl={3}
              >
                Settings
              </Heading>

              {/* Settings navigation items */}
              <VStack
                spacing={4}
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
                      onClick={() => handleMobileMenuItemClick(item.section)}
                      color={isActive ? 'primary.200' : 'text-primary'}
                      fontWeight={isActive ? 'semibold' : 'normal'}
                      px={3}
                      py={2.5}
                      borderRadius="8px"
                      fontSize="lg"
                    >
                      <Text fontSize="18px" fontWeight="500">
                        {item.name}
                      </Text>
                    </Button>
                  )
                })}
              </VStack>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Fixed Settings Navigation Sidebar */}
      {!isMobile && (
        <Box
          width={{ base: '100vw', lg: '21%' }}
          height="100vh"
          position="fixed"
          left={0}
          top={0}
          zIndex={10}
          bg="bg-surface"
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

          <Heading fontSize="xl" ml={3} mb={8} color="text-primary">
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
                  onClick={() => handleSectionNavigation(item.section)}
                  color={isActive ? 'primary.200' : 'text-primary'}
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
        pt={0}
        display={{ base: 'flex', lg: 'block' }}
        flexDirection={{ base: 'column', lg: 'row' }}
      >
        {/* Mobile Header with Hamburger Menu */}
        {isMobile && (
          <Box zIndex={20} p={0} pb={4}>
            <VStack gap={4} align="flex-start">
              <HStack
                spacing={2}
                color="primary.400"
                cursor="pointer"
                onClick={handleBack}
              >
                <Icon as={FaArrowLeft} />
                <Text fontWeight={600}>Go Back</Text>
              </HStack>

              <HStack spacing={2} align="center" ml={-2} pt={2}>
                <IconButton
                  aria-label="Open settings menu"
                  icon={<HiOutlineMenuAlt2 size={30} />}
                  variant="ghost"
                  onClick={handleMobileMenuToggle}
                  color="text-primary"
                />
                <Text fontSize="20px" fontWeight="700" color="text-primary">
                  Settings
                </Text>
              </HStack>
            </VStack>
          </Box>
        )}
        {renderContent()}
      </Box>
    </>
  )
}

export default Settings
