import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import { FaCaretDown, FaPlus, FaSearch } from 'react-icons/fa'

import { Account } from '@/types/Account'

import GroupCard from '../group/GroupCard'

export interface GroupProps {
  prop?: string
}

const Group: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  return (
    <Flex direction={'column'} maxWidth="100%">
      <HStack
        justifyContent="space-between"
        alignItems="flex-start"
        mb={4}
        gap={6}
      >
        <Heading fontSize="2xl">
          My Meetings
          <Text fontSize="sm" fontWeight={500} mt={1} lineHeight={1.5}>
            A group allows you to add multiple members and schedule meetings by
            automatically finding a suitable time based on each member’s
            availability.
          </Text>
        </Heading>
        <Button
          onClick={() => {
            // Add Creation modal logic here
          }}
          flexShrink={0}
          colorScheme="primary"
          display={{ base: 'none', md: 'flex' }}
          mt={{ base: 4, md: 0 }}
          mb={4}
          leftIcon={<FaPlus />}
        >
          Create new group
        </Button>
      </HStack>
      <HStack justifyContent="space-between" mt={2}>
        <HStack>
          <Button>Filters</Button>
          <Menu>
            <MenuButton as={Button} rightIcon={<FaCaretDown />}>
              Sort
            </MenuButton>
            <MenuList>
              <MenuItem>Ascending</MenuItem>
              <MenuItem>Descending</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
        <Box width="300px" position="relative">
          <Input
            type="text"
            placeholder="Search groups"
            borderColor={useColorModeValue('gray.300', 'whiteAlpha.300')}
            paddingRight={45}
          />
          <Box
            background="none"
            position="absolute"
            right={5}
            borderRadius={10}
            color={useColorModeValue('gray.300', 'whiteAlpha.300')}
            insetY={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <FaSearch />
          </Box>
        </Box>
      </HStack>
      <VStack>
        <GroupCard />
      </VStack>
    </Flex>
  )
}

export default Group
