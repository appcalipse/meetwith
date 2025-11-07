import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Tag,
  TagLabel,
  TagLeftIcon,
  Text,
  Th,
  Tr,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import React, { useContext } from 'react'
import { BiExit } from 'react-icons/bi'
import { FaChevronDown } from 'react-icons/fa'
import { GoDotFill } from 'react-icons/go'
import { MdDelete } from 'react-icons/md'

import { Account } from '@/types/Account'
import { GroupMember, MemberType } from '@/types/Group'
import { ChangeGroupAdminRequest } from '@/types/Requests'
import {
  addGroupMemberToContact,
  sendContactListInvite,
} from '@/utils/api_helper'
import { appUrl } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'
import {
  AccountNotFoundError,
  CantInviteYourself,
  ContactAlreadyExists,
  MemberDoesNotExist,
} from '@/utils/errors'
import { ellipsizeAddress } from '@/utils/user_manager'
import { isValidEmail } from '@/utils/validations'

import { Avatar } from '../profile/components/Avatar'
import { CopyLinkButton } from '../profile/components/CopyLinkButton'
import { GroupContext } from './Groups'

interface IGroupMemberCard extends GroupMember {
  currentAccount: Account
  isEmpty?: boolean
  viewerRole: MemberType
  groupRoles: Array<MemberType>
  setGroupRoles: React.Dispatch<React.SetStateAction<MemberType[]>>
  updateRole: (data: ChangeGroupAdminRequest) => Promise<boolean>
  groupSlug: string
  resetState: () => void
  groupID: string
  groupName: string
  isAdmin: boolean
  handleIsAdminChange: (val: boolean) => void
}

