# Zoom Integration — Architecture & Flow Diagrams

This document covers every service that participates in the Zoom integration,
and provides detailed flow diagrams for each operation.

---

## 1. High-Level Architecture

All services that interact with Zoom, either directly or as supporting infrastructure.

```mermaid
graph TB
    subgraph Client["Browser (Client)"]
        UI["Next.js React UI\n(Connected Accounts page)"]
    end

    subgraph Server["Next.js Server — AWS ECS (via Copilot)"]
        direction TB
        SESSION["iron-session\n(encrypted cookie)"]

        subgraph ZoomRoutes["Zoom API Routes"]
            CONNECT["/api/secure/integrations/zoom/connect\nGET — build OAuth URL"]
            CALLBACK["/api/secure/integrations/zoom/callback\nGET — handle OAuth redirect"]
            CREATE["/api/integrations/zoom/create\nPOST — create Zoom meeting"]
            DISCONNECT["/api/secure/accounts/meeting-provider\nDELETE — remove provider"]
        end

        subgraph Helpers["Server Helpers"]
            ZOOMHELPER["zoom.helper.ts\nServer-to-Server token\n(ZOOM_ACCOUNT_ID)"]
            ZOOMUSERHELPER["zoom.user.helper.ts\nUser OAuth token refresh"]
            DB["database.ts\naddOrUpdateMeetingProvider\ngetConnectedMeetingProviders\ndeleteMeetingProviderDB"]
        end

        SENTRY["Sentry\n(error monitoring)"]
        TOKENFILE["zoom-token.json\n(local token cache\nfor server app)"]
    end

    subgraph Supabase["Supabase (PostgreSQL)"]
        MEETING_PROVIDERS[("meeting_providers\naccount_address\nprovider = 'zoom'\nemail\npayload: { access_token,\nrefresh_token, expires_at }")]
        ACCOUNTS[("accounts")]
        SLOTS[("slots")]
        CONF_MEETINGS[("conference_meetings")]
    end

    subgraph ZoomCloud["Zoom Cloud"]
        ZOOM_OAUTH["zoom.us\n/oauth/authorize\n/oauth/token"]
        ZOOM_API["api.zoom.us/v2\n/users/me\n/users/me/meetings"]
    end

    UI -->|"HTTPS requests"| ZoomRoutes
    ZoomRoutes -->|"reads/writes session"| SESSION
    CONNECT --> ZOOM_OAUTH
    CALLBACK --> ZOOM_OAUTH
    CALLBACK --> DB
    CREATE --> ZOOMHELPER
    CREATE --> ZOOMUSERHELPER
    ZOOMHELPER -->|"Server-to-Server OAuth\ngrant_type: account_credentials"| ZOOM_OAUTH
    ZOOMHELPER -->|"cache token"| TOKENFILE
    ZOOMUSERHELPER -->|"grant_type: refresh_token"| ZOOM_OAUTH
    ZOOMUSERHELPER --> DB
    CREATE -->|"POST /users/me/meetings"| ZOOM_API
    DB --> MEETING_PROVIDERS
    DB --> ACCOUNTS
    DB --> SLOTS
    DB --> CONF_MEETINGS
    DISCONNECT --> DB
    CALLBACK --> ZOOM_API
    ZoomRoutes -->|"captureException"| SENTRY
```

---

## 2. Environment Variables & Credentials

Two separate Zoom app credentials are used, serving different purposes.

```mermaid
graph LR
    subgraph OAuthApp["Zoom OAuth App\n(User-level)"]
        CID["ZOOM_CLIENT_ID"]
        CSEC["ZOOM_CLIENT_SECRET"]
    end

    subgraph S2SApp["Zoom Server-to-Server OAuth App\n(Account-level fallback)"]
        SCID["ZOOM_SERVER_CLIENT_ID"]
        SCSEC["ZOOM_SERVER_CLIENT_SECRET"]
        AID["ZOOM_ACCOUNT_ID"]
    end

    CONNECT_ROUTE["/connect + /callback routes"]
    CREATE_ROUTE["/create route\n(fallback path)"]
    REFRESH[("zoom.user.helper.ts\ntoken refresh")]

    CID --> CONNECT_ROUTE
    CSEC --> CONNECT_ROUTE
    CID --> REFRESH
    CSEC --> REFRESH

    SCID --> CREATE_ROUTE
    SCSEC --> CREATE_ROUTE
    AID --> CREATE_ROUTE
```

