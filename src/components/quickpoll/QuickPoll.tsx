import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Grid,
  Heading,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { FaCalendarAlt, FaClock, FaLink } from 'react-icons/fa'
import { FaUsers } from 'react-icons/fa6'
import { HiMiniPlusCircle } from 'react-icons/hi2'

import { Account } from '@/types/Account'

import AllPolls from './AllPolls'

interface QuickPollProps {
  currentAccount: Account
}

const QuickPoll = ({ currentAccount: _currentAccount }: QuickPollProps) => {
  const { push } = useRouter()

  // For demo purposes, we're showing AllPolls
  // Later this will be driven by backend data (e.g., checking if user has polls)
  const hasExistingPolls = true // Change this to false to see the intro page

  const featureCards = [
    {
      icon: FaCalendarAlt,
      title: 'Create a poll',
      description: 'Set up your meeting details and available time slots',
    },
    {
      icon: FaUsers,
      title: 'Add participants from existing groups and from your contact',
      description: 'Include people from your groups and contacts',
    },
    {
      icon: FaLink,
      title: 'Share public link for others to provide their availability',
      description: 'Send a public link for others to enter their free times',
    },
    {
      icon: FaClock,
      title: 'Schedule meeting',
      description: 'Review responses and finalise the meeting time',
    },
  ]

  // If user has existing polls, show the AllPolls component
  if (hasExistingPolls) {
    return <AllPolls />
  }

  // Otherwise, show the intro/welcome page
  return (
    <Box
      width="100%"
      bg="neutral.850"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={8}
    >
      <VStack spacing={8} align="center" maxW="800px">
        {/* Header Section */}
        <VStack spacing={2} align="center">
          <Heading
            as="h1"
            fontSize="31.25px"
            fontWeight="700"
            color="neutral.0"
            textAlign="center"
          >
            Welcome to QuickPoll
          </Heading>
          <Text
            fontSize="16px"
            color="neutral.200"
            fontWeight="500"
            textAlign="center"
          >
            Schedule group calls easily
          </Text>
        </VStack>

        {/* Feature Cards Grid */}
        <Grid templateColumns="repeat(2, 300px)" gap="12px" maxW="612px">
          {featureCards.map((card, index) => (
            <Card
              key={index}
              bg="neutral.900"
              border="1px solid"
              borderColor="neutral.800"
              borderRadius="10px"
              height="240px"
              p={6}
            >
              <CardBody p={0}>
                <VStack spacing={4} align="start">
                  {/* Icon */}
                  <Box
                    width="48px"
                    height="48px"
                    borderRadius="8px"
                    bg="neutral.900"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    border="2px dashed"
                    borderColor="neutral.500"
                  >
                    <Icon as={card.icon} boxSize={6} color="neutral.400" />
                  </Box>

                  {/* Content */}
                  <VStack spacing={2} align="start">
                    <Heading
                      as="h3"
                      fontSize="lg"
                      fontWeight="semibold"
                      color="white"
                      lineHeight="1.3"
                    >
                      {card.title}
                    </Heading>
                    <Text fontSize="sm" color="neutral.300" lineHeight="1.4">
                      {card.description}
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </Grid>

        {/* Call to Action Button */}
        <Flex justify="center" pt={1}>
          <Button
            leftIcon={<HiMiniPlusCircle color="neutral.800" size={16} />}
            bg="primary.200"
            color="neutral.900"
            size="lg"
            px={4}
            py={4}
            fontSize="md"
            fontWeight="semibold"
            borderRadius="8px"
            _hover={{
              bg: 'primary.300',
            }}
            _active={{
              bg: 'primary.400',
            }}
            transition="all 0.2s ease-in-out"
            onClick={() => push(`/dashboard/create-poll`)}
          >
            Run new poll
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}

export default QuickPoll
