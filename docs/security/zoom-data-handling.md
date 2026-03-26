# Zoom User Data Collection, Storage, Logging & Retention

**Organisation:** Meetwith (appcalipse/meetwith)
**Document version:** 1.0
**Last updated:** 2026-03-23
**Applies to:** meetwith.xyz and all associated backend services

---

## Short Answer

**Yes.** Meetwith collects and stores a limited, well-defined set of Zoom user data that is strictly necessary to provide the integration. Specifically:

1. The authenticated user's **Zoom email address**
2. The user's **Zoom OAuth token set** (`access_token`, `refresh_token`, `expires_in`, `token_type`, `scope`, and a server-computed `expires_at` timestamp)

No other Zoom user data is collected, stored, logged, or retained.

---

## 1. What Data Is Collected and Why

### 1.1 Zoom Email Address

| Field   | Source                                | Purpose                                                                                                                                        |
| ------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `email` | `GET https://api.zoom.us/v2/users/me` | Displayed to the user in their Connected Accounts settings as a confirmation of which Zoom account is linked. Never shared with third parties. |

The email is fetched once during the OAuth callback and stored alongside the token. It is used solely for display purposes.

### 1.2 Zoom OAuth Token Set

| Field           | Source                    | Purpose                                                                                                               |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `access_token`  | Zoom OAuth token exchange | Used as the `Bearer` token to call `POST /users/me/meetings` when creating private Zoom meeting links                 |
| `refresh_token` | Zoom OAuth token exchange | Used to silently obtain a new `access_token` when the current one expires, without requiring the user to re-authorise |
| `expires_in`    | Zoom OAuth token exchange | Used to compute `expires_at`                                                                                          |
| `token_type`    | Zoom OAuth token exchange | Stored as part of the token object; always `bearer`                                                                   |
| `scope`         | Zoom OAuth token exchange | Stored as part of the token object; not used directly by the application                                              |
| `expires_at`    | Computed server-side      | `Date.now() + expires_in * 1000` — used to determine whether a token refresh is needed before making an API call      |

The token set is never used for any purpose beyond creating Zoom meetings on behalf of the authenticated user.

---

## 2. Where Data Is Stored

### 2.1 Supabase — `meeting_providers` table

All Zoom user data is stored in a single row in the `meeting_providers` table in Supabase (PostgreSQL):

```
meeting_providers
├── id                (UUID, primary key)
├── account_address   (wallet address of the Meetwith user — foreign key to accounts)
├── provider          ('zoom')
├── email             (Zoom user email address)
├── payload           (JSON — full OAuth token object)
└── updated           (ISO timestamp of last token refresh)
```

The `payload` column stores the following JSON object:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "v1.MgA...",
  "token_type": "bearer",
  "expires_in": 3599,
  "scope": "meeting:write user:read",
  "expires_at": 1712345678000
}
```

All connections to Supabase are enforced over TLS. The Supabase service key is injected at runtime via Doppler and is never present in source code.

### 2.2 Server Filesystem — `zoom-token.json` (Server-to-Server app token only)

The application also operates a Server-to-Server OAuth app (using `ZOOM_SERVER_CLIENT_ID`, `ZOOM_SERVER_CLIENT_SECRET`, and `ZOOM_ACCOUNT_ID`) as a fallback for users who have not connected their personal Zoom account. This app-level token is cached locally in a `zoom-token.json` file on the server filesystem.

**This file contains only the application's own access token — it contains no user-specific data and is not linked to any individual Zoom account.** It is overwritten on every token refresh and is scoped to the Meetwith Zoom app account exclusively.

---

## 3. How Tokens Are Accessed at Runtime

Tokens are retrieved from Supabase at meeting creation time, used in-memory for a single API call, and then discarded. The access path is:

```
POST /api/integrations/zoom/create
  → getConnectedMeetingProviders(account_address)   [reads from Supabase]
  → check: zoomTokens.expires_at < Date.now()
      → if expired: refreshUserAccessToken(...)     [calls zoom.us/oauth/token]
                    → addOrUpdateMeetingProvider(…) [writes new tokens to Supabase]
  → token assigned to in-memory variable
  → POST https://api.zoom.us/v2/users/me/meetings   [token used in Authorization header]
  → token variable goes out of scope
```

Tokens are never written to HTTP responses, application logs, or any external service other than Supabase.

---

## 4. Logging

### 4.1 Application Logs (`console.error`)

Two `console.error` calls exist in the Zoom integration code paths:

| File                                       | Call                                                     | What is logged                                                                                  |
| ------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/api/integrations/zoom/create.ts`         | `console.error(e)`                                       | The caught exception object — contains error messages and stack traces only, never token values |
| `/api/secure/integrations/zoom/connect.ts` | `console.error('Error in Zoom connect handler:', error)` | A fixed string plus the error object — never contains token values                              |

### 4.2 Sentry Error Monitoring

