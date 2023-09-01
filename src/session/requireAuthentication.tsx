import { Flex } from '@chakra-ui/react'
import { NextComponentType, NextPageContext } from 'next'
import router from 'next/router'
import { useContext } from 'react'

import Loading from '../components/Loading'
import { AccountContext } from '../providers/AccountProvider'
import { Account } from '../types/Account'
import { validateAuthentication } from './core'

enum AuthRedirect {
  REDIRECT_IF_AUTHED = 'redirect-if-authed',
  REDIRECT_IF_NOT_AUTHED = 'redirect-if-not-authed',
}

/**
 * A function that queries for the logged in user before rendering the page.
 * Should be called in getInitialProps. It redirects as desired.
 *
 * It allows for redirecting both if the user is not logged in (e.g., redirect
 * to login page) or redirecting if the user is logged in.
 *
 * If not logged in, redirects to the desired route.
 *
 * The return value indicates whether logic should continue or not after the
 * call.
 */
const redirectBasedOnLogin = async (
  ctx: NextPageContext,
  route: string,
  redirectType: AuthRedirect
): Promise<Account | null> => {
  const currentAccount = await validateAuthentication(ctx)

  const shouldRedirect =
    redirectType === AuthRedirect.REDIRECT_IF_AUTHED
      ? !!currentAccount
      : !currentAccount

  // Only redirect here if we are on server side
  if (!!ctx.req && shouldRedirect) {
    // https://github.com/zeit/next.js/wiki/Redirecting-in-%60getInitialProps%60
    if (ctx.res) {
      ctx.res.writeHead(302, {
        Location: route,
      })
      ctx.res.end()
    } else {
      router.push(route)
    }
    return null
  }

  return currentAccount
}

const withAuthRedirect =
  (route: string, redirectType: AuthRedirect) =>
  <P,>(Page: NextComponentType<NextPageContext, any, P>) => {
    function HOC(props: any) {
      const { checkAuthOnClient } = props
      const { logged, currentAccount } = useContext(AccountContext)

      // On the client side, if the user is not logged in,
      // then redirect it to the equivalent endpoint
      if (!logged && redirectType === AuthRedirect.REDIRECT_IF_NOT_AUTHED) {
        router.push(route)

        return (
          <Flex
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
          >
            <Loading />
          </Flex>
        )
      }

      if (checkAuthOnClient && !currentAccount) {
        return (
          <Flex
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
          >
            <Loading />
          </Flex>
        )
      }

      return <Page {...props} />
    }

    HOC.getInitialProps = async (ctx: NextPageContext) => {
      const currentAccount = await redirectBasedOnLogin(
        ctx,
        route,
        redirectType
      )

      if (Page.getInitialProps) {
        return {
          ...(await Page.getInitialProps(ctx)),
        }
      }

      return { currentAccount }
    }

    return HOC
  }

/**
 * HOC that redirects to login page if the user is not logged in.
 */
export const withLoginRedirect = withAuthRedirect(
  '/',
  AuthRedirect.REDIRECT_IF_NOT_AUTHED
)

/**
 * HOC that redirects to the dashboard if the user is logged in.
 */
export const withDashboardRedirect = withAuthRedirect(
  '/dashboard',
  AuthRedirect.REDIRECT_IF_AUTHED
)
