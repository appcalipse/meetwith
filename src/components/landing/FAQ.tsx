import { Box, Button, Heading, Icon, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useState } from 'react'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'

interface FaqItem {
  title: string
  body: string
}

const faqs: FaqItem[] = [
  {
    title:
      'What is Meetwith and how is it different from other scheduling tools?',
    body: "Meetwith is a decentralized group meeting scheduler built for teams, DAOs, and communities. It's designed to make coordinating multi-person meetings simple, flexible, and collaborative. While we do have 1:1 we give you a full 360 experience with group features and payment options that integrates Web3, Stripe and invoicing.",
  },
  {
    title: 'How does scheduling group meetings work?',
    body: 'You can either find the best available time across all members using our discovery tool, or set a fixed time (recurrent or one-off) and notify the group.',
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
    body: 'Absolutely! Create multiple session types with different durations, prices, and descriptions. For example: 30-min quick calls at $50, 90-min strategy sessions at $200.',
  },
]

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

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <Box
      as="section"
      id="faq"
      position="relative"
      w="100%"
      overflow="hidden"
      px={{ base: 4, md: 8, lg: '131px' }}
      py={{ base: 16, md: 24 }}
      scrollMarginTop={{ base: '80px', md: '100px' }}
    >
      <GridBackground />

      <Box maxW="1152px" mx="auto" w="100%" position="relative" zIndex={1}>
        <Heading
          as="h2"
          fontSize={{ base: '3xl', md: '4xl', lg: '48.83px' }}
          fontWeight="bold"
          color="neutral.0"
          lineHeight={1.2}
          mb={10}
        >
          Frequently Asked Questions
        </Heading>

        <VStack spacing={4} w="100%">
          {faqs.map((faq, index) => (
            <Box
              key={index}
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
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                _hover={{ bg: 'rgba(245, 247, 250, 0.02)' }}
                transition="background 0.2s"
              >
                <Heading
                  as="h3"
                  fontSize={{ base: 'lg', md: 'xl' }}
                  fontWeight="bold"
                  color="neutral.0"
                  lineHeight={1.4}
                  pr={4}
                  textAlign="left"
                >
                  {faq.title}
                </Heading>

                <Icon
                  as={openIndex === index ? BiChevronUp : BiChevronDown}
                  boxSize={6}
                  color="primary.400"
                  flexShrink={0}
                  transition="transform 0.2s"
                />
              </Box>

              {openIndex === index && (
                <Box px={6} pb={6}>
                  <Box
                    fontWeight="medium"
                    color="neutral.100"
                    fontSize="md"
                    lineHeight={1.7}
                  >
                    {faq.body}
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </VStack>

        <Box mt={8}>
          <Button
            as={NextLink}
            href="/faq"
            colorScheme="orangeButton"
            color="neutral.0"
            h={12}
            px={5}
            py={2}
            rounded="lg"
            fontWeight="semibold"
          >
            See all FAQs
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default Faq
