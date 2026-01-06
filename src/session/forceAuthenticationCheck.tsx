import { NextComponentType, NextPage, NextPageContext } from 'next'
import React from 'react'
import { useActiveWallet } from 'thirdweb/react'

import { useLogin } from './login'

export const forceAuthenticationCheck = <P,>(
  Page: NextComponentType<NextPageContext, P | object, P>
) => {
  const ForceAuthenticationCheckHOC: NextPage<
    P & { checkAuthOnClient?: boolean }
  > = (props: P & { checkAuthOnClient?: boolean }) => {
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
