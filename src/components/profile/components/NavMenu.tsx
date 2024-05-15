import {
  Box,
  CloseButton,
  HStack,
  Slide,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useContext, useEffect } from 'react'
import { IconType } from 'react-icons'
import {
  FaBell,
  FaCalendarAlt,
  FaCalendarDay,
  FaCalendarPlus,
  FaCalendarWeek,
  FaCog,
  FaDoorClosed,
  FaSignOutAlt,
} from 'react-icons/fa'
import { FaUserGroup } from 'react-icons/fa6'

import DashboardOnboardingGauge from '@/components/onboarding/DashboardOnboardingGauge'
import ActionToast from '@/components/toasts/ActionToast'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { EditMode } from '@/types/Dashboard'
import { logEvent } from '@/utils/analytics'
import { getGroupsEmpty } from '@/utils/api_helper'
import { getAccountCalendarUrl } from '@/utils/calendar_manager'
import { isProduction } from '@/utils/constants'
import { getAccountDisplayName } from '@/utils/user_manager'

import {
  getNotificationTime,
  saveNotificationTime,
} from '../../../utils/storage'
import { Avatar } from './Avatar'
import { CopyLinkButton } from './CopyLinkButton'
import { NavItem } from './NavItem'

interface LinkItemProps {
  name: string
  icon: IconType
  mode: EditMode
  locked?: boolean
}
const LinkItems: Array<LinkItemProps> = [
  { name: 'My Meetings', icon: FaCalendarDay, mode: EditMode.MEETINGS },
  { name: 'Availabilities', icon: FaCalendarAlt, mode: EditMode.AVAILABILITY },
  { name: 'Meeting Types', icon: FaCalendarWeek, mode: EditMode.TYPES },
  {
    name: 'Notifications',
    icon: FaBell,
    mode: EditMode.NOTIFICATIONS,
  },
  {
    name: 'Token Gates',
    icon: FaDoorClosed,
    mode: EditMode.GATES,
  },
  {
    name: 'Connected Calendars',
    icon: FaCalendarPlus,
    mode: EditMode.CALENDARS,
  },
  { name: 'Account Settings', icon: FaCog, mode: EditMode.DETAILS },
  {
    name: 'Sign Out',
    icon: FaSignOutAlt,
    mode: EditMode.SIGNOUT,
  },
]
// add this to the LinkItems array after prod
if (!isProduction) {
  LinkItems.splice(1, 0, {
    name: 'My Groups',
    icon: FaUserGroup,
    mode: EditMode.GROUPS,
  })
}
export const NavMenu: React.FC<{
  currentSection?: EditMode
  isMenuOpen?: boolean
  closeMenu?: () => void
}> = ({ currentSection, isMenuOpen, closeMenu }) => {
  const { currentAccount } = useContext(AccountContext)
  const { reload: reloadOnboardingInfo } = useContext(OnboardingContext)
  const router = useRouter()
  const toast = useToast()

  const { calendarResult } = router.query
  const menuBg = useColorModeValue('white', 'gray.800')
  const handleEmptyGroupCheck = async () => {
    const emptyGroups = await getGroupsEmpty()
    emptyGroups?.forEach((data, index) => {
      if (!toast.isActive(data.id)) {
        toast({
          id: data.id,
          title: 'Invite Members',
          containerStyle: {
            position: 'fixed',
            insetInline: '0px',
            marginInline: 'auto',
            marginTop: `${(index + 1) * 10}px`,
            transform: `scaleX(${1 - 0.01 * index})`,
          },
          render: props => (
            <ActionToast
              description={`Your group ${data.name} is feeling like a party with just you - let’s invite your buddies to join the fun!`}
              action={() => {
                props.onClose()
                router.push(`/dashboard/groups?invite=${data.id}`)
              }}
              cta="Invite"
              close={props.onClose}
            />
          ),
          status: 'success',
          duration: 30000,
          position: 'top',
          isClosable: true,
        })
      }
    })
  }
  useEffect(() => {
    if (calendarResult === 'error') {
      toast({
        title: 'Error connecting calendar',
        description:
          'Please make sure to give access to Meet with Wallet within your calendar provider page.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    } else if (calendarResult === 'success') {
      reloadOnboardingInfo()
      toast({
        title: 'Calendar connected',
        description: "You've just connected a new calendar provider.",
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
  }, [])
  useEffect(() => {
    const lastNotificationTime = getNotificationTime(currentAccount?.address)
    if (lastNotificationTime === null) return
    if (Date.now() > lastNotificationTime) {
      handleEmptyGroupCheck()
      saveNotificationTime(currentAccount?.address)
    }
  }, [currentAccount])

  if (!currentAccount) return null

  const accountUrl = getAccountCalendarUrl(currentAccount!, false)

  const menuClicked = async (mode: EditMode) => {
    logEvent('Selected menu item on dashboard', { mode })
    if (mode === EditMode.SIGNOUT) {
      await router.push(`/logout`)
    } else {
      router.push(`/dashboard/${mode}`)
      isMenuOpen && closeMenu!()
    }
  }

  return (
    <Box borderRadius={{ base: 0, md: 16 }} bgColor={menuBg} mb={8} zIndex="10">
      {!isMenuOpen ? (
        <VStack
          alignItems="center"
          flex={1}
          spacing={8}
          py={12}
          overflow="hidden"
          borderRadius={16}
          display={{ base: 'none', lg: 'flex' }}
          // TO-DO: replace by new dark/light color scheme
          backgroundColor={'transparent'}
        >
          <VStack width="100%" gap={6} px={8}>
            <HStack width="100%" textAlign="center">
              <Box width="64px" height="64px">
                <Avatar account={currentAccount} />
              </Box>

              <VStack ml={2} flex={1} alignItems="flex-start">
                <Text fontSize="lg" fontWeight={500}>
                  {getAccountDisplayName(currentAccount)}
                </Text>
                <CopyLinkButton
                  url={accountUrl}
                  size="md"
                  design_type="link"
                  label="Share my calendar"
                  withIcon
                />
              </VStack>
            </HStack>

            <DashboardOnboardingGauge />
          </VStack>

          <VStack width="100%">
            {LinkItems.map(link => (
              <NavItem
                selected={currentSection === link.mode}
                key={link.name}
                text={link.name}
                icon={link.icon}
                mode={link.mode}
                locked={link.locked || false}
                changeMode={menuClicked}
              ></NavItem>
            ))}
          </VStack>
        </VStack>
      ) : (
        <Slide direction="right" in={isMenuOpen}>
          <VStack
            bgColor={menuBg}
            alignItems="center"
            spacing={8}
            py={12}
            display={{ base: 'flex', lg: 'none' }}
            position={'fixed'}
            top={'0'}
            left={'0'}
            width={'100vw'}
            height={'100vh'}
            overflowY="auto"
          >
            <VStack width="100%" textAlign="center">
              <Box width="120px" height="120px" mb={2}>
                <Avatar account={currentAccount} />
              </Box>

              <Text fontSize="lg" fontWeight={500}>
                {getAccountDisplayName(currentAccount)}
              </Text>
            </VStack>

            <Box>
              <CopyLinkButton
                url={accountUrl}
                size="md"
                label="Share my calendar"
                withIcon
              />
            </Box>

            <VStack py={2} width="100%">
              {LinkItems.map(link => (
                <NavItem
                  selected={currentSection === link.mode}
                  key={link.name}
                  text={link.name}
                  icon={link.icon}
                  mode={link.mode}
                  locked={link.locked || false}
                  changeMode={menuClicked}
                ></NavItem>
              ))}
            </VStack>
            {isMenuOpen && (
              <CloseButton
                onClick={closeMenu}
                position="fixed"
                top="20px"
                right="20px"
                size="lg"
              />
            )}
          </VStack>
        </Slide>
      )}
    </Box>
  )
}
