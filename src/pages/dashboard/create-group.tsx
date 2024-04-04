import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'

const CreateGroupPage = () => {
  const router = useRouter()

  const handleGroupSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    // Implementation for creating a group
    // e.g., post request to your backend

    // On success
    router.push('/dashboard/groups') // Redirect to the groups listing or relevant page
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
            fontFamily="'DM Sans', sans-serif" // Ensure DM Sans is loaded in your project
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
            <Input id="groupName" placeholder="" />
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
            />
          </FormControl>
          <Box>
            <Button
              type="submit"
              colorScheme="red" // Adjusted to a color scheme that closely matches #F9B19A, consider defining a custom color scheme in your theme
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
