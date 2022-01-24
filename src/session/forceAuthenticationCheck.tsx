import React from 'react'
import { NextComponentType, NextPage, NextPageContext } from 'next'
import { useLogin } from './login'

export const forceAuthenticationCheck = <P,>(
  Page: NextComponentType<NextPageContext, any, P>
) => {
  const ForceAuthenticationCheckHOC: NextPage = (props: any) => {
    const { checkAuthOnClient } = props
    const { handleLogin } = useLogin()

    React.useEffect(() => {
      if (checkAuthOnClient) {
        handleLogin(false, false)
      }
    }, [checkAuthOnClient])

    return <Page {...props} />
  }

  return ForceAuthenticationCheckHOC
}
