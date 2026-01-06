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
import { FC } from 'react'

import { IconType } from 'react-icons'
import { FaCalendarAlt, FaClock, FaLink } from 'react-icons/fa'
import { FaUsers } from 'react-icons/fa6'

interface FeatureCard {
  icon: IconType
  title: string
  description: string
}

interface FeatureCardsProps {
  cards: FeatureCard[]
}

const FeatureCards: FC<FeatureCardsProps> = ({ cards }) => {
  return (
    <Grid
      templateColumns={{ base: '1fr', md: 'repeat(2, 300px)' }}
      gap={{ base: '16px', md: '12px' }}
      maxW="612px"
      w={{ base: '100%', md: 'auto' }}
      mx="auto"
    >
      {cards.map(card => (
        <Card
          key={card.title.replace(/\s+/g, '-').toLowerCase()}
          bg="bg-surface"
          border="1px solid"
          borderColor="card-border"
          borderRadius="10px"
          height={{ base: 'auto', md: '240px' }}
          minHeight={{ base: '180px', md: '240px' }}
          p={{ base: 4, md: 6 }}
          shadow="none"
          boxShadow="none"
          w="100%"
        >
          <CardBody p={0}>
            <VStack spacing={{ base: 3, md: 4 }} align="start" h="100%">
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
                flexShrink={0}
              >
                <Icon as={card.icon} boxSize={6} color="text-tertiary" />
              </Box>

              {/* Content */}
              <VStack spacing={2} align="start" flex={1}>
                <Heading
                  as="h3"
                  fontSize={{ base: 'md', md: 'lg' }}
                  fontWeight="semibold"
                  color="text-primary"
                  lineHeight="1.3"
                >
                  {card.title}
                </Heading>
                <Text
                  fontSize={{ base: 'xs', md: 'sm' }}
                  color="text-secondary"
                  lineHeight="1.4"
                >
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
