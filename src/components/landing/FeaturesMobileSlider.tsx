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
    <Box
      h="500px"
      position="relative"
      className="featuresMobileSliderContainer"
    >
      <Swiper
        direction={'vertical'}
        spaceBetween={-20}
        slidesPerView={1.3}
        centeredSlides={false}
        modules={[Mousewheel, Keyboard]}
        className="mySwiper"
        keyboard={true}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 1,
          releaseOnEdges: true,
        }}
        onSlideChange={swiper => setActiveSlideNumber(swiper.activeIndex)}
      >
        {slides.map(slide => (
          <SwiperSlide key={slide.id}>
            <Box
              bg="rgba(251, 199, 183, .15)"
              backdropFilter="blur(12.5px)"
              px={4}
              py={6}
            >
              <Button
                mb={3}
                display={
                  activeSlideNumber === slides.indexOf(slide) ? 'block' : 'none'
                }
              >
                {slide.price}
              </Button>
              <Text fontSize="lg" mb={3} color="primary.400">
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
