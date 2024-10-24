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
import { FaWallet } from 'react-icons/fa'
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
  const bgColor = useColorModeValue('transparent', 'neutral.900')
  const borderColor = useColorModeValue('neutral.300', 'neutral.800')
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
      width={{ md: '60%', base: isOpen ? '100%' : '90%' }}
      mx="auto"
      insetX={0}
      top={{
        base: isOpen ? 0 : 5,
        md: 4,
      }}
      rounded={15}
      zIndex={999}
      alignSelf={'center'}
      backdropFilter={`blur(${backdropFilterValue}px)`}
      bg={bgColor}
      borderWidth={1}
      borderColor={borderColor}
      justifyContent={'space-between'}
    >
      <Flex
        color={useColorModeValue('black', 'white')}
        minH={'60px'}
        py="2"
        px="4"
        align={'center'}
      >
        <Container maxW={'8xl'}>
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
                  width={{ md: '100px', base: '75px' }}
                  p={2}
                  src="/assets/logo.svg"
                  alt="Meet with Wallet"
                />
              </Flex>
            </Flex>
            <Flex flex={{ base: 1 }} justifyContent={'space-between'}>
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
              <Flex
                display={{ base: 'none', lg: 'flex' }}
                ml={10}
                flexBasis={'75%'}
              >
                <DesktopNav
                  pathname={pathname}
                  handleSetActiveLink={handleSetActiveLink}
                  activeLink={activeLink}
                />
              </Flex>
            </Flex>
            <Stack
              flex={{ base: 1, lg: 0 }}
              justify={'flex-end'}
              direction={'row'}
              spacing={4}
            >
              {!shouldEnforceColorOnPath(pathname) && <ThemeSwitcher />}
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
                  colorScheme="orangeButton"
                  color={'white'}
                  leftIcon={<FaWallet color="white" />}
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
                bg="neutral.100"
              >
                <Icon
                  as={BiMenuAltRight}
                  width={6}
                  height={6}
                  color="neutral.800"
                />
              </Button>
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
          activeLink={activeLink}
        />
      </Collapse>
      <ConnectWalletDialog isOpen={loginIn} />
    </Box>
  )
}

interface DesktopNavProps {
  pathname: string
  activeLink: string
  handleSetActiveLink: (id: string) => void
}

const DesktopNav = ({
  pathname,
  handleSetActiveLink,
  activeLink,
}: DesktopNavProps) => {
  const { logged } = useContext(AccountContext)
  const linkHoverColor = 'primary.500'
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
              p={2}
              fontWeight={activeLink === navItem.href ? 700 : 500}
              onClick={() => handleSetActiveLink(navItem.href)}
              color={
                shouldEnforceColorOnPath(pathname)
                  ? activeLink === navItem.href
                    ? linkHoverColor
                    : 'neutral.0'
                  : pathname.includes(navItem.href)
                  ? linkHoverColor
                  : linkColor
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
  activeLink: string
}

const MobileNav = ({
  onToggle,
  onOpenModal,
  handleSetActiveLink,
  isOpen,
  pathname,
  activeLink,
}: MobileNavProps) => {
  const { currentAccount, logged, loginIn } = useLogin()
  const { logout } = useContext(AccountContext)
  const wallet = useActiveWallet()

  const doLogout = async () => {
    logout(wallet!)
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
      left={0}
      right={0}
      height="100vh"
      bg={useColorModeValue('white', 'gray.800')}
      p={6}
      borderBottom={1}
      borderStyle={'solid'}
      borderColor={useColorModeValue('gray.200', 'gray.900')}
    >
      <Flex alignItems="center" justify="space-between" mb={2} width="100%">
        <Flex alignItems="center" cursor="pointer">
          <Image
            width="100px"
            p={2}
            src="/assets/logo.svg"
            alt="Meet with Wallet"
          />
        </Flex>

        <Button
          width={10}
          height={10}
          bg="transparent"
          role="group"
          _hover={{ bgColor: 'transparent' }}
        >
          <Icon
            onClick={onToggle}
            as={CloseIcon}
            width={6}
            height={6}
            color="neutral.100"
            _groupHover={{
              color: 'neutral.100',
            }}
          />
        </Button>
      </Flex>
      <Stack width="100%" spacing={4}>
        {NAV_ITEMS.filter(item => !item.logged || (logged && item.logged)).map(
          navItem => (
            <MobileNavItem
              onToggle={onToggle}
              key={navItem.label}
              handleSetActiveLink={handleSetActiveLink}
              pathname={pathname}
              activeLink={activeLink}
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
            {!shouldEnforceColorOnPath(pathname) && <ThemeSwitcher />}
          </Flex>
        ) : (
          <Button
            colorScheme="orangeButton"
            size="md"
            onClick={() => onOpenModal()}
            isLoading={loginIn}
            color={'white'}
            leftIcon={<FaWallet color="white" />}
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

const MobileNavItem = ({
  label,
  href,
  onToggle,
  handleSetActiveLink,
  pathname,
  activeLink,
}: NavItem & {
  pathname: string
  handleSetActiveLink: (id: string) => void
  activeLink: string
}) => {
  const linkHoverColor = 'primary.500'

  return (
    <Stack spacing={4}>
      <Flex
        bg="neutral.100"
        py={3}
        as={Link}
        href={href ?? '#'}
        justify={'center'}
        rounded={8}
        align={'center'}
        _hover={{
          textDecoration: 'none',
        }}
        onClick={() => {
          handleSetActiveLink(href)
          onToggle?.()
        }}
        color={
          (shouldEnforceColorOnPath(pathname) && activeLink === href) ||
          (!shouldEnforceColorOnPath(pathname) && pathname.includes(href))
            ? linkHoverColor
            : 'neutral.800'
        }
      >
        <Text fontWeight={700}>{label}</Text>
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
