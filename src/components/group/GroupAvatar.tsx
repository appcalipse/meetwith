import {
  Avatar as ChakraAvatar,
  AvatarProps as ChakraAvatarProps,
} from '@chakra-ui/react'
import React from 'react'

interface GroupAvatarProps extends Omit<ChakraAvatarProps, 'name' | 'src'> {
  avatarUrl?: string | null
  groupName: string
}

/**
 * GroupAvatar component that displays a group's avatar or generates initials
 * from the group name when no avatar is provided.
 *
 * Uses Chakra UI's Avatar component which automatically generates initials
 * from the name prop (e.g., "Engineering Team" → "ET", "My Group" → "MG").
 */
const GroupAvatar: React.FC<GroupAvatarProps> = ({
  avatarUrl,
  groupName,
  ...avatarProps
}) => {
  return (
    <ChakraAvatar
      name={groupName}
      src={avatarUrl || undefined}
      {...avatarProps}
    />
  )
}

export default GroupAvatar
