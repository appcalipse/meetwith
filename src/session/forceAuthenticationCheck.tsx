import { NextComponentType, NextPage, NextPageContext } from 'next'
import React from 'react'
import { useActiveWallet } from 'thirdweb/react'

import { useLogin } from './login'

export const forceAuthenticationCheck = <P,>(
  Page: NextComponentType<NextPageContext, any, P>
) => {
  const ForceAuthenticationCheckHOC: NextPage = (props: any) => {
    const { checkAuthOnClient } = props
    const { handleLogin } = useLogin()
    const wallet = useActiveWallet()

    React.useEffect(() => {
      if (checkAuthOnClient) {
        handleLogin(wallet, false, false)
      }
    }, [checkAuthOnClient])

    return <Page {...props} />
  }

  return ForceAuthenticationCheckHOC
}
