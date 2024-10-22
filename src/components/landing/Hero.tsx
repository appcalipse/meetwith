import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Link } from '@chakra-ui/next-js'
import {
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Image,
  SlideFade,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext } from 'react'
import { useInView } from 'react-intersection-observer'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

import { Why } from './Why'

export function Hero() {
  const { currentAccount, loginIn } = useContext(AccountContext)

  const { openConnection } = useContext(OnboardingModalContext)

  const handleLogin = async () => {
    if (!currentAccount) {
      logEvent('Clicked to start on FREE plan')
      openConnection()
    } else {
      await router.push('/dashboard')
    }
  }

  const { ref: heroContainer, inView: isHeroContainerVisible } = useInView({
    triggerOnce: true,
  })

  return (
    <Box
      ref={heroContainer}
      color="neutral.0"
      marginBottom={{ base: '10', md: '28' }}
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
        <SlideFade
          in={isHeroContainerVisible}
          delay={0.5}
          offsetY={-50}
          unmountOnExit={false}
          reverse={false}
        >
          <Image
            width={'100%'}
            src={'/assets/product-ui.png'}
            alt="Product UI"
            mt={10}
          />
        </SlideFade>
      </Box>
      <Box
        w="100%"
        bg="neutral.1000"
        backdropFilter="blur(100px)"
        height={'380px'}
        insetX={0}
        bottom={0}
        pos="absolute"
        zIndex={0}
      />
      <VStack
        px={{ base: '6', md: '0' }}
        w="100%"
        position="relative"
        zIndex="20"
        alignItems="center"
      >
        <Heading
          fontWeight="bold"
          fontSize={{ base: '2xl', md: '40px' }}
          marginBottom={{ base: '4', md: '2' }}
          zIndex={1}
          position="relative"
        >
          Our partners
        </Heading>
        <Text
          marginBottom={10}
          zIndex={1}
          position="relative"
          color="neutral.200"
        >
          Collaboration is at the core of what we do, and we are proud to have
          incredible partnerships and integrations with the following.
        </Text>
        <Grid
          color="neutral.100"
          gridTemplateColumns={{ base: '1fr 1fr 1fr', md: 'none' }}
          gridAutoFlow={{ base: 'none', md: 'column' }}
          zIndex={1}
          position="relative"
        >
          <Link target="_blank" href="https://poap.xyz/">
            <Image src={'/assets/logo-poap.svg'} alt="POAP Logo" />
          </Link>
          <Link target="_blank" href="http://huddle01.xyz/">
            <Image src={'/assets/logo-huddle01.svg'} alt="Huddle01 Logo" />
          </Link>
          <Link target="_blank" href="">
            <Image src={'/assets/logo-e.svg'} alt="E Logo" />
          </Link>
          <Link target="_blank" href="https://unstoppabledomains.com/">
            <Image src={'/assets/logo-u.svg'} alt="Unstoppable Domains Logo" />
          </Link>
          <Link target="_blank" href="">
            <Image src={'/assets/logo-triangle.svg'} alt="Triangle Logo" />
          </Link>
        </Grid>
      </VStack>
    </Box>
  )
}
