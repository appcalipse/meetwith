import { NextComponentType, NextPage, NextPageContext } from 'next'
import React from 'react'
import { useAccount } from 'wagmi'

import { useLogin } from './login'

export const forceAuthenticationCheck = <P,>(
  Page: NextComponentType<NextPageContext, any, P>
) => {
  const ForceAuthenticationCheckHOC: NextPage = (props: any) => {
    const { checkAuthOnClient } = props
    const { handleLogin } = useLogin()
    const { address } = useAccount()

    React.useEffect(() => {
      if (checkAuthOnClient) {
        handleLogin(address, false, false)
      }
    }, [checkAuthOnClient])

    return <Page {...props} />
  }

  return ForceAuthenticationCheckHOC
}
