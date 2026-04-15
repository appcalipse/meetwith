import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  Icon,
  Image,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { NextPage } from 'next'
import React from 'react'
import {
  FiCheckCircle,
  FiLink,
  FiLock,
  FiLogOut,
  FiShield,
  FiUsers,
} from 'react-icons/fi'

import { MWW_DISCORD_SERVER } from '@/utils/constants'

const Section: React.FC<{
  icon: React.ElementType
  title: string
  badge?: string
  children: React.ReactNode
}> = ({ icon, title, badge, children }) => (
  <Box w="100%" mt={12}>
    <Flex align="center" gap={3} mb={4}>
      <Icon as={icon} color="primary.400" h={7} w={7} />
      <Heading color="neutral.100" fontSize={{ base: '2xl', md: '3xl' }}>
        {title}
      </Heading>
      {badge && (
        <Badge
          colorScheme="green"
          fontSize="sm"
          px={3}
          py={1}
          borderRadius="full"
        >
          {badge}
        </Badge>
      )}
    </Flex>
    {children}
  </Box>
)

const Step: React.FC<{ number: number; children: React.ReactNode }> = ({
  number,
  children,
}) => (
  <Flex gap={4} align="flex-start">
    <Flex
      align="center"
      justify="center"
      minW="36px"
      h="36px"
      borderRadius="full"
      bg="primary.400"
      color="white"
      fontWeight="bold"
      fontSize="sm"
      mt={0.5}
      flexShrink={0}
    >
      {number}
    </Flex>
    <Text color="neutral.200" fontSize="md" lineHeight="1.7">
      {children}
    </Text>
  </Flex>
)

