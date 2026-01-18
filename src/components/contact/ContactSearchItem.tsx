import {
  Box,
  Button,
  HStack,
  Td,
  Text,
  Tooltip,
  Tr,
  useToast,
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import React from 'react'

import { SearchAccount } from '@/types/Contacts'
import { sendContactListInvite } from '@/utils/api_helper'
import {
  CantInviteYourself,
  ContactAlreadyExists,
  ContactInviteAlreadySent,
} from '@/utils/errors'
import { ellipsizeAddress } from '@/utils/user_manager'

import { Avatar } from '../profile/components/Avatar'

interface IContactSearchItem extends SearchAccount {
  index: number
  handleUpdateResult: (result: SearchAccount) => void
}

const ContactSearchItem = (props: IContactSearchItem) => {
  const { isLoading: isInviteLoading, mutateAsync: sendInviteAsync } =
    useMutation({
      mutationFn: (data: { email?: string; address?: string }) =>
        sendContactListInvite(data?.address, data?.email),
    })
  const toast = useToast()
  const loadingRef = React.useRef<boolean>(false)

  const handleInvite = async () => {
    if (loadingRef.current || isInviteLoading) return
    try {
      loadingRef.current = true
      const invite = await sendInviteAsync({
        email: props.email,
        address: props.address,
      })
      if (invite?.success) {
        props.handleUpdateResult(props)
        toast({
          title: 'Invitation sent successfully',
          description: '',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
    } catch (e: unknown) {
      if (e instanceof ContactAlreadyExists) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof ContactInviteAlreadySent) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
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
    } finally {
      loadingRef.current = false
    }
  }
  return (
    <Tr
      key={props.index}
      bg={props.index % 2 === 0 ? 'bg-surface-tertiary' : 'none'}
    >
      <Td colSpan={4}>
        <HStack>
          <Box className="contact-avatar">
            <Avatar
              avatar_url={props.avatar_url}
              address={props.address || ''}
              name={
                props.name || props.email || ellipsizeAddress(props.address)
              }
            />
          </Box>
          <Text maxW={{ base: 120, md: 200 }} isTruncated>
            {props.name || `no name - ${props.email || props.address}`}
          </Text>
        </HStack>
      </Td>
      <Td>
        <Tooltip
          label={'Contact Already Invited'}
          isDisabled={!props.is_invited}
        >
          <Button
            colorScheme="primary"
            isLoading={isInviteLoading}
            isDisabled={isInviteLoading || props.is_invited}
            _disabled={{
              bg: props.is_invited ? 'neutral.400' : '',
            }}
            _hover={{
              bg: props.is_invited ? 'neutral.400' : 'primary.300',
            }}
            onClick={() => handleInvite()}
          >
            {props.is_invited ? 'Request Already Sent' : 'Send request'}
          </Button>
        </Tooltip>
      </Td>
    </Tr>
  )
}

export default ContactSearchItem
