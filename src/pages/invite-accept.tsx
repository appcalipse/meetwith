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
import { getGroupExternal, getGroups } from '@/utils/api_helper'

import Loading from '../components/Loading'

export default function LogoutPage() {
  const bgColor = useColorModeValue('white', 'neutral.800')
  const [group, setGroup] = useState<any>()
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
      maxW="7xl"
      mt={8}
      minH={{ sm: '100vh', md: 'auto' }}
      flex={1}
      display="grid"
      placeContent="center"
    >
      {loading ? (
        <Loading />
      ) : (
        <VStack
          m="auto"
          gap={10}
          bg={bgColor}
          borderWidth={1}
          borderColor="neutral.600"
          p={6}
          borderRadius={6}
        >
          <Image width="100px" p={2} src="/assets/logo.svg" alt="Meetwith" />
          <Image
            src="/assets/join-illustration.svg"
            alt="Join illustration"
            width="300px"
            height="auto"
          />
          <Heading size="md" maxW="450px" textAlign="center">
            Hey there! You’ve been invited to join {group.name}!
          </Heading>
          <Button
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
            colorScheme="primary"
            w="100%"
          >
            Join Group
          </Button>
        </VStack>
      )}
    </Container>
  )
}
