import { Box, Button, HStack, Text, Th, Tr, useToast } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, { FC } from 'react'

import { Contact } from '@/types/Contacts'
import { removeContact, sendContactListInvite } from '@/utils/api_helper'
import { appUrl } from '@/utils/constants'
import { ContactStatus } from '@/utils/constants/contact'
import {
  AccountNotFoundError,
  CantInviteYourself,
  ContactAlreadyExists,
} from '@/utils/errors'
import { ellipsizeAddress } from '@/utils/user_manager'

import { Avatar } from '../profile/components/Avatar'

type Props = {
  account: Contact
  index: number
  sync: (id: string) => void
  refetch: () => void
  hasProAccess?: boolean
}

const ContactListItem: FC<Props> = ({
  account,
  index,
  sync,
  refetch,
  hasProAccess = true,
}) => {
  const [isRemoving, setIsRemoving] = React.useState(false)
  const { push } = useRouter()
  const toast = useToast()
  const {
    isLoading: isInviteLoading,
    mutateAsync: sendInviteAsync,
    isSuccess,
  } = useMutation({
    mutationFn: (address?: string) => sendContactListInvite(address),
  })
  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await removeContact(account.address)
      sync(account.id)
      toast({
        title: 'Success',
        description: 'Contact removed successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    } catch (e) {
      const error = e as Error
      toast({
        title: 'Error',
        description: error.message || 'Could not remove contact',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      refetch()
    } finally {
      setIsRemoving(false)
    }
  }
  const handleSendInvite = async () => {
    if (!account.address) return
    try {
      await sendInviteAsync(account.address)
      toast({
        title: 'Success',
        description: 'Contact invite sent successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
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
  return (
    <Tr
      bg={index % 2 === 0 ? 'bg-surface-tertiary' : 'none'}
      color="text-primary"
    >
      <Th w="fit-content" py={8}>
        <HStack w="fit-content" pos={'relative'}>
          {account.status === ContactStatus.INACTIVE && (
            <Text pos="absolute" top={-6} left={1} color="primary.200">
              Removed you as a contact
            </Text>
          )}
          <Box className="contact-avatar">
            <Avatar
              avatar_url={account.avatar_url}
              address={account.address || ''}
              name={account.name || ellipsizeAddress(account.address)}
            />
          </Box>
          <Text maxW={{ base: 120, md: 200 }} isTruncated>
            {account.name ||
              account.email_address ||
              `No Name - ${ellipsizeAddress(account.address)}`}
          </Text>
        </HStack>
      </Th>
      <Th>
        <Text isTruncated maxWidth={{ base: 120, md: 200 }}>
          {account.description}
        </Text>
      </Th>
      <Th>
        <Text>{ellipsizeAddress(account.address)}</Text>
      </Th>
      <Th>
        {!account.calendar_exists ? (
          <Text
            maxW={{ base: '120px', md: '200px' }}
            wordBreak="break-word"
            whiteSpace="normal"
            overflow="hidden"
          >
            Calendar not connected
          </Text>
        ) : account.status === ContactStatus.ACTIVE ? (
          <Button
            colorScheme="primary"
            onClick={() => {
              push(`${appUrl}/${account.domain || account.address}`)
            }}
            isDisabled={!hasProAccess}
            title={
              !hasProAccess
                ? 'Upgrade to Pro to schedule with contacts'
                : undefined
            }
          >
            Schedule
          </Button>
        ) : (
          <Button
            colorScheme="primary"
            onClick={handleSendInvite}
            isLoading={isInviteLoading}
            isDisabled={isSuccess}
            _disabled={{
              bg: isSuccess ? 'neutral.400' : '',
            }}
            _hover={{
              bg: isSuccess ? 'neutral.400' : '',
            }}
          >
            Send request
          </Button>
        )}
      </Th>
      <Th>
        <Button
          colorScheme="primary"
          isLoading={isRemoving}
          aria-busy={isRemoving}
          variant="outline"
          onClick={handleRemove}
        >
          Remove
        </Button>
      </Th>
    </Tr>
  )
}

export default ContactListItem
