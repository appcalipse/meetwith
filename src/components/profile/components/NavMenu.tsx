import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import {
  Box,
  CloseButton,
  Divider,
  HStack,
  IconButton,
  Slide,
  Switch,
  Text,
  useColorMode,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { MAX_DAILY_NOTIFICATIONS_LOOKUPS } from '@utils/constants'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useMemo } from 'react'
import { IconType } from 'react-icons'
import {
  FaCalendarAlt,
  FaCalendarDay,
  FaCalendarWeek,
  FaCog,
  FaSignOutAlt,
  FaWallet,
} from 'react-icons/fa'
import { FaUserGroup, FaUsers } from 'react-icons/fa6'
import {
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarRightExpand,
} from 'react-icons/tb'

import DashboardOnboardingGauge from '@/components/onboarding/DashboardOnboardingGauge'
import ActionToast from '@/components/toasts/ActionToast'
import { AccountContext } from '@/providers/AccountProvider'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import { EditMode, SettingsSection } from '@/types/Dashboard'
import { logEvent } from '@/utils/analytics'
import { getGroupsEmpty, getGroupsInvites } from '@/utils/api_helper'
import { getAccountCalendarUrl } from '@/utils/calendar_manager'
import {
  getNotificationTime,
  incrementNotificationLookup,
  saveNotificationTime,
} from '@/utils/storage'
import { getAccountDisplayName } from '@/utils/user_manager'

import { ThemeSwitcher } from '../../ThemeSwitcher'
import { Avatar } from './Avatar'
import { CopyLinkButton } from './CopyLinkButton'
import { NavDropdownItem, NavItem } from './NavItem'

interface LinkItemProps {
  name: string
  icon: IconType
  mode: EditMode
  locked?: boolean
  badge?: number
  isDropdownItem?: boolean
  subItems?: Array<{
    text: string
    icon: IconType
    mode: EditMode
  }>
  isBeta?: boolean
  isDisabled?: boolean
}

