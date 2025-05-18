import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useContext } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

function Hero() {
  const { currentAccount, loginIn } = useContext(AccountContext)

  const { openConnection } = useContext(OnboardingModalContext)
  const { push } = useRouter()
  const handleLogin = async () => {
    if (!currentAccount) {
      logEvent('Clicked to start on FREE plan')
      openConnection()
    } else {
      await push('/dashboard')
    }
  }

  return (
    <Box
      color="neutral.0"
      position="relative"
      mx="auto"
      px={{ base: 2, md: 10 }}
      pt={32}
      id="home"
      bgImage={{
        base: `none`,
        md: `url('/assets/bg-abstract.svg')`,
      }}
      bgRepeat="no-repeat"
      bgSize="cover"
    >
      <Box
        bgRepeat="no-repeat"
        bgSize="cover"
        px={{ base: 4, md: 16 }}
        pt={{ base: 9, md: 16 }}
        maxW="1360px"
        mx="auto"
        zIndex={1}
        pos={'relative'}
      >
        {' '}
        <VStack position="relative" justifyContent="center" alignItems="center">
          <Heading
            fontSize={{ base: '3xl', md: '5xl' }}
            lineHeight="shorter"
            textAlign={'center'}
            width={{ md: '75%', base: '100%', lg: '50%' }}
          >
            Save time, have more productive meetings
          </Heading>
          <Text
            marginBottom={5}
            flex={0}
            display="inline"
            textAlign={'center'}
            width={{ md: '75%', base: '100%', lg: '50%' }}
          >
            Whether you&apos;re a consultant, freelancer, or board member,
            Meetwith makes scheduling across multiple roles and teams a breeze.
          </Text>
          <HStack>
            <Button
              colorScheme="orangeButton"
              textColor={'white'}
              rightIcon={<ArrowForwardIcon boxSize={4} />}
              isLoading={loginIn}
              onClick={() => handleLogin()}
              mr={2}
              px={4}
              py={3}
            >
              Get started for FREE
            </Button>
          </HStack>
        </VStack>
        <Image
          src={'/assets/product-ui.webp'}
          alt="Product UI"
          loading="eager"
          priority
          width={1200}
          height={675}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
          style={{
            width: '100%',
            height: 'auto',
            marginTop: 40,
          }}
          quality={75}
        />
      </Box>
      <Box
        w="100%"
        bg="neutral.900"
        backdropFilter="blur(100px)"
        height={'380px'}
        insetX={0}
        bottom={0}
        pos="absolute"
        zIndex={0}
      />
    </Box>
  )
}

export default Hero
