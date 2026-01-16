import { HStack, IconButton, Text, useToast, VStack } from '@chakra-ui/react'
import React from 'react'
import { LuLink2 } from 'react-icons/lu'

import { InviteType } from '@/types/Dashboard'
import { appUrl } from '@/utils/constants'

interface Props {
  groupId: string
}

const PublicGroupLink = (props: Props) => {
  const { groupId } = props
  const toast = useToast()
  const handlePublicLinkCopy = async () => {
    try {
      const publicInviteLink = `${appUrl}/invite-accept?groupId=${groupId}&type=${InviteType.PUBLIC}`
      await navigator.clipboard.writeText(publicInviteLink)
      toast({
        title: 'Link copied',
        description: 'Public invite link copied to clipboard.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      })
    } catch (_e) {
      toast({
        title: 'Error copying link',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      })
    }
  }
  return (
    <VStack alignItems={'flex-start'} fontWeight={500}>
      <Text fontSize={'lg'}>Group invite link</Text>
      <VStack
        gap={3}
        bg={'neutral.700'}
        borderWidth={1}
        borderColor={'neutral.400'}
        py={4}
        px={5}
        alignItems={'flex-start'}
        borderRadius={'6px'}
      >
        <Text>
          This is the group link, you can share this with users to easily join
          the group.
        </Text>
        <HStack cursor={'pointer'} onClick={handlePublicLinkCopy}>
          <IconButton
            aria-label="Copy link"
            icon={<LuLink2 size={24} color={'#2D3748'} />}
            p={1}
            h={'auto'}
            bg={'#E6E6E6'}
          />
          <Text>Copy link to share</Text>
        </HStack>
      </VStack>
    </VStack>
  )
}

export default PublicGroupLink
