import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Heading,
  List,
  ListItem,
  VStack,
} from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { BiCaretDown, BiCaretUp } from 'react-icons/bi'

interface Faq {
  title: string
  body: string | ReactElement
}

const faqs: Faq[] = [
  {
    title:
      'What is Meetwith and how is it different from other scheduling tools?',
    body: "Meetwith is a decentralized group meeting scheduler built for teams, DAOs, and communities. It's designed to make coordinating multi-person meetings simple, flexible, and collaborative. While we do have 1:1 we give you a full 360 experience with group features and payment options that integrates Web3, Stripe and invoicing.",
  },
  {
    title: 'How does scheduling group meetings work?',
    body: (
      <>
        <p>You can either:</p>
        <List styleType="disc" ml={4} mt={1} spacing={1}>
          <ListItem>
            Find the best available time across all members using our discovery
            tool, or
          </ListItem>
          <ListItem>
            Set a fixed time (recurrent or one-off) and notify the group.
          </ListItem>
        </List>
      </>
    ),
  },
  {
    title: 'What payment methods does Meetwith accept?',
    body: 'Meetwith supports crypto payments through Arbitrum and Celo networks, traditional payments via Stripe, and manual invoicing. You choose what works best for you and your clients.',
  },
  {
    title: 'Do invitees need a Meetwith account to book or join a meeting?',
    body: 'No, participants can schedule or join meetings with just a link. Creating an account is optional.',
  },
  {
    title: 'Can I offer different pricing for different session types?',
    body: (
      <>
        <p>
          Absolutely! Create multiple session types with different durations,
          prices, and descriptions. For example: 30-min quick calls at $50,
          90-min strategy sessions at $200.
        </p>
        <p>
          These five directly address the biggest conversion questions from your
          customer discovery interviews and remove the main barriers preventing
          sign-ups from your key segments.
        </p>
      </>
    ),
  },
]

function Faq() {
  return (
    <VStack
      py={{ base: '10', md: '20' }}
      px={{ base: 6, md: 40 }}
      maxW="1360px"
      mx="auto"
      id="faq"
      scrollMarginTop={{ base: '60px', md: '20px' }}
      gap={10}
      alignItems="center"
      borderWidth={1}
      borderColor="#2F3847"
      rounded={10}
      bg={{
        md: 'none',
        base: 'neutral.900',
      }}
    >
      <Heading
        fontSize={{
          md: '4xl',
          base: '2xl',
        }}
      >
        Frequently Asked Questions
      </Heading>
      <Accordion allowToggle w="100%">
        {faqs.map(faq => (
          <AccordionItem
            mb={2}
            background="neutral.800"
            p={2}
            key={faq.title}
            w="100%"
            rounded={10}
          >
            {({ isExpanded }) => (
              <>
                <AccordionButton color="neutral.100">
                  <Box as="span" flex={1} textAlign="left">
                    <strong>{faq.title}</strong>
                  </Box>
                  {!isExpanded ? (
                    <BiCaretDown width={24} height={24} />
                  ) : (
                    <BiCaretUp width={24} height={24} />
                  )}
                </AccordionButton>
                <AccordionPanel pb={2} color="neutral.100">
                  {faq.body}
                </AccordionPanel>
              </>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </VStack>
  )
}
export default Faq
