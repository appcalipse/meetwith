import { CheckCircleIcon } from '@chakra-ui/icons'
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
  Tag,
  TagLabel,
  TagLeftIcon,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import React from 'react'
import { BiExit } from 'react-icons/bi'
import { FaChevronDown, FaChevronUp, FaInfo, FaRegCopy } from 'react-icons/fa'
import { GoDotFill } from 'react-icons/go'
import { IoMdPersonAdd, IoMdSettings } from 'react-icons/io'
import { MdDelete } from 'react-icons/md'

import { logEvent } from '@/utils/analytics'

import { CopyLinkButton } from '../profile/components/CopyLinkButton'
import GroupMemberCard from './GroupMemberCard'

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
              <Heading size="sm" flexBasis="50%">
                Contact
              </Heading>
              <Flex alignItems="center" flexBasis="15%" gap={0.5}>
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
                        Admins can add and remove members from the group, change
                        the group&apos;s name, calendar link, and delete group.
                      </Text>
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </Flex>
              <Flex alignItems="center" flexBasis="35%" gap={0.5}>
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
                        At least 1 calendar connected to MeetWithWallet
                        platform.
                      </Text>
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </Flex>
            </HStack>
            <GroupMemberCard />
          </AccordionPanel>
          <Button
            variant="ghost"
            leftIcon={<Icon as={IoMdPersonAdd} h={25} />}
            color="white"
            px={1.5}
            height="fit-content !important"
            py={1}
          >
            Add new member
          </Button>
        </>
      )}
    </AccordionItem>
  )
}
export default GroupCard
