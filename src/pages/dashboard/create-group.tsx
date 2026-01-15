import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Link,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { EditMode } from '@meta/Dashboard'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

import { createGroup } from '@/utils/api_helper'
import { isJson } from '@/utils/generic_utils'

const CreateGroupPage = () => {
  const router = useRouter()
  const toast = useToast()

  const [groupName, setGroupName] = useState('')
  const [groupCreating, setGroupCreating] = useState(false)

  const handleGroupSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setGroupCreating(true)

    try {
      const response = await createGroup(groupName) // Use the helper method

      const newGroupId = response.id

      router.push({
        pathname: '/dashboard/invite-users',
        query: {
          groupId: newGroupId,
          groupName: groupName,
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      const isJsonErr = isJson(message)
      const errorMessage = isJsonErr ? JSON.parse(message)?.error : message
      toast({
        containerStyle: {
          margin: '60px',
        },
        description:
          errorMessage || 'An unexpected error occurred. Please try again.',
        duration: 5000,
        isClosable: true,
        position: 'top',
        status: 'error',
        title: 'Error',
      })
    }
    setGroupCreating(false)
  }

  return (
    <Flex align="center" direction="column" minH="100vh" mt={8}>
      <Box data-component="create-group-form" maxW="400px" w="full">
        <VStack
          align="stretch"
          as="form"
          onSubmit={handleGroupSubmit}
          p={8}
          spacing={6}
        >
          <Link href={`/dashboard/${EditMode.GROUPS}`}>
            <HStack alignItems="flex-start" cursor="pointer" mb={0}>
              <Icon as={FaArrowLeft} color={'primary.500'} size="1.5em" />
              <Heading color="primary.500" fontSize={16}>
                Back
              </Heading>
            </HStack>
          </Link>
          <Heading flex={1} fontSize="2xl">
            Set up your Group
          </Heading>
          <FormControl>
            <FormLabel
              fontFamily="'DM Sans', sans-serif"
              fontSize="16px"
              fontWeight="500"
              lineHeight="24px"
              textAlign="left"
            >
              Group name
            </FormLabel>
            <Input
              _placeholder={{
                color: 'neutral.400',
              }}
              borderColor="neutral.400"
              id="groupName"
              onChange={e => setGroupName(e.target.value)}
              placeholder="My Group Name"
              value={groupName}
            />
          </FormControl>
          <Box>
            <Button
              borderRadius="8px"
              colorScheme="primary"
              height="48px"
              isLoading={groupCreating}
              size="md"
              type="submit"
              w="full"
            >
              Create
            </Button>
          </Box>
        </VStack>
      </Box>
    </Flex>
  )
}

export default CreateGroupPage
