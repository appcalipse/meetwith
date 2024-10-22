import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Link, VStack } from '@chakra-ui/react'
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Heading,
} from '@chakra-ui/react'
import { ReactElement } from 'react'
import { BiCaretDown, BiCaretUp } from 'react-icons/bi'

import { MWW_DISCORD_SERVER } from '@/utils/constants'

interface Faq {
  title: string
  body: string | ReactElement
}

const faqs: Faq[] = [
  {
    title: 'Why create yet another calendar/scheduling tool?',
    body: 'We believe web3 still lacks some important tools widely available in web 2.0, scheduling meetings being one of them. We want to provide a great experience to schedule meetings at the same time that our product meets the ethos of a decentralized web (and is built with the strong collaboration of our users). Also, enough of using your email to create an account and log into tools right?',
  },
  {
    title: 'Why using my wallet to connect/use the tool?',
    body: 'By connecting with your wallet, you will only provide a already public information (you address and public key), and you can decide which other information you want to share. Wallet connection is the new standard for web3 interactions and allow you to keep the sovereignty of your identity.',
  },
  {
    title: 'Which data is public and which is private?',
    body: "Your public data consists of your account information (calendar URL, an optional description, any relevant links, meeting types and duration, an internal public key and an encoded private key - not your wallet's, we generate a pair for the application), and your meet slots (times that your account has some meeting, so no one else can schedule it). All other data regarding your meetings (participants, description/comments, meeting link, etc) are stored encrypted, encoded with your internal private key (that is only known by you, encrypted with your wallet signature). This means that only participants of a meeting know information about it and who are they meeting with - Yes, not even ourselves know about it.",
  },
  {
    title: 'Is Meet with Wallet fully developed?',
    body: 'Meet with Wallet is a new platform, and therefore there is still a lot of work to be done, including ensuring you will not encounter any bugs while using it. For this reason we are still considering it the product in its early stage. But, this does not means that it is not supposed to work properly. If you find any bugs, please report to us in our Discord.',
  },
  {
    title: 'How can I know what is coming next and collaborate?',
    body: (
      <>
        Check our high-level feature roadmap{' '}
        <Link href="mailto:contact@meetwithwallet.xyz" isExternal>
          here
        </Link>{' '}
        and vote on what you want to be done next. You can also be an active
        member in our community through our{' '}
        <Link isExternal href={MWW_DISCORD_SERVER}>
          Discord
        </Link>
      </>
    ),
  },
]

export function Faq() {
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
      borderColor="neutral.900"
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
