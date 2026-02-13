import { InfoIcon } from '@chakra-ui/icons'
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Heading,
  HStack,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6'

const PARTICIPATION_INSTRUCTIONS = [
  "When you get to the poll page, you'll see the current participants(if any), the host, and their availability.",
  <>
    You can go ahead and provide your availability by either Clicking on{' '}
    <strong>Add availability</strong>.
  </>,
  <>
    If you want to add your availability manually, you click on{' '}
    <strong>Input manually</strong> and go ahead to select the slots you&apos;re
    available from the grid. When you select a slot, you should see the colour
    change to orange.
  </>,
  <>
    Alternatively, you can import your availability directly from your calendar
    by clicking on <strong>Import from Calendar</strong> to sign in/sign up.
  </>,
  <>
    Then click <strong>Save availability</strong> (if you&apos;re adding it
    manually) and enter your details to save your availability to the poll.
  </>,
]

export const QuickPollParticipationInstructions: React.FC = () => {
  const iconColor = useColorModeValue('gray.800', '#ffffff')

  return (
    <Accordion allowToggle w="100%">
      <AccordionItem
        border="1px solid"
        borderColor="input-border"
        borderRadius="8px"
        bg="bg-surface-secondary"
        overflow="hidden"
      >
        {({ isExpanded }) => (
          <>
            <AccordionButton
              px={{ base: 4, md: 6 }}
              py={4}
              bg="bg-surface-secondary"
              _hover={{ bg: 'bg-surface-secondary' }}
              _expanded={{ bg: 'bg-surface-secondary' }}
              border="none"
            >
              <HStack flex={1} justify="space-between" align="center">
                <HStack gap={2} align="center">
                  <InfoIcon color={iconColor} w={4} h={4} />
                  <Heading
                    fontSize={{ base: '16px', md: '18px' }}
                    fontWeight={700}
                    color="text-primary"
                  >
                    How to participate in this poll
                  </Heading>
                </HStack>
                {isExpanded ? (
                  <FaChevronUp color={iconColor} size={20} />
                ) : (
                  <FaChevronDown color={iconColor} size={20} />
                )}
              </HStack>
            </AccordionButton>
            <AccordionPanel
              px={{ base: 4, md: 6 }}
              pb={4}
              pt={0}
              borderTop="none"
              borderColor="input-border"
            >
              <VStack align="flex-start" gap={5} w="100%">
                {PARTICIPATION_INSTRUCTIONS.map((instruction, index) => (
                  <HStack key={index} align="flex-start" gap={3}>
                    <Box
                      w="14px"
                      h="14px"
                      borderRadius="50%"
                      bg="primary.400"
                      mt="6px"
                      flexShrink={0}
                    />
                    <Text
                      fontSize={{ base: '14px', md: '16px' }}
                      color="text-primary"
                    >
                      {instruction}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </AccordionPanel>
          </>
        )}
      </AccordionItem>
    </Accordion>
  )
}
