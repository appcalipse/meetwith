import {
  Button,
  Flex,
  Heading,
  HStack,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'
import React from 'react'
import { FaPlus } from 'react-icons/fa'

import { Account } from '@/types/Account'

const Contact: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  return (
    <Flex direction={'column'} maxWidth="100%">
      <HStack
        justifyContent="space-between"
        alignItems="flex-start"
        mb={4}
        gap={6}
      >
        <Heading fontSize="2xl">
          My Contact
          <Text fontSize="sm" fontWeight={500} mt={1} lineHeight={1.5}>
            A contact is an entity or person you regularly would want to
            schedule with so you add them to your list
          </Text>
        </Heading>
        <Button
          onClick={() => {}}
          flexShrink={0}
          colorScheme="primary"
          display={{ base: 'none', md: 'flex' }}
          mt={{ base: 4, md: 0 }}
          mb={4}
          leftIcon={<FaPlus />}
        >
          Create new contact
        </Button>
      </HStack>
      <TableContainer>
        <Table variant="simple">
          <TableCaption>Imperial to metric conversion factors</TableCaption>
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>Description</Th>
              <Th>Account ID</Th>
              <Th>Email address</Th>
              <Th>Schedule</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody></Tbody>
        </Table>
      </TableContainer>
    </Flex>
  )
}

export default Contact
