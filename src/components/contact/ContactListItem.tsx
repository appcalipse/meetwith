import { Button, HStack, Text, Th, Tr } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import React, { FC } from 'react'

import { Contacts } from '@/types/Contacts'
import { acceptContactInvite } from '@/utils/api_helper'
import { ellipsizeAddress } from '@/utils/user_manager'

type Props = {
  account: Contacts
  index: number
}

const ContactListItem: FC<Props> = ({ account, index }) => {
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [isRemoving, setIsRemoving] = React.useState(false)
  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      await acceptContactInvite(account.id)
    } catch (e) {
      console.error(e)
    } finally {
      setIsAccepting(false)
    }
  }
  return (
    <Tr bg={index % 2 === 0 ? 'neutral.825' : 'none'} color="white">
      <Th w="fit-content" py={8}>
        <HStack w="fit-content">
          <Jazzicon
            address={account.contact_address || ''}
            className="contact-avatar"
          />
          <Text maxW={200} isTruncated>
            {account.name || account.contact_address || account.email_address}
          </Text>
        </HStack>
      </Th>
      <Th>
        <Text isTruncated maxWidth={200}>
          {account.description}
        </Text>
      </Th>
      <Th>
        <Text>{ellipsizeAddress(account.contact_address)}</Text>
      </Th>
      <Th>
        <Button colorScheme="primary" onClick={() => {}}>
          Schedule
        </Button>
      </Th>
      <Th>
        <Button
          colorScheme="primary"
          // isLoading={}
          variant="outline"
          onClick={() => {}}
        >
          Remove
        </Button>
      </Th>
    </Tr>
  )
}

export default ContactListItem
