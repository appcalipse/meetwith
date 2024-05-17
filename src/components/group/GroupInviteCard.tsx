import {
  Box,
  Button,
  Heading,
  HStack,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react'
import React from 'react'

import { GetGroupsResponse } from '@/types/Group'
import { joinGroup, rejectGroup } from '@/utils/api_helper'

export interface IGroupInviteCard extends GetGroupsResponse {
  resetState: () => void
}

const GroupInviteCard: React.FC<IGroupInviteCard> = props => {
  const bgColor = useColorModeValue('white', '#1F2933')
  const [accepting, setAccepting] = React.useState(false)
  const [declining, setDeclining] = React.useState(false)
  const handleAccept = async () => {
    setAccepting(true)
    await joinGroup(props.id)
    setAccepting(false)
    props.resetState()
  }
  const handleDecline = async () => {
    setDeclining(true)
    await rejectGroup(props.id)
    setDeclining(false)
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
      <Heading size={'lg'}>{props.name}</Heading>
      <HStack gap="16px">
        {accepting ? (
          <Spinner marginX={4} />
        ) : (
          <Button colorScheme="primary" onClick={handleAccept}>
            Join Group
          </Button>
        )}
        {declining ? (
          <Spinner marginX={4} />
        ) : (
          <Button
            colorScheme="primary"
            variant="outline"
            onClick={handleDecline}
          >
            Decline
          </Button>
        )}
      </HStack>
    </HStack>
  )
}

export default GroupInviteCard
