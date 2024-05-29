import 'swiper/css'

import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Circle,
  Flex,
  Heading,
  HStack,
  Icon,
  SlideFade,
  Text,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext, useState } from 'react'
import { IconType } from 'react-icons'
import { BsCheck } from 'react-icons/bs'
import { IoMdClose } from 'react-icons/io'
import { useInView } from 'react-intersection-observer'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { Plan } from '@/types/Subscription'
import { logEvent } from '@/utils/analytics'

import AlertMeDialog from './AlertMeDialog'
import { PlansMobileSlider } from './PlansMobileSlider'

export interface Feature {
  title: string
  icon: IconType
}

export interface PlansCard {
  category: string
  price: string
  recurringPaymentTime: string
  isComingSoon: boolean
  cta: string
  animationDelay?: number
  features: Feature[]
}

const plansCards: PlansCard[] = [
  {
    category: 'Free',
    price: '0',
    recurringPaymentTime: 'forever',
    isComingSoon: false,
    cta: 'Try for FREE',
    animationDelay: 0.25,
    features: [
      {
        title: 'Public page for scheduling meetings',
        icon: BsCheck,
      },
      {
        title: 'Configurable availability',
        icon: BsCheck,
      },
      {
        title: 'Web3 powered meeting room',
        icon: BsCheck,
      },
      {
        title: 'Email and Discord notifications (optional)',
        icon: BsCheck,
      },
      {
        title: 'Single meeting configuration',
        icon: IoMdClose,
      },
      {
        title:
          'Single integration with Google calendar, iCloud, Office 365 or WebDAV',
        icon: IoMdClose,
      },
      {
        title: 'Fixed booking link with wallet address',
        icon: IoMdClose,
      },
      {
        title: 'Only 1-1 meetings',
        icon: IoMdClose,
      },
    ],
  },
  {
    category: 'PRO',
    price: '30',
    recurringPaymentTime: 'year',
    isComingSoon: false,
    cta: 'Go PRO',
    animationDelay: 0.5,
    features: [
      {
        title: 'Unlimited meeting configurations',
        icon: BsCheck,
      },
      {
        title: 'Customizable booking link',
        icon: BsCheck,
      },
      {
        title: 'ENS and unstoppable domains integration for your calendar link',
        icon: BsCheck,
      },
      {
        title: 'Email, Discord, Push and EPNS Notifications (optional)',
        icon: BsCheck,
      },
      {
        title:
          'Unlimited integrations (Google calendar, iCloud, Office 365 and WebDAV)',
        icon: BsCheck,
      },
    ],
  },
  {
    category: 'DAO / Community',
    price: '200',
    recurringPaymentTime: 'year',
    isComingSoon: true,
    cta: 'Notify me',
    animationDelay: 1,
    features: [
      {
        title: 'Everything from Pro',
        icon: BsCheck,
      },
      {
        title: 'Gated scheduled meetings for members with Allow lists',
        icon: BsCheck,
      },
      {
        title: 'Token gated (ERC20 and/or ERC721) access to scheduled meetings',
        icon: BsCheck,
      },
      {
        title: 'Unlimited sub-teams pages with multiple calendars',
        icon: BsCheck,
      },
      {
        title: 'Custom branding',
        icon: BsCheck,
      },
      {
        title: 'And more to come',
        icon: BsCheck,
      },
    ],
  },
]

