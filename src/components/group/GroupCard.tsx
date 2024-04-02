import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Avatar,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import React from 'react'
import { FaChevronDown, FaChevronUp, FaInfo, FaRegCopy } from 'react-icons/fa'
import { IoMdPersonAdd, IoMdSettings } from 'react-icons/io'

import { logEvent } from '@/utils/analytics'

import { CopyLinkButton } from '../profile/components/CopyLinkButton'

const GroupCard: React.FC = ({}) => {
  const bgColor = useColorModeValue('white', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'white')
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  return (
    <AccordionItem width="100%" padding={5} border={0}>
      {({ isExpanded }) => (
        <>
          <HStack justifyContent="space-between" width="100%">
            <VStack>
              <Heading>RnDAO Marketing</Heading>
              <CopyLinkButton
                url={'meetwithwallet.xyz/rndaomarketing'}
                size="md"
                label={'meetwithwallet.xyz/rndaomarketing'}
                withIcon
                design_type="link"
              />
            </VStack>
            <HStack gap={3} width="fit-content">
              <Button colorScheme="primary">Schedule</Button>
              <IconButton
                aria-label="Add Contact"
                p={'8px 16px'}
                icon={<IoMdPersonAdd size={25} />}
              />
              <IconButton
                aria-label="Group Setting"
                p={'8px 16px'}
                icon={<IoMdSettings size={25} />}
              />
              <AccordionButton width="fit-content" m={0} p={0}>
                <IconButton
                  aria-label="Expand Group"
                  p={'8px 16px'}
                  icon={
                    isExpanded ? (
                      <FaChevronUp size={25} />
                    ) : (
                      <FaChevronDown size={25} />
                    )
                  }
                />
              </AccordionButton>
            </HStack>
          </HStack>
          <AccordionPanel pb={4}>
            <HStack
              width="100%"
              justifyContent="space-between"
              pb={2}
              borderBottomWidth={1}
              borderBottomColor={borderColor}
              py={3}
              px={1}
            >
              <Heading size="sm" flexBasis="33%">
                Contact
              </Heading>
              <Flex alignItems="center" flexBasis="33%" gap={0.5}>
                <Heading size="sm">Role </Heading>
                <Tooltip.Provider delayDuration={400}>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Flex
                        w="16px"
                        h="16px"
                        borderRadius="50%"
                        bgColor={iconColor}
                        justifyContent="center"
                        alignItems="center"
                        ml={1}
                      >
                        <Icon w={1} color={bgColor} as={FaInfo} />
                      </Flex>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <Text
                        fontSize="sm"
                        p={4}
                        maxW="200px"
                        bgColor={bgColor}
                        shadow="lg"
                      >
                        Tooltips
                      </Text>
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </Flex>
              <Flex alignItems="center" flexBasis="33%" gap={0.5}>
                <Heading size="sm">Callendar connection</Heading>
                <Tooltip.Provider delayDuration={400}>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Flex
                        w="16px"
                        h="16px"
                        borderRadius="50%"
                        bgColor={iconColor}
                        justifyContent="center"
                        alignItems="center"
                        ml={1}
                      >
                        <Icon w={1} color={bgColor} as={FaInfo} />
                      </Flex>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <Text
                        fontSize="sm"
                        p={4}
                        maxW="200px"
                        bgColor={bgColor}
                        shadow="lg"
                      >
                        Tooltips
                      </Text>
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </Flex>
            </HStack>
            <HStack
              width="100%"
              justifyContent="space-between"
              pb={2}
              borderBottomWidth={1}
              borderBottomColor={borderColor}
              py={3}
            >
              <HStack flexBasis="33%">
                <Avatar name="Dan Abrahmov" src="https://bit.ly/dan-abramov" />
                <VStack alignItems="start" gap={0}>
                  <Heading size="sm">Daniel Jackalop (You)</Heading>
                  <CopyLinkButton
                    url={'meetwithwallet.xyz/rndaomarketing'}
                    size="md"
                    label={'meetwithwallet.xyz/rndaomarketing'}
                    withIcon
                    design_type="link"
                  />
                </VStack>
              </HStack>
            </HStack>
          </AccordionPanel>
        </>
      )}
    </AccordionItem>
  )
}
export default GroupCard
