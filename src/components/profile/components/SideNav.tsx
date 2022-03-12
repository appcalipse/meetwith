import { Box, Text, useToast, VStack } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { useRouter } from 'next/router'
import React, { useContext, useEffect } from 'react'
import { IconType } from 'react-icons'
import {
  FaBell,
  FaCalendarAlt,
  FaCalendarDay,
  FaCalendarPlus,
  FaCalendarWeek,
  FaInfoCircle,
  FaSignOutAlt,
} from 'react-icons/fa'

import { AccountContext } from '../../../providers/AccountProvider'
import { EditMode } from '../../../types/Dashboard'
import { logEvent } from '../../../utils/analytics'
import { getAccountCalendarUrl } from '../../../utils/calendar_manager'
import { getAccountDisplayName } from '../../../utils/user_manager'
import { CopyLinkButton } from './CopyLinkButton'
import { NavItem } from './NavItem'

interface LinkItemProps {
  name: string
  icon: IconType
  mode: EditMode
  locked?: boolean
}
const LinkItems: Array<LinkItemProps> = [
  { name: 'My meetings', icon: FaCalendarDay, mode: EditMode.MEETINGS },
  { name: 'Account details', icon: FaInfoCircle, mode: EditMode.DETAILS },
  { name: 'Availabilities', icon: FaCalendarAlt, mode: EditMode.AVAILABILITY },
  { name: 'Meeting types', icon: FaCalendarWeek, mode: EditMode.TYPES },
  {
    name: 'Notifications settings',
    icon: FaBell,
    mode: EditMode.NOTIFICATIONS,
  },
  {
    name: 'Connected calendars',
    icon: FaCalendarPlus,
    mode: EditMode.CALENDARS,
  },
  {
    name: 'Sign out',
    icon: FaSignOutAlt,
    mode: EditMode.SIGNOUT,
  },
]

export const SideNav: React.FC<{ currentSection?: EditMode }> = ({
  currentSection,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const router = useRouter()
  const toast = useToast()

  const { result } = router.query

  useEffect(() => {
    if (result === 'error') {
      toast({
        title: 'Error connecting calendar',
        description:
          'Please make sure to give access to Meet With Wallet within your calendar provider page.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    } else if (result === 'success') {
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
      router.push(`/dashboard/${mode}`, undefined, { shallow: true })
    }
  }

  return (
    <VStack
      alignItems="center"
      minW="390px"
      px={8}
      borderRight="1px solid"
      borderColor="gray.200"
      spacing={8}
    >
      <VStack width="100%" textAlign="center">
        <Box width="120px" height="120px" mb={2}>
          <Jazzicon address={currentAccount.address} />
        </Box>

        <Text fontSize="lg" fontWeight={500}>
          {getAccountDisplayName(currentAccount)}
        </Text>
      </VStack>

      <Box>
        <CopyLinkButton
          url={accountUrl}
          size="sm"
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
  )
}
