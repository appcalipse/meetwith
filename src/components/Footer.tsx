import { Link } from '@chakra-ui/next-js'
import {
  Box,
  chakra,
  Container,
  Heading,
  Image,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  VisuallyHidden,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'
import { FaDiscord, FaEnvelope, FaTwitter } from 'react-icons/fa'

import { shouldEnforceColorOnPath } from '@/utils/generic_utils'

import { MWW_DISCORD_SERVER } from '../utils/constants'

const Logo = () => {
  return (
    <Link href={'/'}>
      <Image boxSize="100px" src="/assets/logo.svg" alt="Meet with Wallet" />
    </Link>
  )
}

const SocialButton = ({
  children,
  label,
  href,
}: {
  children: ReactNode
  label: string
  href: string
}) => {
  return (
    <chakra.button
      bg={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
      rounded={'full'}
      w={8}
      h={8}
      cursor={'pointer'}
      as={'a'}
      href={href}
      target="_blank"
      display={'inline-flex'}
      alignItems={'center'}
      justifyContent={'center'}
      transition={'background 0.3s ease'}
      _hover={{
        bg: useColorModeValue('blackAlpha.200', 'whiteAlpha.200'),
      }}
    >
      <VisuallyHidden>{label}</VisuallyHidden>
      {children}
    </chakra.button>
  )
}

export default function SmallWithLogoLeft() {
  const router = useRouter()
  const footerBg = useColorModeValue('#F8F8FA', 'gray.900')
  const footerColor = useColorModeValue('gray.700', 'gray.200')

  return (
    <Box
      bg={shouldEnforceColorOnPath(router.pathname) ? 'gray.900' : footerBg}
      color={
        shouldEnforceColorOnPath(router.pathname) ? 'gray.200' : footerColor
      }
      display={router.pathname.split('/')[1] === 'embed' ? 'none' : 'block'}
      pb={{ base: '8', md: '0' }}
    >
      <Container
        as={Stack}
        maxW={'6xl'}
        py={12}
        direction={{ base: 'column', md: 'row' }}
        spacing={4}
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
      >
        <SimpleGrid columns={[2, 3, 3]} spacing={10} width="100%">
          <Box>
            <Heading size={'sm'} pb={4}>
              Product
            </Heading>
            <Text textAlign="justify">
              <Link href="/#pricing">Pricing</Link>
            </Text>
            <Text textAlign="justify">
              <Link href="mailto:contact@meetwithwallet.xyz" isExternal>
                Roadmap
              </Link>
            </Text>
            <Text textAlign="justify">
              <Link href="/#faq">FAQ</Link>
            </Text>
          </Box>
          <Box>
            <Heading size={'sm'} pb={4}>
              Community
            </Heading>
            <Text textAlign="justify">
              <Link href={MWW_DISCORD_SERVER} target="_blank">
                Discord
              </Link>
            </Text>
            <Text textAlign="justify">
              <Link href="mailto:support@meetwithwallet.xyz">Need Help</Link>
            </Text>
            <Text textAlign="justify">
              <Link href="mailto:contact@meetwithwallet.xyz" isExternal>
                Feature Requests
              </Link>
            </Text>
          </Box>
          <Box>
            <Heading size={'sm'} pb={4}>
              Legal
            </Heading>
            <Text textAlign="justify">
              <Link href={'/legal/terms'}>Terms of Service</Link>
            </Text>
            <Text textAlign="justify">
              <Link href={'/legal/privacy'}>Privacy Policy</Link>
            </Text>
            <Text textAlign="justify">
              <Link href={'/legal/dpa'}>Data Protection</Link>
            </Text>
          </Box>
        </SimpleGrid>
      </Container>
      <Container
        as={Stack}
        maxW={'6xl'}
        direction={{ base: 'column', md: 'row' }}
        spacing={4}
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
      >
        <Logo />
        <Text textAlign="center">
          Meet with Wallet. Some rights reserved, maybe...
        </Text>
        <Stack direction={'row'} spacing={6}>
          <SocialButton
            label={'Eamil'}
            href={'mailto:contact@meetwithwallet.xyz'}
          >
            <FaEnvelope />
          </SocialButton>
          <SocialButton
            label={'Twitter'}
            href={'https://twitter.com/meetwithwallet'}
          >
            <FaTwitter />
          </SocialButton>
          <SocialButton label={'Discord'} href={MWW_DISCORD_SERVER}>
            <FaDiscord />
          </SocialButton>
        </Stack>
      </Container>
    </Box>
  )
}
