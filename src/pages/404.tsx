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
      <Container maxW="7xl" mt={8} flex={1} my={{ base: 12, md: 24 }}>
        <VStack alignItems="center" py={10} px={6}>
          <Heading
            display="inline-block"
            as="h2"
            size="2xl"
            bgGradient="linear(to-r, primary.400, primary.600)"
            backgroundClip="text"
          >
            Ops
          </Heading>
          <Spacer />
          <Image src="/assets/404.svg" alt="404" width="300px" />
          <Spacer />
          <Text color={'gray.500'} my={6}>
            The page you&apos;re looking for does not seem to exist
          </Text>
          <Spacer />
          <Button
            onClick={() => router.push('/')}
            colorScheme="primary"
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
