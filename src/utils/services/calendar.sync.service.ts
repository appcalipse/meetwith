/* eslint-disable no-restricted-syntax */
// src/services/calendarSyncService.ts (adjust path as needed)

import * as Sentry from '@sentry/nextjs' // Optional: For error reporting

// import {
//   findMeetingByGoogleId, // Needs to query based on the *stored* Google Event ID
//   getSyncTokenForChannel,
//   getUserCredentialsForChannel, // NEW: Function to get user address/email/credentials by channelId
//   markMeetingAsCancelled, // Your function to update meeting status in DB
//   removeWatchChannelInfoFromDB,
//   updateSyncTokenForChannel,
//   // triggerFullSyncAndStoreNewToken // Function needed for 410 recovery
// } from '../lib/database' // Adjust path: Your DB operations
import GoogleCalendarService, { CalendarSyncResult } from './google.service' // Adjust path

// Interface matching the headers extracted in the webhook handler
interface GoogleWebhookHeaders {
  channelId?: string | string[]
  resourceId?: string | string[]
  resourceState?: string | string[]
  messageNumber?: string | string[]
  channelToken?: string | string[]
  resourceUri?: string | string[]
  changed?: string | string[]
}

/**
 * Processes an incoming Google Calendar webhook notification.
 * Should be called asynchronously after acknowledging the webhook.
 * @param headers The relevant headers from the webhook request.
 */
export async function processWebhookNotification(
  headers: GoogleWebhookHeaders
): Promise<void> {
  const channelId = headers.channelId as string
  const resourceId = headers.resourceId as string
  const resourceState = headers.resourceState as string
  const resourceUri = headers.resourceUri as string

  console.log(
    `Processing webhook notification for channel ${channelId}, state: ${resourceState}`
  )

  if (!channelId || !resourceId || !resourceState) {
    console.warn(
      `Webhook processing skipped for channel ${channelId}: Missing essential headers.`
    )
    Sentry.captureMessage('Webhook skipped due to missing headers', {
      extra: { headers },
    })
    return
  }

  // Optional: Validate channelToken if you use it

  try {
    // --- Handle Different States ---
    if (resourceState === 'sync') {
      console.log(
        `Sync notification received for channel ${channelId}. Watch likely established.`
      )
      return
    }

    if (resourceState === 'not_exists') {
      console.log(
        `Resource ${resourceId} (channel ${channelId}) no longer exists. Cleaning up watch info.`
      )
      // await removeWatchChannelInfoFromDB(channelId)
      return
    }

    if (resourceState === 'exists') {
      console.log(
        `Change detected for resource ${resourceId} (channel ${channelId}). Initiating sync.`
      )
      // --- Get User Context and Credentials ---
      // You need a way to map channelId back to the user and their Google credentials
      // const userContext = await getUserCredentialsForChannel(channelId) // Implement this DB function
      // if (!userContext) {
      //   console.error(
      //     `Cannot process webhook for channel ${channelId}: No user context found.`
      //   )
      //   Sentry.captureMessage('User context not found for webhook channel', {
      //     extra: { channelId },
      //   })
      //   // Consider removing the orphaned watch channel info
      //   await removeWatchChannelInfoFromDB(channelId)
      //   return
      // }

      // --- Instantiate the Google Service for this user ---
      // Ensure credentials are valid JSON if stored as string
      // let credentials = userContext.credentials
      // if (typeof credentials === 'string') {
      //   try {
      //     credentials = JSON.parse(credentials)
      //   } catch (parseError) {
      //     console.error(
      //       `Failed to parse credentials for user ${userContext.email} (channel ${channelId})`
      //     )
      //     Sentry.captureException(parseError, {
      //       extra: { channelId, userEmail: userContext.email },
      //     })
      //     await removeWatchChannelInfoFromDB(channelId) // Remove channel with bad credentials
      //     return
      //   }
      // }

      // const googleService = new GoogleCalendarService(
      //   userContext.address, // The user's account address in your system
      //   userContext.email, // The user's Google email
      //   credentials // The user's stored Google OAuth credentials
      // )

      // await handleResourceExists(channelId, resourceUri, googleService)
      return
    }

    console.warn(
      `Received unhandled resourceState: ${resourceState} for channel ${channelId}`
    )
    Sentry.captureMessage('Unhandled resourceState in webhook', {
      extra: { resourceState, channelId },
    })
  } catch (error) {
    console.error(`Error processing webhook for channel ${channelId}:`, error)
    Sentry.captureException(error, { extra: { channelId, resourceState } })
  }
}

/**
 * Handles the 'exists' resource state, performing the sync logic.
 * @param channelId The channel ID from the webhook header.
 * @param resourceUri The resource URI from the webhook header.
 * @param googleService An authenticated instance of GoogleCalendarService for the relevant user.
 */