---

## 3. Flow: Connecting a Zoom Account (OAuth)

A user links their personal Zoom account to Meetwith. This enables private
meeting links and waiting rooms scoped to the user's own Zoom account.

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant NextJS as Next.js Server<br/>/api/secure/integrations/zoom
    participant IronSession as iron-session<br/>(cookie)
    participant ZoomOAuth as zoom.us<br/>OAuth Server
    participant ZoomAPI as api.zoom.us/v2<br/>/users/me
    participant Supabase

    User->>Browser: Clicks "Connect Zoom"
    Browser->>NextJS: GET /connect
    Note over NextJS: Reads ZOOM_CLIENT_ID<br/>Builds OAuth authorize URL<br/>with redirect_uri + optional state
    NextJS-->>Browser: 200 { url: "https://zoom.us/oauth/authorize?..." }
    Browser->>ZoomOAuth: Redirect → zoom.us/oauth/authorize
    ZoomOAuth-->>User: Zoom login & consent screen
    User->>ZoomOAuth: Grants permission ("Allow")
    ZoomOAuth-->>Browser: Redirect → /callback?code=AUTH_CODE&state=...

    Browser->>NextJS: GET /callback?code=AUTH_CODE
    NextJS->>IronSession: Verify session (must be logged in)
    IronSession-->>NextJS: account.address ✓

    NextJS->>ZoomOAuth: POST /oauth/token<br/>grant_type=authorization_code<br/>code=AUTH_CODE<br/>Authorization: Basic base64(client_id:secret)
    ZoomOAuth-->>NextJS: { access_token, refresh_token, expires_in }
    Note over NextJS: tokens.expires_at = now + expires_in * 1000

    NextJS->>ZoomAPI: GET /users/me<br/>Authorization: Bearer access_token
    ZoomAPI-->>NextJS: { email, ... }

    NextJS->>Supabase: addOrUpdateMeetingProvider(<br/>  address, email,<br/>  provider='zoom',<br/>  payload={ tokens }<br/>)
    Supabase-->>NextJS: OK

    alt No state redirect
        NextJS-->>Browser: Redirect → /dashboard/settings/connected-calendars?calendarResult=success
    else State contains redirectTo
        NextJS-->>Browser: Redirect → stateObject.redirectTo
    end

    Browser-->>User: ✅ "Connected" badge shown on Zoom card
```

---

## 4. Flow: Creating a Zoom Meeting

Called every time a meeting is booked through Meetwith. The server chooses
between two token strategies depending on whether the host has connected
their personal Zoom account.

```mermaid
sequenceDiagram
    actor Guest
    participant Browser
    participant NextJS as Next.js Server<br/>/api/integrations/zoom/create
    participant IronSession as iron-session
    participant Supabase
    participant UserHelper as zoom.user.helper.ts<br/>Token Refresh
    participant ZoomOAuth as zoom.us<br/>/oauth/token
    participant ZoomAPI as api.zoom.us/v2<br/>/users/me/meetings
    participant Sentry

    Guest->>Browser: Books a meeting (Zoom selected as provider)
    Browser->>NextJS: POST /create { start, end, title, participants, ... }

    NextJS->>IronSession: Read session
    IronSession-->>NextJS: account.address (or null for guests)

    alt User is logged in
        NextJS->>Supabase: getConnectedMeetingProviders(address)
        Supabase-->>NextJS: meeting_providers rows

        alt Zoom provider found in DB
            NextJS->>NextJS: Check tokens.expires_at vs Date.now()

            alt Token is expired
                NextJS->>UserHelper: refreshUserAccessToken(<br/>  address, email, refresh_token<br/>)
                UserHelper->>ZoomOAuth: POST /oauth/token<br/>grant_type=refresh_token
                ZoomOAuth-->>UserHelper: { new access_token, refresh_token }
                UserHelper->>Supabase: addOrUpdateMeetingProvider(updated tokens)
                UserHelper-->>NextJS: new access_token
            else Token still valid
                NextJS->>NextJS: Use existing access_token
            end

            Note over NextJS: isUserToken = true<br/>→ waiting_room: true<br/>→ join_before_host: true
        else No Zoom provider in DB
            NextJS->>NextJS: Fall through to server token
        end
    end

    alt No user token available (fallback)
        NextJS->>NextJS: getAccessToken() from zoom-token.json
        alt File token expired or missing
            NextJS->>ZoomOAuth: POST /oauth/token<br/>grant_type=account_credentials<br/>account_id=ZOOM_ACCOUNT_ID<br/>Authorization: Basic base64(server_id:server_secret)
            ZoomOAuth-->>NextJS: { access_token }
            NextJS->>NextJS: saveCredentials() → zoom-token.json
        end
        Note over NextJS: isUserToken = false<br/>→ waiting_room: false
    end

    NextJS->>Supabase: getAccountsNotificationSubscriptionEmails(addresses)
    Supabase-->>NextJS: [ guest emails for invitees ]

    NextJS->>ZoomAPI: POST /users/me/meetings<br/>{ topic, start_time, duration,<br/>  settings: { waiting_room,<br/>  meeting_invitees, host_video,<br/>  enforce_login, ... },<br/>  recurrence? (if recurring) }

    alt Zoom responds 200 / 201
        ZoomAPI-->>NextJS: { join_url, ... }
        NextJS-->>Browser: 200 { url: join_url }
        Browser-->>Guest: Meeting link delivered ✅
    else Zoom responds error + isUserToken
        ZoomAPI-->>NextJS: Error
        NextJS-->>Browser: 403 { error: "Gated entry config failed..." }
    else Zoom responds error + server token
        ZoomAPI-->>NextJS: Error
        NextJS->>Sentry: captureException(statusText)
        NextJS-->>Browser: 503 "Zoom Unavailable"
    end
