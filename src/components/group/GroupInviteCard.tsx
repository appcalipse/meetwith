import {
  Box,
  Button,
  Heading,
  HStack,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import React from 'react'

import GroupInviteCardModal from '@/components/group/GroupInviteCardModal'
import { GetGroupsResponse } from '@/types/Group'
import { joinGroup } from '@/utils/api_helper'
import { isJson } from '@/utils/generic_utils'

export interface IGroupInviteCard extends GetGroupsResponse {
  resetState: () => void
}

const GroupInviteCard: React.FC<IGroupInviteCard> = props => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const [accepting, setAccepting] = React.useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const handleAccept = async () => {
    setAccepting(true)
    try {
      await joinGroup(props.id)
    } catch (error: any) {
      const isJsonErr = isJson(error.message)
      const errorMessage = isJsonErr
        ? JSON.parse(error.message)?.error
        : error.message
      toast({
        title: 'Error inviting member',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    }
    setAccepting(false)
    props.resetState()
  }
  return (
    <HStack
      width="100%"
      p={8}
      border={0}
      borderRadius="lg"
      mt={6}
      bgColor={bgColor}
      justifyContent="space-between"
      position="relative"
    >
      <Box
        width={2.5}
        height={2.5}
        rounded={'100%'}
        position="absolute"
        left={3}
        bg="primary.500"
      />
      <Heading
        size={'lg'}
        maxW="500px"
        w="fit-content"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {props.name}
      </Heading>
      <HStack gap="16px">
        <Button
          isLoading={accepting}
          colorScheme="primary"
          onClick={handleAccept}
        >
          Join Group
        </Button>
        <Button colorScheme="primary" variant="outline" onClick={onOpen}>
          Decline
        </Button>
      </HStack>
      <GroupInviteCardModal
        group_id={props.id}
        isOpen={isOpen}
        onClose={onClose}
        resetState={props.resetState}
      />
    </HStack>
  )
}

export default GroupInviteCard
