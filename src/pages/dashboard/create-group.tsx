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
import { getSlugFromText, isJson } from '@/utils/generic_utils'

const CreateGroupPage = () => {
  const router = useRouter()
  const toast = useToast()

  const [groupName, setGroupName] = useState('')
  const [groupSlug, setGroupSlug] = useState('')
  const [groupCreating, setGroupCreating] = useState(false)

  const handleGroupSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setGroupCreating(true)

    try {
      const response = await createGroup(groupName, groupSlug) // Use the helper method

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

  function handleGroupNameChange(name: string) {
    setGroupName(val => {
      if (!groupSlug || getSlugFromText(val) === groupSlug) {
        setGroupSlug(getSlugFromText(name))
      }
      return name
    })
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
              onChange={e => handleGroupNameChange(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <HStack spacing={1} alignItems="center">
              <FormLabel
                fontSize="16px"
                fontWeight="500"
                lineHeight="24px"
                fontFamily="'DM Sans', sans-serif"
                textAlign="left"
                mb="0"
                mr="-2"
              >
                Group calendar name
              </FormLabel>
              <InfoTooltip text="This name will be used for your group calendar." />
            </HStack>
            <InputGroup mt="2">
              <InputLeftAddon
                border={'1px solid #7B8794'}
                bg="transparent"
                borderRightWidth={0}
                borderColor="neutral.400 !important"
                pr={0}
              >
                meetwithwallet.xyz/
              </InputLeftAddon>
              <Input
                placeholder="my-group-name"
                value={groupSlug}
                outline="none"
                _focusVisible={{
                  borderColor: 'neutral.400',
                  boxShadow: 'none',
                }}
                borderColor="neutral.400"
                borderLeftWidth={0}
                pl={0}
                _placeholder={{
                  color: 'neutral.400',
                }}
                onChange={e => setGroupSlug(e.target.value)}
              />
            </InputGroup>
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
