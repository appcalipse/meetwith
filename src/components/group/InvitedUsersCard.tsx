import { ChevronDownIcon, DeleteIcon } from '@chakra-ui/icons'
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
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
import customTheme from '@/styles/theme'
import { MemberType } from '@/types/Group'
import { InvitedUser } from '@/types/ParticipantInfo'
import { getInvitedUserDisplayName } from '@/utils/user_manager'

interface InvitedUserCardProps {
  users: InvitedUser[]
  removeUser: (user: number) => void
  updateRole: (userId: number, role: InvitedUser['role']) => void
}

const InvitedUsersCard: React.FC<InvitedUserCardProps> = ({
  users,
  removeUser,
  updateRole,
}) => {
  const borderColor = useColorModeValue(
    customTheme.colors.neutral[200],
    customTheme.colors.neutral[600]
  )

  return (
    <VStack width="full" align="stretch" spacing={0}>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        p={4}
        borderBottom={`1px solid ${borderColor}`}
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
              borderBottom={`1px solid ${borderColor}`}
            >
              <Text
                fontSize="16px"
                fontWeight="700"
                lineHeight="24px"
                textAlign="left"
              >
                {getInvitedUserDisplayName(user)}
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
                      onClick={() => updateRole(user.id, MemberType.ADMIN)}
                    >
                      Admin
                    </MenuItem>
                    <MenuItem
                      onClick={() => updateRole(user.id, MemberType.MEMBER)}
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
                  onClick={() => removeUser(user.id)}
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
          borderBottom={`1px solid ${borderColor}`}
        >
          <Text color="gray.500">No contacts added yet.</Text>
        </Box>
      )}
    </VStack>
  )
}

export default InvitedUsersCard
