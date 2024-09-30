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
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext } from 'react'
import { useInView } from 'react-intersection-observer'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

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
      color="neutral.100"
      marginBottom={{ base: '10', md: '28' }}
      position="relative"
      maxW="1360px"
      mx="auto"
      px={{ base: 2, md: 10 }}
      pt="86px"
      id="home"
    >
      <Box
        background={'rgba(255, 255, 255, 0.05)'}
        position="absolute"
        top={{ base: '91px', md: 0 }}
        backdropFilter="blur(12.5px)"
        h="540px"
        w="calc(100% - 16px)"
        display={{ base: 'inline-block', md: 'none' }}
      ></Box>
      <Box
        bgImage={{ base: 'none', md: `url('/assets/glass-effect.svg')` }}
        bgRepeat="no-repeat"
        bgSize="cover"
        backdropFilter={{ base: 'none', md: 'blur(12.5px)' }}
        px={{ base: 4, md: 16 }}
        py={{ base: 9, md: 16 }}
        mb={{ base: 12, md: 20 }}
      >
        <Stack
          flexDirection={{ base: 'column', md: 'row' }}
          position="relative"
          justifyContent="space-between"
        >
          <Box>
            <Heading
              fontSize={{ base: '3xl', md: '5xl' }}
              lineHeight="shorter"
              marginBottom={6}
            >
              Schedule meetings with full privacy in{' '}
              <Text as="span" color="primary.400">
                Web3
              </Text>{' '}
              style
            </Heading>
            <Text fontSize={{ base: 'lg', md: 'xl' }} marginBottom={4}>
              The{' '}
              <Text as="span" textDecoration="line-through">
                future
              </Text>{' '}
              state of work is remote.
            </Text>
            <Text fontSize={{ base: 'lg', md: 'xl' }} marginBottom={10}>
              <Text as="span" color="primary.400">
                Meet With Wallet
              </Text>{' '}
              is a scheduling manager redefined for Web3. Take control of your
              time, your privacy, your rules.
            </Text>
            <HStack display={{ base: 'none', md: 'inline-block' }}>
              <Button
                colorScheme="primary"
                rightIcon={<ArrowForwardIcon boxSize={4} />}
                isLoading={loginIn}
                onClick={() => handleLogin()}
                mr={2}
              >
                Try for FREE
              </Button>
              <Button colorScheme="grayButton" as="a" href="#plans">
                See Plans
              </Button>
            </HStack>
          </Box>
          <SlideFade
            in={isHeroContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={false}
            reverse={false}
          >
            <Box minW="300px" display="flex" justifyContent="center">
              <Image
                width={{ base: '200px', md: '250px' }}
                src={'/assets/frame.png'}
                position={{ base: 'unset', md: 'absolute' }}
                right={0}
                top={0}
              />
            </Box>
          </SlideFade>
        </Stack>
        <Box
          display={{ base: 'flex', md: 'none' }}
          flexDirection="column"
          mt={{ base: '8', md: '0' }}
        >
          <Button
            onClick={() => handleLogin()}
            isLoading={loginIn}
            colorScheme="primary"
            rightIcon={<ArrowForwardIcon boxSize={4} />}
            width="100%"
            h={12}
            mb={4}
          >
            Try for FREE
          </Button>
          <Button
            colorScheme="grayButton"
            width="100%"
            h={12}
            as="a"
            href="#plans"
          >
            See Plans
          </Button>
        </Box>
      </Box>

      <Box px={{ base: '6', md: '0' }} maxW="4xl">
        <Heading
          fontSize="2xl"
          fontWeight="bold"
          color={{ base: 'primary.400', md: 'neutral.100' }}
          marginBottom={{ base: '4', md: '2' }}
        >
          Our partners
        </Heading>
        <Text fontSize="md" marginBottom={10}>
          Web3 is built by collaborating, and we are proud to have incredible
          partnerships and integrations with the following
        </Text>
        <Grid
          color="neutral.100"
          marginBottom={10}
          gridTemplateColumns={{ base: '1fr 1fr 1fr', md: 'none' }}
          gridAutoFlow={{ base: 'none', md: 'column' }}
        >
          <Link href="https://poap.xyz/">
            <Image src={'/assets/logo-poap.svg'} alt="POAP Logo" />
          </Link>
          <Link href="http://huddle01.xyz/">
            <Image src={'/assets/logo-huddle01.svg'} alt="Huddle01 Logo" />
          </Link>
          {/* <Link href="">
            <Image src={'/assets/logo-e.svg'} alt="E Logo" />
          </Link> */}
          <Link href="https://unstoppabledomains.com/">
            <Image src={'/assets/logo-u.svg'} alt="Unstoppable Domains Logo" />
          </Link>
          <Link href="">
            <Image src={'/assets/logo-triangle.svg'} alt="Triangle Logo" />
          </Link>
        </Grid>
      </Box>
    </Box>
  )
}
