import {
  Box,
  DarkMode,
  Heading,
  Icon,
  Link,
  Text,
  useColorMode,
  VStack,
} from '@chakra-ui/react'
import type { NextPage } from 'next'
import NextHead from 'next/head'
import NextLink from 'next/link'
import { useEffect, useState } from 'react'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'
import { FiArrowLeft } from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const faqCategories = [
  {
    title: 'General',
    items: [
      {
        q: 'What is Meetwith and how is it different from other scheduling tools?',
        a: "Meetwith is a decentralized group meeting scheduler built for teams, DAOs, and communities. It's designed to make coordinating multi-person meetings simple, flexible, and collaborative. While we do have 1:1 we give you a full 360 experience with group features and payment options that integrates Web3, Stripe and invoicing.",
      },
      {
        q: 'How does scheduling group meetings work?',
        a: 'You can either find the best available time across all members using our discovery tool, or set a fixed time (recurrent or one-off) and notify the group.',
      },
      {
        q: 'What payment methods does Meetwith accept?',
        a: 'Meetwith supports crypto payments through Arbitrum and Celo networks, traditional payments via Stripe, and manual invoicing. You choose what works best for you and your clients.',
      },
      {
        q: 'Do invitees need a Meetwith account to book or join a meeting?',
        a: 'No — participants can schedule or join meetings with just a link. Creating an account is optional.',
      },
      {
        q: 'Can I offer different pricing for different session types?',
        a: 'Absolutely! Create multiple session types with different durations, prices, and descriptions. For example: 30-min quick calls at $50, 90-min strategy sessions at $200.',
      },
      {
        q: 'Can I use Meetwith for individual (1:1) meetings too?',
        a: 'Yes! You can create multiple meeting types or sessions, including one-on-one meetings, each with its own unique link.',
      },
      {
        q: 'Is there a limit to the number of meetings or groups I can create?',
        a: 'Nope — create as many meetings or groups as you need. Meetwith scales with you.',
      },
    ],
  },
  {
    title: 'Groups & Contacts',
    items: [
      {
        q: 'How do Groups work in Meetwith?',
        a: 'Groups let you organize your contacts by team, department, project, or organization. You can assign roles, schedule meetings, and set reminders — all from one shared space.',
      },
      {
        q: 'Can I make someone else an admin in a group?',
        a: 'Yes, group members can be promoted to admin to help manage meetings and members.',
      },
      {
        q: 'How do I add people to a group?',
        a: 'You can invite people directly or share a unique invite link — no account required for joining.',
      },
      {
        q: 'Can I add somebody as a contact if we are not in a shared Group?',
        a: 'You can invite any colleague or friend to be your contact using their Meetwith ID or email information. They will receive the invite and appear in your contact list once accepted.',
      },
    ],
  },
  {
    title: 'Integrations & Calendars',
    items: [
      {
        q: 'What video platforms does Meetwith support?',
        a: 'You can integrate with Google Meet, Zoom, Huddle01, or Jitsi Meet when creating a meeting.',
      },
      {
        q: 'Can I connect my external calendars?',
        a: 'Yes! You can connect unlimited calendars and view all your availability in one place.',
      },
      {
        q: 'How does Meetwith handle time zones?',
        a: "You can set your availability based on your time zone, and we'll take care of converting times for everyone else.",
      },
    ],
  },
  {
    title: 'Payments & Pricing',
    items: [
      {
        q: 'How do I set up paid sessions?',
        a: 'When creating a session, simply toggle on the payment option and set your price. You can configure different rates for different session types.',
      },
      {
        q: 'Do I need a crypto wallet to receive payments?',
        a: 'When you create your Meetwith account, you get your own wallet. But if you prefer traditional payments, you can use Stripe.',
      },
      {
        q: 'What are the transaction fees?',
        a: 'Crypto payments have significantly lower fees than traditional processors, with no 2.9% Stripe fee. Stripe payments follow their standard rates, and Meetwith does not charge percentage-based fees on top.',
      },
      {
        q: 'How quickly do I receive payments?',
        a: 'Crypto payments hit your wallet instantly after the transaction confirms. Stripe payments follow their standard payout schedule, typically 2 to 7 days.',
      },
      {
        q: 'Can I offer free and paid sessions at the same time?',
        a: 'Yes! Create different session types — some free like discovery calls and some paid like coaching sessions. Each gets its own booking link.',
      },
    ],
  },
  {
    title: 'Privacy & Access',
    items: [
      {
        q: 'Is my data secure?',
        a: 'Yes. Meetwith is built with privacy in mind and does not sell or share your data.',
      },
      {
        q: 'Can I customize my Meetwith URL?',
        a: 'Yes! Create a personalized link like meetwith.xyz/yourname for easier sharing and better recognition.',
      },
      {
        q: 'Can I customize my public booking page?',
        a: 'Yes! You have full control over your public scheduling page. Add custom descriptions, service offerings, and make it feel like your brand.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GridBackground() {
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      pointerEvents="none"
      overflow="hidden"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        sx={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          maskImage:
            'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)',
        }}
      />
      <Box
        position="absolute"
        top="-10%"
        left="-5%"
        w="60%"
        h="70%"
        sx={{
          background:
            'radial-gradient(ellipse, rgba(244,103,57,0.12) 0%, transparent 70%)',
        }}
      />
    </Box>
  )
}

interface AccordionItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: AccordionItemProps) {
  return (
    <Box
      w="100%"
      bg="neutral.900"
      borderWidth={1}
      borderColor="neutral.700"
      rounded="lg"
      overflow="hidden"
      sx={{ backdropFilter: 'blur(12.5px)' }}
    >
      <Box
        as="button"
        w="100%"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={6}
        textAlign="left"
        onClick={onToggle}
        _hover={{ bg: 'rgba(245, 247, 250, 0.02)' }}
        transition="background 0.2s"
      >
        <Heading
          as="h3"
          fontSize={{ base: 'md', md: 'lg' }}
          fontWeight="bold"
          color="neutral.0"
          lineHeight={1.4}
          pr={4}
          textAlign="left"
        >
          {question}
        </Heading>

        <Icon
          as={isOpen ? BiChevronUp : BiChevronDown}
          boxSize={6}
          color="primary.400"
          flexShrink={0}
          transition="transform 0.2s"
        />
      </Box>

      {isOpen && (
        <Box px={6} pb={6}>
          <Text
            fontWeight="medium"
            color="neutral.100"
            fontSize="md"
            lineHeight={1.7}
          >
            {answer}
          </Text>
        </Box>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const FaqPage: NextPage = () => {
  const { colorMode, setColorMode } = useColorMode()

  // Per-category open state: key = category title, value = open item index or null
  const [openStates, setOpenStates] = useState<Record<string, number | null>>(
    () => Object.fromEntries(faqCategories.map(cat => [cat.title, null]))
  )

  useEffect(() => {
    if (colorMode !== 'dark') {
      setColorMode('dark')
    }
  }, [colorMode, setColorMode])

  const handleToggle = (categoryTitle: string, index: number) => {
    setOpenStates(prev => ({
      ...prev,
      [categoryTitle]: prev[categoryTitle] === index ? null : index,
    }))
  }

  return (
    <main>
      <NextHead>
        <title>FAQ — Meetwith</title>
        <meta
          name="description"
          content="Frequently asked questions about Meetwith — the decentralized group meeting scheduler."
        />
      </NextHead>

      <DarkMode>
        <Box
          position="relative"
          bg="neutral.900"
          minH="100vh"
          overflow="hidden"
          py={{ base: 24, md: 32 }}
          px={{ base: 4, md: 8, lg: '131px' }}
        >
          <GridBackground />

          <Box maxW="1152px" mx="auto" position="relative" zIndex={1}>
            {/* Back link */}
            <Link
              as={NextLink}
              href="/"
              color="primary.400"
              fontSize="sm"
              fontWeight="semibold"
              mb={8}
              display="inline-flex"
              alignItems="center"
              gap={2}
              _hover={{ textDecoration: 'none', color: 'primary.300' }}
              transition="color 0.2s"
            >
              <Icon as={FiArrowLeft} boxSize={4} />
              Back to home
            </Link>

            {/* Page heading */}
            <Heading
              as="h1"
              color="neutral.0"
              fontSize={{ base: '3xl', md: '5xl' }}
              fontWeight="bold"
              lineHeight={1.2}
              mt={6}
              mb={2}
            >
              Frequently Asked Questions
            </Heading>
            <Text
              color="neutral.300"
              fontSize={{ base: 'md', md: 'lg' }}
              mb={14}
            >
              Everything you need to know about Meetwith.
            </Text>

            {/* Categories */}
            {faqCategories.map(category => (
              <Box key={category.title} mb={12}>
                <Heading
                  as="h2"
                  fontSize="xl"
                  fontWeight="bold"
                  color="primary.400"
                  mb={4}
                >
                  {category.title}
                </Heading>

                <VStack spacing={3} w="100%">
                  {category.items.map((item, i) => (
                    <AccordionItem
                      key={i}
                      question={item.q}
                      answer={item.a}
                      isOpen={openStates[category.title] === i}
                      onToggle={() => handleToggle(category.title, i)}
                    />
                  ))}
                </VStack>
              </Box>
            ))}
          </Box>
        </Box>
      </DarkMode>
    </main>
  )
}

export default FaqPage
