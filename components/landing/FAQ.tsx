import {Container, Box, Heading, Text, Link} from '@chakra-ui/react';

export default function FAQ() {
  return (
    <Container maxW="container.lg">
      <Box p={4}>
        <Heading size="xl" pb={8}>
          Comon questions
        </Heading>
        <Heading size="lg" py={4}>
          Why creating another sheduling tool?
        </Heading>
        <Text>
          We believe web3 still lacks some important tools widely available in
          web 2.0, sscheduling meetings being one of them. We want to provide a
          great experience of meet scheduling at the same time that our product
          meets the ethos of a decentralized web (and is buil with the strong
          colaboration of our users). Also, enough of using your email to create
          account and logo into tools right?
        </Text>
        <Heading size="lg" py={4}>
          When is this ging live?
        </Heading>
        <Text>Soon :)</Text>
        <Heading size="lg" py={4}>
          When is soon?
        </Heading>
        <Text>
          Optimistic scenario, before end of 2021. Realistic scenario, mid Q1 of
          2022.
        </Text>
        <Heading size="lg" py={4}>
          How can I know what is comming next and colaborate?
        </Heading>
        <Text>
          Check our high level feature roadmap{' '}
          <Link href="https://meet-with-wallet.sleekplan.app/" target="_blank">
            here
          </Link>{' '}
          and vote on what you want to be done next. You can also be active in
          conversations in our <Link>Discord</Link>
        </Text>
      </Box>
    </Container>
  );
}
