import {
  Box,
  Button,
  Container,
  Heading,
  Image,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { EditMode, Intents } from '@/types/Dashboard'
import { Group } from '@/types/Group'
import { getGroupExternal } from '@/utils/api_helper'
import Loading from '../components/Loading'

export default function LogoutPage() {
  const bgColor = useColorModeValue('white', 'neutral.800')
  const [group, setGroup] = useState<Group>()
  const [loading, setLoading] = useState(true)
  const { openConnection } = useContext(OnboardingModalContext)
  const { query, push } = useRouter()
  const groupId = query.groupId
  const params = new URLSearchParams(query as Record<string, string>)
  const { logged } = useContext(AccountContext)
  const queryString = params.toString()
  const fetchGroup = async (groupId: string) => {
    const groupData = await getGroupExternal(groupId)
    setGroup(groupData)
    setLoading(false)
  }
  useEffect(() => {
    if (logged) {
      void push(
        `/dashboard/${EditMode.GROUPS}?${queryString}&intent=${Intents.JOIN}`
      )
    }
  }, [logged])
  useEffect(() => {
    if (groupId) {
      void fetchGroup(groupId.toString())
    }
  }, [groupId])
  return (
    <Container
      display="grid"
      flex={1}
      maxW="7xl"
      minH={{ md: 'auto', sm: '100vh' }}
      mt={8}
      placeContent="center"
    >
      {loading ? (
        <Loading />
      ) : (
        <VStack
          bg={bgColor}
          borderColor="neutral.600"
          borderRadius={6}
          borderWidth={1}
          gap={10}
          m="auto"
          p={6}
        >
          <Image alt="Meetwith" p={2} src="/assets/logo.svg" width="100px" />
          <Image
            alt="Join illustration"
            height="auto"
            src="/assets/join-illustration.svg"
            width="300px"
          />
          <Heading maxW="450px" size="md" textAlign="center">
            Hey there! You’ve been invited to join {group?.name}!
          </Heading>
          <Button
            colorScheme="primary"
            onClick={() => {
              if (logged) {
                push(
                  `/dashboard/${EditMode.GROUPS}?${queryString}&intent=${Intents.JOIN}`
                )
              } else {
                openConnection(
                  `/dashboard/${EditMode.GROUPS}?${queryString}&intent=${Intents.JOIN}`
                )
              }
            }}
            w="100%"
          >
            Join Group
          </Button>
        </VStack>
      )}
    </Container>
  )
}
