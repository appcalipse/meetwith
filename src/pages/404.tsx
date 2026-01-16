import {
  Button,
  Container,
  Heading,
  Image,
  Spacer,
  Text,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'

export default function NotFound() {
  return (
    <>
      <Container flex={1} maxW="7xl" mt={8} my={{ base: 12, md: 24 }}>
        <VStack alignItems="center" px={6} py={10}>
          <Heading
            as="h2"
            backgroundClip="text"
            bgGradient="linear(to-r, primary.400, primary.600)"
            display="inline-block"
            size="2xl"
          >
            Ops
          </Heading>
          <Spacer />
          <Image alt="404" src="/assets/404.svg" width="300px" />
          <Spacer />
          <Text color={'gray.500'} my={6}>
            The page you&apos;re looking for does not seem to exist
          </Text>
          <Spacer />
          <Button
            colorScheme="primary"
            onClick={() => router.push('/')}
            variant="solid"
          >
            Go to Home
          </Button>
          <Spacer />
        </VStack>
      </Container>
    </>
  )
}
