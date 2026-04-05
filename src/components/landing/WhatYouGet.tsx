import { Box, Flex, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import { FiEye, FiLayout, FiRefreshCw, FiShield, FiZap } from 'react-icons/fi'

const FEATURES = [
  {
    icon: FiRefreshCw,
    title: 'Reusable groups',
    description:
      'Reuse the same group for every recurring call — no starting from scratch.',
  },
  {
    icon: FiEye,
    title: 'Real-time tracking',
    description:
      "See who's in and who hasn't shared availability yet. No inbox archaeology.",
  },
  {
    icon: FiZap,
    title: '90-second scheduling',
    description:
      'Schedule recurring sessions faster once your group is connected. The second meeting takes 90 seconds.',
  },
  {
    icon: FiShield,
    title: 'Privacy-safe',
    description:
      'Privacy-safe scheduling across mixed calendars — Google, Outlook, iCloud, or none at all.',
  },
  {
    icon: FiLayout,
    title: 'One shared place',
    description:
      'One shared place for scheduling decisions. No scattered threads or lost emails.',
  },
]

function WhatYouGet() {
  return (
    <Box
      as="section"
      position="relative"
      w="100%"
      overflow="hidden"
      px={{ base: 4, md: 8, lg: '131px' }}
      py={{ base: 10, md: 16 }}
    >
      <Flex
        maxW="1152px"
        mx="auto"
        w="100%"
        direction={{ base: 'column', lg: 'row' }}
        gap={{ base: 12, lg: 24 }}
      >
        {/* Left sticky heading */}
        <Box
          w={{ base: 'auto', lg: '360px' }}
          flexShrink={0}
          position={{ base: 'static', lg: 'sticky' }}
          top={{ lg: 32 }}
          alignSelf={{ lg: 'flex-start' }}
        >
          <Heading
            as="h2"
            fontSize={{ base: '3xl', md: '4xl', lg: '48.83px' }}
            fontWeight="bold"
            color="neutral.0"
            lineHeight={1.2}
            mb={4}
          >
            What you get
          </Heading>
          <Text
            fontWeight="medium"
            color="neutral.300"
            fontSize="md"
            lineHeight={1.5}
          >
            Everything you need to go from &quot;we should meet&quot; to
            &quot;it&apos;s on the calendar&quot; — without the overhead.
          </Text>
        </Box>

        {/* Right feature list */}
        <VStack flex={1} spacing={0} alignItems="stretch">
          {FEATURES.map(({ icon, title, description }, index) => (
            <Flex
              key={index}
              alignItems="flex-start"
              gap={5}
              py={7}
              borderBottomWidth={index < FEATURES.length - 1 ? 1 : 0}
              borderBottomColor="neutral.800"
              role="group"
              cursor="default"
              _first={{ pt: 0 }}
            >
              {/* Icon circle */}
              <Box
                w={10}
                h={10}
                rounded="full"
                borderWidth={1}
                borderColor="neutral.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
                transition="all 0.3s"
                _groupHover={{
                  borderColor: 'primary.400',
                  bg: 'rgba(244, 103, 57, 0.1)',
                }}
              >
                <Icon
                  as={icon}
                  boxSize="18px"
                  color="neutral.500"
                  transition="color 0.3s"
                  _groupHover={{ color: 'primary.400' }}
                />
              </Box>

              {/* Text */}
              <VStack alignItems="flex-start" spacing={1} pt={1.5}>
                <Heading
                  as="h3"
                  fontSize="lg"
                  fontWeight="bold"
                  color="neutral.0"
                  lineHeight={1.3}
                  transition="color 0.3s"
                  _groupHover={{ color: 'primary.400' }}
                >
                  {title}
                </Heading>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color="neutral.300"
                  lineHeight={1.6}
                >
                  {description}
                </Text>
              </VStack>
            </Flex>
          ))}
        </VStack>
      </Flex>
    </Box>
  )
}

export default WhatYouGet
