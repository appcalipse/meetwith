import React, { useContext } from 'react'
import { AccountContext } from '../providers/AccountProvider'
import {
  Box,
  Flex,
  Text,
  IconButton,
  Stack,
  Collapse,
  Icon,
  Image,
  Link,
  useColorModeValue,
  useDisclosure,
  Container,
  Badge,
  HStack,
} from '@chakra-ui/react'
import {
  HamburgerIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@chakra-ui/icons'
import NextLink from 'next/link'
import { ThemeSwitcher } from './ThemeSwitcher'
import NavBarLoggedProfile from './profile/NavBarLoggedProfile'
import MWWButton from './MWWButton'
import ConnectWalletDialog from './ConnectWalletDialog'
import { useLogin } from '../session/login'

export default function WithSubnavigation() {
  const { isOpen, onToggle } = useDisclosure()

  const { handleLogin, currentAccount, logged, loginIn } = useLogin()

  return (
    <Box as="header" position="fixed" width="100%" top="0" zIndex={999}>
      <Flex
        bg={useColorModeValue('white', 'gray.800')}
        color={useColorModeValue('gray.600', 'white')}
        minH={'60px'}
        py="2"
        px="4"
        borderBottom={1}
        borderStyle={'solid'}
        borderColor={useColorModeValue('gray.200', 'gray.900')}
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
                    <Badge colorScheme="orange">Alpha</Badge>
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
    <Stack direction={'row'} spacing={4} alignItems="center">
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

const MobileNavItem = ({ label, children, href }: NavItem) => {
  const { isOpen, onToggle } = useDisclosure()

  return (
    <Stack spacing={4} onClick={children && onToggle}>
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
        {children && (
          <Icon
            as={ChevronDownIcon}
            transition={'all .25s ease-in-out'}
            transform={isOpen ? 'rotate(180deg)' : ''}
            w={6}
            h={6}
          />
        )}
      </Flex>

      <Collapse in={isOpen} animateOpacity style={{ marginTop: '0!important' }}>
        <Stack
          mt={2}
          pl={4}
          borderLeft={1}
          borderStyle={'solid'}
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          align={'start'}
        >
          {children &&
            children.map(child => (
              <NextLink key={child.label} href={child.href!} passHref>
                <Link py={2}>{child.label}</Link>
              </NextLink>
            ))}
        </Stack>
      </Collapse>
    </Stack>
  )
}

interface NavItem {
  label: string
  subLabel?: string
  href?: string
  logged?: boolean
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