const ZoomGuide: NextPage = () => {
  return (
    <main>
      <Box
        bg="neutral.900"
        bgImage={{ base: 'none', md: `url('/assets/bg-abstract.svg')` }}
        bgRepeat="no-repeat"
        bgSize="cover"
        minH="100vh"
      >
        <Box
          color="neutral.100"
          pt={{ base: '10', md: '20' }}
          pb={{ base: '16', md: '24' }}
          px={{ base: 4, md: 10 }}
        >
          <VStack alignItems="flex-start" maxW="860px" mx="auto" spacing={0}>
            {/* ── Hero ── */}
            <Flex align="center" gap={4} mt={10} mb={4}>
              <Image
                src="/assets/connected-accounts/zoom.png"
                alt="Zoom"
                w={{ base: '48px', md: '64px' }}
                h={{ base: '48px', md: '64px' }}
              />
              <Heading
                fontSize={{ base: '3xl', md: '5xl' }}
                color="neutral.100"
              >
                Connect Zoom to{' '}
                <Text as="span" color="primary.400">
                  Meetwith
                </Text>
              </Heading>
            </Flex>

            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              color="neutral.300"
              mb={2}
            >
              Link your Zoom account once and every meeting you book through
              Meetwith automatically gets its own private Zoom link — complete
              with a waiting room so only invited guests walk straight in.
            </Text>

            <Divider borderColor="whiteAlpha.200" mt={8} />

            {/* ── Section 1 – Adding ── */}
            <Section icon={FiLink} title="Adding Zoom to your account">
              <Text color="neutral.300" mb={6} fontSize="md" lineHeight="1.7">
                Connecting Zoom is a one-time step. Once it&apos;s done,
                Meetwith handles everything automatically every time a meeting
                is booked.
              </Text>

              <Box bg="whiteAlpha.50" borderRadius="xl" p={{ base: 5, md: 8 }}>
                <Text color="neutral.200" fontWeight="600" fontSize="lg" mb={5}>
                  Step-by-step
                </Text>
                <VStack align="stretch" spacing={5}>
                  <Step number={1}>
                    Log in to your Meetwith account at{' '}
                    <Link
                      href="https://meetwith.xyz"
                      color="primary.400"
                      isExternal
                    >
                      meetwith.xyz
                    </Link>
                    .
                  </Step>
                  <Step number={2}>
                    Open the{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      Dashboard
                    </Text>{' '}
                    and click{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      Settings
                    </Text>{' '}
                    in the left-hand menu.
                  </Step>
                  <Step number={3}>
                    Select the{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      Connected Accounts
                    </Text>{' '}
                    tab.
                  </Step>
                  <Step number={4}>
                    Find the{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      Zoom
                    </Text>{' '}
                    card and click{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      &ldquo;Connect Zoom&rdquo;
                    </Text>
                    .
                  </Step>
                  <Step number={5}>
                    You&apos;ll be taken to Zoom&apos;s own website. Sign in
                    with your Zoom credentials and click{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      Allow
                    </Text>{' '}
                    to grant Meetwith permission.
                  </Step>
                  <Step number={6}>
                    Zoom sends you back to Meetwith. The Zoom card will update
                    to show a green{' '}
                    <Text as="span" fontWeight="700" color="green.400">
                      Connected
                    </Text>{' '}
                    badge — you&apos;re all set!
                  </Step>
                </VStack>
              </Box>

              <Flex direction={{ base: 'column', md: 'row' }} gap={4} mt={6}>
                {[
                  {
                    icon: FiShield,
                    text: 'Meetwith never sees or stores your Zoom password.',
                  },
                  {
                    icon: FiCheckCircle,
                    text: 'You can revoke access from Zoom at any time.',
                  },
                ].map(({ icon, text }) => (
                  <Flex
                    key={text}
                    bg="whiteAlpha.50"
                    borderRadius="xl"
                    p={5}
                    align="flex-start"
                    gap={3}
                    flex={1}
                  >
                    <Icon
                      as={icon}
                      color="primary.400"
                      h={5}
                      w={5}
                      mt={0.5}
                      flexShrink={0}
                    />
                    <Text color="neutral.300" fontSize="sm">
                      {text}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Section>

            <Divider borderColor="whiteAlpha.200" mt={12} />

            {/* ── Section 2 – Using ── */}
            <Section
              icon={FiUsers}
              title="Using Zoom with Meetwith"
              badge="After connecting"
            >
              <Text color="neutral.300" mb={6} fontSize="md" lineHeight="1.7">
                Once your Zoom account is connected, Meetwith automatically uses
                it whenever someone books a meeting with you. There&apos;s
                nothing extra to do — here&apos;s what happens behind the
                scenes:
              </Text>

              <VStack align="stretch" spacing={4}>
                {[
                  {
                    icon: FiLock,
                    title: 'Private meeting links — every time',
                    body: 'Each booking generates a brand-new, unique Zoom link that belongs only to that meeting. The link is never shared publicly on your Meetwith profile.',
                  },
                  {
                    icon: FiUsers,
                    title: 'Waiting room for uninvited guests',
                    body: 'Invited participants join directly. Anyone else who somehow gets the link lands in a waiting room until you manually admit them — or you can simply deny entry.',
                  },
                  {
                    icon: FiCheckCircle,
                    title: 'Automatic host controls',
                    body: 'Because the meeting is created under your Zoom account, you are always the host. You get full control: mute participants, record the session, and end the meeting whenever you like.',
                  },
                  {
                    icon: FiShield,
                    title: 'Works with recurring meetings too',
                    body: 'Scheduling a weekly check-in or a daily stand-up? Meetwith creates a properly recurring Zoom meeting so participants get a consistent link each time.',
                  },
                ].map(({ icon, title, body }) => (
                  <Flex
                    key={title}
                    bg="whiteAlpha.50"
                    borderRadius="xl"
                    p={5}
                    gap={4}
                    align="flex-start"
                  >
                    <Icon
                      as={icon}
                      color="primary.400"
                      h={6}
                      w={6}
                      mt={0.5}
                      flexShrink={0}
                    />
                    <Box>
                      <Text
                        color="neutral.100"
                        fontWeight="600"
                        fontSize="md"
                        mb={1}
                      >
                        {title}
                      </Text>
                      <Text color="neutral.300" fontSize="sm" lineHeight="1.7">
                        {body}
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </VStack>

              <Box bg="whiteAlpha.50" borderRadius="xl" p={5} mt={6}>
                <Text color="neutral.200" fontWeight="600" mb={2}>
                  Tip — what your guests experience
                </Text>
                <Text color="neutral.300" fontSize="sm" lineHeight="1.7">
                  After booking, guests receive a confirmation email that
                  includes their unique Zoom link. They click it at the
                  scheduled time and join directly — no Zoom account required
                  (they can join via the Zoom web client).
                </Text>
              </Box>
            </Section>

            <Divider borderColor="whiteAlpha.200" mt={12} />

            {/* ── Section 3 – Removing ── */}
            <Section icon={FiLogOut} title="Removing Zoom from your account">
              <Text color="neutral.300" mb={6} fontSize="md" lineHeight="1.7">
                You can disconnect your Zoom account at any time. This stops
                Meetwith from creating new Zoom links on your behalf. Any
                existing meetings that already have a Zoom link are not
                affected.
              </Text>

              <Box bg="whiteAlpha.50" borderRadius="xl" p={{ base: 5, md: 8 }}>
                <Text color="neutral.200" fontWeight="600" fontSize="lg" mb={5}>
                  Step-by-step
                </Text>
                <VStack align="stretch" spacing={5}>
                  <Step number={1}>
                    Log in to Meetwith and go to{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      Dashboard → Settings → Connected Accounts
                    </Text>
                    .
                  </Step>
                  <Step number={2}>
                    Find the Zoom card — it will show a green{' '}
                    <Text as="span" fontWeight="700" color="green.400">
                      Connected
                    </Text>{' '}
                    badge.
                  </Step>
                  <Step number={3}>
                    Click{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      &ldquo;Disconnect Zoom&rdquo;
                    </Text>
                    .
                  </Step>
                  <Step number={4}>
                    The badge disappears and the button reverts to{' '}
                    <Text as="span" fontWeight="700" color="neutral.100">
                      &ldquo;Connect Zoom&rdquo;
                    </Text>
                    . Your account is now unlinked.
                  </Step>
                </VStack>
              </Box>

              <Box bg="whiteAlpha.50" borderRadius="xl" p={5} mt={6}>
                <Text color="neutral.200" fontWeight="600" mb={2}>
                  What happens to future meetings?
                </Text>
                <Text color="neutral.300" fontSize="sm" lineHeight="1.7">
                  After disconnecting, new bookings will no longer have an
                  auto-generated Zoom link. You can still paste a custom meeting
                  link into your Meetwith settings, or reconnect Zoom whenever
                  you&apos;re ready.
                </Text>
              </Box>
            </Section>

            <Divider borderColor="whiteAlpha.200" mt={12} />

            {/* ── Footer CTA ── */}
            <VStack w="100%" align="center" mt={12} spacing={4}>
              <Heading
                color="neutral.100"
                fontSize={{ base: '2xl', md: '3xl' }}
                textAlign="center"
              >
                Ready to get started?
              </Heading>
              <Text color="neutral.300" textAlign="center" maxW="500px">
                Head to your Connected Accounts settings and click{' '}
                <Text as="span" fontWeight="700" color="neutral.100">
                  Connect Zoom
                </Text>{' '}
                — it takes less than a minute.
              </Text>
              <Flex gap={4} direction={{ base: 'column', md: 'row' }} mt={2}>
                <Button
                  as="a"
                  href="/dashboard/settings/connected-accounts"
                  colorScheme="primary"
                  size="lg"
                  px={8}
                >
                  Connect Zoom now
                </Button>
                <Button
                  as="a"
                  href={MWW_DISCORD_SERVER}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  colorScheme="whiteAlpha"
                  color="neutral.200"
                  size="lg"
                  px={8}
                >
                  Ask us on Discord
                </Button>
              </Flex>
            </VStack>
          </VStack>
        </Box>
      </Box>
    </main>
  )
}

export default ZoomGuide