async function handleResourceExists(
  channelId: string,
  resourceUri: string | string[] | undefined,
  googleService: GoogleCalendarService
): Promise<void> {
  // 1. Extract Calendar ID
  let calendarId: string | null = null
  try {
    const uriString = Array.isArray(resourceUri) ? resourceUri[0] : resourceUri
    if (!uriString) throw new Error('Resource URI is missing')
    // Adjust regex if needed, assumes standard events URI
    const uriParts = uriString.match(/calendars\/([^/]+)\/events/)
    if (uriParts && uriParts[1]) {
      calendarId = decodeURIComponent(uriParts[1]) // e.g., 'primary' or specific ID
    } else {
      throw new Error(
        `Could not extract calendarId from resourceUri: ${uriString}`
      )
    }
  } catch (parseError) {
    console.error(
      `Error parsing resourceUri for channel ${channelId}:`,
      parseError
    )
    Sentry.captureException(parseError, { extra: { channelId, resourceUri } })
    return // Stop processing if calendarId cannot be determined
  }

  // 2. Retrieve Last Sync Token
  // const lastSyncToken = await getSyncTokenForChannel(channelId)
  // if (!lastSyncToken) {
  //   console.error(
  //     `No sync token found for channel ${channelId} and calendar ${calendarId}. A full sync might be needed.`
  //   )
  //   Sentry.captureMessage('Missing sync token for webhook channel', {
  //     extra: { channelId, calendarId },
  //   })
  //   // Implement logic to handle missing sync token (e.g., trigger a full list request)
  //   // await triggerFullSyncAndStoreNewToken(channelId, calendarId, googleService); // Pass service instance
  //   return
  // }

  // 3. Perform Incremental Sync using the Google Service
  console.log(
    `Performing sync for calendar ${calendarId} (channel ${channelId})`
  )
  // const syncResult: CalendarSyncResult = await googleService.syncCalendarEvents(
  //   calendarId,
  //   lastSyncToken
  // )

  // 4. Handle Sync Result
  // if (syncResult.error) {
  //   console.error(
  //     `Sync failed for channel ${channelId}, calendar ${calendarId}. Error: ${
  //       syncResult.error.message || syncResult.error
  //     }`
  //   )
  //   // Handle 410 specifically - requires deleting the token and triggering full sync
  //   if (syncResult.requiresFullSync) {
  //     console.log(
  //       `Removing invalid sync token for channel ${channelId} due to 410 error.`
  //     )
  //     // Remove the bad token FIRST
  //     // await updateSyncTokenForChannel(channelId, null) // Or a dedicated delete function
  //     console.log(
  //       `TODO: Implement full sync mechanism for channel ${channelId}, calendar ${calendarId}`
  //     )
  //     // await triggerFullSyncAndStoreNewToken(channelId, calendarId, googleService);
  //   }
  //   // For other errors, decide if retrying is appropriate or if the watch should be removed.
  //   return // Stop processing on error
  // }

  // 5. Process Deleted Events
  // if (syncResult.deletedGoogleEventIds.length > 0) {
  //   console.log(
  //     `Found ${syncResult.deletedGoogleEventIds.length} deleted events for channel ${channelId}.`
  //   )
  //   for (const googleEventId of syncResult.deletedGoogleEventIds) {
  // --- LOOKUP IN YOUR DATABASE using Google's Event ID ---
  // const meeting = await findMeetingByGoogleId(googleEventId) // Implement this!

  // if (meeting) {
  //   console.log(
  //     `Found corresponding meeting (ID: ${meeting.id}) for deleted Google Event ${googleEventId}. Marking as cancelled.`
  //   )
  //   // --- RUN YOUR DATABASE ACTION HERE ---
  //   try {
  //     await markMeetingAsCancelled(meeting.id) // Use your internal meeting ID
  //     // Add any other necessary actions (e.g., internal notifications)
  //   } catch (dbError) {
  //     console.error(
  //       `Failed to mark meeting ${meeting.id} as cancelled in DB:`,
  //       dbError
  //     )
  //     Sentry.captureException(dbError, {
  //       extra: { meetingId: meeting.id, googleEventId },
  //     })
  //     // Decide if you should retry or log and continue
  //   }
  // } else {
  //   // This is common if the event wasn't created by your app or mapping failed
  //   console.warn(
  //     `Received cancellation for Google Event ID ${googleEventId}, but no matching meeting found in DB for channel ${channelId}.`
  //   )
  //   Sentry.captureMessage('Orphaned Google event deletion detected', {
  //     level: 'warning',
  //     extra: { googleEventId, channelId },
  //   })
  // }
  // }
  // } else {
  //   console.log(`No deleted events found in sync for channel ${channelId}.`)
  // }

  // 6. Store the New Sync Token (IMPORTANT!)
  // if (syncResult.nextSyncToken) {
  //   await updateSyncTokenForChannel(channelId, syncResult.nextSyncToken)
  //   console.log(`Successfully updated syncToken for channel ${channelId}`)
  // } else {
  //   // This case usually follows a 410 error handled above, or means no changes occurred (less common with sync tokens)
  //   // If it wasn't a 410, it might indicate an issue with the watch channel itself.
  //   if (!syncResult.requiresFullSync) {
  //     // Don't log this warning if it was an expected 410
  //     console.warn(
  //       `No nextSyncToken received for channel ${channelId}, but no 410 error reported. Watch might need attention.`
  //     )
  //     Sentry.captureMessage(
  //       'No nextSyncToken received from sync without 410 error',
  //       { level: 'warning', extra: { channelId, calendarId } }
  //     )
  //     // Consider removing the watch info if this persists:
  //     // await removeWatchChannelInfoFromDB(channelId);
  //   }
  // }
}
