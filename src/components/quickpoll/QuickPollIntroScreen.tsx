import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { IconType } from 'react-icons'
import { FaCalendarAlt, FaClock, FaLink } from 'react-icons/fa'
import { FaUsers } from 'react-icons/fa6'
import { HiMiniPlusCircle } from 'react-icons/hi2'

import FeatureCards from './FeatureCards'

export interface QuickPollIntroCard {
  icon: IconType
  title: string
  description: string
}

interface QuickPollIntroScreenProps {
  onCreate: () => void
  ctaText: string
  ctaDisabled?: boolean
  ctaTitle?: string
  headerTitle?: string
  headerSubtitle?: string
  headerVariant?: 'default' | 'allPolls'
  compact?: boolean
  bottomPadding?: number
  cards?: QuickPollIntroCard[]
}

const QuickPollIntroScreen = ({
  onCreate,
  ctaText,
  ctaDisabled = false,
  ctaTitle,
  headerTitle = 'Welcome to QuickPoll',
  headerSubtitle = 'Schedule group calls easily',
  headerVariant = 'default',
  compact = false,
  bottomPadding,
  cards,
}: QuickPollIntroScreenProps) => {
  const effectiveCards: QuickPollIntroCard[] = cards ?? [
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

  return (
    <Box
      width="100%"
      bg="bg-canvas"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 2, md: 4 }}
      py={compact ? { base: 0, md: 4 } : { base: 6, md: 8 }}
      minH={compact ? undefined : '100vh'}
      pb={bottomPadding ?? (compact ? 24 : undefined)}
    >
      <VStack
        spacing={{ base: 6, md: 8 }}
        align={headerVariant === 'allPolls' ? 'flex-start' : 'center'}
        maxW="800px"
        w={{ base: '100%', md: 'auto' }}
      >
        {/* Header Section */}
        <VStack
          spacing={{ base: 3, md: 2 }}
          align={headerVariant === 'allPolls' ? 'flex-start' : 'center'}
          order={{ base: 1, md: 1 }}
        >
          <Heading
            as="h1"
            fontSize={
              headerVariant === 'allPolls'
                ? { base: '20px', md: '24px' }
                : { base: '24px', md: '31.25px' }
            }
            fontWeight="700"
            color="text-primary"
            textAlign={headerVariant === 'allPolls' ? 'left' : 'center'}
            lineHeight="1.2"
          >
            {headerTitle}
          </Heading>
          <Text
            fontSize={{ base: '14px', md: '16px' }}
            color={
              headerVariant === 'allPolls' ? 'neutral.400' : 'text-secondary'
            }
            fontWeight="500"
            textAlign={headerVariant === 'allPolls' ? 'left' : 'center'}
          >
            {headerSubtitle}
          </Text>
        </VStack>

        <Flex justify="center" w="100%" order={{ base: 2, md: 3 }}>
          <Button
            leftIcon={<HiMiniPlusCircle color="text-primary" size={16} />}
            bg="primary.200"
            color="neutral.900"
            size={{ base: 'md', md: 'lg' }}
            px={{ base: 6, md: 4 }}
            py={{ base: 3, md: 4 }}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight="semibold"
            borderRadius="8px"
            w={{ base: '100%', sm: 'auto' }}
            maxW={{ base: '280px', sm: 'none' }}
            _hover={{
              bg: 'primary.300',
            }}
            _active={{
              bg: 'primary.400',
            }}
            transition="all 0.2s ease-in-out"
            onClick={onCreate}
            isDisabled={ctaDisabled}
            title={ctaTitle}
          >
            {ctaText}
          </Button>
        </Flex>

        {/* Feature Cards Grid */}
        <Box w="100%" order={{ base: 3, md: 2 }}>
          <FeatureCards cards={effectiveCards} />
        </Box>
      </VStack>
    </Box>
  )
}

export default QuickPollIntroScreen