export const NavMenu: React.FC<{
  currentSection?: EditMode
  isMenuOpen?: boolean
  closeMenu?: () => void
  toggleSidebar?: () => void
  isOpened?: boolean
}> = ({ currentSection, isMenuOpen, closeMenu, isOpened, toggleSidebar }) => {
  const { currentAccount } = useContext(AccountContext)
  const { toggleColorMode } = useColorMode()
  const router = useRouter()
  const toast = useToast()
  const { contactsRequestCount, groupInvitesCount } =
    useContext(MetricStateContext)

  const menuBg = useColorModeValue('white', 'neutral.900')
  const dividerColor = useColorModeValue('neutral.200', 'neutral.700')
  const scrollbarThumbColor = useColorModeValue('gray.300', 'gray.600')
  const scrollbarThumbHoverColor = useColorModeValue('gray.400', 'gray.500')
  const switchTrackBg = useColorModeValue('gray.200', 'gray.600')
  const isDarkMode = useColorModeValue(false, true)

  const LinkItems: Array<LinkItemProps> = useMemo(() => {
    const tabs: Array<LinkItemProps> = [
      { name: 'My Schedule', icon: FaCalendarDay, mode: EditMode.MEETINGS },
      {
        name: 'My Groups',
        icon: FaUserGroup,
        mode: EditMode.GROUPS,
        badge: groupInvitesCount,
        isBeta: true,
      },
      {
        name: 'My Contacts',
        icon: FaUserGroup,
        mode: EditMode.CONTACTS,
        badge: contactsRequestCount,
        isBeta: true,
      },
      {
        name: 'QuickPoll',
        icon: FaUsers,
        mode: EditMode.QUICKPOLL,
        isBeta: true,
      },
      {
        name: 'Session Settings',
        icon: FaCalendarWeek,
        mode: EditMode.MEETING_SETTINGS,
      },
      {
        name: 'Wallet',
        icon: FaWallet,
        mode: EditMode.WALLET,
      },
      {
        name: 'Availabilities',
        icon: FaCalendarAlt,
        mode: EditMode.AVAILABILITY,
      },
      { name: 'Settings', icon: FaCog, mode: EditMode.DETAILS },
    ]
    return tabs.filter(item => !item.isDisabled)
  }, [groupInvitesCount, contactsRequestCount])
  const handleEmptyGroupCheck = async () => {
    return
    const emptyGroups = await getGroupsEmpty()
    emptyGroups?.forEach((data, index) => {
      if (!toast.isActive(data.id)) {
        toast({
          id: data.id,
          containerStyle: {
            position: 'fixed',
            insetInline: '0px',
            marginInline: 'auto',
            marginTop: `${(index + 1) * 10}px`,
            transform: `scaleX(${1 - 0.01 * index})`,
          },
          render: props => (
            <ActionToast
              title="Invite Members"
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
  const handleGroupInvites = async () => {
    if (!currentAccount?.address) return
    const invitedGroups = await getGroupsInvites()
    invitedGroups?.forEach((data, index) => {
      if (!toast.isActive(data.id)) {
        toast({
          id: data.id,
          containerStyle: {
            position: 'fixed',
            insetInline: '0px',
            marginInline: 'auto',
            marginTop: `${(index + 1) * 10}px`,
            transform: `scaleX(${1 - 0.01 * index})`,
          },
          render: props => (
            <ActionToast
              title="Group invite received"
              description={`You have been invited to join ${data.name}!`}
              action={() => {
                props.onClose()
                router.push(`/dashboard/groups?join=${data.id}`)
              }}
              cta="Join Group"
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
    if (!currentAccount) return
    void handleGroupInvites()
    const lastNotificationTime = getNotificationTime(currentAccount?.address)

    if (
      lastNotificationTime === null ||
      (lastNotificationTime.lookups === MAX_DAILY_NOTIFICATIONS_LOOKUPS &&
        DateTime.fromMillis(lastNotificationTime.date).hasSame(
          DateTime.now(),
          'day'
        ))
    ) {
      return
    }
    void handleEmptyGroupCheck()
    if (
      lastNotificationTime.lookups === MAX_DAILY_NOTIFICATIONS_LOOKUPS ||
      !DateTime.fromMillis(lastNotificationTime.date).hasSame(
        DateTime.now(),
        'day'
      )
    ) {
      saveNotificationTime(currentAccount?.address)
    } else {
      incrementNotificationLookup(currentAccount?.address)
    }
  }, [currentAccount?.address])

  if (!currentAccount) return null

  const accountUrl = getAccountCalendarUrl(currentAccount, false)

  const menuClicked = async (mode: EditMode) => {
    logEvent('Selected menu item on dashboard', { mode })
    const path =
      mode === EditMode.DETAILS
        ? `/dashboard/settings/${SettingsSection.DETAILS}`
        : `/dashboard/${mode}`
    await router.push(path)
    isMenuOpen && closeMenu!()
  }

  const handleSignOut = async () => {
    await router.push(`/logout`)
  }

  return (
    <Box
      bgColor={menuBg}
      zIndex="10"
      width={{ base: '100vw', lg: isOpened ? '21%' : '100px' }}
      height="100vh"
      position="fixed"
      left={0}
      top={0}
      display={isMenuOpen ? 'flex' : { base: 'none', lg: 'flex' }}
      flexDirection="column"
      borderRadius={12}
      transition="width 0.2s ease-in-out"
    >
      {!isMenuOpen ? (
        <VStack
          alignItems="center"
          height="100vh"
          spacing={0}
          overflow="hidden"
          display={{ base: 'none', lg: 'flex' }}
          backgroundColor={'transparent'}
        >
          <VStack width="100%" gap={6} px={5} py={8} flexShrink={0}>
            <Box
              cursor="pointer"
              mb={4}
              onClick={toggleSidebar}
              color="sidebar-inverted-subtle"
              alignSelf={isOpened ? 'flex-end' : 'center'}
            >
              {isOpened ? (
                <TbLayoutSidebarRightExpand size={40} />
              ) : (
                <TbLayoutSidebarLeftExpand size={40} />
              )}
            </Box>
            <HStack width="100%" textAlign="center">
              <Box width="64px" height="64px" display="block">
                <Avatar
                  address={currentAccount.address}
                  avatar_url={currentAccount.preferences?.avatar_url || ''}
                  name={getAccountDisplayName(currentAccount)}
                />
              </Box>

              {isOpened && (
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
              )}
            </HStack>

            <DashboardOnboardingGauge />
          </VStack>

          {/* Main Navigation Items */}
          <VStack
            width="100%"
            flex={1}
            spacing={2}
            overflowY="auto"
            px={0}
            sx={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: scrollbarThumbColor,
                borderRadius: '2px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: scrollbarThumbHoverColor,
              },
            }}
          >
            {LinkItems.map(link =>
              link.isDropdownItem ? (
                <NavDropdownItem
                  key={link.name}
                  text={link.name}
                  icon={link.icon}
                  subItems={link.subItems || []}
                  changeMode={menuClicked}
                  currentSection={currentSection}
                  isOpened={isOpened}
                />
              ) : (
                <NavItem
                  selected={currentSection === link.mode}
                  key={link.name}
                  text={link.name}
                  icon={link.icon}
                  mode={link.mode}
                  badge={link.badge}
                  locked={link.locked || false}
                  changeMode={menuClicked}
                  isBeta={link.isBeta}
                  isOpened={isOpened}
                />
              )
            )}
          </VStack>

          <VStack width="100%" spacing={4} py={8} flexShrink={0}>
            <Divider borderColor={dividerColor} />

            <HStack
              width="100%"
              justify="space-between"
              px={8}
              flexDirection={!isOpened ? 'column' : undefined}
            >
              <HStack spacing={3} cursor="pointer" onClick={handleSignOut}>
                <Box color="primary.500">
                  <FaSignOutAlt size={isOpened ? 16 : 24} />
                </Box>
                {isOpened && (
                  <Text fontSize="sm" fontWeight={500} color="primary.500">
                    Sign out
                  </Text>
                )}
              </HStack>

              <HStack spacing={1}>
                {isOpened && (
                  <IconButton
                    aria-label="Settings"
                    icon={<FaCog />}
                    size="sm"
                    variant="ghost"
                    color="neutral.300"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={() => menuClicked(EditMode.DETAILS)}
                  />
                )}
                <ThemeSwitcher />
              </HStack>
            </HStack>
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
            <HStack width="100%" spacing={4} alignItems="flex-start" ml={16}>
              <Box width="65px" height="65px" mb={2}>
                <Avatar
                  address={currentAccount.address || ''}
                  avatar_url={currentAccount.preferences?.avatar_url || ''}
                  name={getAccountDisplayName(currentAccount)}
                />
              </Box>
              <VStack alignItems="flex-start" spacing={2}>
                <Text fontSize="lg" fontWeight={500} color="white">
                  {getAccountDisplayName(currentAccount)}
                </Text>
                <CopyLinkButton
                  url={accountUrl}
                  size="md"
                  label="Share my calendar"
                  withIcon
                  design_type="link"
                  variant="ghost"
                  _hover={{ bg: 'transparent' }}
                  _focus={{ boxShadow: 'none' }}
                  color="orange.400"
                />
              </VStack>
            </HStack>

            {/* Main Navigation Items */}
            <VStack py={2} width="100%" flex={1} spacing={2}>
              {LinkItems.map(link =>
                link.isDropdownItem ? (
                  <NavDropdownItem
                    key={link.name}
                    text={link.name}
                    icon={link.icon}
                    subItems={link.subItems || []}
                    changeMode={menuClicked}
                    currentSection={currentSection}
                  />
                ) : (
                  <NavItem
                    selected={currentSection === link.mode}
                    key={link.name}
                    text={link.name}
                    icon={link.icon}
                    mode={link.mode}
                    locked={link.locked || false}
                    changeMode={menuClicked}
                    badge={link.badge}
                  />
                )
              )}
            </VStack>

            {/* Mobile Bottom Section - Display Name, Settings, Theme Toggle */}
            <VStack width="100%" spacing={4} mt="auto">
              <Divider borderColor={dividerColor} />

              <HStack width="100%" justify="space-between" px={8}>
                <HStack spacing={3} cursor="pointer" onClick={handleSignOut}>
                  <Box color="primary.500">
                    <FaSignOutAlt size={16} />
                  </Box>
                  <Text fontSize="sm" fontWeight={500} color="primary.500">
                    Sign out
                  </Text>
                </HStack>

                <HStack spacing={3}>
                  <IconButton
                    aria-label="Settings"
                    icon={<FaCog />}
                    size="sm"
                    variant="ghost"
                    color="white"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={() => menuClicked(EditMode.DETAILS)}
                  />
                  <HStack spacing={2} alignItems="center">
                    <Box color="neutral.300" fontSize="sm">
                      <SunIcon />
                    </Box>
                    <Switch
                      colorScheme="orange"
                      size="sm"
                      onChange={() => {
                        toggleColorMode()
                      }}
                      isChecked={isDarkMode}
                      sx={{
                        '& .chakra-switch__track': {
                          bg: switchTrackBg,
                        },
                        '& .chakra-switch__thumb': {
                          bg: 'white',
                        },
                        '& .chakra-switch__track[data-checked]': {
                          bg: 'primary.400',
                        },
                      }}
                    />
                    <Box color="neutral.300" fontSize="sm">
                      <MoonIcon color="primary.400" />
                    </Box>
                  </HStack>
                </HStack>
              </HStack>
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
