import { useRouter } from 'next/router'
import { FC, useEffect } from 'react'

import useAccountContext from '@/hooks/useAccountContext'

const RedirectHandler: FC = () => {
  const { query, push, prefetch } = useRouter()
  const { state, redirect, intent } = query
  const [isRedirecting, setIsRedirecting] = React.useState(false)
  const currentAccount = useAccountContext()
  const handleRedirect = async () => {
    if (!currentAccount || isRedirecting || state) return
    setIsRedirecting(true)
    if (redirect) {
      let url = `${redirect}`
      if (intent) {
        url += `&intent=${intent}`
      }
      await prefetch(url)
      await push(url)
    }
    setIsRedirecting(false)
  }
  useEffect(() => {
    void handleRedirect()
  }, [state, redirect])
  return null
}

export default RedirectHandler
