import {
  Box,
  Card,
  CardBody,
  Grid,
  Heading,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react'
import { FaCalendarAlt, FaClock, FaLink } from 'react-icons/fa'
import { FaUsers } from 'react-icons/fa6'

interface FeatureCard {
  icon: any
  title: string
  description: string
}

interface FeatureCardsProps {
  cards: FeatureCard[]
}

const FeatureCards = ({ cards }: FeatureCardsProps) => {
  return (
    <Grid templateColumns="repeat(2, 300px)" gap="12px" maxW="612px">
      {cards.map(card => (
        <Card
          key={card.title.replace(/\s+/g, '-').toLowerCase()}
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
  )
}

export default FeatureCards
