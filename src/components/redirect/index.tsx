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
      let url = `${redirect}`
      if (intent) {
        url += `&intent=${intent}`
      }
      prefetch(url)
      push(url)
    }
  }, [state, redirect])
  return null
}

export default RedirectHandler
