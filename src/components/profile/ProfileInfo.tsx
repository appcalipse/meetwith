import { Image } from '@chakra-ui/image'
import { Box, Flex, HStack, Spacer, Text } from '@chakra-ui/layout'
import { Heading, Link, VStack } from '@chakra-ui/react'
import { Tooltip, useColorModeValue } from '@chakra-ui/react'
import { Select } from '@chakra-ui/select'
import React, { useState } from 'react'
import { BiChevronDown } from 'react-icons/bi'
import { FaDiscord, FaTelegram, FaTwitter } from 'react-icons/fa'

import { CalendarType } from '@/components/public-calendar'
import { durationToHumanReadable } from '@/utils/calendar_manager'

import { Account, MeetingType, SocialLinkType } from '../../types/Account'
import {
  generateTelegramUrl,
  generateTwitterUrl,
} from '../../utils/generic_utils'
import { getAccountDisplayName } from '../../utils/user_manager'
import { Avatar } from './components/Avatar'

interface ProfileInfoProps {
  account: Account
  isPrivateType?: boolean
  readyToSchedule?: boolean
  calendarType: CalendarType
  changeType: (val: string) => void
  selectedType: MeetingType
  rescheduleSlotId?: string
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
  const durationToHumanReadable = (duration: number): string => {
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60

    if (hours > 0) {
      if (minutes > 0) {
        return `${hours} hour ${minutes} min`
      }
      return `${hours} hour`
    }
    return `${duration} min`
  }
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
    <VStack gap={8} w="fit-content" alignItems="flex-start">
      <Box>
        <HStack gap={4} alignItems="center">
          <Box width={55} height={55} mb={4}>
            <Avatar account={props.account} />
          </Box>
          <Text fontSize="lg" fontWeight="500" mb={5}>
            {getAccountDisplayName(props.account)}
          </Text>
        </HStack>
        <HStack mt={6} gap={6} justifyContent="flex-start">
          {telegram && (
            <>
              <Link
                color={iconColor}
                isExternal
                href={generateTelegramUrl(telegram)}
              >
                <FaTelegram size={24} />
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
                <FaTwitter size={24} />
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
      {props.calendarType === CalendarType.REGULAR &&
        !props.rescheduleSlotId && (
          <VStack position="relative" alignItems="flex-start">
            <Heading size="md">Meeting Type</Heading>
            <Select
              isDisabled={props.readyToSchedule}
              placeholder="Select option"
              border={0}
              icon={<BiChevronDown size={24} />}
              cursor="pointer"
              iconSize="25"
              _focusVisible={{ borderWidth: 0, boxShadow: 'none' }}
              value={props.selectedType.id}
              maxW="350px"
              onChange={e => e.target.value && props.changeType(e.target.value)}
            >
              {props
                .account!.preferences.availableTypes.filter(
                  type =>
                    !type.deleted && (!type.private || props.isPrivateType)
                )
                .map(type => (
                  <option key={type.id} value={type.id}>
                    {type.title ? `${type.title} - ` : ''}
                    {durationToHumanReadable(type.duration)}
                  </option>
                ))}
            </Select>
            {props.selectedType.description && (
              <Text p={2}>{props.selectedType.description}</Text>
            )}
          </VStack>
        )}
      {props.account.preferences?.description && (
        <VStack alignItems="flex-start">
          <Heading size="md">Description</Heading>
          <Text position="relative" textAlign="justify" mx={4} fontWeight="500">
            {props.account.preferences.description}
          </Text>
        </VStack>
      )}
    </VStack>
  )
}

export default ProfileInfo
