import { Button, HStack, Text, Th, Tr, useToast } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import React, { FC, useContext } from 'react'

import { ContactStateContext } from '@/providers/ContactInvitesProvider'
import { ContactInvite } from '@/types/Contacts'
import { acceptContactInvite } from '@/utils/api_helper'
import { ContactAlreadyExists, ContactInviteNotFound } from '@/utils/errors'
import { ellipsizeAddress } from '@/utils/user_manager'

type Props = {
  index: number
  account: ContactInvite
  refetch: () => void
  syncAccept: () => void
  openRejectModal: () => void
}

const ContactRequestItem: FC<Props> = ({
  account,
  index,
  refetch,
  syncAccept,
  openRejectModal,
}) => {
  const [isAccepting, setIsAccepting] = React.useState(false)

  const { setSelectedContact, fetchRequestCount } =
    useContext(ContactStateContext)

  const toast = useToast()
  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      await acceptContactInvite(account.id)
      syncAccept()
    } catch (e) {
      const error = e as Error
      if (e instanceof ContactAlreadyExists) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } else if (e instanceof ContactInviteNotFound) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } else {
        toast({
          title: 'Error',
          description: 'Could not load contact request',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
      refetch()
    } finally {
      setIsAccepting(false)
    }
    fetchRequestCount()
  }

  const handleRemove = async () => {
    setSelectedContact(account)
    openRejectModal()
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
        <HStack gap={4}>
          <Button
            colorScheme="primary"
            onClick={handleAccept}
            isLoading={isAccepting}
          >
            Accept
          </Button>
          <Button
            colorScheme="primary"
            variant="outline"
            onClick={handleRemove}
          >
            Decline
          </Button>
        </HStack>
      </Th>
    </Tr>
  )
}

export default ContactRequestItem
