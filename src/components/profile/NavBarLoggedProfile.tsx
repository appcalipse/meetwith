import { BellIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'

import { ellipsizeAddress } from '@/utils/user_manager'

import { Account } from '../../types/Account'
import { EditMode } from '../../types/Dashboard'
import { logEvent } from '../../utils/analytics'
import { Avatar } from './components/Avatar'
import { NavMenu } from './components/NavMenu'

interface NavBarLoggedProfileProps {
  account: Account
  currentSection?: EditMode
  handleSetActiveLink: (id: string) => void
  isOpen?: boolean
}
const NavBarLoggedProfile: React.FC<NavBarLoggedProfileProps> = props => {
  const accountName = ellipsizeAddress(props.account.address)
  const [navOpen, setNavOpen] = useState(false)
  const router = useRouter()
  const { section } = router.query

  const goToDashboard = () => {
    logEvent('Clicked menu account container')
    router.push('/dashboard')
    props.handleSetActiveLink('/dashboard')
  }
  const openMenu = () => {
    setNavOpen(true)
  }

  const variantAction = useBreakpointValue({
    base: openMenu,
    lg: goToDashboard,
  })

  const closeMenu = () => {
    setNavOpen(false)
  }

  return (
    <Flex>
      {!props.isOpen && (
        <Button mr={4} display="none">
          <Icon as={BellIcon} width={6} height={6} />
        </Button>
      )}

      <Flex
        borderRadius={6}
        px={4}
        py={2}
        justifyContent="center"
        alignItems="center"
        onClick={variantAction}
        cursor="pointer"
        color="neutral.800"
        _hover={{
          bg: 'neutral.100',
          boxShadow: 'lg',
        }}
        transition="all 0.3s"
        backgroundColor={'neutral.50'}
      >
        <Box width="24px" height="24px" mr={{ base: 0, lg: 2 }}>
          {props.account.preferences?.avatar ? (
            <Image
              src={props.account.preferences.avatar}
              alt="Account avatar"
              width="24px"
              height="24px"
              borderRadius="50%"
              objectFit="cover"
            />
          ) : (
            <Avatar account={props.account} />
          )}
        </Box>
        {props.isOpen && (
          <Text fontSize={'sm'} ml={2} data-testid="account-name">
            {accountName}
          </Text>
        )}
        <Text
          fontSize={'sm'}
          display={{ base: 'none', lg: 'inline-block' }}
          data-testid="account-name"
        >
          {accountName}
        </Text>
      </Flex>

      {navOpen && (
        <NavMenu
          currentSection={section as EditMode}
          isMenuOpen={navOpen}
          closeMenu={closeMenu}
        />
      )}
    </Flex>
  )
}

export default NavBarLoggedProfile
