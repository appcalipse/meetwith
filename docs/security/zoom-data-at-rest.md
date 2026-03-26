# Zoom User Data — Protection at Rest

**Organisation:** Meetwith (appcalipse/meetwith)
**Document version:** 1.0
**Last updated:** 2026-03-23
**Applies to:** meetwith.xyz and all associated backend services

---

## Short Answer

Zoom OAuth tokens and the associated Zoom user email address are stored in a **Supabase-managed PostgreSQL database**. Supabase encrypts all data at rest using **AES-256**, running on AWS infrastructure in the **eu-west-1 (Ireland)** region. Access to the database is restricted to the application server at runtime only, using a service key injected via a secrets manager (Doppler) — never hardcoded or committed to source control.

---

## 1. Storage Layer — Supabase (PostgreSQL)

All Zoom user data is stored in a single row in the `meeting_providers` table:

| Column            | Content                                                                                                      | Type          |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| `email`           | Zoom account email address                                                                                   | `text`        |
| `payload`         | Full OAuth token object (`access_token`, `refresh_token`, `expires_in`, `token_type`, `scope`, `expires_at`) | `jsonb`       |
| `account_address` | Wallet address of the owning Meetwith user (foreign key)                                                     | `text`        |
| `provider`        | Fixed value: `'zoom'`                                                                                        | `enum`        |
| `updated`         | ISO timestamp of last token refresh                                                                          | `timestamptz` |

### 1.1 Encryption at Rest — Platform Level

Supabase encrypts **all data at rest** on the underlying storage volumes using **AES-256**, provided by AWS (EBS volume encryption and RDS-equivalent PostgreSQL encryption). This applies automatically to every table, every row, and every column — including the `payload` column containing OAuth tokens and the `email` column. No additional configuration is required; it is enforced at the infrastructure level by default for all Supabase projects.

This means:

- The `access_token` and `refresh_token` values stored in `meeting_providers.payload` are encrypted at rest at the storage layer
- The Zoom email address stored in `meeting_providers.email` is encrypted at rest at the storage layer
- Encryption and decryption are handled transparently by the Supabase/AWS infrastructure; the data is only decrypted when legitimately accessed over an authenticated, TLS-encrypted connection

### 1.2 Encryption in Transit

All connections between the application server and Supabase are enforced over **TLS 1.2 or higher**. The Supabase client (`@supabase/supabase-js`) connects exclusively over HTTPS. Plaintext database connections are not permitted.

### 1.3 Database Access Control

Access to the Supabase database is controlled by a **service key** (`NEXT_SUPABASE_KEY`). This key:

- Is stored exclusively in **Doppler** (secrets manager) and injected at runtime via the Doppler CLI
- Is never committed to the source repository
- Is never present in any configuration file, environment file, or build artifact
- Is rotated as part of the incident response process if compromise is suspected

The Supabase URL and key are only present in the running application process. They are not exposed to the browser, included in API responses, or logged.

---

## 2. Session Layer — iron-session Cookie

When a user authenticates, their session identity is stored in an encrypted HTTP cookie (`mww_iron`). The cookie is encrypted using **AES-256** via the `iron-session` library, keyed with a secret (`IRON_COOKIE_PASSWORD`) managed through Doppler. In production, the cookie is set with `Secure: true`, ensuring it is only transmitted over HTTPS.

The cookie does **not** contain Zoom tokens — it contains only the user's wallet address and session signature. Tokens are retrieved from Supabase server-side when needed, within the request lifecycle.

---

## 3. Server Filesystem — Server-to-Server App Token (`zoom-token.json`)

The application maintains a separate Server-to-Server OAuth token for the Meetwith Zoom app account (not tied to any individual user). This token is cached in a `zoom-token.json` file on the server filesystem.

| Property             | Detail                                                         |
| -------------------- | -------------------------------------------------------------- |
| Contains             | App-level `access_token` only — no user-specific data          |
| Location             | Server filesystem inside the Docker container (AWS App Runner) |
| Platform encryption  | AWS App Runner uses encrypted ephemeral storage by default     |
| Lifetime             | Overwritten approximately every 50 minutes on token refresh    |
| On container restart | File is not persisted — a fresh token is fetched from Zoom     |

This file contains no Zoom user data. It is the application's own credential, scoped to the Meetwith Zoom app account.

---

## 4. Infrastructure Encryption Summary

| Layer                      | Technology                   | Encryption standard                     |
| -------------------------- | ---------------------------- | --------------------------------------- |
| Database storage           | Supabase on AWS (eu-west-1)  | AES-256 at rest (AWS EBS)               |
| Database connection        | Supabase JS client           | TLS 1.2+ in transit                     |
| Application server storage | AWS App Runner (Docker)      | AES-256 at rest (AWS ephemeral storage) |
| Session cookie             | iron-session                 | AES-256 (IRON_COOKIE_PASSWORD)          |
| Secret management          | Doppler                      | AES-256 (Doppler vault encryption)      |
| HTTPS (user-facing)        | AWS App Runner load balancer | TLS 1.2+ enforced in production         |

---

## 5. What Is Not Relied Upon

For completeness and transparency:

- **No additional application-level encryption** is applied to the `meeting_providers.payload` column before writing to Supabase. The application relies on Supabase's platform-level AES-256 encryption for the token payload, rather than a second layer of application-level encryption such as AES or ECIES. (Note: other sensitive columns in the application — such as `meeting_info_encrypted` and `encoded_signature` — do use application-level ECIES/AES encryption before storage. Zoom tokens were not included in this pattern because they are write-once-read-server credentials that never leave the server process.)
- **No Zoom token data is stored in browser storage** (localStorage, sessionStorage, or IndexedDB).
- **No Zoom token data is written to application logs**, Sentry error payloads, or any external monitoring service.

---

## 6. Summary

> Zoom OAuth tokens (access token, refresh token) and the user's Zoom email address are stored in a Supabase-managed PostgreSQL database. All data is encrypted at rest using AES-256 at the infrastructure level, provided by Supabase on AWS (eu-west-1). All connections to the database are encrypted in transit over TLS. Access credentials for the database are managed exclusively through Doppler (secrets manager) and are never present in source code, logs, or browser-accessible responses. Users can permanently delete all stored Zoom data at any time by disconnecting the integration, which triggers an immediate hard DELETE from the database.
