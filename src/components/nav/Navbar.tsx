import { CloseIcon } from '@chakra-ui/icons'
import { Link } from '@chakra-ui/next-js'
import {
  Box,
  Button,
  Collapse,
  Container,
  Flex,
  HStack,
  Icon,
  Image,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import router, { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { BiMenuAltRight, BiWallet } from 'react-icons/bi'
import { useActiveWallet } from 'thirdweb/react'

import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { EditMode, Intents } from '@/types/Dashboard'
import { shouldEnforceColorOnPath } from '@/utils/generic_utils'

import { AccountContext } from '../../providers/AccountProvider'
import { useLogin } from '../../session/login'
import ConnectWalletDialog from '../ConnectWalletDialog'
import NavBarLoggedProfile from '../profile/NavBarLoggedProfile'
import { ThemeSwitcher } from '../ThemeSwitcher'

export const Navbar = () => {
  const { openConnection } = useContext(OnboardingModalContext)
  const { isOpen, onToggle } = useDisclosure()

  const { pathname, asPath, query } = useRouter()

  const { currentAccount, logged, loginIn } = useLogin()

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
    changeNavbarBackground()
  }, [])
  const params = new URLSearchParams(query as Record<string, string>)

  const queryString = params.toString()
  const handleConnectionOpen = () => {
    openConnection(
      REDIRECT_PATHS[pathname]?.(queryString),
      pathname !== '/[...address]'
    )
  }

  return (
    <Box
      id="navbar-container"
      as="header"
      display={pathname.split('/')[1] === 'embed' ? 'none' : 'block'}
      position="fixed"
      width="100%"
      top="0"
      zIndex={999}
      backdropFilter={`blur(${backdropFilterValue}px)`}
      bg={'transparent'}
    >
      <Flex
        color={useColorModeValue('black', 'white')}
        minH={'60px'}
        py="2"
        px="4"
        align={'center'}
      >
        <Container maxW={'7xl'}>
          <Flex alignItems="center">
            <Flex ml={{ base: -2 }} display={{ base: 'flex', lg: 'none' }}>
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
              <Link
                href={'/'}
                display={{ base: 'none', lg: 'flex' }}
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
              <Flex display={{ base: 'none', lg: 'flex' }} ml={10}>
                <DesktopNav
                  pathname={pathname}
                  handleSetActiveLink={handleSetActiveLink}
                />
              </Flex>
            </Flex>

            <Stack
              flex={{ base: 1, lg: 0 }}
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
                <Button
                  size="md"
                  onClick={handleConnectionOpen}
                  isLoading={loginIn}
                  colorScheme="primary"
                  leftIcon={<BiWallet />}
                >
                  Sign in
                  <Box display={{ base: 'none', md: 'flex' }} as="span">
                    &#160;
                  </Box>
                </Button>
              )}
              <Button
                onClick={onToggle}
                width={10}
                height={10}
                display={{ base: 'flex', lg: 'none' }}
                zIndex="0"
              >
                <Icon as={BiMenuAltRight} width={6} height={6} />
              </Button>
              {!shouldEnforceColorOnPath(pathname) && <ThemeSwitcher />}
            </Stack>
          </Flex>
        </Container>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <MobileNav
          onOpenModal={handleConnectionOpen}
          onToggle={onToggle}
          handleSetActiveLink={handleSetActiveLink}
          isOpen={isOpen}
          pathname={pathname}
        />
      </Collapse>
      <ConnectWalletDialog isOpen={loginIn} />
    </Box>
  )
}

interface DesktopNavProps {
  pathname: string
  handleSetActiveLink: (id: string) => void
}

const DesktopNav = ({ pathname, handleSetActiveLink }: DesktopNavProps) => {
  const { logged } = useContext(AccountContext)
  const linkHoverColor = 'primary.400'
  const linkColor = useColorModeValue('neutral.800', 'neutral.0')

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
            <Link
              href={navItem.href ?? '#'}
              onClick={() => handleSetActiveLink(navItem.href)}
              p={2}
              fontSize={'sm'}
              fontWeight={500}
              color={
                shouldEnforceColorOnPath(pathname) ? 'neutral.0' : linkColor
              }
              _hover={{
                textDecoration: 'none',
                color: linkHoverColor,
              }}
            >
              {navItem.label}
            </Link>
          </Box>
        )
      )}
    </Stack>
  )
}

interface MobileNavProps {
  onToggle: () => void
  onOpenModal: () => void
  handleSetActiveLink: (id: string) => void
  isOpen: boolean
  pathname: string
}

const MobileNav = ({
  onToggle,
  onOpenModal,
  handleSetActiveLink,
  isOpen,
  pathname,
}: MobileNavProps) => {
  const { currentAccount, logged, loginIn } = useLogin()
  const { logout } = useContext(AccountContext)
  const wallet = useActiveWallet()

  const doLogout = async () => {
    await logout(wallet!)
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
              Sign out
            </Button>
            {!shouldEnforceColorOnPath(pathname) && <ThemeSwitcher />}
          </Flex>
        ) : (
          <Button
            colorScheme="primary"
            size="md"
            onClick={() => onOpenModal()}
            isLoading={loginIn}
            leftIcon={<BiWallet />}
          >
            Sign in
            <Box display={{ base: 'none', md: 'flex' }} as="span">
              &#160;
            </Box>
          </Button>
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
    href: '/#plans',
  },
  {
    label: 'Discord bot',
    href: '/features/discord',
  },
  {
    label: 'FAQ',
    href: '/#faq',
  },
]
const REDIRECT_PATHS: Record<string, (query: string) => string> = {
  '/invite-accept': (query: string) =>
    `/dashboard/${EditMode.GROUPS}?${query}&intent=${Intents.JOIN}`,
}
