import { Button, HStack, Text, Th, Tr, useToast } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import React, { FC, useContext } from 'react'

import { ContactCountStateContext } from '@/providers/ContactInvitesCountProvider'
import { ContactStateContext } from '@/providers/ContactInvitesProvider'
import { ContactInvite } from '@/types/Contacts'
import { acceptContactInvite, rejectContactInvite } from '@/utils/api_helper'
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
  const { fetchRequestCount } = useContext(ContactCountStateContext)
  const { setSelectedContact } = useContext(ContactStateContext)

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
