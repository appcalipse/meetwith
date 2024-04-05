import {
  Avatar,
  Button,
  Heading,
  HStack,
  Icon,
  Tag,
  TagLabel,
  TagLeftIcon,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import { BiExit } from 'react-icons/bi'
import { FaChevronDown } from 'react-icons/fa'
import { GoDotFill } from 'react-icons/go'
import { MdDelete } from 'react-icons/md'

import { CopyLinkButton } from '../profile/components/CopyLinkButton'

const GroupMemberCard: React.FC = ({}) => {
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  return (
    <HStack
      width="100%"
      justifyContent="space-between"
      pb={2}
      borderBottomWidth={1}
      borderBottomColor={borderColor}
      py={3}
    >
      <HStack flexBasis="50%" overflow="hidden">
        <Avatar name="Dan Abrahmov" src="https://bit.ly/dan-abramov" />
        <VStack alignItems="start" gap={0}>
          <Heading size="sm">Daniel Jackalop (you)</Heading>
          <CopyLinkButton
            url={'meetwithwallet.xyz/rndaomarketing'}
            size="md"
            width="100%"
            label={'meetwithwallet.xyz/rndaomarketing'}
            withIcon
            design_type="link"
            noOfLines={1}
            pl={0}
          />
        </VStack>
      </HStack>
      <HStack flexBasis="15%" overflow="hidden">
        <Button rightIcon={<FaChevronDown />} variant="ghost" p={0}>
          Admin
        </Button>
      </HStack>
      <HStack flexBasis="35%" display="flex" justifyContent="space-between">
        {true ? (
          true ? (
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
            <Tag size={'sm'} variant="subtle" bgColor="neutral.400">
              <TagLeftIcon
                boxSize="12px"
                w={5}
                h={5}
                as={GoDotFill}
                color="red" // we need a better color here
              />
              <TagLabel color="white" px="2px">
                Disconnected
              </TagLabel>
            </Tag>
          )
        ) : (
          <Text>Pending invites</Text>
        )}
        {
          // no one can leave an empty group
          true &&
            (false ? (
              <Icon ml={2} w={25} h={25} as={BiExit} />
            ) : // only admin can remove other users
            true ? (
              <Icon ml={2} w={25} h={25} as={MdDelete} />
            ) : null)
        }
      </HStack>
    </HStack>
  )
}
export default GroupMemberCard
