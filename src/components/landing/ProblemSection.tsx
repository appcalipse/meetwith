import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
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
      pointerEvents="none"
      overflow="hidden"
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

function ProblemSection() {
  const { currentAccount, loginIn } = useContext(AccountContext)
  const { openConnection } = useContext(OnboardingModalContext)
  const { push } = useRouter()

  const handleGetStarted = async () => {
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
      position="relative"
      w="100%"
      overflow="hidden"
      px={{ base: 4, md: 8, lg: '131px' }}
      pt={{ base: 8, md: 12 }}
      pb={{ base: 10, md: 16 }}
    >
      <GridBackground />

      <Box maxW="1152px" mx="auto" w="100%" position="relative" zIndex={1}>
        <Heading
          as="h2"
          fontSize={{ base: '3xl', md: '4xl', lg: '48.83px' }}
          fontWeight="bold"
          color="neutral.0"
          lineHeight={1.2}
          mb={4}
        >
          We solve the right{' '}
          <Box as="span" color="primary.400">
            problem
          </Box>
        </Heading>

        <VStack alignItems="flex-start" spacing={4} mb={8}>
          <Text
            fontWeight="medium"
            color="neutral.0"
            fontSize="md"
            lineHeight={1.5}
          >
            Doodle sends a one-time poll. Calendly books an inbound call. AI
            tools like Reclaim and Motion require calendar access that people
            across different organizations often can&apos;t or won&apos;t grant.
          </Text>
          <Text
            fontWeight="medium"
            color="neutral.0"
            fontSize="md"
            lineHeight={1.5}
          >
            Stop remembering things on your own — details, emails, calendar
            availabilities. Meetwith is the alternative you&apos;re looking for:
            cross-org coordination with the same group of people.
          </Text>
        </VStack>

        <HStack flexWrap="wrap" gap={4}>
          <Button
            colorScheme="orangeButton"
            textColor="neutral.0"
            rightIcon={<FiArrowRight />}
            isLoading={loginIn}
            onClick={handleGetStarted}
            h={12}
            px={4}
            py={2}
            rounded="lg"
          >
            Get started for FREE
          </Button>
          <Button
            bg="neutral.100"
            color="neutral.800"
            _hover={{ bg: 'neutral.200' }}
            h={12}
            px={4}
            py={2}
            rounded="lg"
            fontWeight="bold"
          >
            Book a walkthrough
          </Button>
        </HStack>
      </Box>
    </Box>
  )
}

export default ProblemSection
