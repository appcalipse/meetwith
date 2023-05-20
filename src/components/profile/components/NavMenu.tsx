import {
  Box,
  CloseButton,
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
  FaDoorClosed,
  FaInfoCircle,
  FaSignOutAlt,
} from 'react-icons/fa'

import { getAccountCalendarUrl } from '@/utils/calendar_manager'
import { getAccountDisplayName } from '@/utils/user_manager'

import { AccountContext } from '../../../providers/AccountProvider'
import { EditMode } from '../../../types/Dashboard'
import { logEvent } from '../../../utils/analytics'
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
  { name: 'Account Details', icon: FaInfoCircle, mode: EditMode.DETAILS },
  { name: 'Availabilities', icon: FaCalendarAlt, mode: EditMode.AVAILABILITY },
  { name: 'Meeting Types', icon: FaCalendarWeek, mode: EditMode.TYPES },
  {
    name: 'Notifications Settings',
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
  {
    name: 'Sign Out',
    icon: FaSignOutAlt,
    mode: EditMode.SIGNOUT,
  },
]

export const NavMenu: React.FC<{
  currentSection?: EditMode
  isMenuOpen?: boolean
  closeMenu?: () => void
}> = ({ currentSection, isMenuOpen, closeMenu }) => {
  const { currentAccount } = useContext(AccountContext)
  const router = useRouter()
  const toast = useToast()

  const { calendarResult } = router.query
  const menuBg = useColorModeValue('white', 'gray.800')

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
          maxW={'360px'}
          spacing={8}
          py={12}
          overflow="hidden"
          borderRadius={16}
          display={{ base: 'none', md: 'flex' }}
          // TO-DO: replace by new dark/light color scheme
          backgroundColor={'transparent'}
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
              label="Copy my calendar link"
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
        </VStack>
      ) : (
        <Slide direction="right" in={isMenuOpen}>
          <VStack
            bgColor={menuBg}
            alignItems="center"
            spacing={8}
            py={12}
            display={{ base: 'flex', md: 'none' }}
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
                label="Copy my calendar link"
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
                top="0"
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