const GroupMemberCard: React.FC<IGroupMemberCard> = props => {
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
  const activeMenuColor = useColorModeValue('neutral.200', 'neutral.400')
  const tagColor = useColorModeValue('neutral.100', 'neutral.400')
  const [currentRole, setCurrentRole] = React.useState<MemberType>(props.role)
  const [loading, setLoading] = React.useState(false)
  const {
    isLoading: isAddLoading,
    mutateAsync: addGroupMemberToContactAsync,
    isSuccess: isAddSuccess,
  } = useMutation({
    mutationFn: () =>
      addGroupMemberToContact({
        address: props.address!,
        groupId: props.groupID,
        state: props.invitePending ? 'pending' : 'accepted',
      }),
  })
  const getInviteParams = () => {
    if (!props.invitePending) {
      return { address: undefined, displayName: undefined }
    }

    return {
      address: props.address || undefined,
      displayName: props.address ? undefined : props.displayName,
    }
  }

  const { address, displayName } = getInviteParams()

  const {
    isLoading: isInviteLoading,
    mutateAsync: sendInviteAsync,
    isSuccess: isInviteSuccess,
  } = useMutation({
    mutationFn: () => sendContactListInvite(address, displayName),
  })
  const isSuccess = isAddSuccess || isInviteSuccess
  const toast = useToast()
  const {
    openLeaveModal,
    setToggleAdminChange,
    pickGroupId,
    openRemoveModal,
    setSelectedGroupMember,
    setGroupName,
  } = useContext(GroupContext)
  const handleRoleChange = (
    oldRole: MemberType,
    newRole: MemberType,
    condition?: boolean
  ) => {
    if (
      oldRole === MemberType.ADMIN &&
      currentRole === MemberType.ADMIN &&
      props.groupRoles.filter(role => role === MemberType.ADMIN).length === 1
    ) {
      return () => {
        setToggleAdminChange(true)
      }
    }
    return async () => {
      try {
        if (currentRole === oldRole && !condition) {
          setLoading(true)
          const isSuccessful = await props.updateRole({
            address: props.invitePending ? undefined : props.address,
            userId: props.invitePending ? props.userId : undefined,
            role: newRole,
            invitePending: props.invitePending,
          })
          setLoading(false)
          if (!isSuccessful) return
          props.setGroupRoles(prev => {
            const rolesArr = [...prev]
            const index = prev.indexOf(oldRole)
            rolesArr[index] = newRole
            return rolesArr
          })
          setCurrentRole(newRole)
          if (props.currentAccount.address === props.address) {
            props.handleIsAdminChange(newRole === MemberType.ADMIN)
          }
        }
      } catch (error: unknown) {
        handleApiError('Error changing roles', error)
      }
      setLoading(false)
    }
  }
  const handleLeaveGroup = async () => {
    if (!props.groupID) return
    pickGroupId(props.groupID)
    openLeaveModal()
  }
  const handleRemoveGroupMember = async () => {
    if (!props.groupID) return
    pickGroupId(props.groupID)
    setGroupName(props.groupName)
    setSelectedGroupMember({
      address: props.address,
      role: props.role,
      displayName: props.displayName,
      userId: props.userId,
      invitePending: props.invitePending,
      domain: props.domain,
    })
    openRemoveModal()
  }
  const handleAddToContacts = async () => {
    try {
      let description = ''
      if (!props.invitePending) {
        await addGroupMemberToContactAsync()
        description = 'Contact added successfully'
      } else if (props.invitePending) {
        await sendInviteAsync()
        description = 'Contact invite sent successfully'
      }
      toast({
        title: 'Success',
        description,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    } catch (e) {
      if (e instanceof ContactAlreadyExists) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } else if (e instanceof AccountNotFoundError) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } else if (e instanceof CantInviteYourself) {
        toast({
          title: 'Error',
          description: 'You can&apos;t invite yourself',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof MemberDoesNotExist) {
        toast({
          title: 'Error',
          description: 'Member does not exist',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Could not load contact invite request',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
    }
  }
  const isActor = props.currentAccount.address === props.address
  return (
    <Tr
      width="100%"
      borderBottomWidth={1}
      borderBottomColor={borderColor}
      pb={3}
    >
      <Th pl={0}>
        <HStack>
          <Box
            width={{ base: '32px', md: '48px', lg: '64px' }}
            height={{ base: '32px', md: '48px', lg: '64px' }}
            display="block"
            flexBasis={{ base: '32px', md: '48px', lg: '64px' }}
          >
            <Avatar
              address={props.address || ''}
              avatar_url={props.avatar_url}
              name={props.displayName}
            />
          </Box>
          <VStack alignItems="start" gap={1} width="calc(100% - 72px)">
            <Heading size={{ base: 'xs', md: 'sm' }}>
              {props.displayName || ellipsizeAddress(props.address || '')}{' '}
              {isActor && '(You)'}
            </Heading>
            {!props.invitePending ? (
              <CopyLinkButton
                url={`${appUrl}/${props.domain || props.address}`}
                size={{ base: 'sm', md: 'md' }}
                label={`${appUrl}/${props.domain || props.address}`}
                withIcon
                design_type="link"
                pl={0}
                maxW="335px"
                px={0}
                childStyle={{
                  style: {
                    width: '150px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            ) : (
              <HStack alignItems="center">
                <Box
                  h={5}
                  w="fit-content"
                  borderRadius="99px"
                  px={2.5}
                  py="3"
                  display="grid"
                  placeContent="center"
                  bg={tagColor}
                >
                  <Text size={{ base: 'xs', md: 'sm' }}>Pending</Text>
                </Box>
              </HStack>
            )}
          </VStack>
        </HStack>
      </Th>
      <Th pl={0}>
        <Flex alignItems="center" gap={0.5} align="flex-start">
          {props?.isContact || isSuccess || isActor ? (
            <Tag size={'sm'} variant="subtle">
              <TagLeftIcon
                boxSize="12px"
                w={5}
                h={5}
                as={GoDotFill}
                color="green.500"
              />
              <TagLabel px="2px">
                {isActor ? 'This is me' : 'My contact'}
              </TagLabel>
            </Tag>
          ) : props?.hasContactInvite ? (
            <Tag size={'sm'} variant="subtle">
              <TagLeftIcon
                boxSize="12px"
                w={5}
                h={5}
                as={GoDotFill}
                color="yellow.500"
              />
              <TagLabel px="2px">Pending</TagLabel>
            </Tag>
          ) : (
            <Button
              colorScheme="primary"
              onClick={handleAddToContacts}
              isLoading={isAddLoading || isInviteLoading}
              isDisabled={isSuccess}
              _disabled={{
                bg: isSuccess ? 'neutral.400' : '',
              }}
              _hover={{
                bg: isSuccess ? 'neutral.400' : '',
              }}
            >
              Add to Contacts
            </Button>
          )}
        </Flex>
      </Th>
      <Th pl={0}>
        <HStack display="flex" justifyContent="space-between">
          <HStack overflow="hidden" maxW={'150px'}>
            {loading ? (
              <Spinner marginInline="auto" />
            ) : (
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={
                    <FaChevronDown
                      style={{
                        marginLeft:
                          currentRole === MemberType.ADMIN ? '0px' : '15px',
                      }}
                    />
                  }
                  variant="ghost"
                  gap={12}
                  width="100px"
                  pr={4}
                  pl={0}
                  textTransform="capitalize"
                  isDisabled={!props.isAdmin}
                >
                  {currentRole}
                </MenuButton>
                <MenuList
                  width="10px"
                  minWidth="fit-content"
                  overflowX="hidden"
                >
                  <MenuItem
                    width="100px"
                    textTransform="capitalize"
                    borderBottom={`2px solid neutral.200`}
                    backgroundColor={
                      currentRole === MemberType.ADMIN
                        ? activeMenuColor
                        : menuBgColor
                    }
                    onClick={handleRoleChange(
                      MemberType.MEMBER,
                      MemberType.ADMIN
                    )}
                    disabled={currentRole === MemberType.ADMIN}
                  >
                    {MemberType.ADMIN}
                  </MenuItem>
                  <MenuItem
                    width="100px"
                    textTransform="capitalize"
                    backgroundColor={
                      currentRole === MemberType.MEMBER
                        ? activeMenuColor
                        : menuBgColor
                    }
                    disabled={currentRole === MemberType.MEMBER}
                    onClick={handleRoleChange(
                      MemberType.ADMIN,
                      MemberType.MEMBER,
                      currentRole === MemberType.ADMIN &&
                        props.groupRoles.filter(
                          role => role === MemberType.ADMIN
                        ).length === 1
                    )}
                  >
                    {MemberType.MEMBER}
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </HStack>
        </HStack>
      </Th>
      <Th pr={0}>
        <HStack>
          {
            // no one can leave an empty group
            !props?.isEmpty &&
              (props.address === props.currentAccount.address ? (
                <Icon
                  ml={2}
                  w={25}
                  h={25}
                  as={BiExit}
                  cursor="pointer"
                  onClick={handleLeaveGroup}
                />
              ) : // only admin can remove other users
              props.viewerRole === MemberType.ADMIN ? (
                <Icon
                  ml={2}
                  w={25}
                  h={25}
                  as={MdDelete}
                  onClick={handleRemoveGroupMember}
                  cursor="pointer"
                />
              ) : null)
          }
        </HStack>
      </Th>
    </Tr>
  )
}
export default GroupMemberCard
