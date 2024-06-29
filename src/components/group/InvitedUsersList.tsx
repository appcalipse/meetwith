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
  Spinner,
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
  getInvitedUserDisplayName,
} from '@/utils/user_manager'

interface InvitedUsersList {
  users: InvitedUser[]
  removeUser: (inviteeId: number) => void
  updateRole: (inviteeId: number, role: MemberType) => void
  isLoading: boolean
}

const InvitedUsersList: React.FC<InvitedUsersList> = ({
  users,
  removeUser,
  updateRole,
  isLoading,
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
        <Text
          width="226px"
          fontSize="16px"
          fontWeight="700"
          lineHeight="24px"
          flexBasis="70%"
        >
          Contact
        </Text>
        <HStack alignItems="center" flexBasis="30%">
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
      {users.length > 0 || isLoading ? (
        <>
          {users.map((user, index) => {
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
                  flexBasis="70%"
                >
                  {getInvitedUserDisplayName(user)}
                </Text>
                <Flex alignItems="flex-start" flexBasis="30%">
                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<ChevronDownIcon />}
                      fontSize="16px"
                      fontWeight="500"
                      lineHeight="24px"
                      bg="transparent"
                      textAlign="left"
                      textTransform="capitalize"
                    >
                      {user.role}
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
          })}
          {isLoading && (
            <Flex
              p={4}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              borderBottom={`1px solid ${borderColor}`}
            >
              <Spinner />
              <Flex alignItems="flex-start" flexBasis="30%">
                <Button
                  fontSize="16px"
                  fontWeight="500"
                  lineHeight="24px"
                  bg="transparent"
                  textAlign="left"
                  textTransform="capitalize"
                >
                  <Spinner />
                </Button>
              </Flex>
            </Flex>
          )}
        </>
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

export default InvitedUsersList
