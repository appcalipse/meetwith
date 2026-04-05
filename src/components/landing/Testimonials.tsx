import { Box, Grid, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import { FiMessageCircle } from 'react-icons/fi'

const TESTIMONIALS = [
  {
    name: 'Roso',
    quote:
      "I've used MeetWith almost every day for the past 3 years. It helped me and my team quickly schedule group calls and made it easier to go from thinking about the people I want to meet with to having a meeting booked with them. Since using it, scheduling meetings became effortless.",
  },
  {
    name: 'Susana',
    quote:
      'I was managing double-booked meetings and cross-coordination issues, and I was at risk of losing clients and projects. I needed something that could allow me to handle group meetings, to get 1:1s, and get all my emails and calendars in one place. Meetwith was the only answer, since all competitors failed and are just too pricey.',
  },
  {
    name: 'Yineisy',
    quote:
      'I was looking for a way to diversify the way my clients could pay for their consults, and Meetwith fit perfectly. Now my clients can choose to pay in crypto or credit card, and I can customize different time lengths for the type of consults. My work is easier now.',
  },
  {
    name: 'Stella',
    quote:
      "Meetwith is amazing, one call and one demo, and I switched it out against Calendly, cause it is just better and more versatile! It's based on decentralized technologies and has more competitive pricing.",
  },
  {
    name: 'Daniel',
    quote:
      'Meetwith has saved me countless hours of admin. When you want to move fast and work across teams, tools like Calendly, cal.com, and lettucemeet dont cut it. Meetwith increases our productivity.',
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

function Testimonials() {
  return (
    <Box
      as="section"
      position="relative"
      w="100%"
      overflow="hidden"
      px={{ base: 4, md: 8, lg: '131px' }}
      py={{ base: 10, md: 16 }}
    >
      <GridBackground />
      <Box maxW="1152px" mx="auto" w="100%" position="relative" zIndex={1}>
        <Box maxW="720px" mb={10}>
          <Heading
            as="h2"
            fontSize={{ base: '3xl', md: '4xl', lg: '48.83px' }}
            fontWeight="bold"
            color="neutral.0"
            lineHeight={1.2}
            mb={4}
          >
            What customers say about{' '}
            <Box as="span" color="primary.400">
              Meetwith
            </Box>
          </Heading>
          <Text
            fontWeight="medium"
            color="neutral.300"
            fontSize="md"
            lineHeight={1.5}
          >
            Teams using Meetwith talk about speed, flexibility, and finally
            having one place to coordinate recurring meetings that other tools
            make painful.
          </Text>
        </Box>

        <Grid
          templateColumns={{
            base: '1fr',
            md: 'repeat(2, 1fr)',
            xl: 'repeat(3, 1fr)',
          }}
          gap={5}
        >
          {TESTIMONIALS.map(({ name, quote }) => (
            <Box
              key={name}
              as="article"
              position="relative"
              h="full"
              rounded="xl"
              borderWidth={1}
              borderColor="neutral.800"
              bg="linear-gradient(180deg, rgba(31,41,51,0.92) 0%, rgba(19,26,32,0.98) 100%)"
              p={{ base: 6, md: 7 }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap={4}
                mb={5}
              >
                <VStack alignItems="flex-start" spacing={0}>
                  <Heading
                    as="h3"
                    fontSize="xl"
                    fontWeight="bold"
                    color="neutral.0"
                    lineHeight={1.3}
                  >
                    {name}
                  </Heading>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="primary.400"
                    lineHeight={1.4}
                  >
                    Meetwith customer
                  </Text>
                </VStack>

                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  w={11}
                  h={11}
                  rounded="full"
                  borderWidth={1}
                  borderColor="rgba(244, 103, 57, 0.25)"
                  bg="rgba(244, 103, 57, 0.12)"
                  flexShrink={0}
                >
                  <Icon as={FiMessageCircle} boxSize={5} color="primary.400" />
                </Box>
              </Box>

              <Text
                fontWeight="medium"
                color="neutral.100"
                fontSize="md"
                lineHeight={1.7}
              >
                &quot;{quote}&quot;
              </Text>
            </Box>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}

export default Testimonials
