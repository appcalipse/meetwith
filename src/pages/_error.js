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
      <Container maxW="7xl" mt={8} flex={1} my={{ base: 12, md: 24 }}>
        <VStack alignItems="center" py={10} px={6}>
          <Heading
            display="inline-block"
            as="h2"
            size="2xl"
            bgGradient="linear(to-r, primary.400, primary.600)"
            backgroundClip="text"
          >
            Something went wrong
          </Heading>
          <Spacer />
          <Image src="/assets/404.svg" alt="404" width="300px" />
          <Spacer />
          <Text color={'gray.500'} my={6} textAlign="center">
            We encountered an unexpected error. Our team has been notified and
            is working to fix it.
          </Text>
          <Spacer />
          <Button
            onClick={() => router.reload()}
            colorScheme="primary"
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

MyError.getInitialProps = async contextData => {
  const { res, err, asPath } = contextData
  const errorInitialProps = await NextErrorComponent.getInitialProps({
    res,
    err,
  })
  await Sentry.captureUnderscoreErrorException(contextData)
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
    posthog.captureException(err)

    // Flushing before returning is necessary if deploying to Vercel, see
    // https://vercel.com/docs/platform/limits#streaming-responses
    await Sentry.flush(2000)

    return errorInitialProps
  }

  // If this point is reached, getInitialProps was called without any
  // information about what the error might be. This is unexpected and may
  // indicate a bug introduced in Next.js, so record it in Sentry
  Sentry.captureException(
    new Error(`_error.js getInitialProps missing data at path: ${asPath}`)
  )
  new Error(`_error.js getInitialProps missing data at path: ${asPath}`)
  posthog.captureException(
    new Error(`_error.js getInitialProps missing data at path: ${asPath}`)
  )
  await Sentry.flush(2000)

  return errorInitialProps
}

export default MyError
