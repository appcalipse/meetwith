import { Box, Flex, Text, HStack, Spacer, Link } from '@chakra-ui/layout'
import { Account, SocialLinkType } from '../../types/Account'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { getAccountDisplayName } from '../../utils/user_manager'
import { FaDiscord, FaTelegram, FaTwitter } from 'react-icons/fa'
import { Image } from '@chakra-ui/image'
import { Tooltip, useColorModeValue } from '@chakra-ui/react'
import {
  generateTelegramUrl,
  generateTwitterUrl,
} from '../../utils/generic_utils'
import { useState } from 'react'

interface ProfileInfoProps {
  account: Account
}
const ProfileInfo: React.FC<ProfileInfoProps> = props => {
  let [twitter, telegram, discord] = ['', '', '']

  const social = props.account.preferences?.socialLinks

  if (social) {
    twitter = social.filter(s => s.type === SocialLinkType.TWITTER)[0]?.url
    discord = social.filter(s => s.type === SocialLinkType.DISCORD)[0]?.url
    telegram = social.filter(s => s.type === SocialLinkType.TELEGRAM)[0]?.url
  }

  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false)

  const iconColor = useColorModeValue('gray.600', 'white')

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

  return (
    <Flex direction="column" alignItems="center">
      <Box width="80px" height="80px" mb={4}>
        <Jazzicon address={props.account.address} />
      </Box>
      <Box>{getAccountDisplayName(props.account)}</Box>
      <HStack my={6}>
        {telegram && (
          <>
            <Link
              color={iconColor}
              isExternal
              href={generateTelegramUrl(telegram)}
            >
              <FaTelegram size={24} />
            </Link>
            <Spacer />
          </>
        )}
        {twitter && (
          <>
            <Link
              color={iconColor}
              isExternal
              href={generateTwitterUrl(twitter)}
            >
              <FaTwitter size={24} />
            </Link>
            <Spacer />
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
      {props.account.preferences?.description && (
        <Box position="relative">
          <Image
            src="/assets/quotes.svg"
            position="absolute"
            top="-6px"
            left="-24px"
          />
          <Text position="relative" textAlign="justify">
            <em>{props.account.preferences.description}</em>
          </Text>
        </Box>
      )}
    </Flex>
  )
}

export default ProfileInfo
