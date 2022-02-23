import {
  Box,
  Button,
  Flex,
  FlexProps,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import { IconType } from 'react-icons'
import {
  FaBell,
  FaCalendarAlt,
  FaCalendarDay,
  FaCalendarPlus,
  FaCalendarWeek,
  FaInfoCircle,
  FaLock,
  FaSignOutAlt,
} from 'react-icons/fa'

import { AccountContext } from '../../providers/AccountProvider'
import { logEvent } from '../../utils/analytics'
import * as api from '../../utils/api_helper'
import { getAccountCalendarUrl } from '../../utils/calendar_manager'
import { getAccountDisplayName } from '../../utils/user_manager'
import AvailabilityConfig from '../availabilities/availability-config'
import IPFSLink from '../IPFSLink'
import Loading from '../Loading'
import NotificationsConfig from '../notifications/NotificationConfig'
import AccountDetails from './AccountDetails'
import ConnectCalendar from './ConnectCalendar'
import Meetings from './Meetings'
import MeetingTypesConfig from './MeetingTypesConfig'

export enum EditMode {
  MEETINGS = 'meetings',
  AVAILABILITY = 'availability',
  DETAILS = 'details',
  TYPES = 'types',
  CALENDARS = 'calendars',
  NOTIFICATIONS = 'notifications',
  SIGNOUT = 'signout',
}

interface LinkItemProps {
  name: string
  icon: IconType
  mode: EditMode
  locked?: boolean
}
const LinkItems: Array<LinkItemProps> = [
  { name: 'My meetings', icon: FaCalendarDay, mode: EditMode.MEETINGS },
  { name: 'Account Details', icon: FaInfoCircle, mode: EditMode.DETAILS },
  { name: 'Availabilities', icon: FaCalendarAlt, mode: EditMode.AVAILABILITY },
  { name: 'Meeting types', icon: FaCalendarWeek, mode: EditMode.TYPES },
  {
    name: 'Notifications Settings',
    icon: FaBell,
    mode: EditMode.NOTIFICATIONS,
  },
  {
    name: 'Connected calendars',
    icon: FaCalendarPlus,
    mode: EditMode.CALENDARS,
  },
  {
    name: 'Sign Out',
    icon: FaSignOutAlt,
    mode: EditMode.SIGNOUT,
  },
]

interface NavItemProps extends FlexProps {
  selected: boolean
  icon: IconType
  text: string
  mode: EditMode
  locked: boolean
  changeMode: (mode: EditMode) => void
}
const NavItem = ({
  selected,
  icon,
  text,
  mode,
  changeMode,
  locked,
  ...rest
}: NavItemProps) => {
  const backgroundColor = useColorModeValue('gray.300', 'gray.600')
  const hoverBg = useColorModeValue('gray.100', 'gray.500')
  const hoverColor = useColorModeValue('gray.600', 'gray.200')
  const iconColor = useColorModeValue('gray.600', 'gray.200')
  const lockedColor = useColorModeValue('gray.400', 'gray.100')
  return (
    <Box
      width="100%"
      style={{ textDecoration: 'none' }}
      onClick={() => {
        !locked && changeMode(mode)
      }}
    >
      <Flex
        align="center"
        width="100%"
        p="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        backgroundColor={selected ? backgroundColor : 'transparent'}
        _hover={{
          bg: hoverBg,
          color: hoverColor,
        }}
        {...rest}
      >
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            color={locked ? lockedColor : iconColor}
            _groupHover={{
              color: locked ? lockedColor : iconColor,
            }}
            as={icon}
          />
        )}
        <Text flex={1}>{text}</Text>
        {locked && (
          <Icon
            mr="4"
            fontSize="16"
            color={lockedColor}
            _groupHover={{
              color: lockedColor,
            }}
            as={FaLock}
          />
        )}
      </Flex>
    </Box>
  )
}

const DashboardContent: React.FC<{ currentSection?: EditMode }> = ({
  currentSection,
}) => {
  const { currentAccount, logout } = useContext(AccountContext)
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

  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false)
  const accountUrl = getAccountCalendarUrl(currentAccount!, false)
  // For showing embedded calendar version: const embedCode = getEmbedCode(currentAccount!, false)

  const menuClicked = async (mode: EditMode) => {
    logEvent('Selected menu item on dashboard', { mode })
    if (mode === EditMode.SIGNOUT) {
      await api.logout().then(() => logout())
      router.push(`/`)
    } else {
      router.push(`/dashboard/${mode}`, undefined, { shallow: true })
    }
  }

  const copyUrl = async () => {
    logEvent('Copied calendar URL')
    if ('clipboard' in navigator) {
      await navigator.clipboard.writeText(accountUrl)
    } else {
      document.execCommand('copy', true, accountUrl)
    }
    setCopyFeedbackOpen(true)
    setTimeout(() => {
      setCopyFeedbackOpen(false)
    }, 2000)
  }

  const renderSelected = () => {
    switch (currentSection) {
      case EditMode.MEETINGS:
        return <Meetings />
      case EditMode.AVAILABILITY:
        return <AvailabilityConfig />
      case EditMode.DETAILS:
        return <AccountDetails />
      case EditMode.TYPES:
        return <MeetingTypesConfig />
      case EditMode.CALENDARS:
        return <ConnectCalendar />
      case EditMode.NOTIFICATIONS:
        return <NotificationsConfig />
    }
  }

  const buttonColor = useColorModeValue('gray.600', 'gray.200')

  return currentAccount ? (
    <HStack alignItems="start" width="100%" flexWrap="wrap">
      <VStack
        alignItems="start"
        minW="390px"
        px={8}
        borderRight="1px solid"
        borderColor="gray.200"
      >
        <Box width="100%" mb="4" textAlign="center">
          <Box width="80px" height="80px" mb={4} mx="auto">
            <Jazzicon address={currentAccount.address} />
          </Box>

          <Box>{getAccountDisplayName(currentAccount)}</Box>

          <Box>
            <Text fontSize="sm" mt={8} textAlign="start">
              Your calendar link
            </Text>
            <InputGroup size="md">
              <Input pr="4.5rem" type={'text'} disabled value={accountUrl} />
              <InputRightElement width="4.5rem">
                <Tooltip
                  label="Copied"
                  placement="top"
                  isOpen={copyFeedbackOpen}
                >
                  <Button
                    h="1.75rem"
                    color={buttonColor}
                    size="sm"
                    onClick={copyUrl}
                  >
                    Copy
                  </Button>
                </Tooltip>
              </InputRightElement>
            </InputGroup>
          </Box>

          <IPFSLink
            ipfsHash={currentAccount.preferences_path}
            title="You account configuration hash on IPFS"
          />
        </Box>

        <Box py={2} width="100%">
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
        </Box>
      </VStack>
      <Box flex={1} px={8}>
        {renderSelected()}
      </Box>
    </HStack>
  ) : (
    <Flex
      width="100%"
      height="100%"
      alignItems="center"
      justifyContent="center"
    >
      <Loading />
    </Flex>
  )
}

export default DashboardContent
