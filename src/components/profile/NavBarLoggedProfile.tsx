import { useColorModeValue } from '@chakra-ui/color-mode'
import { Box, Flex, Image, Text, useBreakpointValue } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { useRouter } from 'next/router'
import { useState } from 'react'

import { Account } from '../../types/Account'
import { EditMode } from '../../types/Dashboard'
import { logEvent } from '../../utils/analytics'
import { getAccountDisplayName } from '../../utils/user_manager'
import { NavMenu } from './components/NavMenu'

interface NavBarLoggedProfileProps {
  account: Account
  currentSection?: EditMode
}
const NavBarLoggedProfile: React.FC<NavBarLoggedProfileProps> = props => {
  const accountName = getAccountDisplayName(props.account, true)
  const [navOpen, setNavOpen] = useState(false)
  const router = useRouter()
  const { section } = router.query

  const goToDashboard = () => {
    logEvent('Clicked menu account container')
    router.push('/dashboard')
  }
  const openMenu = () => {
    setNavOpen(true)
  }

  const variantAction = useBreakpointValue({
    base: openMenu,
    md: goToDashboard,
  })

  const closeMenu = () => {
    setNavOpen(false)
  }

  return (
    <Flex>
      <Flex
        borderRadius={6}
        px={4}
        py={2}
        justifyContent="center"
        alignItems="center"
        onClick={variantAction}
        cursor="pointer"
        _hover={{
          bg: useColorModeValue('gray.100', 'gray.500'),
          boxShadow: 'lg',
        }}
        transition="all 0.3s"
        backgroundColor={useColorModeValue('white', 'gray.600')}
      >
        <Text
          mr={2}
          fontSize={'sm'}
          display={{ base: 'none', md: 'inline-block' }}
        >
          {accountName}
        </Text>
        <Box width="24px" height="24px">
          {props.account.avatar ? (
            <Image
              src={props.account.avatar}
              alt="Account avatar"
              width="24px"
              height="24px"
              borderRadius="50%"
              objectFit="cover"
            />
          ) : (
            <Jazzicon address={props.account.address} />
          )}
        </Box>
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
