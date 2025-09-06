import { Avatar as ChakraAvatar, Image } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { getAccountDisplayName } from '@utils/user_manager'
import { useEffect, useState } from 'react'

interface AvatarProps {
  avatar_url?: string
  address: string
  name?: string
}

export const Avatar = (props: AvatarProps) => {
  const [rendered, setRendered] = useState(false)
  useEffect(() => {
    setRendered(true)
  }, [])
  return !rendered ? (
    <div />
  ) : props.avatar_url ? (
    <ChakraAvatar
      w={'100%'}
      h={'100%'}
      name={props.name}
      src={props.avatar_url}
    />
  ) : (
    <Jazzicon address={props.address} />
  )
}
