import 'swiper/css'

import {
  Box,
  Button,
  Circle,
  Flex,
  Heading,
  HStack,
  SlideFade,
  Text,
} from '@chakra-ui/react'
import { BsCheck } from 'react-icons/bs'
import { IoMdClose } from 'react-icons/io'
import { useInView } from 'react-intersection-observer'
import { Swiper, SwiperSlide } from 'swiper/react'

export function Plans() {
  const { ref: cardsContainer, inView: isCardsContainerVisible } = useInView()

  return (
    <Box
      py={{ base: '10', md: '20' }}
      //pl={{ base: 10, md: 10, lg: 10 }}
      px={{ base: 0, md: 28 }}
      maxW="1360px"
      mx="auto"
    >
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
        gap={2}
        justifyContent="center"
        display={{ base: 'none', sm: 'flex' }}
      >
        <SlideFade
          in={isCardsContainerVisible}
          delay={0.5}
          offsetY={-50}
          reverse={false}
        >
          <Box
            background="rgba(251, 199, 183, 0.15)"
            backdropFilter="12.5px"
            borderTopRadius={0}
            borderBottomRadius="xl"
          >
            <Box px={6} py={6}>
              <Text fontSize="lg" color="primary.400" mb={2}>
                Free
              </Text>
              <Flex mb={6}>
                <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                  $0
                </Text>
                <Text
                  fontSize="md"
                  fontWeight="bold"
                  color="neutral.100"
                  ml={2}
                >
                  / forever
                </Text>
              </Flex>
              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Public page for scheduling meetings
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Configurable availability
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Web3 powered meeting room
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Email notifications (optional)
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Single meeting configuration
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Single integration with Google calendar, iCloud, Office 365 or
                  WebDAV
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Fixed booking link with wallet address
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px">
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Only 1-1 meetings
                </Text>
              </HStack>
            </Box>
            <Button
              w="100%"
              h="78px"
              borderTopRadius={0}
              borderBottomRadius="xl"
              p={6}
              justifyContent="left"
              colorScheme="orange"
            >
              Try for FREE
            </Button>
          </Box>
        </SlideFade>

        <SlideFade
          in={isCardsContainerVisible}
          delay={0.6}
          offsetY={-50}
          reverse={false}
        >
          <Box
            background="rgba(251, 199, 183, 0.15)"
            backdropFilter="12.5px"
            borderTopRadius={0}
            borderBottomRadius="xl"
          >
            <Box px={6} py={6}>
              <Text fontSize="lg" color="primary.400" mb={2}>
                Free
              </Text>
              <Flex mb={6}>
                <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                  $0
                </Text>
                <Text
                  fontSize="md"
                  fontWeight="bold"
                  color="neutral.100"
                  ml={2}
                >
                  / forever
                </Text>
              </Flex>
              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Public page for scheduling meetings
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Configurable availability
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Web3 powered meeting room
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Email notifications (optional)
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Single meeting configuration
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Single integration with Google calendar, iCloud, Office 365 or
                  WebDAV
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Fixed booking link with wallet address
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px">
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Only 1-1 meetings
                </Text>
              </HStack>
            </Box>
            <Button
              w="100%"
              h="78px"
              borderTopRadius={0}
              borderBottomRadius="xl"
              p={6}
              justifyContent="left"
              colorScheme="orange"
            >
              Go PRO
            </Button>
          </Box>
        </SlideFade>

        <SlideFade
          in={isCardsContainerVisible}
          delay={0.7}
          offsetY={-50}
          reverse={false}
        >
          <Box
            background="rgba(251, 199, 183, 0.15)"
            backdropFilter="12.5px"
            borderTopRadius={0}
            borderBottomRadius="xl"
          >
            <Box px={6} py={6}>
              <Text fontSize="lg" color="primary.400" mb={2}>
                Free
              </Text>
              <Flex mb={6}>
                <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                  $0
                </Text>
                <Text
                  fontSize="md"
                  fontWeight="bold"
                  color="neutral.100"
                  ml={2}
                >
                  / forever
                </Text>
              </Flex>
              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Public page for scheduling meetings
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Configurable availability
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Web3 powered meeting room
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Email notifications (optional)
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Single meeting configuration
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Single integration with Google calendar, iCloud, Office 365 or
                  WebDAV
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Fixed booking link with wallet address
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px">
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Only 1-1 meetings
                </Text>
              </HStack>
            </Box>
            <Button
              w="100%"
              h="78px"
              borderTopRadius={0}
              borderBottomRadius="xl"
              p={6}
              justifyContent="left"
            >
              Notify me
            </Button>
          </Box>
        </SlideFade>

        <SlideFade
          in={isCardsContainerVisible}
          delay={0.8}
          offsetY={-50}
          reverse={false}
        >
          <Box
            background="rgba(251, 199, 183, 0.15)"
            backdropFilter="12.5px"
            borderTopRadius={0}
            borderBottomRadius="xl"
          >
            <Box px={6} py={6}>
              <Text fontSize="lg" color="primary.400" mb={2}>
                Free
              </Text>
              <Flex mb={6}>
                <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                  $0
                </Text>
                <Text
                  fontSize="md"
                  fontWeight="bold"
                  color="neutral.100"
                  ml={2}
                >
                  / forever
                </Text>
              </Flex>
              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Public page for scheduling meetings
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Configurable availability
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Web3 powered meeting room
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="primary.400">
                  <BsCheck />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Email notifications (optional)
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Single meeting configuration
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Single integration with Google calendar, iCloud, Office 365 or
                  WebDAV
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px" mb={3}>
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Fixed booking link with wallet address
                </Text>
              </HStack>

              <HStack gap="10px" maxW="228px">
                <Circle bg="neutral.100">
                  <IoMdClose />
                </Circle>
                <Text fontSize="sm" color="neutral.100">
                  Only 1-1 meetings
                </Text>
              </HStack>
            </Box>
            <Button
              w="100%"
              h="78px"
              borderTopRadius={0}
              borderBottomRadius="xl"
              p={6}
              justifyContent="left"
            >
              Notify me
            </Button>
          </Box>
        </SlideFade>
      </Flex>

      <Box display={{ base: 'block', sm: 'none' }} mb={6}>
        <Swiper slidesPerView={1.1} spaceBetween={10}>
          <SwiperSlide>
            <Box
              background="rgba(251, 199, 183, 0.15)"
              backdropFilter="12.5px"
              borderTopRadius={0}
              borderBottomRadius="xl"
            >
              <Box px={6} py={6}>
                <Text fontSize="lg" color="primary.400" mb={2}>
                  Free
                </Text>
                <Flex mb={6}>
                  <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                    $0
                  </Text>
                  <Text
                    fontSize="md"
                    fontWeight="bold"
                    color="neutral.100"
                    ml={2}
                  >
                    / forever
                  </Text>
                </Flex>
                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Public page for scheduling meetings
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Configurable availability
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Web3 powered meeting room
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Email notifications (optional)
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Single meeting configuration
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Single integration with Google calendar, iCloud, Office 365
                    or WebDAV
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Fixed booking link with wallet address
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px">
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Only 1-1 meetings
                  </Text>
                </HStack>
              </Box>
              <Button
                w="100%"
                h="78px"
                borderTopRadius={0}
                borderBottomRadius="xl"
                p={6}
                justifyContent="left"
                colorScheme="orange"
              >
                Try for FREE
              </Button>
            </Box>
          </SwiperSlide>
          <SwiperSlide>
            <Box
              background="rgba(251, 199, 183, 0.15)"
              backdropFilter="12.5px"
              borderTopRadius={0}
              borderBottomRadius="xl"
            >
              <Box px={6} py={6}>
                <Text fontSize="lg" color="primary.400" mb={2}>
                  Free
                </Text>
                <Flex mb={6}>
                  <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                    $0
                  </Text>
                  <Text
                    fontSize="md"
                    fontWeight="bold"
                    color="neutral.100"
                    ml={2}
                  >
                    / forever
                  </Text>
                </Flex>
                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Public page for scheduling meetings
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Configurable availability
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Web3 powered meeting room
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Email notifications (optional)
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Single meeting configuration
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Single integration with Google calendar, iCloud, Office 365
                    or WebDAV
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Fixed booking link with wallet address
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px">
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Only 1-1 meetings
                  </Text>
                </HStack>
              </Box>
              <Button
                w="100%"
                h="78px"
                borderTopRadius={0}
                borderBottomRadius="xl"
                p={6}
                justifyContent="left"
                colorScheme="orange"
              >
                Try for FREE
              </Button>
            </Box>
          </SwiperSlide>
          <SwiperSlide>
            <Box
              background="rgba(251, 199, 183, 0.15)"
              backdropFilter="12.5px"
              borderTopRadius={0}
              borderBottomRadius="xl"
            >
              <Box px={6} py={6}>
                <Text fontSize="lg" color="primary.400" mb={2}>
                  Free
                </Text>
                <Flex mb={6}>
                  <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                    $0
                  </Text>
                  <Text
                    fontSize="md"
                    fontWeight="bold"
                    color="neutral.100"
                    ml={2}
                  >
                    / forever
                  </Text>
                </Flex>
                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Public page for scheduling meetings
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Configurable availability
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Web3 powered meeting room
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Email notifications (optional)
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Single meeting configuration
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Single integration with Google calendar, iCloud, Office 365
                    or WebDAV
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Fixed booking link with wallet address
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px">
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Only 1-1 meetings
                  </Text>
                </HStack>
              </Box>
              <Button
                w="100%"
                h="78px"
                borderTopRadius={0}
                borderBottomRadius="xl"
                p={6}
                justifyContent="left"
                colorScheme="orange"
              >
                Try for FREE
              </Button>
            </Box>
          </SwiperSlide>
          <SwiperSlide>
            <Box
              background="rgba(251, 199, 183, 0.15)"
              backdropFilter="12.5px"
              borderTopRadius={0}
              borderBottomRadius="xl"
            >
              <Box px={6} py={6}>
                <Text fontSize="lg" color="primary.400" mb={2}>
                  Free
                </Text>
                <Flex mb={6}>
                  <Text fontSize="3xl" fontWeight="bold" color="neutral.100">
                    $0
                  </Text>
                  <Text
                    fontSize="md"
                    fontWeight="bold"
                    color="neutral.100"
                    ml={2}
                  >
                    / forever
                  </Text>
                </Flex>
                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Public page for scheduling meetings
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Configurable availability
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Web3 powered meeting room
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="primary.400">
                    <BsCheck />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Email notifications (optional)
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Single meeting configuration
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Single integration with Google calendar, iCloud, Office 365
                    or WebDAV
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px" mb={3}>
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Fixed booking link with wallet address
                  </Text>
                </HStack>

                <HStack gap="10px" maxW="228px">
                  <Circle bg="neutral.100">
                    <IoMdClose />
                  </Circle>
                  <Text fontSize="sm" color="neutral.100">
                    Only 1-1 meetings
                  </Text>
                </HStack>
              </Box>
              <Button
                w="100%"
                h="78px"
                borderTopRadius={0}
                borderBottomRadius="xl"
                p={6}
                justifyContent="left"
                colorScheme="orange"
              >
                Try for FREE
              </Button>
            </Box>
          </SwiperSlide>
        </Swiper>
      </Box>

      <Text fontSize="2xl" color="neutral.100">
        Start for free, go Pro, or power your DAO with more organization and
        transparency.
      </Text>
    </Box>
  )
}
