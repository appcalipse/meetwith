import {
  AspectRatio,
  Box,
  Button,
  Grid,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useContext } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

const STEPS = [
  {
    number: '1',
    title: 'Create a reusable group',
    description:
      'Set up your group once with everyone who needs to meet regularly — cohort participants, portfolio companies, community members, external partners. No rebuilding lists. No re-confirming attendees.',
  },
  {
    number: '2',
    title: 'Members share availability',
    description:
      'People join and share availability on their own terms, without exposing their full calendar. You instantly see which times work for the whole group. Scheduling stops being guesswork.',
  },
  {
    number: '3',
    title: 'Schedule in one action',
    description:
      "See the overlap. Pick the time. Create your meeting. Done. The same group is ready for next week's call — no setup required.",
  },
]

function HowItWorks() {
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
      id="features"
      position="relative"
      w="100%"
      overflow="hidden"
      px={{ base: 4, md: 8, lg: '131px' }}
      py={{ base: 10, md: 16 }}
      scrollMarginTop={{ base: '80px', md: '100px' }}
    >
      <Box maxW="1152px" mx="auto" w="100%">
        <Heading
          as="h2"
          fontSize={{ base: '3xl', md: '4xl', lg: '48.83px' }}
          fontWeight="bold"
          color="neutral.0"
          lineHeight={1.2}
          mb={8}
        >
          How{' '}
          <Box as="span" color="primary.400">
            Meetwith
          </Box>{' '}
          Works
        </Heading>

        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
          gap={{ base: 8, md: '53px' }}
          mb={8}
        >
          {STEPS.map(step => (
            <VStack key={step.number} alignItems="flex-start" gap={4}>
              <VStack alignItems="flex-start" gap="15px">
                <Box
                  bg="neutral.600"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  rounded="full"
                  w="30px"
                  h="30px"
                >
                  <Text
                    fontWeight="bold"
                    color="neutral.0"
                    fontSize="xl"
                    lineHeight={1.2}
                  >
                    {step.number}
                  </Text>
                </Box>
                <Heading
                  as="h3"
                  fontSize="2xl"
                  fontWeight="bold"
                  color="neutral.0"
                  lineHeight={1.2}
                >
                  {step.title}
                </Heading>
              </VStack>
              <Text
                fontWeight="medium"
                color="neutral.0"
                fontSize="md"
                lineHeight={1.5}
              >
                {step.description}
              </Text>
            </VStack>
          ))}
        </Grid>

        {/* YouTube embed */}
        <Box w="100%" maxW="1152px" rounded="15px" overflow="hidden" mb={0}>
          <AspectRatio ratio={16 / 9}>
            <Box
              as="iframe"
              src="https://www.youtube.com/embed/Fh4Chd-DxEs?list=PL_8jZMxhZaVWsIavN3-ZwJ3Gqc7gLiXto&start=27"
              title="How Meetwith Works"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </AspectRatio>
        </Box>

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
          mt={8}
        >
          Get started for FREE
        </Button>
      </Box>
    </Box>
  )
}

export default HowItWorks
