import 'swiper/css'
import 'swiper/css/pagination'

import { Box, Button, Text } from '@chakra-ui/react'
import { useState } from 'react'
//import "swiper/css/effect-creative";
import { Keyboard, Mousewheel } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'

import { Slides } from './Features'

interface FeaturesMobileSliderProps {
  slides: Slides[]
}

export function FeaturesMobileSlider({ slides }: FeaturesMobileSliderProps) {
  const [activeSlideNumber, setActiveSlideNumber] = useState(0)

  return (
    <Box className="featuresSliderContainer" height="450px" overflow="hidden">
      <Swiper
        direction={'vertical'}
        className="mySwiperTestMobile"
        slidesPerView={1}
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
              px={4}
              py={6}
              h={
                activeSlideNumber === slides.indexOf(slide)
                  ? '100%'
                  : 'fit-content'
              }
            >
              <Button
                colorScheme="grayButton"
                mb={3}
                display={
                  activeSlideNumber === slides.indexOf(slide) ? 'block' : 'none'
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
                color="neutral.100"
                display={
                  activeSlideNumber === slides.indexOf(slide) ? 'block' : 'none'
                }
              >
                {slide.about}
              </Text>
            </Box>
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  )
}
