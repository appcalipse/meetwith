import { Box, Button, HStack, Text, Th, Tr, useToast } from '@chakra-ui/react'
import React, { FC, useContext } from 'react'

import { MetricStateContext } from '@/providers/MetricStateProvider'
import { ContactInvite } from '@/types/Contacts'
import { acceptContactInvite } from '@/utils/api_helper'
import {
  ContactAlreadyExists,
  ContactInviteNotForAccount,
  ContactInviteNotFound,
  OwnInviteError,
} from '@/utils/errors'
import { ellipsizeAddress } from '@/utils/user_manager'
import { ContactStateContext } from '../profile/Contact'
import { Avatar } from '../profile/components/Avatar'

type Props = {
  index: number
  account: ContactInvite
  refetch: () => Promise<void>
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

  const { fetchContactsRequestCount } = useContext(MetricStateContext)
  const { setSelectedContact } = useContext(ContactStateContext)

  const toast = useToast()
  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      await acceptContactInvite(account.id)
      syncAccept()
      await refetch()
      toast({
        title: 'Success',
        position: 'top',
        description: 'Contact invite accepted successfully',
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
          position: 'top',
        })
      } else if (e instanceof ContactInviteNotForAccount) {
        toast({
          title: 'Error',
          description: "Contact invite already accepted or doesn't exist",
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof ContactInviteNotFound) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof OwnInviteError) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Could not load contact request',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
    } finally {
      setIsAccepting(false)
    }
    fetchContactsRequestCount()
  }

  const handleRemove = async () => {
    setSelectedContact(account)
    openRejectModal()
  }
  return (
    <Tr
      bg={index % 2 === 0 ? 'bg-surface-tertiary' : 'none'}
      color="text-primary"
    >
      <Th w="fit-content" py={8}>
        <HStack w="fit-content">
          <Box className="contact-avatar">
            <Avatar
              avatar_url={account.avatar_url}
              address={account.address || ''}
              name={account.name || ellipsizeAddress(account.address)}
            />
          </Box>
          <Text maxW={200} isTruncated>
            {account.name ||
              account.email_address ||
              `No Name - ${ellipsizeAddress(account.address)}`}
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
