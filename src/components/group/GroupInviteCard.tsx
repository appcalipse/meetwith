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
import { EmptyGroupsResponse, GetGroupsResponse } from '@/types/Group'
import { logEvent } from '@/utils/analytics'
import { joinGroup } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

export interface IGroupInviteCard extends EmptyGroupsResponse {
  resetState: () => Promise<unknown>
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
      await props.resetState()
      toast({
        title: `You have joined the group "${props.name}"`,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })

      logEvent('Accepted invite', {
        group: props,
      })
    } catch (error: any) {
      handleApiError('Error accepting invite', error)
    }
    setAccepting(false)
  }
  return (
    <HStack
      width="100%"
      pr={8}
      py={{ base: 8, lg: 4 }}
      pl={{ base: 8, lg: 4 }}
      border={0}
      borderRadius="lg"
      mt={2}
      bgColor={bgColor}
      gap={{
        base: 7,
        lg: 4,
      }}
      justifyContent="space-between"
      position="relative"
      alignItems={{
        base: 'flex-start',
        md: 'center',
      }}
      flexDirection={{
        base: 'column',
        md: 'row',
      }}
    >
      <HStack position="relative" pl={6}>
        <Box
          width={2.5}
          height={2.5}
          rounded={'100%'}
          position="absolute"
          left={0}
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
      </HStack>
      <HStack
        gap="16px"
        w={{
          base: '100%',
          md: 'fit-content',
        }}
      >
        <Button
          isLoading={accepting}
          colorScheme="primary"
          onClick={handleAccept}
          flex={1}
        >
          Join Group
        </Button>
        <Button
          colorScheme="primary"
          variant="outline"
          onClick={onOpen}
          flex={1}
        >
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
