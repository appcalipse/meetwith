import React from 'react'
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  FlexProps,
  Icon,
  Button,
  Tooltip,
  InputGroup,
  Input,
  InputRightElement,
  useColorModeValue,
} from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { getAccountDisplayName } from '../../utils/user_manager'
import { FaCalendarDay, FaCalendarWeek, FaInfo } from 'react-icons/fa'
import { useState, useContext } from 'react'
import AvailabilityConfig from '../availabilities/AvailabilityConfig'
import { IconType } from 'react-icons'
import Meetings from './Meetings'
import IPFSLink from '../IPFSLink'
import { AccountContext } from '../../providers/AccountProvider'
import AccountDetails from './AccountDetails'

enum EditMode {
  MEETINGS,
  AVAILABILITY,
  DETAILS,
}

interface LinkItemProps {
  name: string
  icon: IconType
  mode: EditMode
}
const LinkItems: Array<LinkItemProps> = [
  { name: 'My meetings', icon: FaCalendarDay, mode: EditMode.MEETINGS },
  { name: 'Account Details', icon: FaInfo, mode: EditMode.DETAILS },
  { name: 'Availabilities', icon: FaCalendarWeek, mode: EditMode.AVAILABILITY },
]

interface NavItemProps extends FlexProps {
  selected: boolean
  icon: IconType
  text: string
  mode: EditMode
  changeMode: (mode: EditMode) => void
}
const NavItem = ({
  selected,
  icon,
  text,
  mode,
  changeMode,
  ...rest
}: NavItemProps) => {
  const backgroundColor = useColorModeValue('gray.300', 'gray.600')
  const hoverBg = useColorModeValue('gray.100', 'gray.500')
  const hoverColor = useColorModeValue('gray.600', 'gray.200')
  const iconColor = useColorModeValue('gray.600', 'gray.200')
  return (
    <Box
      width="100%"
      style={{ textDecoration: 'none' }}
      onClick={() => {
        changeMode(mode)
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
            _groupHover={{
              color: iconColor,
            }}
            as={icon}
          />
        )}
        <Text>{text}</Text>
      </Flex>
    </Box>
  )
}

const ProfileEdit: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)

  const [currentEditMode, setCurrentEditMode] = useState(EditMode.MEETINGS)

  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false)

  const accountUrl = `https://meetwithwallet.xyz/${currentAccount.address}`

  const copyUrl = async () => {
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

          <IPFSLink ipfsHash={currentAccount.preferences_path} />
        </Box>

        <Box py={2} width="100%">
          {LinkItems.map(link => (
            <NavItem
              selected={currentEditMode === link.mode}
              key={link.name}
              text={link.name}
              icon={link.icon}
              mode={link.mode}
              changeMode={setCurrentEditMode}
            ></NavItem>
          ))}
        </Box>
      </VStack>
      <Box flex={1} px={8}>
        {renderSelected()}
      </Box>
    </HStack>
  ) : (
    <Box>Loading...</Box>
  )
}

export default ProfileEdit