```

---

## 5. Flow: Token Refresh (User OAuth)

The user's access token expires after ~1 hour. This refresh happens
automatically inside the meeting creation flow before calling the Zoom API.

```mermaid
sequenceDiagram
    participant CreateRoute as /create route
    participant UserHelper as zoom.user.helper.ts
    participant ZoomOAuth as zoom.us<br/>/oauth/token
    participant Supabase

    CreateRoute->>UserHelper: refreshUserAccessToken(<br/>  accountAddress,<br/>  email,<br/>  refresh_token<br/>)
    UserHelper->>ZoomOAuth: POST /oauth/token<br/>grant_type=refresh_token<br/>refresh_token=<stored_token><br/>Authorization: Basic base64(client_id:secret)

    alt Refresh succeeds
        ZoomOAuth-->>UserHelper: { access_token, refresh_token, expires_in }
        UserHelper->>UserHelper: tokens.expires_at = now + expires_in * 1000
        UserHelper->>Supabase: addOrUpdateMeetingProvider(<br/>  accountAddress, email,<br/>  'zoom', { new tokens }<br/>)
        Supabase-->>UserHelper: OK
        UserHelper-->>CreateRoute: new access_token
    else Refresh fails
        ZoomOAuth-->>UserHelper: 4xx / network error
        UserHelper-->>CreateRoute: throws Error("Failed to refresh...")
    end
```

---

## 6. Flow: Server-to-Server Token (Fallback)

Used when the meeting host has not connected a personal Zoom account.
Tokens are cached locally on the server filesystem to avoid redundant requests.

```mermaid
sequenceDiagram
    participant CreateRoute as /create route
    participant ZoomHelper as zoom.helper.ts
    participant FileSystem as zoom-token.json<br/>(local filesystem)
    participant ZoomOAuth as zoom.us<br/>/oauth/token

    CreateRoute->>ZoomHelper: getAccessToken()
    ZoomHelper->>FileSystem: readFile(zoom-token.json)

    alt File exists and token not expired<br/>(credentials.expires_at > Date.now())
        FileSystem-->>ZoomHelper: { access_token, expires_at }
        ZoomHelper-->>CreateRoute: access_token ✅
    else File missing or token expired
        ZoomHelper->>ZoomHelper: refreshAccessToken()
        ZoomHelper->>ZoomOAuth: POST /oauth/token<br/>grant_type=account_credentials<br/>account_id=ZOOM_ACCOUNT_ID<br/>Authorization: Basic base64(<br/>  ZOOM_SERVER_CLIENT_ID:<br/>  ZOOM_SERVER_CLIENT_SECRET<br/>)
        ZoomOAuth-->>ZoomHelper: { access_token, expires_in }
        Note over ZoomHelper: expires_at = now + 1h - 100s<br/>(buffer to avoid edge expiry)
        ZoomHelper->>FileSystem: writeFile(zoom-token.json)
        ZoomHelper-->>CreateRoute: access_token ✅
    end
