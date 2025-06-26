import { Button, HStack, Text, Th, Tr, useToast } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { useRouter } from 'next/router'
import React, { FC } from 'react'

import { Contact } from '@/types/Contacts'
import { removeContact, sendContactListInvite } from '@/utils/api_helper'
import { ContactStatus } from '@/utils/constants/contact'
import {
  AccountNotFoundError,
  CantInviteYourself,
  ContactAlreadyExists,
} from '@/utils/errors'
import { ellipsizeAddress } from '@/utils/user_manager'

type Props = {
  account: Contact
  index: number
  sync: (id: string) => void
  refetch: () => void
}

const ContactListItem: FC<Props> = ({ account, index, sync, refetch }) => {
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
    <Tr bg={index % 2 === 0 ? 'neutral.825' : 'none'} color="white">
      <Th w="fit-content" py={8}>
        <HStack w="fit-content">
          <Jazzicon
            address={account.address || ''}
            className="contact-avatar"
          />
          <Text maxW={200} isTruncated>
            {account.name || account.address || account.email_address}
          </Text>
        </HStack>
      </Th>
      <Th>
        <Text isTruncated maxWidth={200}>
          {account.description}
        </Text>
      </Th>
      <Th>
        <Text>{ellipsizeAddress(account.address)}</Text>
      </Th>
      <Th>
        {account.status === ContactStatus.ACTIVE ? (
          <Button
            colorScheme="primary"
            onClick={() => {
              push(`/dashboard/schedule?ref=contact&contactId=${account.id}`)
            }}
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
