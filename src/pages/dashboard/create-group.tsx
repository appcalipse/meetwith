import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useState } from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
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
          groupName: groupName,
          groupId: newGroupId,
        },
      })
    } catch (error: any) {
      const isJsonErr = isJson(error.message)
      const errorMessage = isJsonErr
        ? JSON.parse(error.message)?.error
        : error.message

      toast({
        title: 'Error',
        description:
          errorMessage || 'An unexpected error occurred. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
        containerStyle: {
          margin: '60px',
        },
      })
    }
    setGroupCreating(false)
  }

  return (
    <Flex direction="column" align="center" minH="100vh" pt="160px">
      <Box maxW="400px" w="full" data-component="create-group-form">
        <VStack
          as="form"
          onSubmit={handleGroupSubmit}
          spacing={6}
          align="stretch"
          p={8}
        >
          <Heading
            as="h1"
            size="xl"
            fontWeight="700"
            lineHeight="1.2"
            textAlign="left"
          >
            Set up your Group
          </Heading>
          <FormControl>
            <FormLabel
              fontSize="16px"
              fontWeight="500"
              lineHeight="24px"
              fontFamily="'DM Sans', sans-serif"
              textAlign="left"
            >
              Group name
            </FormLabel>
            <Input
              id="groupName"
              placeholder="My Group Name"
              value={groupName}
              borderColor="neutral.400"
              _placeholder={{
                color: 'neutral.400',
              }}
              onChange={e => setGroupName(e.target.value)}
            />
          </FormControl>
          <Box>
            <Button
              type="submit"
              colorScheme="primary"
              size="md"
              height="48px"
              borderRadius="8px"
              w="full"
              isLoading={groupCreating}
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
