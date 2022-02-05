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
  VStack,
} from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import React, { useContext, useState } from 'react'
import { IconType } from 'react-icons'
import {
  FaBell,
  FaCalendarDay,
  FaCalendarPlus,
  FaCalendarWeek,
  FaInfo,
  FaLock,
} from 'react-icons/fa'

import { AccountContext } from '../../providers/AccountProvider'
import { logEvent } from '../../utils/analytics'
import {
  getAccountCalendarUrl,
  getEmbedCode,
} from '../../utils/calendar_manager'
import { getAccountDisplayName } from '../../utils/user_manager'
import AvailabilityConfig from '../availabilities/availability-config'
import IPFSLink from '../IPFSLink'
import Loading from '../Loading'
import NotificationsConfig from '../notifications/NotificationConfig'
import AccountDetails from './AccountDetails'
import Meetings from './Meetings'
import MeetingTypesConfig from './MeetingTypesConfig'

enum EditMode {
  MEETINGS,
  AVAILABILITY,
  DETAILS,
  TYPES,
  NOTIFICATIONS,
}

interface LinkItemProps {
  name: string
  icon: IconType
  mode: EditMode
  locked?: boolean
}
const LinkItems: Array<LinkItemProps> = [
  { name: 'My meetings', icon: FaCalendarDay, mode: EditMode.MEETINGS },
  { name: 'Account Details', icon: FaInfo, mode: EditMode.DETAILS },
  { name: 'Availabilities', icon: FaCalendarWeek, mode: EditMode.AVAILABILITY },
  { name: 'Meeting types', icon: FaCalendarPlus, mode: EditMode.TYPES },
  {
    name: 'Notifications',
    icon: FaBell,
    mode: EditMode.NOTIFICATIONS,
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

const DashboardContent: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)

  const [currentEditMode, setCurrentEditMode] = useState(EditMode.MEETINGS)

  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false)
  const accountUrl = getAccountCalendarUrl(currentAccount!, false)
  // For showing embedded calendar version: const embedCode = getEmbedCode(currentAccount!, false)

  const menuClicked = (mode: EditMode) => {
    setCurrentEditMode(mode)
    logEvent('Selected menu item on dashboard', { mode })
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
    switch (currentEditMode) {
      case EditMode.AVAILABILITY:
        return <AvailabilityConfig />
      case EditMode.DETAILS:
        return <AccountDetails />
      case EditMode.MEETINGS:
        return <Meetings />
      case EditMode.TYPES:
        return <MeetingTypesConfig />
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
              selected={currentEditMode === link.mode}
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
