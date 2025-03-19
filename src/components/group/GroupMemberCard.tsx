import {
  Box,
  Button,
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
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import React, { useContext } from 'react'
import { BiExit } from 'react-icons/bi'
import { FaChevronDown } from 'react-icons/fa'
import { GoDotFill } from 'react-icons/go'
import { MdDelete } from 'react-icons/md'

import { GroupContext } from '@/components/profile/Group'
import { Account } from '@/types/Account'
import { GroupMember, MemberType } from '@/types/Group'
import { ChangeGroupAdminRequest } from '@/types/Requests'
import { appUrl } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'
import { ellipsizeAddress } from '@/utils/user_manager'

import { CopyLinkButton } from '../profile/components/CopyLinkButton'

const Avatar = dynamic(
  async () => (await import('@ukstv/jazzicon-react')).Jazzicon,
  {
    ssr: false,
    loading: () => <Spinner />,
  }
)

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
      } catch (error: any) {
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
      calendarConnected: props.calendarConnected,
      invitePending: props.invitePending,
      domain: props.domain,
    })
    openRemoveModal()
  }

  return (
    <HStack
      width="100%"
      justifyContent="space-between"
      borderBottomWidth={1}
      borderBottomColor={borderColor}
      pb={3}
    >
      <HStack flexBasis="57%" overflow="hidden">
        <Box width="64px" height="64px" display="block" flexBasis={'64px'}>
          <Avatar address={props.address || ''} />
        </Box>
        <VStack alignItems="start" gap={1} width="calc(100% - 72px)">
          <Heading size="sm">
            {props.displayName || ellipsizeAddress(props.address || '')}{' '}
            {props.currentAccount.address === props.address && '(You)'}
          </Heading>
          {!props.invitePending ? (
            <CopyLinkButton
              url={`${appUrl}/${props.domain || props.address}`}
              size="md"
              label={`${appUrl}/${props.domain || props.address}`}
              withIcon
              design_type="link"
              pl={0}
              maxW="335px"
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
                <Text size="sm">Pending</Text>
              </Box>
            </HStack>
          )}
        </VStack>
      </HStack>
      <HStack flexBasis="15%" overflow="hidden">
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
              pr={4}
              pl={0}
              textTransform="capitalize"
              isDisabled={!props.isAdmin}
            >
              {currentRole}
            </MenuButton>
            <MenuList width="10px" minWidth="fit-content" overflowX="hidden">
              <MenuItem
                textTransform="capitalize"
                borderBottom={`2px solid neutral.200`}
                backgroundColor={
                  currentRole === MemberType.ADMIN
                    ? activeMenuColor
                    : menuBgColor
                }
                onClick={handleRoleChange(MemberType.MEMBER, MemberType.ADMIN)}
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
                    props.groupRoles.filter(role => role === MemberType.ADMIN)
                      .length === 1
                )}
              >
                {MemberType.MEMBER}
              </MenuItem>
            </MenuList>
          </Menu>
        )}
      </HStack>
      <HStack flexBasis="35%" display="flex" justifyContent="space-between">
        {props?.calendarConnected ? (
          <Tag size={'sm'} variant="subtle">
            <TagLeftIcon
              boxSize="12px"
              w={5}
              h={5}
              as={GoDotFill}
              color="green.500"
            />
            <TagLabel px="2px">Connected</TagLabel>
          </Tag>
        ) : (
          <Text p={0} fontWeight={700}>
            Not connected
          </Text>
        )}
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
    </HStack>
  )
}
export default GroupMemberCard
