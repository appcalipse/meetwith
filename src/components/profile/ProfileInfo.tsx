import { Image } from '@chakra-ui/image'
import { Box, Flex, HStack, Spacer, Text } from '@chakra-ui/layout'
import {
  Heading,
  Icon,
  IconButton,
  Link,
  useMediaQuery,
  VStack,
} from '@chakra-ui/react'
import { Tooltip, useColorModeValue } from '@chakra-ui/react'
import { Select } from '@chakra-ui/select'
import { addMinutes, format } from 'date-fns'
import React, { useState } from 'react'
import { BiChevronDown } from 'react-icons/bi'
import {
  FaCalendar,
  FaClock,
  FaDiscord,
  FaGlobe,
  FaTelegram,
  FaTwitter,
} from 'react-icons/fa'

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
  selectedTime?: Date
  selectedDay?: Date
  isMobile: boolean
}

const ProfileInfo: React.FC<ProfileInfoProps> = props => {
  let [twitter, telegram, discord] = ['', '', '']
  const social = props.account.preferences?.socialLinks
  if (social) {
    twitter = social.filter(s => s.type === SocialLinkType.TWITTER)[0]?.url
    discord = social.filter(s => s.type === SocialLinkType.DISCORD)[0]?.url
    telegram = social.filter(s => s.type === SocialLinkType.TELEGRAM)[0]?.url
  }
  const socialsExists = social?.some(val => val.url)
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
  const startTime = props.selectedTime || new Date()
  const endTime = addMinutes(startTime, props.selectedType.duration)
  const formattedStartTime = startTime.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  })
  const formattedEndTime = endTime.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  })
  const formattedDate = format(startTime, 'PPPP')
  const timeDuration = `${formattedStartTime} - ${formattedEndTime}`
  return (
    <VStack
      gap={{ md: 8, base: 6 }}
      w={{ base: '100%', md: 'fit-content' }}
      alignItems={{ md: 'flex-start', base: 'center' }}
      marginX={{ base: 'auto', md: 0 }}
      display={
        props.selectedDay && !props.selectedTime && props.isMobile
          ? 'none'
          : 'flex'
      }
    >
      <Box>
        <HStack gap={{ md: 4, base: 2 }} alignItems="center">
          <Box w={{ md: 55, base: 10 }} h={{ md: 55, base: 10 }} mb={4}>
            <Avatar account={props.account} />
          </Box>
          <Text fontSize={{ md: 'lg', base: 'medium' }} fontWeight="500" mb={5}>
            {getAccountDisplayName(props.account)}
          </Text>
        </HStack>
      </Box>
      {props.readyToSchedule ? (
        <VStack
          gap={{ md: 8, base: 6 }}
          w="100%"
          alignItems="flex-start"
          mt={{ base: -6, md: 0 }}
        >
          <Heading size={'lg'}>{props.selectedType.title}</Heading>
          <HStack>
            <FaCalendar size={24} />
            <Text>{`${formattedDate}, ${timeDuration}`}</Text>
          </HStack>
          <HStack>
            <FaClock size={24} />
            <Text>{props.selectedType.duration} minutes</Text>
          </HStack>
          <HStack>
            <FaGlobe size={24} />
            <Text align="center" fontSize="base" fontWeight="500">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Text>
          </HStack>
        </VStack>
      ) : (
        <>
          {socialsExists && (
            <VStack
              alignItems={{ md: 'flex-start', base: 'center' }}
              mt={{ base: -6, md: 0 }}
            >
              <Heading size="md" display={{ md: 'block', base: 'none' }}>
                Socials
              </Heading>
              <HStack
                mx={4}
                mt={{ md: 2, base: 0 }}
                gap={6}
                justifyContent="flex-start"
              >
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
                        size={'lg'}
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
                        icon={<FaTwitter size={24} />}
                        size={'lg'}
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
                    <Box
                      color={iconColor}
                      onClick={copyDiscord}
                      cursor="pointer"
                    >
                      <FaDiscord size={24} />
                    </Box>
                  </Tooltip>
                )}
              </HStack>
            </VStack>
          )}
          {props.account.preferences?.description && (
            <VStack alignItems={{ md: 'flex-start', base: 'center' }}>
              <Heading size="md">Description</Heading>
              <Text
                position="relative"
                textAlign="justify"
                mx={4}
                fontWeight="500"
              >
                {props.account.preferences.description}
              </Text>
            </VStack>
          )}
          {props.calendarType === CalendarType.REGULAR &&
            !props.rescheduleSlotId && (
              <VStack
                position="relative"
                alignItems={{ md: 'flex-start', base: 'center' }}
              >
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
                  onChange={e =>
                    e.target.value && props.changeType(e.target.value)
                  }
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
        </>
      )}
      <Box
        w={'100%'}
        bg={'neutral.400'}
        h={'1px'}
        mt={4}
        display={{ md: 'none', base: 'block' }}
      />
    </VStack>
  )
}

export default ProfileInfo
