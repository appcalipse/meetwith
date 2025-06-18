import { Box, HStack, Text } from '@chakra-ui/layout'
import {
  Button,
  Flex,
  Heading,
  IconButton,
  Link,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { Select } from '@chakra-ui/select'
import { Avatar } from '@components/profile/components/Avatar'
import { CalendarType } from '@components/public-calendar'
import { PublicScheduleContext } from '@components/public-meeting/index'
import SessionTypeCard from '@components/public-meeting/SessionTypeCard'
import { SocialLinkType } from '@meta/Account'
import { getAccountDisplayName } from '@utils/user_manager'
import React, { FC, useContext } from 'react'

const BasePage: FC = props => {
  const { account } = useContext(PublicScheduleContext)
  let [twitter, telegram, discord] = ['', '', '']
  const iconColor = useColorModeValue('gray.600', 'white')
  const social = account.preferences?.socialLinks
  if (social) {
    twitter = social.filter(s => s.type === SocialLinkType.TWITTER)[0]?.url
    discord = social.filter(s => s.type === SocialLinkType.DISCORD)[0]?.url
    telegram = social.filter(s => s.type === SocialLinkType.TELEGRAM)[0]?.url
  }
  const socialsExists = social?.some(val => val.url)

  return (
    <VStack
      gap={{ md: 8, base: 6 }}
      w={{ base: '100%', md: '80%', lg: '60%' }}
      alignItems={{ md: 'flex-start', base: 'center' }}
      marginX={'auto'}
      px={'4'}
    >
      <Flex
        w={'100%'}
        alignItems={{ base: 'flex-start', md: 'flex-end' }}
        justifyContent="space-between"
        flexDirection={{
          base: 'column',
          md: 'row',
        }}
        gap={4}
      >
        <Box
          borderWidth="1px"
          borderColor="neutral.800"
          borderRadius="md"
          p={4}
          w="max-content"
          minW={{ base: '100%', md: '40%' }}
        >
          <HStack gap={{ md: 4, base: 2 }} alignItems="center">
            <Box w={10} h={10}>
              <Avatar account={account} />
            </Box>
            <Text fontSize={{ md: 'lg', base: 'medium' }} fontWeight="500">
              {getAccountDisplayName(account)}
            </Text>
          </HStack>
          {account.preferences?.description && (
            <Text fontWeight="700">{account.preferences.description}</Text>
          )}
        </Box>
        <Text fontWeight={500}>
          Login to see all plans that you have paid for.{' '}
          <Button
            variant="link"
            colorScheme="primary"
            color="primary.400"
            textDecoration="underline"
            fontWeight={600}
          >
            Sign in
          </Button>
        </Text>
      </Flex>
      <HStack
        w={'100%'}
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        rowGap={{ base: 4, md: '1vw' }}
      >
        {account?.meetingTypes?.map(val => (
          <SessionTypeCard key={val.id} {...val} />
        ))}
      </HStack>
    </VStack>
  )
}

export default BasePage
