import 'swiper/css'
import 'swiper/css/pagination'

import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Image,
  Text,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext, useState } from 'react'
import { Mousewheel, Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

import { FeaturesMobileSlider } from './FeaturesMobileSlider'

export interface Slides {
  id: number
  price: string
  title: string
  about: string
}

const slides = [
  {
    id: 1,
    price: 'Free',
    title: 'Just like Calendly, but powered by Web3',
    about:
      'Meet with Wallet is integrated with Web3 technologies: Major L1 and L2 blockchains, ENS, Huddle01, and much more, providing a highly secure and private scheduling experience. It’s like Calendly, but tailor made to Web3.',
  },
  {
    id: 2,
    price: 'Free',
    title: 'Huddle01 integration for private meetings',
    about:
      'Meet with anybody within your DAO, guild or NFT community using Web3 wallets, no signups and email addresses required.',
  },
  {
    id: 3,
    price: 'Free',
    title: 'Meetings with full data privacy',
    about:
      'All meeting private information is encrypted on the client side, Meet with Wallet does not have access to any of the keys or decrypted information.',
  },
  {
    id: 4,
    price: 'Free',
    title: 'Sync availability and meetings across your existing calendars',
    about:
      'Connect your existing personal and work calendars on Google, Apple iCloud, Office365 and more to check real-time availability. Preserve your identity while ensuring all your appointments across your calendars do not conflict.',
  },
  {
    id: 5,
    price: 'Free',
    title: 'Automated reminders over email or Discord',
    about:
      'Receive automated reminders so you don’t miss an important meeting. Meet with Wallet supports a variety of notification options from traditional emails to decentralised alternatives.',
  },
  {
    id: 6,
    price: 'Free',
    title: 'Best meeting slot finde',
    about:
      'Meet with wallet finds and proposes the best meeting slots for your group to meet, allowing much faster bookings and ensuring everyone is available.',
  },
  {
    id: 7,
    price: 'PRO',
    title: 'Custom meeting link',
    about:
      'No one likes to memorize 40 character wallet addresses, neither do we. Own your identity by creating your own vanity meeting link, then share it with others in a breeze.',
  },
  {
    id: 8,
    price: 'PRO',
    title:
      'ENS, Lens protocol, unstoppable domains and many name services integration',
    about:
      'Fully integrated with ENS, Lens protocol, Unstoppable Domains, and many other name services for your calendar link and profile.',
  },
  {
    id: 9,
    price: 'PRO',
    title: 'Unlimited booking configurations',
    about:
      'Create an unlimited number of booking configurations to suit your schedule and meeting preferences. Create specific meeting types for specific purposes, including private ones to be shared only with your closest friends/business partners.',
  },
  {
    id: 10,
    price: 'PRO',
    title: 'Token-gated meetings',
    about:
      'Create token-gated or community meetings only for those holding a set of tokens/NFTs/POAPs. Bring your clients / community / DAO closer, for those who matter.',
  },
  {
    id: 11,
    price: 'PRO',
    title: 'Paid meetings',
    about:
      'Collect payments in any token when meetings are booked - perfect for consultants, DAOs or communities for one-off or recurring events.',
  },
]

const FEATURES = [
  {
    title: 'Group scheduling without back-and-forth',
    image: 'time-discover.png',
  },
  {
    title: 'Sync all your calendars in one place',
    image: 'connect-calendar.png',
  },
  {
    title: 'Discord-bot for instant scheduling',
    image: 'discord-bot.png',
  },
  {
    title: 'Token-gated and private meetings',
    image: 'token-gates.png',
  },
  {
    title: 'Integrates with Zoom, Google Meet, and Huddle01',
    image: 'meeting-platform.png',
  },
  {
    title: 'Receive notifications via Email or Discord',
    image: 'notifications.png',
  },
]

export function Features() {
  const [activeSlideNumber, setActiveSlideNumber] = useState(0)
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
  return (
    <Box
      maxW="1360px"
      mx="auto"
      px={{ sm: '2', md: '18', lg: '28' }}
      id="features"
      scrollMarginTop={{ base: '60px', md: '20px' }}
    >
      <Heading fontSize={'4xl'} textAlign="center" mb={8}>
        Features That Make Scheduling Effortless
      </Heading>
      <Box
        pos={'relative'}
        borderLeftWidth={{ md: 1, base: 0 }}
        borderRightWidth={{ md: 1, base: 0 }}
        borderColor={'neutral.800'}
        borderTopWidth={0}
      >
        <Box
          borderWidth={1}
          borderColor={'neutral.800'}
          width="100%"
          top={6}
          pos={'absolute'}
          display={{ md: 'block', base: 'none' }}
        />
        <Box
          borderWidth={1}
          borderColor={'neutral.800'}
          width="100%"
          bottom={6}
          pos={'absolute'}
          display={{ md: 'block', base: 'none' }}
        />
        <Box
          w={5}
          h={5}
          pos={'absolute'}
          top={6}
          left={0}
          bgColor={'neutral.800'}
          display={{ md: 'block', base: 'none' }}
        />
        <Box
          w={5}
          h={5}
          pos={'absolute'}
          top={6}
          right={0}
          bgColor={'neutral.800'}
          display={{ md: 'block', base: 'none' }}
        />
        <Box
          w={5}
          h={5}
          pos={'absolute'}
          bottom={6}
          left={0}
          bgColor={'neutral.800'}
          display={{ md: 'block', base: 'none' }}
        />
        <Box
          w={5}
          h={5}
          pos={'absolute'}
          bottom={6}
          right={0}
          bgColor={'neutral.800'}
          display={{ md: 'block', base: 'none' }}
        />
        <Grid
          gridTemplateColumns={{ lg: '1fr 1fr', base: '1fr' }}
          p={{ md: 16 }}
          gap={5}
        >
          {FEATURES.map(val => (
            <VStack
              key={val.title}
              height={{ md: '388px', base: '290px' }}
              bg={'neutral.900'}
              p={10}
              pb="0"
              pos={'relative'}
              overflowY="hidden"
              rounded={10}
            >
              <Heading fontSize={'2xl'}>{val.title}</Heading>
              <Image
                src={`/assets/features/${val.image}`}
                alt={val.title}
                h="auto"
                w="100%"
                bottom={'0'}
                mt={2}
              />
              <Box
                className="image-back-drop"
                h="100px"
                w="100%"
                left={0}
                right={0}
                bottom={0}
                pos="absolute"
              />
            </VStack>
          ))}
        </Grid>
      </Box>
      <HStack
        w="100%"
        justifyContent="center"
        mt={{ md: 14, base: 12 }}
        mb={20}
      >
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
    </Box>
  )
}
