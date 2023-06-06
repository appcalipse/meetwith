import { Jazzicon } from '@ukstv/jazzicon-react'
import { useEffect, useState } from 'react'

import { Account } from '@/types/Account'

interface AvatarProps {
  account: Account
}

export const Avatar = (props: AvatarProps) => {
  const [rendered, setRendered] = useState(false)
  useEffect(() => {
    setRendered(true)
  }, [])
  return !rendered ? <div /> : <Jazzicon address={props.account.address} />
}