`Sentry.captureException(err)` is called in the callback and create routes when an unhandled exception occurs. Sentry captures:

- The error message (e.g., `"Failed to fetch zoom token: Unauthorized"`)
- A stack trace

Sentry **does not** capture:

- `access_token` or `refresh_token` values
- The `tokens` object or `payload`
- Zoom user email addresses

Sentry is enabled only in the production environment (`NEXT_PUBLIC_ENV === 'production'`).

### 4.3 What Is Never Logged

The following are confirmed **never logged** anywhere in the codebase:

- `access_token` values
- `refresh_token` values
- The full token `payload` object
- Zoom user email addresses
- Any value from `GET /users/me` beyond the `email` field, which itself is not logged

---

## 5. What Data Is Returned to the Browser

The `/api/secure/accounts/connected` endpoint returns the connected account status to the authenticated user's own browser session. The Zoom entry in this response includes:

```json
{
  "account": "zoom",
  "info": {
    "id": "...",
    "account_address": "0x...",
    "provider": "zoom",
    "email": "user@example.com",
    "username": "user@example.com",
    "payload": { "access_token": "...", "refresh_token": "...", ... },
    "updated": "..."
  }
}
```

This endpoint is protected by `withSessionRoute` (iron-session) — it is only accessible to the authenticated user who owns the connection. The response is never cached, never served to third parties, and is only used by the Meetwith frontend to display the "Connected" badge for that user's own session.

---

## 6. Data Retention

### 6.1 Active Connections

Zoom OAuth tokens and the associated email address are retained in the `meeting_providers` table for as long as the user keeps their Zoom account connected to Meetwith.

### 6.2 User-Initiated Disconnection

When a user disconnects their Zoom account (Dashboard → Settings → Connected Accounts → "Disconnect Zoom"), the following is executed:

```
DELETE /api/secure/accounts/meeting-provider?provider=zoom
  → deleteMeetingProviderDB(account_address, 'zoom')
  → DELETE FROM meeting_providers
    WHERE account_address = ? AND provider = 'zoom'
```

This is a **hard DELETE** — the row is permanently removed from the database. No soft-delete or archival copy is retained. After disconnection, Meetwith holds no Zoom user data for that account.

### 6.3 Account Deletion

If a Meetwith user deletes their account, all associated rows across all tables — including `meeting_providers` — are deleted as part of the account teardown process.

### 6.4 Server-to-Server Token (`zoom-token.json`)

This file is overwritten on every refresh (approximately every 50 minutes, due to the 100-second safety buffer applied before the 1-hour expiry). It is not backed up and contains no user-specific data.

---

## 7. Data Not Collected

The following Zoom data is explicitly **not** collected, stored, or processed by Meetwith:

| Data                                               | Confirmation                                 |
| -------------------------------------------------- | -------------------------------------------- |
| Zoom meeting recordings                            | Not accessed — no API calls to `/recordings` |
| Zoom meeting chat messages                         | Not accessed                                 |
| Zoom meeting participant list                      | Not accessed post-creation                   |
| Zoom meeting audio or video                        | Not accessed                                 |
| Zoom account settings or billing information       | Not accessed                                 |
| Zoom contacts                                      | Not accessed                                 |
| Zoom webinar or event data                         | Not accessed                                 |
| Any Zoom user data beyond `email` from `/users/me` | Not accessed or stored                       |

---

## 8. Third-Party Data Sharing

Zoom user data (email address and OAuth tokens) is:

- **Not shared** with any third-party analytics, advertising, or data-processing service
- **Not included** in Sentry error payloads
- **Not included** in Discord deployment notifications
- **Not included** in any email sent via Resend
- **Visible only** to the authenticated Meetwith user who owns the connection, via the Connected Accounts page

---

## 9. Summary Table

| Data item                    | Collected      | Stored                     | Logged | Shared | Deleted on disconnect  |
| ---------------------------- | -------------- | -------------------------- | ------ | ------ | ---------------------- |
| Zoom email address           | ✅ Yes         | ✅ Supabase                | ❌ No  | ❌ No  | ✅ Hard DELETE         |
| `access_token`               | ✅ Yes         | ✅ Supabase                | ❌ No  | ❌ No  | ✅ Hard DELETE         |
| `refresh_token`              | ✅ Yes         | ✅ Supabase                | ❌ No  | ❌ No  | ✅ Hard DELETE         |
| `expires_in` / `expires_at`  | ✅ Yes         | ✅ Supabase                | ❌ No  | ❌ No  | ✅ Hard DELETE         |
| `token_type` / `scope`       | ✅ Yes         | ✅ Supabase                | ❌ No  | ❌ No  | ✅ Hard DELETE         |
| Meeting content / recordings | ❌ No          | ❌ No                      | ❌ No  | ❌ No  | N/A                    |
| App Server-to-Server token   | App-level only | `zoom-token.json` (server) | ❌ No  | ❌ No  | Overwritten on refresh |
