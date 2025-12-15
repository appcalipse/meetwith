import { Avatar as ChakraAvatar } from '@chakra-ui/react'
import { lazy, Suspense } from 'react'

const Jazzicon = lazy(() =>
  import('@ukstv/jazzicon-react').then(module => ({
    default: module.Jazzicon,
  }))
)

interface AvatarProps {
  avatar_url?: string | null
  address?: string
  name?: string
}

export const Avatar = (props: AvatarProps) => {
  if (props.avatar_url) {
    return (
      <ChakraAvatar
        w={'100%'}
        h={'100%'}
        name={props.name}
        src={props.avatar_url}
      />
    )
  }

  return (
    <Suspense fallback={<div />}>
      <Jazzicon address={props.address || ''} />
    </Suspense>
  )
}
