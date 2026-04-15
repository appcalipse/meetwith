# Meetwith — Zoom Marketplace App Reviewer Notes

**App name:** Meetwith
**Website:** https://meetwith.xyz
**Version submitted:** 1.0
**Date:** 2026-03-23
**Primary contact:** Available via https://meetwith.xyz or Discord: https://discord.gg/En7BK4vhUF

---

## 1. What Meetwith Does

Meetwith is a scheduling platform — similar to Calendly — built for individuals, freelancers, consultants, and Web3-native teams and DAOs. Users connect their crypto wallet to create a public booking page where other people can schedule time with them.

Key capabilities:

- Personal and group availability sharing via a public booking link
- One-off and recurring meeting scheduling (daily, weekly, monthly)
- Multi-participant scheduling across groups and DAOs
- Calendar integrations (Google Calendar, iCloud, Office 365, WebDAV/CalDAV)
- Payment collection for paid sessions (crypto via Arbitrum/Celo, Stripe, invoicing)
- Token-gated and private meetings
- Smart notifications via email, Discord, and Telegram

**Zoom's role in the product:**
When a user connects their Zoom account, every meeting booked through Meetwith automatically receives a unique, private Zoom link. Invited guests join directly; all others land in a waiting room until the host admits them. Without the Zoom connection, meetings fall back to a shared app-level Zoom link (no waiting room) or another provider the user selects (Google Meet, Huddle01, Jitsi, or a custom link).

---

## 2. Zoom Integration —

Exact Scope of Use

### 2.1 OAuth Scopes Requested

| Scope           | Why it is needed                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meeting:write` | Create a new scheduled Zoom meeting on behalf of the user via `POST /users/me/meetings`                                                             |
| `user:read`     | Retrieve the user's Zoom email address via `GET /users/me` immediately after OAuth, to confirm which account was connected and display it in the UI |

No other scopes are requested. Meetwith does not read, list, update, or delete any existing Zoom meetings. It does not access recordings, chat, webinars, contacts, account settings, or any data beyond what is listed above.

### 2.2 Zoom API Endpoints Called

| Endpoint                           | Method   | When                                   | Purpose                                                                      |
| ---------------------------------- | -------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| `zoom.us/oauth/authorize`          | Redirect | User clicks "Connect Zoom"             | Initiates the OAuth 2.0 authorisation flow                                   |
| `zoom.us/oauth/token`              | POST     | After user grants permission           | Exchanges the authorisation code for `access_token` and `refresh_token`      |
| `api.zoom.us/v2/users/me`          | GET      | Once, immediately after token exchange | Fetches the user's Zoom email address for display in Connected Accounts      |
| `zoom.us/oauth/token`              | POST     | When `access_token` is expired         | Silently refreshes the token using `refresh_token` before creating a meeting |
| `api.zoom.us/v2/users/me/meetings` | POST     | Each time a meeting is booked          | Creates a scheduled Zoom meeting and returns the `join_url`                  |

### 2.3 Meeting Settings Applied on Creation

Every meeting created via Meetwith sends the following settings to `POST /users/me/meetings`:

```json
{
  "type": 2,
  "use_pmi": false,
  "encryption_type": "enhanced_encryption",
  "waiting_room": true,
  "join_before_host": true,
  "enforce_login": true,
  "email_notification": true,
  "host_video": true,
  "participant_video": false,
  "mute_upon_entry": false,
  "approval_type": 0,
  "allow_multiple_devices": true,
  "auto_start_ai_companion_questions": false,
  "auto_start_meeting_summary": false
}
```

- `type: 2` — scheduled meeting (never PMI)
- `use_pmi: false` — every booking generates a unique, fresh meeting link
- `waiting_room: true` — enabled only when the user's own OAuth token is used; falls back to `false` with the app-level Server-to-Server token
- `encryption_type: enhanced_encryption` — strongest available encryption enforced on every meeting
- Recurring meetings (daily / weekly / monthly) set the `recurrence` object accordingly, with `weekly_days` calculated from the meeting's start date and the host's timezone

---

## 3. User-Facing Flows to Review

### 3.1 Connecting a Zoom Account

1. Log in to Meetwith at **https://meetwith.xyz** (requires a crypto wallet — see §6 for test account details)
2. Go to **Dashboard → Settings → Connected Accounts**
3. Find the **Zoom** card — it shows the description _"Connect your Zoom account to enable gated meeting entry and waiting rooms natively."_
4. Click **Connect Zoom**
5. The browser redirects to `zoom.us/oauth/authorize` with `response_type=code` and the app's `client_id`
6. Sign in to Zoom (or use an already-authenticated Zoom session) and click **Allow**
7. Zoom redirects back to `https://meetwith.xyz/api/secure/integrations/zoom/callback`
8. Meetwith exchanges the code for tokens, calls `GET /users/me` to retrieve the email, and saves both to the database
9. The browser redirects to the Connected Accounts page — the Zoom card now shows a green **Connected** badge with the linked Zoom email address

### 3.2 Using Zoom to Create a Meeting

Once connected, the integration is automatic. To observe it:

1. From the Dashboard, go to **Schedule** or open a public booking page
2. Create or accept a meeting with **Zoom** selected as the meeting platform
3. Meetwith calls `POST /api/integrations/zoom/create` server-side
4. The server retrieves the stored OAuth token, refreshes it if expired, then calls `POST https://api.zoom.us/v2/users/me/meetings`
5. The returned `join_url` is stored and distributed to all participants in their booking confirmation
6. The meeting link is private — it does not appear on the user's public Meetwith profile

### 3.3 Disconnecting a Zoom Account

