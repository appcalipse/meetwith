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
          bg="bg-surface"
          border="1px solid"
          borderColor="card-border"
          borderRadius="10px"
          height="240px"
          p={6}
          shadow="none"
          boxShadow="none"
        >
          <CardBody p={0}>
            <VStack spacing={4} align="start">
              {/* Icon */}
              <Box
                width="48px"
                height="48px"
                borderRadius="8px"
                bg="bg-surface"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="2px dashed"
                borderColor="border-emphasis"
              >
                <Icon as={card.icon} boxSize={6} color="text-tertiary" />
              </Box>

              {/* Content */}
              <VStack spacing={2} align="start">
                <Heading
                  as="h3"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="text-primary"
                  lineHeight="1.3"
                >
                  {card.title}
                </Heading>
                <Text fontSize="sm" color="text-secondary" lineHeight="1.4">
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
