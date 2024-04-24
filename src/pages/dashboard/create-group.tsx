import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useState } from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
import { createGroup } from '@/utils/api_helper'

const CreateGroupPage = () => {
  const router = useRouter()
  const toast = useToast()

  const [groupName, setGroupName] = useState('')
  const [groupCalendarName, setGroupCalendarName] = useState('')

  const handleGroupSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const response = await createGroup(groupName, groupCalendarName) // Use the helper method

      // Extract the new group ID from the response
      const newGroupId = response.groupId

      // Navigate to the invite-users page with relevant query parameters
      router.push({
        pathname: '/dashboard/invite-users',
        query: {
          success: true,
          groupName: groupName,
          groupId: newGroupId,
        },
      })
    } catch (error) {
      console.error('Error creating group:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
        containerStyle: {
          margin: '60px',
        },
      })
    }
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
              placeholder=""
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
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
            <Input
              id="groupCalendarName"
              placeholder="meetwithwallet.xyz/"
              mt="2"
              value={groupCalendarName}
              onChange={e => setGroupCalendarName(e.target.value)}
            />
          </FormControl>
          <Box>
            <Button
              type="submit"
              colorScheme="primary"
              size="md"
              height="48px" // Fixed height of 48px
              borderRadius="8px" // Radius of 8px
              w="full" // Button width to fill the form width
              _hover={{ bg: '#E68982' }} // Adjust hover color accordingly
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
