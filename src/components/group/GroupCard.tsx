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
  Table,
  TableContainer,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { InviteType } from '@meta/Dashboard'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useRouter } from 'next/router'
import React, { Fragment, useContext, useId, useMemo, useState } from 'react'
import { FaChevronDown, FaChevronUp, FaInfo } from 'react-icons/fa'
import { IoMdPersonAdd, IoMdSettings } from 'react-icons/io'
import { IoShareSocialOutline } from 'react-icons/io5'

import { GroupContext } from '@/components/group/Groups'
import { Account } from '@/types/Account'
import { GetGroupsFullResponse, MemberType, MenuOptions } from '@/types/Group'
import { ChangeGroupAdminRequest } from '@/types/Requests'
import { updateGroupRole } from '@/utils/api_helper'
import { appUrl, isProduction } from '@/utils/constants'

import GroupMemberCard from './GroupMemberCard'

export interface IGroupCard extends GetGroupsFullResponse {
  currentAccount: Account
  onAddNewMember: (groupId: string, groupName: string) => void
  mt: number
  resetState: () => void
}

const GroupCard: React.FC<IGroupCard> = props => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const itemsBgColor = useColorModeValue('white', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'white')
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
  const toast = useToast()

  const id = useId()
  const { push } = useRouter()
  const actor = props.members.find(
    member => member.address === props.currentAccount.address
  )
  const [isAdmin, setIsAdmin] = useState(actor?.role === MemberType.ADMIN)
  const [groupRoles, setGroupRoles] = useState<Array<MemberType>>(
    props.members.map(member => member.role)
  )
  const {
    openDeleteModal,
    setGroupName,
    pickGroupId,
    openNameEditModal,
    openLeaveModal,
  } = useContext(GroupContext)

  const renderPopOverOptions = (role: MemberType): Array<MenuOptions> => {
    const defaultOptions: Array<MenuOptions> = []
    switch (role) {
      case MemberType.ADMIN:
        return [
          ...defaultOptions,
          {
            label: 'Edit group name',
            onClick: () => {
              openNameEditModal()
              setGroupName(props.name)
              pickGroupId(props.id)
            },
          },
          {
            label: 'Delete group',
            important: true,
            onClick: () => {
              openDeleteModal()
              setGroupName(props.name)
              pickGroupId(props.id)
            },
          },
        ]
      case MemberType.MEMBER:
        return [
          ...defaultOptions,
          {
            label: 'Leave group',
            important: true,
            onClick: () => {
              if (!props.id) return
              pickGroupId(props.id)
              openLeaveModal()
            },
          },
        ]
      default:
        return []
    }
  }
  const updateRole = async (data: ChangeGroupAdminRequest) => {
    return await updateGroupRole(props.id, data)
  }

  const menuItems = useMemo(
    () => renderPopOverOptions(actor?.role || MemberType.MEMBER),
    [actor?.role]
  )
  return (
    <AccordionItem
      width="100%"
      key={`${id}-${props.id}`}
      px={8}
      py={4}
      border={0}
      borderRadius="lg"
      mt={2}
      bgColor={'bg-surface'}
      id={props.id}
    >
      {({ isExpanded }) => (
        <>
          <HStack
            justifyContent="space-between"
            width="100%"
            alignItems="flex-start"
            flexDirection={{
              base: 'column',
              md: 'row',
            }}
          >
            <VStack gap={0} alignItems="start">
              <Heading
                size={'lg'}
                maxW={{ '2xl': '400px', lg: 270, xl: 300, base: 200 }}
                w="fit-content"
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
              >
                {props.name}
              </Heading>
            </VStack>
            <Button
              colorScheme="primary"
              display={{ base: 'flex', md: 'none' }}
              onClick={() =>
                push(`/dashboard/schedule?ref=group&groupId=${props.id}`)
              }
            >
              Schedule
            </Button>
            <HStack gap={3} width="fit-content">
              <Button
                colorScheme="primary"
                display={{ base: 'none', md: 'flex' }}
                onClick={() =>
                  push(`/dashboard/schedule?ref=group&groupId=${props.id}`)
                }
              >
                Schedule
              </Button>
              {isAdmin && (
                <IconButton
                  aria-label="Add Contact"
                  p={'8px 16px'}
                  icon={<IoMdPersonAdd size={20} />}
                  onClick={() => props.onAddNewMember(props.id, props.name)}
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
                      <Fragment key={`${val.label}-${props?.id}`}>
                        {val.link ? (
                          <MenuItem
                            as="a"
                            href={val.link}
                            target="_blank"
                            rel="noopener noreferrer"
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
                      </Fragment>
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
            <VStack my={6} width="100%" px={0}>
              <TableContainer width="100%">
                <Table variant="unstyled" colorScheme="whiteAlpha">
                  <Thead bg="bg-surface">
                    <Tr color="text-primary">
                      <Th alignItems={'start'} px={0}>
                        <Heading size="sm" fontWeight={800}>
                          Contact
                        </Heading>
                      </Th>
                      <Th pl={0}>
                        <Flex alignItems="center" align="flex-start">
                          <Heading size="sm" fontWeight={800}>
                            Contact Connection{' '}
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
                                  <Icon
                                    w={1}
                                    color={itemsBgColor}
                                    as={FaInfo}
                                  />
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
                                  This shows whether the member is in your
                                  contacts list or has already been sent a
                                  contact invite from you.
                                </Text>
                                <Tooltip.Arrow />
                              </Tooltip.Content>
                            </Tooltip.Root>
                          </Tooltip.Provider>
                        </Flex>
                      </Th>
                      <Th pl={0}>
                        <Flex alignItems="center" gap={0.5} align="flex-start">
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
                                  <Icon
                                    w={1}
                                    color={itemsBgColor}
                                    as={FaInfo}
                                  />
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
                                  Admins can add and remove members from the
                                  group, change the group&apos;s name, calendar
                                  link, and delete group.
                                </Text>
                                <Tooltip.Arrow />
                              </Tooltip.Content>
                            </Tooltip.Root>
                          </Tooltip.Provider>
                        </Flex>
                      </Th>
                      <Th pl={0}></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {props.members.map(member => (
                      <GroupMemberCard
                        currentAccount={props.currentAccount}
                        key={member?.address}
                        isEmpty={props.members.length < 2}
                        viewerRole={actor?.role || MemberType.MEMBER}
                        groupRoles={groupRoles}
                        setGroupRoles={setGroupRoles}
                        updateRole={updateRole}
                        groupSlug={props.slug}
                        groupID={props.id}
                        groupName={props.name}
                        resetState={props.resetState}
                        isAdmin={isAdmin}
                        handleIsAdminChange={setIsAdmin}
                        {...member}
                      />
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
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
                <Flex
                  alignItems="center"
                  gap={0.5}
                  align="flex-start"
                  flexBasis="30%"
                >
                  <Heading size="sm" fontWeight={800}>
                    Contact Connection{' '}
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
                          This shows whether the member is in your contacts list
                          or has already been sent a contact invite from you.
                        </Text>
                        <Tooltip.Arrow />
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </Flex>
                <Flex
                  alignItems="center"
                  gap={0.5}
                  align="flex-start"
                  flexBasis="30%"
                >
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
                          Admins can add and remove members from the group,
                          change the group&apos;s name, calendar link, and
                          delete group.
                        </Text>
                        <Tooltip.Arrow />
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </Flex>
              </HStack>
              {isAdmin && (
                <>
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
                </>
              )}
            </VStack>
          </AccordionPanel>
        </>
      )}
    </AccordionItem>
  )
}
export default GroupCard
