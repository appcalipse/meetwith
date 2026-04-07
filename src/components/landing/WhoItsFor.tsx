import { Box, Grid, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import { IconType } from 'react-icons'
import {
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiGlobe,
  FiMessageSquare,
  FiUsers,
} from 'react-icons/fi'

interface Role {
  icon: IconType
  title: string
  subtitle: string
  description: string
}

const ROLES: Role[] = [
  {
    icon: FiUsers,
    title: 'Program Manager',
    subtitle: 'Director / Lead',
    description:
      'Coordinate recurring check-ins and milestone reviews across your entire program cohort.',
  },
  {
    icon: FiBookOpen,
    title: 'Cohort Manager',
    subtitle: 'Coordinator',
    description:
      'Keep your cohort in sync. Schedule group sessions without the endless back-and-forth.',
  },
  {
    icon: FiAward,
    title: 'Fellowship Manager',
    subtitle: 'Director',
    description:
      'Manage fellow touchpoints and group workshops with reusable scheduling groups.',
  },
  {
    icon: FiMessageSquare,
    title: 'Community Lead',
    subtitle: 'Manager / Head of Community',
    description:
      "Run community calls and AMAs effortlessly — even across members who won't share calendars.",
  },
  {
    icon: FiGlobe,
    title: 'Ecosystem Lead',
    subtitle: 'Manager',
    description:
      'Align stakeholders across organizations, time zones, and calendar systems seamlessly.',
  },
  {
    icon: FiBriefcase,
    title: 'Portfolio Operations',
    subtitle: 'Portfolio Ops',
    description:
      'Schedule portfolio-wide check-ins and founder syncs that repeat without setup overhead.',
  },
]

function WhoItsFor() {
  return (
    <Box
      as="section"
      position="relative"
      w="100%"
      overflow="hidden"
      px={{ base: 4, md: 8, lg: '131px' }}
      py={{ base: 10, md: 16 }}
    >
      <Box maxW="1152px" mx="auto" w="100%">
        <Heading
          as="h2"
          fontSize={{ base: '3xl', md: '4xl', lg: '48.83px' }}
          fontWeight="bold"
          color="neutral.0"
          lineHeight={1.2}
          mb={4}
        >
          Who Meetwith is for
        </Heading>

        <Text
          fontWeight="medium"
          color="neutral.300"
          fontSize="md"
          lineHeight={1.5}
          mb={10}
          maxW="600px"
        >
          Built for the people who run recurring multi-person programs — across
          orgs, time zones, and mixed calendar stacks.
        </Text>

        <Grid
          templateColumns={{
            base: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          }}
          gap={{ base: 4, md: 5 }}
        >
          {ROLES.map(({ icon, title, subtitle, description }) => (
            <Box
              key={title}
              position="relative"
              display="flex"
              flexDirection="column"
              gap={4}
              p={6}
              rounded="xl"
              borderWidth={1}
              borderColor="neutral.800"
              bg="linear-gradient(135deg, #1a2530 0%, #131a20 100%)"
              overflow="hidden"
              cursor="default"
              transition="all 0.3s"
              role="group"
              _hover={{
                borderColor: 'primary.400',
                bg: 'linear-gradient(135deg, #1f2e3a 0%, #161f27 100%)',
              }}
              sx={{
                '&:hover .role-icon-box': {
                  background: 'rgba(244, 103, 57, 0.20)',
                },
                '&:hover .role-icon': {
                  color: '#F46739',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background:
                    'linear-gradient(90deg, transparent, #F46739, transparent)',
                  opacity: 0,
                  transition: 'opacity 0.3s',
                },
                '&:hover::before': {
                  opacity: 1,
                },
              }}
            >
              {/* Icon container */}
              <Box
                className="role-icon-box"
                w="44px"
                h="44px"
                rounded="lg"
                bg="rgba(244, 103, 57, 0.12)"
                borderWidth={1}
                borderColor="rgba(244, 103, 57, 0.25)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
                transition="background 0.3s"
              >
                <Icon
                  className="role-icon"
                  as={icon}
                  boxSize={5}
                  color="primary.400"
                  transition="color 0.3s"
                />
              </Box>

              {/* Text content */}
              <VStack alignItems="flex-start" gap={1}>
                <Heading
                  as="h3"
                  fontSize="lg"
                  fontWeight="bold"
                  color="neutral.0"
                  lineHeight={1.3}
                >
                  {title}
                </Heading>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color="primary.400"
                  lineHeight={1.4}
                  opacity={0.8}
                >
                  {subtitle}
                </Text>
              </VStack>

              <Text
                fontSize="sm"
                fontWeight="medium"
                color="neutral.300"
                lineHeight={1.6}
              >
                {description}
              </Text>
            </Box>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}

export default WhoItsFor
