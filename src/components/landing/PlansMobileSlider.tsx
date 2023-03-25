import 'swiper/css'

import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Circle,
  Flex,
  HStack,
  Icon,
  Text,
} from '@chakra-ui/react'
import { BsCheck } from 'react-icons/bs'
import { Swiper, SwiperSlide } from 'swiper/react'

import { PlansCard } from './Plans'

interface PlansMobileSliderProps {
  cards: PlansCard[]
  handleCardButton: (buttonCategory: string) => void
}

export function PlansMobileSlider({
  cards,
  handleCardButton,
}: PlansMobileSliderProps) {
  return (
    <Swiper slidesPerView={1.1} spaceBetween={10}>
      {cards.map(card => (
        <SwiperSlide key={card.category}>
          <Flex
            background="rgba(251, 199, 183, 0.15)"
            backdropFilter="12.5px"
            borderTopRadius={0}
            borderBottomRadius="xl"
            minHeight="578px"
            flexDirection="column"
            justify="space-between"
          >
            <Box px={6} py={6}>
              <Text fontSize="lg" color="primary.400" mb={2}>
                {card.category}
              </Text>
              <Flex mb={6}>
                <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                  ${card.price}
                </Text>
                <Text
                  fontSize="md"
                  fontWeight="bold"
                  color="neutral.100"
                  ml={2}
                >
                  / {card.recurringPaymentTime}
                </Text>
              </Flex>
              {card.isComingSoon && (
                <Center h={8} bg={'primary.200'} mb={6}>
                  Comming Soon
                </Center>
              )}
              {card.features.map(feature => (
                <HStack gridGap="10px" maxW="228px" mb={3} key={feature.title}>
                  <Circle
                    bg={
                      feature.icon === BsCheck ? 'primary.400' : 'neutral.100'
                    }
                    p="2px"
                  >
                    <Icon
                      as={feature.icon}
                      color="gray.600"
                      width="12px"
                      height="12px"
                    />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
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
              color={card.isComingSoon ? 'neutral.900' : 'neutral.50'}
              colorScheme={card.isComingSoon ? 'grayButton' : 'orangeButton'}
              onClick={() => handleCardButton(card.category)}
            >
              {card.cta}
            </Button>
          </Flex>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
