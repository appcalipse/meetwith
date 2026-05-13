import {
  Box,
  chakra,
  Flex,
  HStack,
  Image,
  Link,
  Stack,
  Text,
  useColorModeValue,
  useMediaQuery,
  VisuallyHidden,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'
import { FaDiscord, FaEnvelope, FaTwitter } from 'react-icons/fa'

import { localizePath } from '@/i18n'
import { useI18n } from '@/i18n/I18nProvider'
import { MWW_DISCORD_SERVER } from '@/utils/constants'
import { shouldEnforceColorOnPath } from '@/utils/generic_utils'

const Logo = () => {
  const { locale } = useI18n()
  const [isMobile] = useMediaQuery(['(max-width: 800px)'], {
    ssr: true,
    fallback: false,
  })
  return (
    <Link href={localizePath(locale, '/')}>
      <Image
        width={53}
        height={33}
        alt="Meetwith"
        style={{
          width: isMobile ? '75px' : '100px',
          height: 'auto',
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: 8,
        }}
        src="/assets/logo.svg"
      />
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
  const { locale, t } = useI18n()
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
      py={{ base: 16, md: 8, lg: 4 }}
      fontWeight={500}
    >
      <Flex
        direction={{
          lg: 'row',
          base: 'column',
        }}
        w="100%"
        justify={{ base: 'center', lg: 'space-between' }}
        align={{ base: 'center', lg: 'center' }}
        gap={8}
        px={{ md: 10, base: 6 }}
      >
        <HStack gap={5} display={{ lg: 'flex', base: 'none' }}>
          <Logo />
          <Text textAlign="center">{t('footer.rights')}</Text>
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
            <Link href={localizePath(locale, '/#pricing')} color={'inherit'}>
              {t('footer.plans')}
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
            <Link href={localizePath(locale, '/#faq')} color={'inherit'}>
              {t('footer.faq')}
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
              href="mailto:contact@meetwith.xyz"
              color={'inherit'}
              isExternal
            >
              {t('footer.featureRequests')}
            </Link>
          </Text>
        </HStack>
        <Stack direction={'row'} spacing={6}>
          <SocialButton
            label={t('footer.email')}
            href={'mailto:contact@meetwith.xyz'}
          >
            <FaEnvelope size={22} />
          </SocialButton>
          <SocialButton
            label={t('footer.twitter')}
            href={'https://x.com/meetwithhq'}
          >
            <FaTwitter size={22} />
          </SocialButton>
          <SocialButton label={t('footer.discord')} href={MWW_DISCORD_SERVER}>
            <FaDiscord size={22} />
          </SocialButton>
        </Stack>
        <VStack
          gap={5}
          display={{ base: 'flex', lg: 'none' }}
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
            {t('footer.rights')}
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
            <Link href={localizePath(locale, '/legal/terms')} color={'inherit'}>
              {t('footer.terms')}
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
            <Link
              href={localizePath(locale, '/legal/privacy')}
              color={'inherit'}
            >
              {t('footer.privacy')}
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
            <Link href={localizePath(locale, '/legal/dpa')} color={'inherit'}>
              {t('footer.dataProtection')}
            </Link>
          </Text>
        </HStack>
      </Flex>
    </Box>
  )
}
