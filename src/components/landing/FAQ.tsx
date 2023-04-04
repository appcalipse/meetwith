import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Heading,
} from '@chakra-ui/react'

interface Faq {
  title: string
  body: string
}

const faqs: Faq[] = [
  {
    title: 'Why create yet another calendar/scheduling tool?',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enimad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    title: 'Why using my wallet to connect/use the tool?',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enimad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    title: 'Which data is public and which is private?',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enimad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    title: 'Who can I schedule a meeting with?',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enimad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    title: 'How can I know what is coming next and collaborate?',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enimad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    title: 'Contribute to Meet with Wallet',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enimad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
]

export function Faq() {
  return (
    <Box
      py={{ base: '10', md: '20' }}
      px={{ base: 2, md: 40 }}
      maxW="1360px"
      mx="auto"
    >
      <Heading fontSize="5xl" color="neutral.100" mb={10}>
        FAQ
      </Heading>
      <Accordion allowToggle>
        {faqs.map(faq => (
          <AccordionItem mb={2} background="neutral.50" p={2} key={faq.title}>
            <AccordionButton color="neutral.800">
              <Box as="span" flex={1} textAlign="left">
                {faq.title}
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={2} color="neutral.800">
              {faq.body}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Box>
  )
}