1. Go to **Dashboard → Settings → Connected Accounts**
2. Find the Zoom card (showing the green **Connected** badge)
3. Click **Disconnect Zoom**
4. Meetwith calls `DELETE /api/secure/accounts/meeting-provider?provider=zoom`
5. The row is **permanently deleted** from the `meeting_providers` table in the database — no soft delete, no archive
6. The Zoom card reverts to the **Connect Zoom** button
7. Future bookings will fall back to the app-level Zoom link or another provider selected by the user

---

## 4. What the Integration Does NOT Do

To help the reviewer confirm scope boundaries:

- ❌ Does not read, list, modify, or delete any existing Zoom meetings
- ❌ Does not access Zoom recordings, transcripts, or summaries
- ❌ Does not access Zoom chat messages
- ❌ Does not access the user's Zoom contacts or directory
- ❌ Does not access Zoom webinar or event data
- ❌ Does not access Zoom account-level billing or admin settings
- ❌ Does not use Personal Meeting ID (PMI) — `use_pmi` is always `false`
- ❌ Does not store or process any content from inside Zoom meetings
- ❌ Does not share Zoom user data (email, tokens) with any third party
- ❌ Does not send Zoom tokens to the browser — tokens are retrieved and used server-side only

---

## 5. Architecture Summary

```
User Browser
    │
    ▼
Next.js Server (AWS App Runner, eu-west-1)
    │
    ├── /api/secure/integrations/zoom/connect   → builds OAuth URL
    ├── /api/secure/integrations/zoom/callback  → exchanges code, stores tokens
    ├── /api/integrations/zoom/create           → creates Zoom meeting
    └── /api/secure/accounts/meeting-provider   → deletes tokens on disconnect
    │
    ├── Supabase (PostgreSQL, AES-256 at rest, TLS in transit)
    │       └── meeting_providers table
    │             ├── email       (Zoom user email)
    │             └── payload     (access_token, refresh_token, expires_at)
    │
    ├── Doppler (secrets manager — ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET never in source)
    │
    └── Zoom Cloud
            ├── zoom.us/oauth/token       (token exchange + refresh)
            ├── api.zoom.us/v2/users/me   (email lookup, once at connect)
            └── api.zoom.us/v2/users/me/meetings  (meeting creation)
```

Sessions are managed with **iron-session** (AES-256 encrypted cookie). All Zoom API routes under `/api/secure/` require a valid authenticated session — unauthenticated requests receive a `401` redirect before the handler is reached.

---

## 6. Test Account & Review Instructions

To review the integration end-to-end without needing your own crypto wallet setup, please use the following:

**Meetwith test account**

> URL: https://meetwith.xyz
> Login method: Connect
> any Ethereum-compatible wallet (MetaMask, WalletConnect, etc.) — no email or personal data required
> Alternatively, the team can provision a pre-authenticated demo session on request — contact us via Discord (https://discord.gg/En7BK4vhUF) or book time at https://meetwith.xyz/sinachpat

**Zoom account needed for review**
The reviewer will need a Zoom account (free tier is sufficient to test OAuth connect and meeting creation; a paid plan is required to verify waiting room functionality).

**Step-by-step review path:**

1. Visit **https://meetwith.xyz** and connect a wallet (or use the demo session)
2. Navigate to **Dashboard → Settings → Connected Accounts**
3. Click **Connect Zoom** and complete the OAuth flow with your Zoom account
4. Verify the green **Connected** badge appears with your Zoom email shown
5. Navigate to the **Schedule** tab and create a new meeting, selecting **Zoom** as the meeting platform
6. Confirm a Zoom `join_url` is returned and stored against the meeting
7. Return to **Connected Accounts** and click **Disconnect Zoom**
8. Verify the badge is removed and the row is deleted (no Zoom data persists)

---

## 7. Redirect URIs Registered

| Environment       | Redirect URI                                                               |
| ----------------- | -------------------------------------------------------------------------- |
| Production        | `https://meetwith.xyz/api/secure/integrations/zoom/callback`               |
| Preview / staging | `https://[preview-env].meetwith.xyz/api/secure/integrations/zoom/callback` |

The callback URL validates:

- That the session is authenticated before processing the code (`iron-session` check)
- That `stateObject.redirectTo`, if present, begins with `/` — preventing open-redirect to external domains

---

## 8. Security & Compliance Summary

| Control                             | Detail                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Token storage                       | Supabase PostgreSQL — AES-256 at rest, TLS in transit                                                       |
| Secret management                   | Doppler — `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET` injected at runtime, never in source code               |
| Session authentication              | iron-session (AES-256 encrypted cookie, `Secure: true` in production)                                       |
| SAST                                | Semgrep — runs on every commit, 116,585 rules, 0 blocking findings (2026-03-23)                             |
| Automated tests                     | 3,984 unit tests + 20 end-to-end Playwright tests — all must pass before deployment                         |
| Deployment gate                     | Deploy job requires `coverage`, `e2e`, and `sast` jobs to all succeed                                       |
| Token never logged                  | Confirmed — `console.error` and `Sentry.captureException` calls only log error messages, never token values |
| User data deletion                  | Hard `DELETE` from database on disconnect — no soft delete or archive                                       |
| Zoom data shared with third parties | None                                                                                                        |

---

## 9. Support & Contact

| Channel                            | Details                                |
| ---------------------------------- | -------------------------------------- |
| Live app                           | https://meetwith.xyz                   |
| User guide for Zoom                | https://meetwith.xyz/features/zoom     |
| Discord community                  | https://discord.gg/En7BK4vhUF          |
| Book time with the team            | https://meetwith.xyz/sinachpat         |
| GitHub (for code review questions) | https://github.com/appcalipse/meetwith |
