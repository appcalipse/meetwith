import 'swiper/css'
import 'swiper/css/pagination'

import { Box, Button, Heading, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { Mousewheel, Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'

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

export function Features() {
  const [activeSlideNumber, setActiveSlideNumber] = useState(0)

  return (
    <Box
      maxW="1360px"
      mx="auto"
      px={{ sm: '2', md: '18', lg: '28' }}
      py={{ base: 8, md: 16 }}
      id="features"
      scrollMarginTop={{ base: '60px', md: '20px' }}
    >
      <Heading fontSize="5xl" color="primary.400" mb={8}>
        Features
      </Heading>
      <Box
        className="featuresSliderContainer"
        height="312px"
        w="100%"
        overflow="hidden"
        position="relative"
        display={{ base: 'none', md: 'inline-block' }}
      >
        <Box position="absolute" top="160px">
          <Text color="neutral.100" fontSize="xs">
            <Text as="span" color="primary.400" display="block" fontSize="2xl">
              {activeSlideNumber + 1}
            </Text>
            /{slides.length}
          </Text>
        </Box>
        <Swiper
          modules={[Pagination, Mousewheel]}
          direction={'vertical'}
          className="mySwiperTest"
          slidesPerView={1}
          mousewheel={true}
          pagination={{
            type: 'progressbar',
          }}
          onSlideChange={swiper => setActiveSlideNumber(swiper.activeIndex)}
        >
          {slides.map(slide => (
            <SwiperSlide key={slide.id}>
              <Box
                bg={
                  activeSlideNumber === slides.indexOf(slide)
                    ? 'rgba(251, 199, 183, .15)'
                    : 'rgba(255, 255, 255, 0.05)'
                }
                backdropFilter="blur(12.5px)"
                px={6}
                py={6}
                minH="211px"
                w={
                  activeSlideNumber === slides.indexOf(slide)
                    ? '100%'
                    : 'fit-content'
                }
              >
                <Button
                  mb={3}
                  colorScheme="grayButton"
                  display={
                    activeSlideNumber === slides.indexOf(slide)
                      ? 'block'
                      : 'none'
                  }
                >
                  {slide.price}
                </Button>
                <Text
                  fontSize="lg"
                  mb={3}
                  color={
                    activeSlideNumber === slides.indexOf(slide)
                      ? 'primary.400'
                      : 'neutral.100'
                  }
                >
                  {slide.title}
                </Text>
                <Text
                  w="90%"
                  color="neutral.100"
                  display={
                    activeSlideNumber === slides.indexOf(slide)
                      ? 'block'
                      : 'none'
                  }
                >
                  {slide.about}
                </Text>
              </Box>
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>
      <Box display={{ base: 'inline-block', md: 'none' }}>
        <FeaturesMobileSlider slides={slides} />
      </Box>
    </Box>
  )
}
