import {
  Container,
  Box,
  Heading,
  Text,
  Link,
  useColorModeValue,
} from '@chakra-ui/react'

export default function FAQ() {
  return (
    <Container maxW="container.lg" id="faq">
      <Box p={4} mb={8} color={useColorModeValue('gray.500', 'gray.300')}>
        <Heading size="xl" pb={8} textColor="orange.400">
          Common questions
        </Heading>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          Why creating another scheduling tool?
        </Heading>
        <Text pb={2}>
          We believe web3 still lacks some important tools widely available in
          web 2.0, scheduling meetings being one of them. We want to provide a
          great experience of meet scheduling at the same time that our product
          meets the ethos of a decentralized web (and is build with the strong
          colaboration of our users). Also, enough of using your email to create
          account and logo into tools right?
        </Text>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          Which data is public and which is private?
        </Heading>
        <Text pb={2}>
          Your public data consists in your account information (calendar URL,
          optional description, any relevant links, meeting types and duration,
          an internal public key and an encoded private key - not your wallet's,
          we generate a pair for the application), and your meet slots (times
          that your account have some meeting, so no one else can schedule it).
          The public data is stored in our servers to provide a smoother and
          faster experi experience to all users. All other data regarding your
          meetings (participants, description/comments, meeting link, etc) are
          stored on IPFS, encoded with your internal private key (that is only
          know by you, encrypted with your wallet signature). This means that
          only participants of a meeting know information about it and who are
          they meeting with - Yes, not even ourselves know about it.
        </Text>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          When is this going live?
        </Heading>
        <Text pb={2}>Soon :)</Text>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          When is soon?
        </Heading>
        <Text pb={2}>
          Optimistic scenario, before end of 2021. Realistic scenario, mid Q1 of
          2022.
        </Text>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          How can I know what is coming next and colaborate?
        </Heading>
        <Text pb={2}>
          Check our high level feature roadmap{' '}
          <Link href="https://meet-with-wallet.sleekplan.app/" target="_blank">
            here
          </Link>{' '}
          and vote on what you want to be done next. You can also be active in
          conversations in our <Link>Discord</Link>
        </Text>
      </Box>
    </Container>
  )
}
