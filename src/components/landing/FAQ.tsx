import {
  Box,
  Container,
  Heading,
  Link,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

export default function FAQ() {
  return (
    <Container maxW="7xl" id="faq">
      <Box p={4} mb={8} color={useColorModeValue('gray.500', 'gray.300')}>
        <Heading size="xl" pb={8} textColor="orange.400">
          Common questions
        </Heading>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          Why create yet another scheduling tool?
        </Heading>
        <Text pb={2}>
          We believe web3 still lacks some important tools widely available in
          web 2.0, scheduling meetings being one of them. We want to provide a
          great experience to schedule meetings at the same time that our
          product meets the ethos of a decentralized web (and is built with the
          strong collaboration of our users). Also, enough of using your email
          to create an account and log into tools right?
        </Text>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          Why using my wallet to connect/use the tool?
        </Heading>
        <Text pb={2}>
          By connecting with your wallet, you will only provide a already public
          information (you address and public key), and you can decide which
          other information you want to share. Wallet connection is the new
          standard for web3 interactions and allow you to keep the sovereignty
          of your identity.
        </Text>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          Is Meet with Wallet fully developed?
        </Heading>
        <Text pb={2}>
          Meet with Wallet is a new platform, and therefore there is still a lot
          of work to be done, including ensuring you will not encounter any bugs
          while using it. For this reason we are still considering it the
          product in its early stage. But, this does not means that it is not
          supposed to work properly. If you find any bugs, please report to us
          in our Discord.
        </Text>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          Which data is public and which is private?
        </Heading>
        <Text pb={2}>
          Your public data consists of your account information (calendar URL,
          an optional description, any relevant links, meeting types and
          duration, an internal public key and an encoded private key - not your
          wallet&apos;s, we generate a pair for the application), and your meet
          slots (times that your account has some meeting, so no one else can
          schedule it). Part of the public data is stored in our servers (to
          provide a smoother and faster experience to all users) and part on
          IPFS. All other data regarding your meetings (participants,
          description/comments, meeting link, etc) are stored on IPFS, encoded
          with your internal private key (that is only known by you, encrypted
          with your wallet signature). This means that only participants of a
          meeting know information about it and who are they meeting with - Yes,
          not even ourselves know about it.
        </Text>
        <Heading
          size="lg"
          py={4}
          color={useColorModeValue('gray.700', 'gray.100')}
        >
          How can I know what is coming next and collaborate?
        </Heading>
        <Text pb={2}>
          Check our high-level feature roadmap{' '}
          <Link
            href="https://app.dework.xyz/meet-with-wallet/mww-roadmap/board/"
            isExternal
          >
            here
          </Link>{' '}
          and vote on what you want to be done next. You can also be an active
          member in our community through our{' '}
          <Link isExternal href="https://discord.gg/an2q4xUkcR">
            Discord
          </Link>
        </Text>
      </Box>
    </Container>
  )
}
