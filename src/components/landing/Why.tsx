import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Image,
  SlideFade,
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext } from 'react'
import { BsBell, BsShieldShaded } from 'react-icons/bs'
import { FaRegCalendarCheck, FaRegHandshake } from 'react-icons/fa'
import { useInView } from 'react-intersection-observer'
import { base, polygon } from 'thirdweb/chains'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

const SOCIALS = [
  'mrjacklop.eth',
  'afo-wefa.eth',
  'emailname@gmail.com',
  'emailname@company.com',
  'patrick.polygon',
  'ramon.sophon',
  'craig.eth.base',
  'mason.eth',
  'ayush.huddle01.eth',
  'huddle01.eth',
  'udoka.eth',
  'osinachi.base.eth',
]
export function Why() {
  const { currentAccount, loginIn } = useContext(AccountContext)

  const { openConnection } = useContext(OnboardingModalContext)

  const { ref: whyContainer, inView: isWhyContainerVisible } = useInView({
    triggerOnce: true,
  })

  return (
    <Box px={5}>
      <VStack
        bg={'neutral.900'}
        alignItems="center"
        borderWidth={1}
        borderColor="neutral.900"
        width={'fit-content'}
        mx="auto"
        rounded={10}
      >
        <Text
          color="neutral.100"
          fontSize="4xl"
          fontWeight="bold"
          lineHeight="10"
          my={{ base: '6', lg: '9' }}
          textAlign="center"
        >
          Why Choose Meetwith?
        </Text>
        <Flex
          ref={whyContainer}
          maxW="1360px"
          direction="column"
          borderWidth={1}
          borderColor="neutral.900"
          width={'fit-content'}
        >
          <Grid
            color="neutral.0"
            gridTemplateColumns={{
              lg: '1fr 1fr 1fr',
              base: '1fr',
            }}
          >
            <SlideFade
              in={isWhyContainerVisible}
              delay={0.25}
              offsetY={-50}
              unmountOnExit={true}
            >
              <VStack
                px={10}
                py={20}
                alignItems="flex-start"
                justifyContent="center"
                gridGap={2}
                height="100%"
                className="abstract-border"
                bg={`#0D1015 url('/assets/why-abstract.svg')`}
                bgRepeat="no-repeat"
                bgSize="cover"
              >
                <Box
                  bg="neutral.700"
                  p={2.5}
                  rounded={10}
                  w={'58px'}
                  h={'58px'}
                >
                  <Image src="/assets/whys/Group.svg" alt="Users" w={9} h={9} />
                </Box>

                <Heading
                  fontSize={{ md: '26px', base: 'xl' }}
                  color="neutral.0"
                >
                  Group Scheduling, Simplified
                </Heading>
                <Text color="neutral.0">
                  Effortlessly find times that work for everyone—without the
                  endless messages.
                </Text>
              </VStack>
            </SlideFade>
            <Grid gridTemplateColumns="1fr">
              <SlideFade
                in={isWhyContainerVisible}
                delay={0.75}
                offsetY={-50}
                unmountOnExit={true}
              >
                <Flex
                  py={12}
                  px={9}
                  pr={6}
                  direction={{
                    md: 'row',
                    base: 'column',
                  }}
                  alignItems="flex-start"
                  gap={4}
                  className="horizontal-abstract-border"
                  bg={`#171F26 url('/assets/why-abstract.svg')`}
                  bgRepeat="no-repeat"
                  height="100%"
                  bgSize="cover"
                >
                  <Box
                    bg="neutral.700"
                    p={2.5}
                    rounded={10}
                    w={'58px'}
                    h={'58px'}
                  >
                    <Image
                      src="/assets/whys/Calendar.svg"
                      alt="Box"
                      w={9}
                      h={9}
                    />
                  </Box>
                  <VStack flex={1} alignItems="flex-start">
                    <Heading
                      fontSize={{ md: '26px', base: 'xl' }}
                      color="neutral.0"
                    >
                      Multi-Calendar Integration
                    </Heading>
                    <Text color="neutral.0">
                      Sync all your calendars in one place so you can manage
                      your busy life—whether it’s personal, freelance, or client
                      work.
                    </Text>
                  </VStack>
                </Flex>
              </SlideFade>

              <SlideFade
                in={isWhyContainerVisible}
                delay={1}
                offsetY={-50}
                unmountOnExit={true}
              >
                <Flex
                  py={12}
                  px={9}
                  pr={6}
                  alignItems="flex-start"
                  className="horizontal-abstract-border"
                  bg={`#1F2933 url('/assets/why-horizontal-abstract.svg')`}
                  bgRepeat="no-repeat"
                  height="100%"
                  bgSize="cover"
                  gap={4}
                  direction={{
                    md: 'row',
                    base: 'column',
                  }}
                >
                  <Box
                    bg="neutral.700"
                    p={2.5}
                    rounded={10}
                    w={'58px'}
                    h={'58px'}
                  >
                    <Image src="/assets/whys/Lock.svg" alt="Box" w={9} h={9} />
                  </Box>
                  <VStack flex={1} alignItems="flex-start">
                    <Heading
                      fontSize={{ md: '26px', base: 'xl' }}
                      color="neutral.0"
                    >
                      Token-Gated Meetings
                    </Heading>
                    <Text color="neutral.0">
                      Set up exclusive, token-based access for private and
                      secure meetings.
                    </Text>
                  </VStack>
                </Flex>
              </SlideFade>
            </Grid>
            <SlideFade
              in={isWhyContainerVisible}
              delay={0.5}
              offsetY={-50}
              unmountOnExit={true}
            >
              <VStack
                px={10}
                py={20}
                alignItems="flex-start"
                justifyContent="center"
                gridGap={2}
                height="100%"
                className="abstract-border"
                bg={`#0D1015 url('/assets/why-abstract.svg')`}
                bgRepeat="no-repeat"
                bgSize="cover"
                width="100%"
              >
                <Box
                  bg="neutral.700"
                  p={2.5}
                  rounded={10}
                  w={'58px'}
                  h={'58px'}
                >
                  <Image src="/assets/whys/Box.svg" alt="Box" w={9} h={9} />
                </Box>
                <Heading
                  fontSize={{ md: '26px', base: 'xl' }}
                  color="neutral.0"
                >
                  Lightning Scheduling Discord Bot
                </Heading>
                <Text color="neutral.0">
                  Schedule meetings right within Discord for even quicker
                  coordination.
                </Text>
              </VStack>
            </SlideFade>
          </Grid>
          <Grid
            color="neutral.0"
            gridTemplateColumns={{
              md: '1fr 1fr',
              base: '1fr',
            }}
          >
            <SlideFade
              in={isWhyContainerVisible}
              delay={0.75}
              offsetY={-50}
              unmountOnExit={true}
            >
              <VStack
                px={10}
                py={20}
                alignItems="flex-start"
                gridGap={2}
                bg={`#1F2933 url('/assets/why-bottom-abstract.svg')`}
                bgRepeat="no-repeat"
                bgSize="cover"
                width="100%"
              >
                <Box
                  bg="neutral.700"
                  p={2.5}
                  rounded={10}
                  w={'58px'}
                  h={'58px'}
                >
                  <Image src="/assets/whys/Shield.svg" alt="Box" w={9} h={9} />
                </Box>

                <Heading
                  fontSize={{ md: '26px', base: 'xl' }}
                  color="neutral.0"
                >
                  Flexibility and Privacy
                </Heading>
                <Text color="neutral.0">
                  Works seamlessly with Zoom, Google Meet, or Huddle01 for
                  privacy-preserving meetings. We don&apos;t gather your data.
                </Text>
              </VStack>
            </SlideFade>

            <SlideFade
              in={isWhyContainerVisible}
              delay={1}
              offsetY={-50}
              unmountOnExit={true}
            >
              <VStack
                px={10}
                py={20}
                alignItems="flex-start"
                gridGap={2}
                height="100%"
                bg={`#171F26 url('/assets/why-bottom-right-abstract.svg')`}
                bgRepeat="no-repeat"
                bgSize="cover"
                width="100%"
              >
                <Box
                  bg="neutral.700"
                  p={2.5}
                  rounded={10}
                  w={'58px'}
                  h={'58px'}
                >
                  <Image src="/assets/whys/Link.svg" alt="Box" w={9} h={9} />
                </Box>

                <Heading
                  fontSize={{ md: '26px', base: 'xl' }}
                  color="neutral.0"
                >
                  Meeting Links for Easy Booking
                </Heading>
                <Text color="neutral.0">
                  Create meeting types and share your link for others to book in
                  seconds.
                </Text>
              </VStack>
            </SlideFade>
          </Grid>
        </Flex>
      </VStack>
      <VStack my={16}>
        <Heading
          fontSize={{
            md: '4xl',
            base: '2xl',
          }}
        >
          Perfect for Portfolio Careers, Nomads, and Web3 Natives
        </Heading>
        <Text
          textAlign="center"
          w={{ lg: '60%', md: '75%', base: '100%' }}
          color="neutral.200"
        >
          If you&apos;re managing work across multiple projects, Meetwith keeps
          you organized. Our integrations with Web3 tools like ENS and
          Unstoppable Domains make it even easier for those working in
          decentralized environments. But it&apos;s designed for anyone who
          juggles different commitments - this might be a consultant, a
          freelancer, a multiple DAOs contributor, multi-preneurs etc
        </Text>
        <HStack
          flexWrap={'wrap'}
          w={{ lg: '60%', md: '75%', base: '100%' }}
          justifyContent="center"
          gap={4}
        >
          {SOCIALS.map((social, index) => (
            <Tag
              key={social}
              fontSize={'base'}
              px={2.5}
              py={1.5}
              rounded={10}
              borderWidth={1}
              borderColor={'neutral.400'}
              bg="neutral.800"
              color="neutral.0"
            >
              {social}
            </Tag>
          ))}
        </HStack>
      </VStack>
    </Box>
  )
}
