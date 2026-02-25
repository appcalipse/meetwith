import { Box, HStack, Link, Text } from '@chakra-ui/layout'
import {
  Button,
  Flex,
  Heading,
  IconButton,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { Avatar } from '@components/profile/components/Avatar'
import { PublicScheduleContext } from '@components/public-meeting/index'
import SessionTypeCard from '@components/public-meeting/SessionTypeCard'
import { getAccountDisplayName } from '@utils/user_manager'
import React, { type FC, useContext, useMemo, useState } from 'react'
import { FaDiscord, FaTelegram } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { SocialLinkType } from '@/types/Account'
import { generateTelegramUrl, generateTwitterUrl } from '@/utils/generic_utils'

import PaidMeetings from './PaidMeetings'

const BasePage: FC = () => {
  const { account } = useContext(PublicScheduleContext)
  const currentAccount = useAccountContext()
  const [paidSessionsExists, setPaidSessionsExists] = React.useState(false)
  const { openConnection } = useContext(OnboardingModalContext)
  const borderColor = useColorModeValue('neutral.200', 'neutral.800')
  const social = account.preferences?.socialLinks
  const iconColor = useColorModeValue('gray.600', 'white')
  const { twitter, telegram, discord } = useMemo(() => {
    let [twitter, telegram, discord] = ['', '', '']
    if (social) {
      twitter = social.filter(s => s.type === SocialLinkType.TWITTER)[0]?.url
      discord = social.filter(s => s.type === SocialLinkType.DISCORD)[0]?.url
      telegram = social.filter(s => s.type === SocialLinkType.TELEGRAM)[0]?.url
    }
    return { twitter, telegram, discord }
  }, [social])
  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false)

  const copyDiscord = async () => {
    if ('clipboard' in navigator) {
      await navigator.clipboard.writeText(discord)
    } else {
      document.execCommand('copy', true, discord)
    }
    setCopyFeedbackOpen(true)
    setTimeout(() => {
      setCopyFeedbackOpen(false)
    }, 200)
  }
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
          borderColor={borderColor}
          borderRadius="md"
          p={4}
          minW={'40%'}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <HStack
            gap={{ md: 4, base: 2 }}
            alignItems="center"
            maxW="100%"
            w="100%"
          >
            <Box w={10} h={10}>
              <Avatar
                address={account.address}
                avatar_url={account.preferences?.avatar_url || ''}
                name={getAccountDisplayName(account)}
              />
            </Box>
            <Text fontSize={{ md: 'lg', base: 'medium' }} fontWeight="500">
              {getAccountDisplayName(account)}
            </Text>
          </HStack>
          {account.preferences?.description && (
            <Text fontWeight="700" w={'100%'}>
              {account.preferences.description}
            </Text>
          )}
          <HStack gap={3} justifyContent="flex-start">
            {telegram && (
              <>
                <Link
                  color={iconColor}
                  isExternal
                  href={generateTelegramUrl(telegram)}
                >
                  <IconButton
                    aria-label="Telegram icon"
                    icon={<FaTelegram size={24} />}
                    p={2}
                  />
                </Link>
              </>
            )}
            {twitter && (
              <>
                <Link
                  color={iconColor}
                  isExternal
                  href={generateTwitterUrl(twitter)}
                >
                  <IconButton
                    aria-label="Twitter icon"
                    icon={<FaXTwitter size={24} />}
                    p={2}
                  />
                </Link>
              </>
            )}
            {discord && (
              <Tooltip
                label="Discord username copied"
                placement="top"
                isOpen={copyFeedbackOpen}
              >
                <Box color={iconColor} onClick={copyDiscord} cursor="pointer">
                  <FaDiscord size={24} />
                </Box>
              </Tooltip>
            )}
          </HStack>
        </Box>
        {!currentAccount && (
          <Text fontWeight={500}>
            Login to see all plans that you have paid for.{' '}
            <Button
              variant="link"
              colorScheme="primary"
              color="primary.400"
              textDecoration="underline"
              fontWeight={600}
              onClick={() => openConnection(undefined, false)}
            >
              Sign in
            </Button>
          </Text>
        )}
      </Flex>
      <VStack gap={4} w={'100%'} alignItems="flex-start">
        {currentAccount?.address && (
          <PaidMeetings setPaidSessionsExists={setPaidSessionsExists} />
        )}
        <VStack gap={4} w={'100%'} alignItems="flex-start">
          {paidSessionsExists && (
            <Heading fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}>
              All Plans
            </Heading>
          )}
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
      </VStack>
    </VStack>
  )
}

export default BasePage
