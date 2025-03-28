import { Button, HStack, Text, Th, Tr, useToast } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import React, { FC, useContext } from 'react'

import { ContactStateContext } from '@/providers/ContactInvitesProvider'
import { ContactInvite } from '@/types/Contacts'
import { acceptContactInvite, rejectContactInvite } from '@/utils/api_helper'
import { ellipsizeAddress } from '@/utils/user_manager'

type Props = {
  index: number
  account: ContactInvite
  refetch: () => void
  syncAccept: () => void
}

const ContactRequestItem: FC<Props> = ({
  account,
  index,
  refetch,
  syncAccept,
}) => {
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [isRemoving, setIsRemoving] = React.useState(false)
  const { fetchRequestCount } = useContext(ContactStateContext)

  const toast = useToast()
  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      await acceptContactInvite(account.id)
      syncAccept()
    } catch (e) {
      const error = e as Error

      console.error(e)
      toast({
        title: 'Error',
        description: error.message || 'Could not accept contact request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      refetch()
    } finally {
      setIsAccepting(false)
    }
    fetchRequestCount()
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await rejectContactInvite(account.id)
    } catch (e) {
      const error = e as Error
      console.error(e)
      toast({
        title: 'Error',
        description: error.message || 'Could not remove contact request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      refetch()
    } finally {
      setIsRemoving(false)
    }
    fetchRequestCount()
  }
  return (
    <Tr bg={index % 2 === 0 ? 'neutral.825' : 'none'} color="white">
      <Th w="fit-content" py={8}>
        <HStack w="fit-content">
          <Jazzicon
            address={account.account_owner_address || ''}
            className="contact-avatar"
          />
          <Text maxW={200} isTruncated>
            {account.name ||
              account.account_owner_address ||
              account.email_address}
          </Text>
        </HStack>
      </Th>
      <Th>
        <Text isTruncated maxWidth={200}>
          {account.description}
        </Text>
      </Th>
      <Th>
        <Text>{ellipsizeAddress(account.account_owner_address)}</Text>
      </Th>
      <Th>
        <Text>{account.email_address}</Text>
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
            isLoading={isRemoving}
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
