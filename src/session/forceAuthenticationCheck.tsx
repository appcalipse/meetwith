import React from 'react'
import { NextComponentType, NextPageContext } from 'next'
import { useLogin } from './login'

export const forceAuthenticationCheck = <P,>(
  Page: NextComponentType<NextPageContext, any, P>
) => {
  const ForceAuthenticationCheckHOC: React.FC = (props: any) => {
    const { checkAuthOnClient } = props
    const { handleLogin } = useLogin()

    React.useEffect(() => {
      if (checkAuthOnClient) {
        console.log('checking auth again automatically', checkAuthOnClient)
        handleLogin(false, false)
      }
    }, [checkAuthOnClient])

    return <Page {...props} />
  }

  return ForceAuthenticationCheckHOC
}
