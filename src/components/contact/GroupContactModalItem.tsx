import { Box, Button, HStack, Td, Text, Tr } from '@chakra-ui/react'
import React, { FC } from 'react'

import { LeanContact } from '@/types/Contacts'
import { ellipsizeAddress } from '@/utils/user_manager'

import { Avatar } from '../profile/components/Avatar'

interface IGroupModalItem extends LeanContact {
  index: number
  buttonLabel?: string
  isContactAlreadyAdded: (address: LeanContact) => boolean
  addUserFromContact: (address: LeanContact) => void | Promise<void>
  removeUserFromContact: (address: LeanContact) => void | Promise<void>
  isLoading: boolean
}

const GroupContactModalItem: FC<IGroupModalItem> = ({
  isContactAlreadyAdded,
  index,
  removeUserFromContact,
  addUserFromContact,
  buttonLabel = 'Add to Group',
  isLoading,
  ...account
}) => {
  return (
    <Tr bg={index % 2 === 0 ? 'neutral.825' : 'none'}>
      <Td colSpan={4} maxWidth={'250px'}>
        <HStack>
          <Box className="contact-avatar">
            <Avatar
              avatar_url={account.avatar_url}
              address={account.address || ''}
              name={account.name || ellipsizeAddress(account.address)}
            />
          </Box>
          <Text maxW={200} isTruncated>
            {account.name || account.address}
          </Text>
        </HStack>
      </Td>
      <Td colSpan={4} display={{ base: 'none', md: 'table-cell' }}>
        <Text maxW={200} isTruncated>
          {ellipsizeAddress(account.address)}
        </Text>
      </Td>
      <Td>
        {isContactAlreadyAdded(account) ? (
          <Button
            colorScheme="primary"
            onClick={() => removeUserFromContact(account)}
            isLoading={isLoading}
            variant="outline"
          >
            Remove
          </Button>
        ) : (
          <Button
            colorScheme="primary"
            onClick={() => addUserFromContact(account)}
            isLoading={isLoading}
          >
            {buttonLabel}
          </Button>
        )}
      </Td>
    </Tr>
  )
}

export default GroupContactModalItem
