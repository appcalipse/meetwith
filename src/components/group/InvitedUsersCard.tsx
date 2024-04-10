import { CheckCircleIcon, ChevronDownIcon, DeleteIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
import { InvitedUser } from '@/types/ParticipantInfo'

interface InvitedUserCardProps {
  users: InvitedUser[]
  removeUser: (user: string) => void
  updateRole: (userId: string, role: InvitedUser['role']) => void
}

const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text || ''
  const startLength = Math.ceil((maxLength - 3) / 2)
  const endLength = Math.floor((maxLength - 3) / 2)
  return `${text.substring(0, startLength)}...${text.substring(
    text.length - endLength
  )}`
}

const InvitedUsersCard: React.FC<InvitedUserCardProps> = ({
  users,
  removeUser,
  updateRole,
}) => {
  console.log('List of users', users)

  return (
    <VStack width="full" align="stretch" spacing={0}>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        p={4}
        borderBottom="1px solid #5A6E7F"
      >
        <Text
          width="316px"
          fontSize="16px"
          fontWeight="700"
          lineHeight="24px"
          fontFamily="'DM Sans', sans-serif"
        >
          Contact
        </Text>
        <HStack spacing="4px">
          <Text
            fontSize="16px"
            fontWeight="700"
            lineHeight="24px"
            fontFamily="'DM Sans', sans-serif"
            ml="-30px"
          >
            Role
          </Text>
          <InfoTooltip text="Admins can manage the group" />
        </HStack>

        <Box width="45px" />
      </Flex>
      {users.length > 0 ? (
        users.map((user, index) => {
          console.log('User memberId:', user.account_address)
          const roleDisplay = user.role
            ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
            : 'Member'

          return (
            <Flex
              key={index}
              p={4}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              borderBottom="1px solid #5A6E7F"
            >
              <Text
                fontSize="16px"
                fontWeight="700"
                lineHeight="24px"
                fontFamily="'DM Sans', sans-serif"
                textAlign="left"
              >
                {truncateText(user.account_address, 20)}
              </Text>
              <Flex alignItems="center">
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    fontSize="16px"
                    fontWeight="500"
                    lineHeight="24px"
                    bg=""
                    textAlign="left"
                  >
                    {roleDisplay}
                  </MenuButton>
                  <MenuList>
                    <MenuItem
                      onClick={() => updateRole(user.account_address, 'admin')}
                    >
                      Admin
                    </MenuItem>
                    <MenuItem
                      onClick={() => updateRole(user.account_address, 'member')}
                    >
                      Member
                    </MenuItem>
                  </MenuList>
                </Menu>
                <IconButton
                  aria-label="Remove user"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={() => removeUser(user.account_address)}
                  ml={2}
                />
              </Flex>
            </Flex>
          )
        })
      ) : (
        <Box
          width="full"
          height="72px"
          display="flex"
          justifyContent="center"
          alignItems="center"
          // borderTop="1px solid #5A6E7F"
          borderBottom="1px solid #5A6E7F"
        >
          <Text color="gray.500">No contacts added yet.</Text>
        </Box>
      )}
    </VStack>
  )
}

export default InvitedUsersCard
