import {
  Box,
  chakra,
  Container,
  Heading,
  Image,
  Link,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  VisuallyHidden,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'
import { FaDiscord, FaEnvelope, FaTwitter } from 'react-icons/fa'

const Logo = () => {
  return (
    <NextLink href={'/'} passHref>
      <Link>
        <Image boxSize="100px" src="/assets/logo.svg" alt="Meet with Wallet" />
      </Link>
    </NextLink>
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

  return (
    <Box
      bg={useColorModeValue('#F8F8FA', 'gray.900')}
      color={useColorModeValue('gray.700', 'gray.200')}
      display={router.pathname.split('/')[1] === 'embed' ? 'none' : 'block'}
    >
      <Container
        as={Stack}
        maxW={'6xl'}
        py={4}
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
              <NextLink href="/#pricing" passHref>
                <Link>Pricing</Link>
              </NextLink>
            </Text>
            <Text textAlign="justify">
              <Link
                href="https://app.dework.xyz/meet-with-wallet/mww-roadmap/board"
                target="_blank"
              >
                Roadmap
              </Link>
            </Text>
            <Text textAlign="justify">
              <NextLink href="/#faq" passHref>
                <Link>FAQ</Link>
              </NextLink>
            </Text>
          </Box>
          <Box>
            <Heading size={'sm'} pb={4}>
              Community
            </Heading>
            <Text textAlign="justify">
              <Link href="https://discord.gg/an2q4xUkcR" target="_blank">
                Discord
              </Link>
            </Text>
            <Text textAlign="justify">
              <Link href="mailto:support@meetwithwallet.xyz">Need Help</Link>
            </Text>
            <Text textAlign="justify">
              <Link
                href="https://app.dework.xyz/meet-with-wallet/mww-roadmap/community"
                target="_blank"
              >
                Feature Requests
              </Link>
            </Text>
          </Box>
          <Box>
            <Heading size={'sm'} pb={4}>
              Legal
            </Heading>
            <Text textAlign="justify">
              <NextLink href={'/legal/terms'} passHref>
                <Link>Terms of Service</Link>
              </NextLink>
            </Text>
            <Text textAlign="justify">
              <NextLink href={'/legal/privacy'} passHref>
                <Link>Privacy Policy</Link>
              </NextLink>
            </Text>
            <Text textAlign="justify">
              <NextLink href={'/legal/dpa'} passHref>
                <Link>Data Protection</Link>
              </NextLink>
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
            href={'mailto:it_people@meetwithwallet.xyz'}
          >
            <FaEnvelope />
          </SocialButton>
          <SocialButton
            label={'Twitter'}
            href={'https://twitter.com/meetwithwallet'}
          >
            <FaTwitter />
          </SocialButton>
          <SocialButton
            label={'Discord'}
            href={'https://discord.gg/an2q4xUkcR'}
          >
            <FaDiscord />
          </SocialButton>
        </Stack>
      </Container>
    </Box>
  )
}
