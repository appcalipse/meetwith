import { Flex } from '@chakra-ui/react'
import { NextComponentType, NextPageContext } from 'next'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'

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
  const currentRoute =
    ctx.asPath || ctx.pathname || (ctx.req ? ctx.req.url : '')
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
    redirectUrl = `${route}?redirect=${encodeURIComponent(currentRoute)}`
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
      // This part of the logic is now handled by the client-side useEffect
      // and useRouter.
      // For SSR, we just return the current account.
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
      const router = useRouter()
      const [redirecting, setRedirecting] = useState(false)

      useEffect(() => {
        if (typeof window === 'undefined') return
        const currentRoute = router.pathname
        const isOnTargetRoute = currentRoute === route

        // Redirect unauthenticated users
        if (
          !logged &&
          redirectType === AuthRedirect.REDIRECT_IF_NOT_AUTHED &&
          !isOnTargetRoute
        ) {
          let redirectUrl = route
          if (currentRoute && currentRoute !== route) {
            redirectUrl = `${route}?redirect=${encodeURIComponent(
              currentRoute
            )}`
          }
          setRedirecting(true)
          router.push(redirectUrl)
        }

        // Redirect authenticated users away when needed
        if (
          logged &&
          redirectType === AuthRedirect.REDIRECT_IF_AUTHED &&
          !isOnTargetRoute
        ) {
          setRedirecting(true)
          router.push(route)
        }
      }, [logged, redirectType, router, route])

      if (redirecting) {
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