```

---

## 7. Flow: Disconnecting Zoom

The user removes the Zoom integration from their account.

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant NextJS as Next.js Server<br/>/api/secure/accounts/meeting-provider
    participant IronSession as iron-session
    participant Supabase
    participant Sentry

    User->>Browser: Clicks "Disconnect Zoom"
    Browser->>NextJS: DELETE /meeting-provider?provider=zoom

    NextJS->>IronSession: Verify session
    IronSession-->>NextJS: account.address ✓

    NextJS->>Supabase: deleteMeetingProviderDB(<br/>  account_address,<br/>  provider='zoom'<br/>)
    Note over Supabase: DELETE FROM meeting_providers<br/>WHERE account_address = ?<br/>AND provider = 'zoom'

    alt Delete succeeds
        Supabase-->>NextJS: OK
        NextJS-->>Browser: 200 { success: true }
        Browser-->>User: ✅ Badge removed, button resets to "Connect Zoom"
    else Delete fails
        Supabase-->>NextJS: Error
        NextJS->>Sentry: captureException(error)
        NextJS-->>Browser: 500 "An unexpected error occurred"
    end
```

---

## 8. Database Schema — Zoom-relevant Tables

```mermaid
erDiagram
    accounts {
        string address PK
        string encoded_signature
        string internal_pub_key
    }

    meeting_providers {
        string id PK
        string account_address FK
        string provider
        string email
        json payload
    }

    conference_meetings {
        string id PK
        string meeting_url
        string provider
        datetime start
        datetime end
        string title
        datetime created_at
    }

    slots {
        string id PK
        string account_address FK
        datetime start
        datetime end
        string meeting_info_encrypted
        string role
    }

    accounts ||--o{ meeting_providers : "has connected providers"
    accounts ||--o{ slots : "owns slots"
    slots }o--|| conference_meetings : "linked to meeting"
```

The `meeting_providers.payload` column stores the full Zoom token object:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "v1.MgA...",
  "token_type": "bearer",
  "expires_in": 3599,
  "expires_at": 1712345678000,
  "scope": "meeting:write user:read"
}
```

---

## 9. Zoom API Calls Summary

| Route              | Zoom Endpoint                      | Method | Auth                            |
| ------------------ | ---------------------------------- | ------ | ------------------------------- |
| `/callback`        | `zoom.us/oauth/token`              | POST   | Basic (client_id:secret)        |
| `/callback`        | `api.zoom.us/v2/users/me`          | GET    | Bearer user token               |
| `/create` (user)   | `zoom.us/oauth/token` (refresh)    | POST   | Basic (client_id:secret)        |
| `/create` (user)   | `api.zoom.us/v2/users/me/meetings` | POST   | Bearer user token               |
| `/create` (server) | `zoom.us/oauth/token` (s2s)        | POST   | Basic (server_id:server_secret) |
| `/create` (server) | `api.zoom.us/v2/users/me/meetings` | POST   | Bearer server token             |

---

## 10. Error Handling & Monitoring

```mermaid
graph TD
    ERR1["OAuth callback receives\nerror param from Zoom"]
    ERR2["Token exchange\nrequest fails"]
    ERR3["GET /users/me\nrequest fails"]
    ERR4["No email returned\nfrom Zoom user info"]
    ERR5["POST /meetings\nreturns non-200\n(user token)"]
    ERR6["POST /meetings\nreturns non-200\n(server token)"]
    ERR7["Unexpected exception\nin any route"]

    SENTRY["Sentry.captureException()"]
    REDIRECT_ERR["Redirect → ?meetResult=error\nor ?calendarResult=error"]
    RES403["HTTP 403\n(gated entry config failed)"]
    RES503["HTTP 503\n(Zoom Unavailable)"]
    RES500["HTTP 500\n(unexpected error)"]

    ERR1 --> SENTRY
    ERR1 --> REDIRECT_ERR
    ERR2 --> RES503
    ERR3 --> RES503
    ERR4 --> REDIRECT_ERR
    ERR5 --> RES403
    ERR6 --> SENTRY
    ERR6 --> RES503
    ERR7 --> SENTRY
    ERR7 --> RES500
```
