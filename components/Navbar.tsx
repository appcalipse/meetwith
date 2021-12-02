import React, { useContext } from 'react'
import { loginWithWallet } from '../utils/user_manager'
import { AccountContext } from '../providers/AccountProvider'
import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  Collapse,
  Icon,
  Image,
  Link,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import {
  HamburgerIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@chakra-ui/icons'
import NextLink from 'next/link'
import { Account } from '../types/Account'
import { ThemeSwitcher } from './ThemeSwitcher'
import { logEvent } from '../utils/analytics'

export default function WithSubnavigation() {
  const { isOpen, onToggle } = useDisclosure()

  const { currentAccount, logged, login } = useContext(AccountContext)

  const toast = useToast()

  const handleLogin = async () => {
    if (!currentAccount) {
      // const account = await loginWithWallet()
      // await login(account)
      logEvent('Clicked to connect wallet')
      toast({
        title: 'Comming Soon',
        description:
          'Soon you will be able to log in with your favourite web3 wallet. Meanwhile, join the waitlist.',
        status: 'warning',
        duration: 7000,
        position: 'top',
        isClosable: true,
      })
    }
  }

  const buttonColor = useColorModeValue('gray.500', 'gray.400')

  return (
    <Box as="header" position="fixed" width="100%" zIndex={999}>
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
        <Flex ml={{ base: -2 }} display={{ base: 'flex', md: 'none' }}>
          <IconButton
            onClick={onToggle}
            icon={
              isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />
            }
            variant={'ghost'}
            aria-label={'Toggle Navigation'}
          />
        </Flex>
        <Flex flex={{ base: 1 }}>
          <NextLink href={'/'} passHref>
            <Link>
              <Image
                width="100px"
                p={2}
                src="/assets/logo.svg"
                alt="Meet with Wallet"
              />
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
            <LoggedContainer user={currentAccount!} />
          ) : (
            <Button
              as={'a'}
              size="lg"
              href={'#'}
              onClick={handleLogin}
              color={buttonColor}
            >
              Log in
              <Box display={{ base: 'none', md: 'flex' }} as="span">
                &#160;with wallet
              </Box>
            </Button>
          )}
        </Stack>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <MobileNav />
      </Collapse>
    </Box>
  )
}

const LoggedContainer: React.FC<{
  user: Account
}> = ({ user }) => {
  return <div>{user.address}</div>
}

const DesktopNav = () => {
  const linkColor = useColorModeValue('gray.600', 'gray.200')
  const linkHoverColor = useColorModeValue('gray.800', 'white')
  const popoverContentBgColor = useColorModeValue('white', 'gray.800')

  return (
    <Stack direction={'row'} spacing={4} alignItems="center">
      {NAV_ITEMS.map(navItem => (
        <Box key={navItem.label}>
          <Popover trigger={'hover'} placement={'bottom-start'}>
            <PopoverTrigger>
              <Link
                p={2}
                href={navItem.href ?? '#'}
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
            </PopoverTrigger>

            {navItem.children && (
              <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                p={4}
                rounded={'xl'}
                minW={'sm'}
              >
                <Stack>
                  {navItem.children.map(child => (
                    <DesktopSubNav key={child.label} {...child} />
                  ))}
                </Stack>
              </PopoverContent>
            )}
          </Popover>
        </Box>
      ))}
    </Stack>
  )
}

const DesktopSubNav = ({ label, href, subLabel }: NavItem) => {
  return (
    <Link
      href={href}
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
  )
}

const MobileNav = () => {
  return (
    <Stack
      bg={useColorModeValue('white', 'gray.800')}
      p={4}
      display={{ md: 'none' }}
    >
      {NAV_ITEMS.map(navItem => (
        <MobileNavItem key={navItem.label} {...navItem} />
      ))}
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
              <Link key={child.label} py={2} href={child.href}>
                {child.label}
              </Link>
            ))}
        </Stack>
      </Collapse>
    </Stack>
  )
}

interface NavItem {
  label: string
  subLabel?: string
  children?: Array<NavItem>
  href?: string
}

const NAV_ITEMS: Array<NavItem> = [
  // {
  //     label: 'Pricing',
  //     children: [
  //         {
  //             label: 'Free',
  //             subLabel: 'Find your dream design job',
  //             href: '#',
  //         },
  //         {
  //             label: 'Freelance Projects',
  //             subLabel: 'An exclusive list for contract work',
  //             href: '#',
  //         },
  //     ],
  // },
  {
    label: 'Waitlist',
    href: '#subscribe',
  },
  {
    label: 'Plans',
    href: '#pricing',
  },
  {
    label: 'FAQ',
    href: '#faq',
  },
  // {
  //     label: 'Hire Designers',
  //     href: '#',
  // },
]
