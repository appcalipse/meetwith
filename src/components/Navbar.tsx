import { ChevronRightIcon, CloseIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Collapse,
  Container,
  Flex,
  HStack,
  Icon,
  Image,
  Link,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import router, { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import { BiMenuAltRight } from 'react-icons/bi'

import { AccountContext } from '../providers/AccountProvider'
import { useLogin } from '../session/login'
import ConnectWalletDialog from './ConnectWalletDialog'
import MWWButton from './MWWButton'
import NavBarLoggedProfile from './profile/NavBarLoggedProfile'

export const Navbar = () => {
  const router = useRouter()
  const { asPath } = useRouter()

  const { isOpen, onToggle } = useDisclosure()

  const { handleLogin, currentAccount, logged, loginIn } = useLogin()

  const [backdropFilterValue, setBackdropFilterValue] = useState<string>('0')
  const [activeLink, setActiveLink] = useState('')

  function handleSetActiveLink(id: string) {
    if (id === '/') {
      setActiveLink('/#home')
    } else {
      setActiveLink(id)
    }
  }

  useEffect(() => {
    if (asPath === '/') {
      setActiveLink('/#home')
    } else {
      setActiveLink(asPath)
    }

    const changeNavbarBackground = () => {
      if (window.scrollY >= 10) {
        setBackdropFilterValue('24')
      } else if (window.scrollY >= 0) {
        setBackdropFilterValue('0')
      }
    }
    window.addEventListener('scroll', changeNavbarBackground)
  }, [])

  return (
    <Box
      id="navbar-container"
      as="header"
      display={router.pathname.split('/')[1] === 'embed' ? 'none' : 'block'}
      position="fixed"
      width="100%"
      top="0"
      zIndex={999}
      backdropFilter={`blur(${backdropFilterValue}px)`}
      bg={'transparent'}
    >
      <Flex
        color={useColorModeValue('gray.600', 'white')}
        minH={'60px'}
        py="2"
        px="4"
        align={'center'}
      >
        <Container maxW={'7xl'}>
          <Flex alignItems="center">
            <Flex ml={{ base: -2 }} display={{ base: 'flex', md: 'none' }}>
              <Flex
                alignItems="center"
                onClick={() => {
                  handleSetActiveLink('/')
                }}
                cursor="pointer"
              >
                <Image
                  width="100px"
                  p={2}
                  src="/assets/logo.svg"
                  alt="Meet with Wallet"
                />
              </Flex>
            </Flex>
            <Flex flex={{ base: 1 }}>
              <NextLink href={'/'} passHref>
                <Link
                  display={{ base: 'none', md: 'flex' }}
                  onClick={() => {
                    handleSetActiveLink('/')
                  }}
                >
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
                <DesktopNav
                  activeLink={activeLink}
                  handleSetActiveLink={handleSetActiveLink}
                />
              </Flex>
            </Flex>

            <Stack
              flex={{ base: 1, md: 0 }}
              justify={'flex-end'}
              direction={'row'}
              spacing={4}
            >
              {logged ? (
                <NavBarLoggedProfile
                  account={currentAccount!}
                  handleSetActiveLink={handleSetActiveLink}
                />
              ) : (
                <MWWButton
                  size="md"
                  onClick={() => handleLogin()}
                  isLoading={loginIn}
                >
                  Sign in
                  <Box display={{ base: 'none', md: 'flex' }} as="span">
                    &#160;
                  </Box>
                </MWWButton>
              )}
              <Button
                onClick={onToggle}
                width={10}
                height={10}
                display={{ base: 'flex', md: 'none' }}
              >
                <Icon as={BiMenuAltRight} width={6} height={6} />
              </Button>
            </Stack>
          </Flex>
        </Container>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <MobileNav
          onToggle={onToggle}
          handleSetActiveLink={handleSetActiveLink}
          isOpen={isOpen}
        />
      </Collapse>
      <ConnectWalletDialog isOpen={loginIn} />
    </Box>
  )
}

interface DesktopNavProps {
  activeLink: string
  handleSetActiveLink: (id: string) => void
}

const DesktopNav = ({ activeLink, handleSetActiveLink }: DesktopNavProps) => {
  const { logged } = useContext(AccountContext)
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
                onClick={() => handleSetActiveLink(navItem.href)}
                p={2}
                fontSize={'sm'}
                fontWeight={500}
                color={
                  activeLink.includes(navItem.href)
                    ? 'primary.500'
                    : 'neutral.0'
                }
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

interface MobileNavProps {
  onToggle: () => void
  handleSetActiveLink: (id: string) => void
  isOpen: boolean
}

const MobileNav = ({
  onToggle,
  handleSetActiveLink,
  isOpen,
}: MobileNavProps) => {
  const { handleLogin, currentAccount, logged, loginIn } = useLogin()
  const { logout } = useContext(AccountContext)

  const doLogout = async () => {
    await logout()
    await router.push('/')
    onToggle()
  }

  return (
    <Stack
      spacing={8}
      id="navbar-mobile"
      pos="fixed"
      top="0"
      width="100%"
      height="100vh"
      bg={useColorModeValue('white', 'gray.800')}
      p={4}
      borderBottom={1}
      borderStyle={'solid'}
      borderColor={useColorModeValue('gray.200', 'gray.900')}
    >
      <Flex alignItems="center" justify="space-between" mb={8}>
        <Flex alignItems="center" cursor="pointer">
          <Image
            width="100px"
            p={2}
            src="/assets/logo.svg"
            alt="Meet with Wallet"
          />
        </Flex>

        <Button onClick={onToggle} width={10} height={10} bg="transparent">
          <Icon as={CloseIcon} width={3} height={3} />
        </Button>
      </Flex>
      <Stack>
        {NAV_ITEMS.filter(item => !item.logged || (logged && item.logged)).map(
          navItem => (
            <MobileNavItem
              onToggle={onToggle}
              key={navItem.label}
              {...navItem}
            />
          )
        )}
      </Stack>
      <Flex justify="center">
        {logged ? (
          <Flex direction="column" gridGap={8}>
            <NavBarLoggedProfile
              isOpen={isOpen}
              account={currentAccount!}
              handleSetActiveLink={handleSetActiveLink}
            />
            <Button onClick={doLogout} variant="link">
              Logout
            </Button>
          </Flex>
        ) : (
          <MWWButton
            size="md"
            onClick={() => handleLogin()}
            isLoading={loginIn}
          >
            Sign in
            <Box display={{ base: 'none', md: 'flex' }} as="span">
              &#160;
            </Box>
          </MWWButton>
        )}
      </Flex>
    </Stack>
  )
}

const MobileNavItem = ({ label, href, onToggle }: NavItem) => {
  return (
    <Stack spacing={4}>
      <Flex
        onClick={onToggle}
        bg="neutral.100"
        py={2}
        as={Link}
        href={href ?? '#'}
        justify={'center'}
        align={'center'}
        _hover={{
          textDecoration: 'none',
        }}
      >
        <Text fontWeight={600} color="neutral.800">
          {label}
        </Text>
      </Flex>
    </Stack>
  )
}

type NavItem = {
  label: string
  href: string
  onToggle?: () => void
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
    label: 'Features',
    href: '/#features',
  },
  {
    label: 'Plans',
    href: '/#pricing',
  },
  {
    label: 'FAQ',
    href: '/#faq',
  },
  {
    label: 'Contact',
    href: '/#contact',
  },
]
