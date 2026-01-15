import { Flex } from '@chakra-ui/react'
import { NextComponentType, NextPageContext } from 'next'
import { useRouter } from 'next/router'
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
  const currentRoute = ctx.asPath || ''
  const shouldRedirect =
    redirectType === AuthRedirect.REDIRECT_IF_AUTHED
      ? !!currentAccount
      : !currentAccount

  // Prevent redirecting to the same route to avoid infinite loops
  if (shouldRedirect && currentRoute === route) {
    return currentAccount
  }

  let redirectUrl = route
  if (currentRoute && currentRoute !== route) {
    let redirectQuery = ''
    if (currentRoute) {
      redirectQuery = `?redirect=${encodeURIComponent(currentRoute)}`
    }
    redirectUrl = `${route}${redirectQuery}`
  }

  // Only redirect here if we are on server side
  if (!!ctx.req && shouldRedirect) {
    // https://github.com/zeit/next.js/wiki/Redirecting-in-%60getInitialProps%60
    if (ctx.res) {
      ctx.res.writeHead(302, {
        Location: redirectUrl,
      })
      ctx.res.end()
    } else {
      // For client-side redirects in getInitialProps, use Router (not useRouter)
      const Router = (await import('next/router')).default
      Router.push(redirectUrl)
    }
    return null
  }

  return currentAccount
}

const withAuthRedirect =
  (route: string, redirectType: AuthRedirect) =>
  <P,>(Page: NextComponentType<NextPageContext, P, P>) => {
    function HOC(props: P & { checkAuthOnClient?: boolean }) {
      const { checkAuthOnClient } = props
      const { logged, currentAccount } = useContext(AccountContext)
      const router = useRouter()

      // Prevent infinite redirects by checking if we're already on the target route
      const currentRoute = router.pathname
      const isOnTargetRoute = currentRoute === route

      // On the client side, if the user is not logged in,
      // then redirect it to the equivalent endpoint
      if (
        !logged &&
        redirectType === AuthRedirect.REDIRECT_IF_NOT_AUTHED &&
        !isOnTargetRoute
      ) {
        let redirectUrl = route
        if (currentRoute && currentRoute !== route) {
          let redirectQuery = ''
          if (currentRoute) {
            redirectQuery = `?redirect=${encodeURIComponent(currentRoute)}`
          }
          redirectUrl = `${route}${redirectQuery}`
        }
        router.push(redirectUrl)

        return (
          <Flex
            alignItems="center"
            height="100%"
            justifyContent="center"
            width="100%"
          >
            <Loading />
          </Flex>
        )
      }

      // Similar check for authenticated users
      if (
        logged &&
        redirectType === AuthRedirect.REDIRECT_IF_AUTHED &&
        !isOnTargetRoute
      ) {
        router.push(route)
        return (
          <Flex
            alignItems="center"
            height="100%"
            justifyContent="center"
            width="100%"
          >
            <Loading />
          </Flex>
        )
      }

      if (checkAuthOnClient && !currentAccount) {
        return (
          <Flex
            alignItems="center"
            height="100%"
            justifyContent="center"
            width="100%"
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
