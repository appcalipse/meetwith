import {
  Box,
  chakra,
  Container,
  Image,
  Link,
  Stack,
  Text,
  useColorModeValue,
  VisuallyHidden,
} from '@chakra-ui/react'
import NextLink from 'next/link'
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
  return (
    <Box
      bg={useColorModeValue('gray.50', 'gray.900')}
      color={useColorModeValue('gray.700', 'gray.200')}
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
