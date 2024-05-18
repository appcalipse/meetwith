import {
  Box,
  Button,
  Heading,
  HStack,
  Icon,
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
}
const GroupMemberCard: React.FC<IGroupMemberCard> = props => {
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
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
              url={'meetwithwallet.xyz/rndaomarketing'}
              size="md"
              width="90%"
              label={'meetwithwallet.xyz/rndaomarketing'}
              withIcon
              design_type="link"
              noOfLines={1}
              pl={0}
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
        <Button
          rightIcon={<FaChevronDown />}
          variant="ghost"
          p={0}
          textTransform="capitalize"
        >
          {props.role}
        </Button>
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
