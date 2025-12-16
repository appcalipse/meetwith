import { Box, HStack, Text, VStack } from '@chakra-ui/layout'
import { Image, useBreakpointValue } from '@chakra-ui/react'
import * as React from 'react'

import { BannerSetting } from '@/types/Account'

import { Avatar } from '../profile/components/Avatar'

interface UserBannerProps {
  banner_url: string | null
  avatar_url: string | null
  owner_account_address: string
  description: string | null
  name: string | null
  banner_setting?: BannerSetting | null
  calendar_url: string
}
const MAX_DESCRIPTION_LENGTH = 120
const truncateText = (text: string | null, maxLength: number): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}
const UserBannerBrowser: React.FC<UserBannerProps> = ({
  avatar_url,
  banner_url,
  calendar_url,
  description,
  owner_account_address,
  name,
  banner_setting,
}) => {
  const MAX_LENGTH =
    useBreakpointValue(
      { base: 40, md: 80, lg: MAX_DESCRIPTION_LENGTH },
      { ssr: true }
    ) ?? 40

  return (
    <VStack
      width="100%"
      height="100%"
      bgGradient="linear-gradient(180deg, #1F2933 0%, #131A20 100%);"
      gap={0}
    >
      <VStack gap={0} width="100%" flex={1} p={6} pb={0}>
        <Box position="relative" width={'100%'} height="100%">
          <Image
            width={'100%'}
            height="100%"
            src={banner_url || '/assets/banner/default.png'}
            alt="Banner Image"
            inset="0"
            position="absolute"
            objectFit="cover"
            zIndex={0}
          />
          <VStack
            width="100%"
            height="100%"
            paddingLeft={{ lg: '83px', base: '10px', md: '40px' }}
            paddingRight={{ lg: '83px', base: '10px', md: '40px' }}
            position="absolute"
            top={0}
            zIndex={20}
            justifyContent="center"
            alignItems="start"
            gap={6}
          >
            {banner_setting?.show_avatar && (
              <HStack gap={5}>
                <Box
                  width={{ base: '50px', md: '75px', lg: '100px' }}
                  height={{ base: '50px', md: '75px', lg: '100px' }}
                >
                  <Avatar
                    address={owner_account_address}
                    avatar_url={avatar_url}
                    name={name || ''}
                  />
                </Box>
                <Text
                  color="white"
                  fontWeight={700}
                  fontSize={{ lg: '32px', base: '20px', md: '24px' }}
                >
                  {name}
                </Text>
              </HStack>
            )}

            {banner_setting?.show_description && (
              <Text
                fontSize={{ lg: '32px', base: '20px', md: '24px' }}
                color="white"
                wordBreak="break-word"
                whiteSpace="pre-wrap"
                fontWeight={500}
                lineHeight="1.2"
              >
                {truncateText(description, MAX_LENGTH)}
              </Text>
            )}
          </VStack>
        </Box>
      </VStack>
      <HStack
        justifyContent="space-between"
        width="100%"
        px={{ base: 2, lg: 6 }}
        py={{ base: 2, lg: 4 }}
        bg="#F35826"
        height={{ base: '40px', lg: '62px' }}
        alignItems="center"
        fontWeight={500}
        fontSize={{ base: 'sm', md: '20px' }}
      >
        <Text>{calendar_url}</Text>
        <Text>Powered by Meetwith</Text>
      </HStack>
    </VStack>
  )
}

export default UserBannerBrowser
