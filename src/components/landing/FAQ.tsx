import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Heading,
} from '@chakra-ui/react'

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
        <AccordionItem mb={2} background="neutral.50" p={4}>
          <h2>
            <AccordionButton>
              <Box as="span" flex={1} textAlign="left">
                Why create yet another calendar/scheduling tool?
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem mb={2} background="neutral.50" p={4}>
          <h2>
            <AccordionButton>
              <Box as="span" flex={1} textAlign="left">
                Why using my wallet to connect/use the tool?
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem mb={2} background="neutral.50" p={4}>
          <h2>
            <AccordionButton>
              <Box as="span" flex={1} textAlign="left">
                Which data is public and which is private?
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem mb={2} background="neutral.50" p={4}>
          <h2>
            <AccordionButton>
              <Box as="span" flex={1} textAlign="left">
                Who can I schedule a meeting with?
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem mb={2} background="neutral.50" p={4}>
          <h2>
            <AccordionButton>
              <Box as="span" flex={1} textAlign="left">
                How can I know what is coming next and collaborate?
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem mb={2} background="neutral.50" p={4}>
          <h2>
            <AccordionButton>
              <Box as="span" flex={1} textAlign="left">
                Contribute to Meet with Wallet
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Box>
  )
}
