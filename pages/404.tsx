import { Heading, Text, Button, Image, VStack, Spacer } from '@chakra-ui/react'
import router from 'next/router'

export default function NotFound() {
  return (
    <VStack alignItems="center" py={10} px={6}>
      <Heading
        display="inline-block"
        as="h2"
        size="2xl"
        bgGradient="linear(to-r, orange.400, orange.600)"
        backgroundClip="text"
      >
        Ops
      </Heading>
      <Spacer />
      <Image src="/assets/404.svg" alt="404" width="300px" />
      <Spacer />
      <Text color={'gray.500'} my={6}>
        The page you're looking for does not seem to exist
      </Text>
      <Spacer />
      <Button
        onClick={() => router.push('/')}
        colorScheme="orange"
        bgGradient="linear(to-r, orange.400, orange.500, orange.600)"
        color="white"
        variant="solid"
      >
        Go to Home
      </Button>
      <Spacer />
    </VStack>
  )
}
