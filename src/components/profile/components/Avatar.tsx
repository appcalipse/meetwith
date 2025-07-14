import { Avatar as ChakraAvatar, Image } from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { getAccountDisplayName } from '@utils/user_manager'
import { useEffect, useState } from 'react'

import { Account } from '@/types/Account'

interface AvatarProps {
  account: Account
  url?: string
}

export const Avatar = (props: AvatarProps) => {
  const [rendered, setRendered] = useState(false)
  useEffect(() => {
    setRendered(true)
  }, [])
  const avatar_url = props?.url || props?.account?.preferences?.avatar_url
  return !rendered ? (
    <div />
  ) : avatar_url ? (
    <ChakraAvatar
      w={'100%'}
      h={'100%'}
      name={getAccountDisplayName(props.account)}
      src={avatar_url}
    />
  ) : (
    <Jazzicon address={props.account.address} />
  )
}
