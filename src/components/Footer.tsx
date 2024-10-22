import { Link } from '@chakra-ui/next-js'
import {
  Box,
  chakra,
  Container,
  Flex,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  VisuallyHidden,
  VStack,
} from '@chakra-ui/react'
import textAlign from '@tiptap/extension-text-align'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'
import { FaDiscord, FaEnvelope, FaTwitter } from 'react-icons/fa'
import { size } from 'viem'

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
      w={10}
      h={10}
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
  const footerBg = useColorModeValue('#F8F8FA', 'neutral.900')
  const footerColor = useColorModeValue('gray.700', 'neutral.0')

  return (
    <Box
      bg={shouldEnforceColorOnPath(router.pathname) ? 'neutral.900' : footerBg}
      color={
        shouldEnforceColorOnPath(router.pathname) ? 'neutral.0' : footerColor
      }
      display={router.pathname.split('/')[1] === 'embed' ? 'none' : 'block'}
      py={{ base: 16, md: 4 }}
      fontWeight={500}
    >
      <Flex
        direction={{
          md: 'row',
          base: 'column',
        }}
        w="100%"
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
        gap={8}
        px={{ md: 10, base: 6 }}
      >
        <HStack gap={5} display={{ md: 'flex', base: 'none' }}>
          <Logo />
          <Text textAlign="center">
            Meet with Wallet. Some rights reserved, maybe...
          </Text>
        </HStack>
        <HStack gap={3}>
          <Text
            textAlign="justify"
            px={4}
            fontSize={{
              base: 'small',
              md: 'medium',
            }}
          >
            <Link
              href="mailto:contact@meetwithwallet.xyz"
              isExternal
              color={'inherit'}
            >
              Plans
            </Link>
          </Text>
          <Text
            textAlign="justify"
            px={4}
            fontSize={{
              base: 'small',
              md: 'medium',
            }}
          >
            <Link href="/#faq" color={'inherit'}>
              FAQ
            </Link>
          </Text>
          <Text
            textAlign="justify"
            px={4}
            fontSize={{
              base: 'small',
              md: 'medium',
            }}
          >
            <Link
              href="mailto:contact@meetwithwallet.xyz"
              color={'inherit'}
              isExternal
            >
              Feature Requests
            </Link>
          </Text>
        </HStack>
        <Stack direction={'row'} spacing={6}>
          <SocialButton
            label={'Eamil'}
            href={'mailto:contact@meetwithwallet.xyz'}
          >
            <FaEnvelope size={22} />
          </SocialButton>
          <SocialButton
            label={'Twitter'}
            href={'https://twitter.com/meetwithwallet'}
          >
            <FaTwitter size={22} />
          </SocialButton>
          <SocialButton label={'Discord'} href={MWW_DISCORD_SERVER}>
            <FaDiscord size={22} />
          </SocialButton>
        </Stack>
        <VStack
          gap={5}
          display={{ base: 'flex', md: 'none' }}
          alignItems="center"
          justifyContent="center"
        >
          <Logo />
          <Text
            textAlign="center"
            fontSize={{
              base: 'small',
              md: 'medium',
            }}
          >
            Meet with Wallet. Some rights reserved, maybe...
          </Text>
        </VStack>
        <HStack gap={3}>
          <Text
            textAlign="justify"
            px={{ md: 4, base: 0 }}
            fontSize={{
              base: 'small',
              md: 'medium',
            }}
          >
            <Link href={'/legal/terms'} color={'inherit'}>
              Terms of Service
            </Link>
          </Text>
          <Text
            textAlign="justify"
            px={{ md: 4, base: 0 }}
            fontSize={{
              base: 'small',
              md: 'medium',
            }}
          >
            <Link href={'/legal/privacy'} color={'inherit'}>
              Privacy Policy
            </Link>
          </Text>
          <Text
            textAlign="justify"
            px={{ md: 4, base: 0 }}
            fontSize={{
              base: 'small',
              md: 'medium',
            }}
          >
            <Link href={'/legal/dpa'} color={'inherit'}>
              Data Protection
            </Link>
          </Text>
        </HStack>
      </Flex>
    </Box>
  )
}
