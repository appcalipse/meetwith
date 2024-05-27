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
  VStack,
} from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import React from 'react'
import { BiExit } from 'react-icons/bi'
import { FaChevronDown } from 'react-icons/fa'
import { GoDotFill } from 'react-icons/go'
import { MdDelete } from 'react-icons/md'

import { Account } from '@/types/Account'
import { GroupMember, MemberType } from '@/types/Group'
import { ChangeGroupAdminRequest } from '@/types/Requests'
import { appUrl } from '@/utils/constants'

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
}
const GroupMemberCard: React.FC<IGroupMemberCard> = props => {
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  const activeMenuColor = useColorModeValue('neutral.800', 'neutral.200')
  const [currentRole, setCurrentRole] = React.useState<MemberType>(props.role)
  const [loading, setLoading] = React.useState(false)
  const handleRoleChange = (
    oldRole: MemberType,
    newRole: MemberType,
    condition?: boolean
  ) => {
    return async () => {
      try {
        if (currentRole === oldRole && !condition) {
          setLoading(true)
          const isSuccessful = await props.updateRole({
            address: props.address,
            role: newRole,
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
        }
      } catch (e) {}
    }
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
            {props.displayName}{' '}
            {props.currentAccount.address === props.address && '(You)'}
          </Heading>
          {!props.invitePending ? (
            <CopyLinkButton
              url={`${appUrl}/${props.address}`}
              size="md"
              label={`${appUrl}/${props.address}`}
              withIcon
              design_type="link"
              pl={0}
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
                bg="neutral.400"
              >
                <Text size="sm">Pending</Text>
              </Box>
              <Button colorScheme="primary" variant="link" size="sm">
                Send reminder
              </Button>
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
              px={4}
              textTransform="capitalize"
            >
              {currentRole}
            </MenuButton>
            <MenuList width="10px" minWidth="fit-content" overflowX="hidden">
              <MenuItem
                textTransform="capitalize"
                borderBottom={`2px solid ${activeMenuColor}`}
                backgroundColor={
                  currentRole === MemberType.ADMIN ? activeMenuColor : undefined
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
                    : undefined
                }
                disabled={
                  (currentRole === MemberType.ADMIN &&
                    props.groupRoles.filter(role => role === MemberType.ADMIN)
                      .length === 1) ||
                  currentRole === MemberType.MEMBER
                }
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
          <Tag size={'sm'} variant="subtle" bgColor="neutral.400">
            <TagLeftIcon
              boxSize="12px"
              w={5}
              h={5}
              as={GoDotFill}
              color="green.500"
            />
            <TagLabel color="white" px="2px">
              Connected
            </TagLabel>
          </Tag>
        ) : (
          <Button rightIcon={<FaChevronDown />} variant="ghost" p={0}>
            Not connected
          </Button>
        )}
        {
          // no one can leave an empty group
          !props?.isEmpty &&
            props.viewerRole === MemberType.ADMIN &&
            (props.address === props.currentAccount.address ? (
              <Icon ml={2} w={25} h={25} as={BiExit} cursor="pointer" />
            ) : // only admin can remove other users
            props.viewerRole === MemberType.ADMIN ? (
              <Icon ml={2} w={25} h={25} as={MdDelete} cursor="pointer" />
            ) : null)
        }
      </HStack>
    </HStack>
  )
}
export default GroupMemberCard
