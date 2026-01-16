import {
  Button,
  Container,
  Heading,
  Image,
  Spacer,
  Text,
  VStack,
} from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import NextErrorComponent from 'next/error'
import { useRouter } from 'next/router'
import posthog from 'posthog-js'

const MyError = ({ statusCode, hasGetInitialPropsRun, err }) => {
  if (!hasGetInitialPropsRun && err) {
    // getInitialProps is not called in case of
    // https://github.com/vercel/next.js/issues/8592. As a workaround, we pass
    // err via _app.js so it can be captured
    Sentry.captureException(err)
    posthog.captureException(err)
    // Flushing is not required in this case as it only happens on the client
  }
  const router = useRouter()
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
            Something went wrong
          </Heading>
          <Spacer />
          <Image alt="404" src="/assets/404.svg" width="300px" />
          <Spacer />
          <Text color={'gray.500'} my={6} textAlign="center">
            We encountered an unexpected error. Our team has been notified and
            is working to fix it.
          </Text>
          <Spacer />
          <Button
            colorScheme="primary"
            onClick={() => router.reload()}
            variant="solid"
          >
            Reload page
          </Button>
          <Spacer />
        </VStack>
      </Container>
    </>
  )
}

MyError.getInitialProps = async ({ res, err, asPath }) => {
  const errorInitialProps = await NextErrorComponent.getInitialProps({
    err,
    res,
  })

  // Workaround for https://github.com/vercel/next.js/issues/8592, mark when
  // getInitialProps has run
  errorInitialProps.hasGetInitialPropsRun = true

  // Running on the server, the response object (`res`) is available.
  //
  // Next.js will pass an err on the server if a page's data fetching methods
  // threw or returned a Promise that rejected
  //
  // Running on the client (browser), Next.js will provide an err if:
  //
  //  - a page's `getInitialProps` threw or returned a Promise that rejected
  //  - an exception was thrown somewhere in the React lifecycle (render,
  //    componentDidMount, etc) that was caught by Next.js's React Error
  //    Boundary. Read more about what types of exceptions are caught by Error
  //    Boundaries: https://reactjs.org/docs/error-boundaries.html

  if (err) {
    Sentry.captureException(err)
    posthog.captureException(err)

    // Flushing before returning is necessary if deploying to Vercel, see
    // https://vercel.com/docs/platform/limits#streaming-responses
    await Sentry.flush(2000)

    return errorInitialProps
  }

  return errorInitialProps
}

export default MyError