export function Plans() {
  const { currentAccount, login, setLoginIn } = useContext(AccountContext)

  const [selectedPlan, setSelectedPlan] = useState(
    undefined as string | undefined
  )

  const { openConnection } = useContext(OnboardingModalContext)

  const handleLogin = async (selectedPlan?: Plan) => {
    if (!currentAccount) {
      logEvent(`Clicked to start on ${selectedPlan} plan`)
      openConnection()
    } else {
      if (selectedPlan && selectedPlan === Plan.PRO) {
        await router.push('/dashboard/details')
      } else {
        await router.push('/dashboard')
      }
    }
  }

  function handleCardButton(buttonCategory: string) {
    switch (buttonCategory) {
      case 'Free':
        handleLogin()
        break
      case 'PRO':
        handleLogin(Plan.PRO)
        break
      case 'DAO / Community':
        setSelectedPlan('DAO')
        break
      default:
        break
    }
  }

  const { ref: cardsContainer, inView: isCardsContainerVisible } = useInView({
    triggerOnce: true,
  })

  return (
    <Box
      py={{ base: 0, md: 16 }}
      px={{ base: 0, md: 28 }}
      maxW="1360px"
      mx="auto"
      position="relative"
      id="plans"
      scrollMarginTop={{ base: '80px', md: '20px' }}
    >
      <Text
        as="span"
        id="plans"
        position="absolute"
        translateY="-50vh"
        top={isCardsContainerVisible ? '0' : '50%'}
      ></Text>
      <Heading fontSize="5xl" color="primary.400">
        Plans
      </Heading>
      <Text fontSize={{ base: '2xl', md: '4xl' }} color="neutral.100" mb={10}>
        that fit your needs
      </Text>
      <Flex
        ref={cardsContainer}
        mb={16}
        flexWrap="wrap"
        gridGap={2}
        justifyContent="center"
        display={{ base: 'none', sm: 'flex' }}
      >
        {plansCards.map(planCard => (
          <SlideFade
            in={isCardsContainerVisible}
            delay={planCard.animationDelay}
            offsetY={-50}
            reverse={false}
            key={planCard.category}
          >
            <Flex
              background="rgba(251, 199, 183, 0.15)"
              backdropFilter="12.5px"
              borderTopRadius={0}
              borderBottomRadius="xl"
              height="100%"
              flexDirection="column"
              justify="space-between"
            >
              <Box px={14} py={6}>
                <Text
                  fontSize="xl"
                  fontWeight={'bold'}
                  color="primary.400"
                  mb={2}
                >
                  {planCard.category}
                </Text>
                <Flex mb={6}>
                  <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                    ${planCard.price}
                  </Text>
                  <Text
                    fontSize="md"
                    fontWeight="bold"
                    color="neutral.100"
                    ml={2}
                    mt={2}
                  >
                    / {planCard.recurringPaymentTime}
                  </Text>
                </Flex>
                {planCard.isComingSoon && (
                  <Center h={8} bg={'primary.200'} mb={6} color="neutral.700">
                    Comming Soon
                  </Center>
                )}
                {planCard.features.map(feature => (
                  <HStack
                    gridGap="10px"
                    maxW="228px"
                    mb={3}
                    key={feature.title}
                    alignItems="flex-start"
                  >
                    <Circle
                      bg={feature.icon === BsCheck ? 'primary.400' : 'gray.100'}
                      p="2px"
                      mt="4px"
                    >
                      <Icon
                        as={feature.icon}
                        color="gray.600"
                        width="12px"
                        height="12px"
                      />
                    </Circle>
                    <Text fontSize="md" color="neutral.100">
                      {feature.title}
                    </Text>
                  </HStack>
                ))}
              </Box>
              <Button
                w="100%"
                h="78px"
                borderTopRadius={0}
                borderBottomRadius="xl"
                p={6}
                justifyContent="left"
                rightIcon={<ArrowForwardIcon />}
                color={planCard.isComingSoon ? 'neutral.900' : 'neutral.50'}
                colorScheme={
                  planCard.isComingSoon ? 'grayButton' : 'orangeButton'
                }
                onClick={() => handleCardButton(planCard.category)}
              >
                {planCard.cta}
              </Button>
            </Flex>
          </SlideFade>
        ))}
      </Flex>

      <Box display={{ base: 'block', sm: 'none' }} mb={6}>
        <PlansMobileSlider
          cards={plansCards}
          handleCardButton={handleCardButton}
        />
      </Box>

      <Text fontSize="2xl" color="neutral.100">
        Start for free, go PRO, or power your DAO with more organization and
        transparency.
      </Text>

      <AlertMeDialog
        plan={selectedPlan}
        isOpen={selectedPlan !== undefined}
        onClose={() => setSelectedPlan(undefined)}
      />
    </Box>
  )
}
