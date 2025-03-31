import { Button, HStack, Text, Th, Tr } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { useRouter } from 'next/router'
import React, { FC } from 'react'

import { Contact } from '@/types/Contacts'
import { removeContact } from '@/utils/api_helper'
import { ContactStatus } from '@/utils/constants/contact'
import { ellipsizeAddress } from '@/utils/user_manager'

type Props = {
  account: Contact
  index: number
}

const ContactListItem: FC<Props> = ({ account, index }) => {
  const [isRemoving, setIsRemoving] = React.useState(false)
  const { push } = useRouter()
  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await removeContact(account.contact_address)
    } catch (e) {
      console.error(e)
    } finally {
      setIsRemoving(false)
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
          <Button colorScheme="primary" onClick={() => {}}>
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
