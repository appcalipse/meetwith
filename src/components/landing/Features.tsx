import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Image,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

export interface Slides {
  id: number
  price: string
  title: string
  about: string
}

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
