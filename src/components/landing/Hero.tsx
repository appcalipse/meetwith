import { Box, Button, Heading, Text } from '@chakra-ui/react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useContext } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

function GridBackground() {
  return (
    <Box
      position="absolute"
      top={0}
      right={0}
      bottom={0}
      left={0}
      overflow="hidden"
      pointerEvents="none"
      aria-hidden="true"
    >
      {/* Grid lines */}
      <Box
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        sx={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage:
            'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)',
        }}
      />

      {/* Dot intersections at grid crossings */}
      <Box
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        sx={{
          backgroundImage:
            'radial-gradient(circle, rgba(244,103,57,0.25) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage:
            'radial-gradient(ellipse 60% 70% at 50% 0%, black 30%, transparent 90%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 60% 70% at 50% 0%, black 30%, transparent 90%)',
        }}
      />

      {/* Orange radial glow — top-left */}
      <Box
        position="absolute"
        top="-10%"
        left="-5%"
        w="60%"
        h="70%"
        sx={{
          background:
            'radial-gradient(ellipse, rgba(244,103,57,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Blue accent glow — top-right */}
      <Box
        position="absolute"
        top="-5%"
        right="5%"
        w="40%"
        h="50%"
        sx={{
          background:
            'radial-gradient(ellipse, rgba(56,189,248,0.05) 0%, transparent 70%)',
        }}
      />
    </Box>
  )
}

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
      as="section"
      id="home"
      position="relative"
      w="100%"
      pt={{ base: 32, md: 40 }}
      pb={0}
      px={{ base: 4, md: 8, lg: '131px' }}
      overflow="hidden"
      scrollMarginTop={{ base: '80px', md: '100px' }}
    >
      <GridBackground />

      <Box maxW="1152px" mx="auto" position="relative" zIndex={1}>
        <Heading
          as="h1"
          fontSize={{ base: '3xl', md: '4xl', lg: '48.83px' }}
          fontWeight="bold"
          color="neutral.0"
          lineHeight={1.2}
          mb={6}
        >
          Schedule the same group again and again
          <br />
          Meetwith remembers them for you
        </Heading>

        <Text
          fontSize="md"
          fontWeight="medium"
          color="neutral.0"
          lineHeight={1.5}
          mb={6}
        >
          No back and forth, no starting from scratch
        </Text>

        <Button
          colorScheme="orangeButton"
          textColor="white"
          rightIcon={<FiArrowRight />}
          isLoading={loginIn}
          onClick={handleLogin}
          h={12}
          px={4}
          py={2}
          rounded="lg"
          mb={3}
        >
          Create your group
        </Button>
      </Box>
    </Box>
  )
}

export default Hero
