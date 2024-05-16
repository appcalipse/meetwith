import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  Spacer,
  Spinner,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import React, { ReactNode, useEffect, useId, useMemo, useState } from 'react'
import { BiExit } from 'react-icons/bi'
import { FaChevronDown, FaChevronUp, FaInfo, FaRegCopy } from 'react-icons/fa'
import { GoDotFill } from 'react-icons/go'
import { IoMdPersonAdd, IoMdSettings } from 'react-icons/io'
import { MdDelete } from 'react-icons/md'

import { Account } from '@/types/Account'
import {
  GetGroupsResponse,
  GroupMember,
  MemberType,
  MenuOptions,
} from '@/types/Group'
import { logEvent } from '@/utils/analytics'
import { getGroupsMembers } from '@/utils/api_helper'
import { isProduction } from '@/utils/constants'

import { CopyLinkButton } from '../profile/components/CopyLinkButton'
import GroupMemberCard from './GroupMemberCard'

export interface IGroupCard extends GetGroupsResponse {
  currentAccount: Account
  onAddNewMember: (groupId: string, groupName: string) => void
}

const GroupCard: React.FC<IGroupCard> = props => {
  const bgColor = useColorModeValue('white', '#1F2933')
  const itemsBgColor = useColorModeValue('white', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'white')
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
  const [groupMembers, setGroupsMembers] = useState<Array<GroupMember>>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const id = useId()
  const [firstFetch, setFirstFetch] = useState(true)
  const fetchMembers = async (reset?: boolean) => {
    const PAGE_SIZE = 10
    setLoading(true)
    const newGroupMembers = (await getGroupsMembers(
      props.id,
      PAGE_SIZE,
      groupMembers?.length
    )) as Array<GroupMember>
    if (newGroupMembers?.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setGroupsMembers(prev => (reset ? [] : [...prev]).concat(newGroupMembers))
    setLoading(false)
    setFirstFetch(false)
  }
  const resetState = async () => {
    setFirstFetch(true)
    setNoMoreFetch(false)
    fetchMembers(true)
  }

  useEffect(() => {
    resetState()
  }, [props.currentAccount])
  const renderPopOverOptions = (role: MemberType): Array<MenuOptions> => {
    const defaultOptions: Array<MenuOptions> = []
    switch (role) {
      case MemberType.ADMIN:
        return [
          ...defaultOptions,
          {
            label: 'Edit group name',
            onClick: () => {
              // Logic to open edit group popup
            },
          },
          {
            label: 'Edit group scheduling link',
            link: '',
          },
          {
            label: 'Delete group',
            important: true,
            link: '',
          },
        ]
      case MemberType.MEMBER:
        return [
          ...defaultOptions,
          {
            label: 'Leave group',
            important: true,
            link: '',
          },
        ]
      default:
        return []
    }
  }
  let content: ReactNode
  const menuItems = useMemo(
    () => renderPopOverOptions(props.role),
    [props.role]
  )
  if (firstFetch) {
    content = (
      <VStack alignItems="center" mb={6}>
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking for your groups members...</Text>
        </HStack>
      </VStack>
    )
  } else if (groupMembers.length > 0) {
    content = (
      <VStack my={6} width="100%" px={0}>
        <HStack
          width="100%"
          justifyContent="space-between"
          pb={2}
          borderBottomWidth={1}
          borderBottomColor={borderColor}
          py={3}
          px={1}
        >
          <Heading size="sm" flexBasis="57%" fontWeight={800}>
            Contact
          </Heading>
          <Flex alignItems="center" flexBasis="15%" gap={0.5}>
            <Heading size="sm" fontWeight={800}>
              Role{' '}
            </Heading>
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
                    <Icon w={1} color={itemsBgColor} as={FaInfo} />
                  </Flex>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <Text
                    fontSize="sm"
                    p={4}
                    maxW="200px"
                    bgColor={itemsBgColor}
                    shadow="lg"
                  >
                    Admins can add and remove members from the group, change the
                    group&apos;s name, calendar link, and delete group.
                  </Text>
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Flex>
          <Flex alignItems="center" flexBasis="35%" gap={0.5}>
            <Heading size="sm" fontWeight={800}>
              Calendar connection
            </Heading>
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
                    <Icon w={1} color={itemsBgColor} as={FaInfo} />
                  </Flex>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <Text
                    fontSize="sm"
                    p={4}
                    maxW="200px"
                    bgColor={itemsBgColor}
                    shadow="lg"
                  >
                    At least 1 calendar connected to MeetWithWallet platform.
                  </Text>
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Flex>
        </HStack>
        <VStack width="100%" borderRadius="lg">
          {groupMembers.map(member => (
            <GroupMemberCard
              currentAccount={props.currentAccount}
              key={member?.address}
              isEmpty={groupMembers.length < 2}
              viewerRole={props.role}
              {...member}
            />
          ))}
        </VStack>
        {!noMoreFetch && !firstFetch && (
          <Button
            isLoading={loading}
            colorScheme="primary"
            variant="outline"
            alignSelf="center"
            my={4}
            onClick={() => fetchMembers()}
          >
            Load more
          </Button>
        )}
        <Spacer />

        <Button
          mt={3}
          variant="ghost"
          leftIcon={<Icon as={IoMdPersonAdd} h={25} />}
          color="white"
          px={1.5}
          height="fit-content !important"
          mr="auto"
          py={1}
          onClick={() => props.onAddNewMember(props.id, props.name)}
        >
          Add new member
        </Button>
      </VStack>
    )
  }
  return (
    <AccordionItem
      width="100%"
      key={`${id}-${props.id}`}
      p={8}
      border={0}
      borderRadius="lg"
      mt={6}
      bgColor={bgColor}
    >
      {({ isExpanded }) => (
        <>
          <HStack justifyContent="space-between" width="100%">
            <VStack gap={0} alignItems="flex-start">
              <Heading size={'lg'}>{props.name}</Heading>
              <CopyLinkButton
                url={`https://meetwithwallet.xyz/${props.slug}`}
                size="md"
                label={`meetwithwallet.xyz/${props.slug}`}
                withIcon
                design_type="link"
                noOfLines={1}
                width="95%"
              />
            </VStack>
            <HStack gap={3} width="fit-content">
              <Button colorScheme="primary">Schedule</Button>
              {props.role === MemberType.ADMIN && (
                <IconButton
                  aria-label="Add Contact"
                  p={'8px 16px'}
                  icon={<IoMdPersonAdd size={20} />}
                />
              )}
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="Group Settings"
                  p={'8px 16px'}
                  icon={<IoMdSettings size={20} />}
                  key={`${props?.id}-option`}
                />
                <Portal>
                  <MenuList backgroundColor={menuBgColor}>
                    {menuItems.map((val, index, arr) => (
                      <>
                        {val.link ? (
                          <MenuItem
                            as="a"
                            href={val.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            key={`${val.label}-${props?.id}`}
                            backgroundColor={menuBgColor}
                          >
                            {val.label}
                          </MenuItem>
                        ) : (
                          <MenuItem
                            color={val.important ? 'primary.500' : undefined}
                            onClick={val.onClick}
                            backgroundColor={menuBgColor}
                            key={`${val.label}-${props?.id}`}
                          >
                            {val.label}
                          </MenuItem>
                        )}
                        {index !== arr.length - 1 && (
                          <MenuDivider borderColor="neutral.600" />
                        )}
                      </>
                    ))}
                    {!isProduction && (
                      <>
                        <MenuDivider borderColor="neutral.600" />
                        <MenuItem
                          backgroundColor={menuBgColor}
                          onClick={() => console.debug(props)}
                        >
                          Log info (for debugging)
                        </MenuItem>
                      </>
                    )}
                  </MenuList>
                </Portal>
              </Menu>
              <AccordionButton
                as={IconButton}
                width="fit-content"
                m={0}
                aria-label="Expand Group"
                p={'8px 16px'}
                icon={
                  isExpanded ? (
                    <FaChevronUp size={20} />
                  ) : (
                    <FaChevronDown size={20} />
                  )
                }
              />
            </HStack>
          </HStack>
          <AccordionPanel px={0} pb={4}>
            {content}
          </AccordionPanel>
        </>
      )}
    </AccordionItem>
  )
}
export default GroupCard
