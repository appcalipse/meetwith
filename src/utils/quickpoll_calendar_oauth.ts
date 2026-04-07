import type { NextApiResponse } from 'next'

import { appUrl } from '@/utils/constants'

type CreateFlowState = { pollSlug?: string; redirectTo?: string } | undefined

/** Same-origin check for OAuth `redirectTo` (must match appUrl). */
export function isSameOriginQuickPollOAuthRedirect(
  redirectTo: string
): boolean {
  try {
    return new URL(redirectTo).origin === new URL(appUrl).origin
  } catch {
    return false
  }
}

/**
 * Google/Microsoft returned ?error= (denied consent, etc.) while there is no poll yet.
 */
export function redirectQuickPollOAuthProviderErrorNoPoll(
  res: NextApiResponse,
  stateObject: CreateFlowState
): NextApiResponse | void {
  const redirectTo = stateObject?.redirectTo
  if (
    redirectTo &&
    typeof redirectTo === 'string' &&
    isSameOriginQuickPollOAuthRedirect(redirectTo)
  ) {
    const sep = redirectTo.includes('?') ? '&' : '?'
    return res.redirect(
      `${redirectTo}${sep}calendarResult=error&error=oauth_denied`
    )
  }
  return res.redirect(
    `${appUrl.replace(
      /\/$/,
      ''
    )}/quickpoll/create?calendarResult=error&error=oauth_denied`
  )
}

/**
 * Pending calendar could not be stored in iron-session
 */
export function redirectQuickPollPendingCalendarFallback(
  res: NextApiResponse,
  stateObject: CreateFlowState
): NextApiResponse | void {
  const redirectTo = stateObject?.redirectTo
  if (
    redirectTo &&
    typeof redirectTo === 'string' &&
    isSameOriginQuickPollOAuthRedirect(redirectTo)
  ) {
    const sep = redirectTo.includes('?') ? '&' : '?'
    return res.redirect(
      `${redirectTo}${sep}calendarResult=error&error=pending_calendar_failed`
    )
  }
  return res.redirect(
    `${appUrl.replace(
      /\/$/,
      ''
    )}/quickpoll/create?calendarResult=error&error=pending_calendar_failed`
  )
}
