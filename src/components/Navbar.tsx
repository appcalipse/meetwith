import { ChevronRightIcon, CloseIcon, HamburgerIcon } from '@chakra-ui/icons'
import {
  Badge,
  Box,
  Collapse,
  Container,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Link,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import React, { useContext } from 'react'

import { AccountContext } from '../providers/AccountProvider'
import { useLogin } from '../session/login'
import ConnectWalletDialog from './ConnectWalletDialog'
import MWWButton from './MWWButton'
import NavBarLoggedProfile from './profile/NavBarLoggedProfile'
import { ThemeSwitcher } from './ThemeSwitcher'

export const Navbar = () => {
  const router = useRouter()

  const { isOpen, onToggle } = useDisclosure()

  const { handleLogin, currentAccount, logged, loginIn } = useLogin()

  const bgGradient = `linear-gradient(${useColorModeValue(
    'white',
    '#1A202C'
  )} 30%, rgba(245, 247, 250, 0) 100%) repeat scroll 0% 0%`

  return (
    <Box
      id="navbar-container"
      as="header"
      display={router.pathname.split('/')[1] === 'embed' ? 'none' : 'block'}
      position="fixed"
      width="100%"
      top="0"
      zIndex={999}
      backdropFilter="blur(24px)"
      bg={bgGradient}
    >
      <Flex
        backdropFilter={'auto'}
        backdropBlur={'24px'}
        color={useColorModeValue('gray.600', 'white')}
        minH={'60px'}
        py="2"
        px="4"
        align={'center'}
      >
        <Container maxW={'7xl'}>
          <Flex alignItems="center">
            <Flex ml={{ base: -2 }} display={{ base: 'flex', md: 'none' }}>
              <IconButton
                onClick={onToggle}
                icon={
                  isOpen ? (
                    <CloseIcon w={3} h={3} />
                  ) : (
                    <HamburgerIcon w={5} h={5} />
                  )
                }
                variant={'ghost'}
                aria-label={'Toggle Navigation'}
              />
            </Flex>
            <Flex flex={{ base: 1 }}>
              <NextLink href={'/'} passHref>
                <Link display={{ base: 'none', md: 'flex' }}>
                  <HStack>
                    <Image
                      width="100px"
                      p={2}
                      src="/assets/logo.svg"
                      alt="Meet with Wallet"
                    />
                  </HStack>
                </Link>
              </NextLink>
              <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
                <DesktopNav />
              </Flex>
            </Flex>

            <Stack
              flex={{ base: 1, md: 0 }}
              justify={'flex-end'}
              direction={'row'}
              spacing={6}
            >
              <ThemeSwitcher />
              {logged ? (
                <NavBarLoggedProfile account={currentAccount!} />
              ) : (
                <MWWButton
                  size="lg"
                  onClick={() => handleLogin()}
                  isLoading={loginIn}
                >
                  Sign in
                  <Box display={{ base: 'none', md: 'flex' }} as="span">
                    &#160;with wallet
                  </Box>
                </MWWButton>
              )}
            </Stack>
          </Flex>
        </Container>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <MobileNav />
      </Collapse>
      <ConnectWalletDialog isOpen={loginIn} />
    </Box>
  )
}

const DesktopNav = () => {
  const { logged } = useContext(AccountContext)
  const linkColor = useColorModeValue('gray.600', 'gray.200')
  const linkHoverColor = useColorModeValue('gray.800', 'white')

  return (
    <Stack
      id="navbar-desktop"
      direction={'row'}
      spacing={4}
      alignItems="center"
    >
      {NAV_ITEMS.filter(item => !item.logged || (logged && item.logged)).map(
        navItem => (
          <Box key={navItem.label}>
            <NextLink href={navItem.href ?? '#'} passHref>
              <Link
                p={2}
                fontSize={'sm'}
                fontWeight={500}
                color={linkColor}
                _hover={{
                  textDecoration: 'none',
                  color: linkHoverColor,
                }}
              >
                {navItem.label}
              </Link>
            </NextLink>
          </Box>
        )
      )}
    </Stack>
  )
}

const DesktopSubNav = ({ label, href, subLabel }: NavItem) => {
  return (
    <NextLink href={href!} passHref>
      <Link
        role={'group'}
        display={'block'}
        p={2}
        rounded={'md'}
        _hover={{ bg: useColorModeValue('pink.50', 'gray.900') }}
      >
        <Stack direction={'row'} align={'center'}>
          <Box>
            <Text
              transition={'all .3s ease'}
              _groupHover={{ color: 'pink.400' }}
              fontWeight={500}
            >
              {label}
            </Text>
            <Text fontSize={'sm'}>{subLabel}</Text>
          </Box>
          <Flex
            transition={'all .3s ease'}
            transform={'translateX(-10px)'}
            opacity={0}
            _groupHover={{ opacity: '100%', transform: 'translateX(0)' }}
            justify={'flex-end'}
            align={'center'}
            flex={1}
          >
            <Icon color={'pink.400'} w={5} h={5} as={ChevronRightIcon} />
          </Flex>
        </Stack>
      </Link>
    </NextLink>
  )
}

const MobileNav = () => {
  const { logged } = useContext(AccountContext)

  return (
    <Stack
      id="navbar-mobile"
      bg={useColorModeValue('white', 'gray.800')}
      p={4}
      display={{ md: 'none' }}
      borderBottom={1}
      borderStyle={'solid'}
      borderColor={useColorModeValue('gray.200', 'gray.900')}
    >
      {NAV_ITEMS.filter(item => !item.logged || (logged && item.logged)).map(
        navItem => (
          <MobileNavItem key={navItem.label} {...navItem} />
        )
      )}
    </Stack>
  )
}

const MobileNavItem = ({ label, href }: NavItem) => {
  return (
    <Stack spacing={4}>
      <Flex
        py={2}
        as={Link}
        href={href ?? '#'}
        justify={'space-between'}
        align={'center'}
        _hover={{
          textDecoration: 'none',
        }}
      >
        <Text
          fontWeight={600}
          color={useColorModeValue('gray.600', 'gray.200')}
        >
          {label}
        </Text>
      </Flex>
    </Stack>
  )
}

type NavItem = {
  label: string
  href: string
  logged?: boolean
  subLabel?: string
}

const NAV_ITEMS: Array<NavItem> = [
  {
    label: 'Dashboard',
    logged: true,
    href: '/dashboard',
  },
  {
    label: 'Home',
    href: '/#home',
  },
  {
    label: 'Plans',
    href: '/#pricing',
  },
  {
    label: 'FAQ',
    href: '/#faq',
  },
]
