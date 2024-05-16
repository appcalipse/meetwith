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
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
import customTheme from '@/styles/theme'
import { MemberType } from '@/types/Group'
import { InvitedUser } from '@/types/ParticipantInfo'
import {
  getAccountDisplayName,
  getInvitedUserDisplayNameModal,
} from '@/utils/user_manager'

interface InvitedUserCardModalProps {
  users: InvitedUser[]
  removeUser: (user: string) => void
  updateRole: (userId: string, role: MemberType) => void
}

const InvitedUsersCardModal: React.FC<InvitedUserCardModalProps> = ({
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
        py={2}
        px={4}
        borderBottom={`1px solid ${borderColor}`}
      >
        <Text width="226px" fontSize="16px" fontWeight="700" lineHeight="24px">
          Contact
        </Text>
        <HStack alignItems="center" flex="1">
          <Text
            fontSize="16px"
            fontWeight="700"
            lineHeight="24px"
            textAlign="left"
            mr="-10px"
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
                width="226px"
                fontSize="16px"
                fontWeight="700"
                lineHeight="24px"
                textAlign="left"
              >
                {getInvitedUserDisplayNameModal(user)}
              </Text>
              <Flex alignItems="center" flex="1">
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    fontSize="16px"
                    fontWeight="500"
                    lineHeight="24px"
                    bg=""
                    textAlign="left"
                    flex="1"
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
          borderBottom={`1px solid ${borderColor}`}
        >
          <Text color="gray.500">No contacts added yet.</Text>
        </Box>
      )}
    </VStack>
  )
}

export default InvitedUsersCardModal
