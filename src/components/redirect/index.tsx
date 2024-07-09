import { useRouter } from 'next/router'
import React, { FC, useEffect } from 'react'

const RedirectHandler: FC = () => {
  const { query, push, prefetch } = useRouter()
  const { state, redirect, intent } = query
  useEffect(() => {
    if (state) {
      return
    }
    if (redirect) {
      prefetch(redirect as string)
      push(`${redirect as string}&intent=${intent}`)
    }
  }, [state, redirect])
  return null
}

export default RedirectHandler
