import { Box, HStack, Link } from '@chakra-ui/layout'
import {
  Heading,
  IconButton,
  Tag,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { Avatar } from '@components/profile/components/Avatar'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { getAccountDisplayName } from '@utils/user_manager'
import React, { useContext, useState } from 'react'
import { FaDiscord, FaTelegram } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

import { SocialLinkType } from '@/types/Account'
import {
  formatCurrency,
  generateTelegramUrl,
  generateTwitterUrl,
} from '@/utils/generic_utils'

const SessionTypeCardPaymentInfo = () => {
  const { selectedType, account } = useContext(PublicScheduleContext)
  let [twitter, telegram, discord] = ['', '', '']
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
    }, 2000)
  }
  const social = account.preferences?.socialLinks
  if (social) {
    twitter = social.filter(s => s.type === SocialLinkType.TWITTER)[0]?.url
    discord = social.filter(s => s.type === SocialLinkType.DISCORD)[0]?.url
    telegram = social.filter(s => s.type === SocialLinkType.TELEGRAM)[0]?.url
  }
  const bgColor = useColorModeValue('white', 'neutral.825')
  const borderColor = useColorModeValue('neutral.200', 'neutral.825')
  const iconColor = useColorModeValue('gray.600', 'white')
  return (
    <VStack
      bg={bgColor}
      border={'1px solid'}
      borderColor={borderColor}
      flexBasis={'100%'}
      width={'100%'}
      alignItems={'flex-start'}
      p={6}
      rounded={'lg'}
      gap={6}
    >
      <HStack w={'100%'} justifyContent="space-between" alignItems="center">
        <HStack gap={{ md: 4, base: 2 }} alignItems="center">
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
        <Tag
          bg="green.500"
          px={2}
          color="black"
          rounded={'full'}
          fontSize={'sm'}
        >
          {!!selectedType?.plan ? (
            <>
              {formatCurrency(
                selectedType?.plan?.price_per_slot *
                  selectedType?.plan?.no_of_slot
              )}
              /{selectedType?.plan?.no_of_slot} session
              {selectedType?.plan?.no_of_slot > 1 ? 's' : ''}
            </>
          ) : (
            'Free'
          )}
        </Tag>
      </HStack>
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
      <VStack gap={4} alignItems={'flex-start'} w={'100%'}>
        <Heading fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}>
          {selectedType?.title}
        </Heading>
        {selectedType?.description && <Text>{selectedType?.description}</Text>}
        <Text>{selectedType?.duration_minutes} mins per session</Text>
      </VStack>
    </VStack>
  )
}

export default SessionTypeCardPaymentInfo
