# Security Policy

**Organisation:** Meetwith (appcalipse/meetwith)
**Document version:** 1.0
**Last updated:** 2026-03-23
**Applies to:** meetwith.xyz and all associated backend services

---

## 1. Secure Software Development Lifecycle (SSDLC)

Meetwith operates a fully enforced SSDLC through GitHub Actions CI/CD. No code reaches production without passing every gate below.

### 1.1 Pipeline Gates (deploy.yml / test.yml)

| Gate                     | Tool                   | Result (2026-03-23)                       |
| ------------------------ | ---------------------- | ----------------------------------------- |
| Unit & integration tests | Jest (Node 20.17.0)    | 3,984 passed / 0 failed across 177 suites |
| End-to-end browser tests | Playwright (Chromium)  | 20 passed                                 |
| Static analysis (SAST)   | Semgrep                | 0 blocking findings                       |
| Linting                  | Biome                  | Passed                                    |
| Type checking            | TypeScript strict mode | Passed                                    |
| Build verification       | Next.js build          | Passed                                    |

The `deploy` job declares `needs: [coverage, e2e, sast]` — deployment is **blocked** if any gate fails.

### 1.2 Branch Protection

| Branch     | Environment       | Rule                                  |
| ---------- | ----------------- | ------------------------------------- |
| `main`     | Production        | All CI jobs must pass; no direct push |
| `pre-prod` | Pre-production    | All CI jobs must pass; no direct push |
| `develop`  | Preview / staging | All CI jobs must pass; no direct push |

All changes are introduced via Pull Requests reviewed by at least one engineer before merge.

### 1.3 Secret Management

All secrets (API keys, OAuth credentials, database URLs) are managed exclusively through **Doppler**. The Doppler CLI is installed at CI startup and injects secrets at runtime via an encrypted `DOPPLER_TOKEN`. No secrets are committed to the repository or present in any configuration file.

---

## 2. Static Application Security Testing (SAST)

### 2.1 Tool & Configuration

- **Tool:** Semgrep (`semgrep/semgrep` official Docker image)
- **Rules:** 116,585 rules applied per scan
- **Scope:** 1,109 source files per run
- **Trigger:** Every Pull Request and every push to a protected branch
- **Policy enforcement:** Blocking findings cause a non-zero exit, which prevents deployment

### 2.2 Most Recent Scan Results (2026-03-23)

```
Branch:            develop
Commit:            e5c0f46ecfa05b2226413eda2c50f06445dff755
Rules run:         116,585
Targets scanned:   1,109
Total findings:    171
Blocking findings: 0
Exit code:         0 ✓
```

Full results: https://semgrep.dev/orgs/meetwith/findings?repo=appcalipse/meetwith

### 2.3 Supply-Chain Scanning

Semgrep supply-chain scanning runs in the same job, covering third-party dependencies for known CVEs. Dependencies are locked via `yarn.lock` (Yarn 4.9.1, immutable installs in CI).

### 2.4 Finding Management

- Non-blocking findings are reviewed by the security lead each sprint
- Findings are triaged as: **fix**, **accept risk** (with written justification), or **false positive** (suppressed with inline annotation)
- Any finding reclassified as blocking immediately gates all future deployments until resolved

---

## 3. Dynamic Application Security Testing (DAST)

Dynamic testing is performed at two levels:

### 3.1 End-to-End Automated Testing

Playwright E2E tests exercise the full application stack in a live browser (Chromium) against a running instance of the application. Tests cover:

- Authentication flows (wallet connect, session cookies, redirect handling)
- API endpoint behaviour including error responses (409 conflict, 412, 503)
- Scheduling workflows with multiple participants
- Input validation (empty bodies, mismatched addresses)

These run on every CI pipeline run before deployment.

### 3.2 Manual Testing & Exploratory Security Review

The engineering team conducts exploratory security testing before significant feature releases, including:

- Testing OAuth redirect validation (confirming only relative paths are accepted via `startsWith('/')`)
- Session cookie inspection (`mww_iron` encrypted via iron-session)
- API endpoint access control verification (session-protected routes return 401/403 without valid session)

---

## 4. Vulnerability Management Policy

### 4.1 Discovery

Vulnerabilities are discovered through:

- Automated SAST (Semgrep) on every commit
- Automated supply-chain scanning (Semgrep supply-chain)
- Developer code review on every Pull Request
- Runtime error capture via Sentry

### 4.2 Severity Classification

| Severity | Definition                                            | Target Remediation |
| -------- | ----------------------------------------------------- | ------------------ |
| Critical | Remote code execution, auth bypass, data exfiltration | Within 24 hours    |
| High     | Privilege escalation, sensitive data exposure         | Within 72 hours    |
| Medium   | Limited-scope injection, open redirect                | Within 14 days     |
| Low      | Informational, hygiene findings                       | Next sprint        |

### 4.3 Patch & Release Process

1. Vulnerability is identified and documented
2. A fix branch is created and reviewed
3. All CI gates (including SAST) must pass on the fix branch
4. Fix is merged and deployed through the standard pipeline
5. Sentry is monitored post-deployment for regression

### 4.4 Responsible Disclosure

Security researchers may report vulnerabilities via:

- The Meetwith Discord server (https://discord.gg/En7BK4vhUF)
- Direct contact with maintainers via the GitHub repository

Reports are acknowledged within 72 hours and triaged within 7 days.

---

## 5. Data Retention & Protection Policy

### 5.1 Data Collected

| Data Type                   | Storage                            | Retention              |
| --------------------------- | ---------------------------------- | ---------------------- |
| Wallet address              | Supabase (PostgreSQL)              | Account lifetime       |
| OAuth tokens (Zoom, Google) | Supabase `meeting_providers` table | Until user disconnects |
| Meeting metadata            | Supabase (encrypted)               | Account lifetime       |
| Email addresses (optional)  | Supabase                           | Until user removes     |
| Session cookie              | Browser (iron-session, encrypted)  | Session duration       |

### 5.2 OAuth Token Handling

- OAuth tokens are stored in the `meeting_providers` table in Supabase
- Tokens are never logged, never returned in API responses, and never stored in plaintext outside Supabase
- Access tokens have a server-side expiry timestamp (`expires_at`) and are refreshed automatically
- Users can revoke access at any time by disconnecting the integration from their account settings, which triggers a hard `DELETE` from the `meeting_providers` table

### 5.3 Encryption

- Meeting content is stored encrypted in the `meeting_info_encrypted` column
- User private keys are encrypted using `encryptContent` before storage
- Supabase enforces TLS for all connections
- Passwords for CalDAV integrations are stored with cryptographic hashing

### 5.4 Data Minimisation

Meetwith does not collect or retain:

- Zoom meeting content, recordings, or chat
- Participant video or audio
- Any data beyond what is necessary to create and manage calendar events

---

## 6. Privacy Policy Summary

Meetwith is built on a privacy-first principle. Key commitments:

- **No tracking:** Meetwith does not gather, sell, or share user data with third-party advertisers
- **Wallet-based identity:** Users identify themselves with a crypto wallet — no mandatory email or personal data
- **End-to-end encryption:** Meeting details are encrypted before storage; only the participants can decrypt them
- **User control:** Users can disconnect any integration, delete their account, and remove all associated data at any time
- **Third-party integrations:** Meetwith uses Zoom and Google Meet solely to create meeting links on behalf of the user. No meeting content is accessed or stored by Meetwith

---

## 7. Incident Management & Response Policy

### 7.1 Detection

Incidents are detected through:

- Sentry real-time error alerts (enabled in production)
- GitHub Actions pipeline failure notifications (Discord webhook)
- Semgrep Cloud Platform security finding alerts

### 7.2 Response Process

| Step             | Action                                                  | Owner            |
| ---------------- | ------------------------------------------------------- | ---------------- |
| 1. Detection     | Alert received via Sentry / Discord / Semgrep           | On-call engineer |
| 2. Triage        | Assess severity, scope, and impact                      | Security lead    |
| 3. Containment   | Disable affected feature, rotate secrets if needed      | Engineering team |
| 4. Investigation | Review logs, Sentry traces, and CI pipeline history     | Engineering team |
| 5. Remediation   | Develop, test, and deploy fix through standard pipeline | Engineering team |
| 6. Post-mortem   | Document root cause, timeline, and preventive measures  | All stakeholders |

### 7.3 Secret Rotation

If a secret is suspected to be compromised:

1. It is immediately rotated in Doppler
2. Dependent services (Supabase, Zoom, AWS) have their credentials rotated
3. All active sessions are invalidated
4. Sentry is monitored for post-rotation anomalies

---

## 8. Infrastructure & Dependency Management Policy

### 8.1 Infrastructure

| Component           | Technology                      | Security Control                               |
| ------------------- | ------------------------------- | ---------------------------------------------- |
| Application runtime | Docker on AWS ECS (via Copilot) | Container isolation, least-privilege IAM       |
| Database            | Supabase (PostgreSQL)           | Row-level security, TLS, encrypted credentials |
| Secret management   | Doppler                         | Runtime injection only, no secrets in code     |
| CDN / Load balancer | AWS (Copilot-managed)           | HTTPS enforced, TLS termination                |
| Error monitoring    | Sentry                          | Production-only, no PII in error payloads      |
| Deployment region   | AWS eu-west-1                   | EU data residency                              |

### 8.2 Dependency Management

- All dependencies are declared in `package.json` and locked in `yarn.lock`
- `YARN_ENABLE_IMMUTABLE_INSTALLS=true` is enforced in CI, preventing lock file drift
- Semgrep supply-chain scanning checks all dependencies for known CVEs on every pipeline run
- Dependencies are reviewed and updated as part of the regular sprint cycle

### 8.3 Docker Image Security

- The application is containerised using a minimal Dockerfile
- The Semgrep SAST image is pulled fresh on every CI run using its SHA digest to prevent supply-chain attacks on the toolchain itself
- Base images are updated as part of the dependency management cycle

---

## 9. Access Control

| Resource          | Access Policy                                                                |
| ----------------- | ---------------------------------------------------------------------------- |
| AWS Console       | IAM roles with least privilege; credentials stored in GitHub Actions secrets |
| Supabase          | Service key scoped to application functions only                             |
| Doppler           | Team-scoped tokens per environment                                           |
| GitHub repository | Branch protection rules; required reviews on all PRs                         |
| Semgrep Cloud     | Org-scoped token stored as GitHub Actions secret                             |
| Zoom OAuth app    | Client credentials stored in Doppler; never in source                        |

---

## 10. Compliance Summary

| Requirement              | Status | Evidence                                             |
| ------------------------ | ------ | ---------------------------------------------------- |
| SSDLC process            | ✅ Yes | `.github/workflows/deploy.yml` — all gates must pass |
| SAST                     | ✅ Yes | Semgrep, 116,585 rules, runs on every commit         |
| Supply-chain scanning    | ✅ Yes | Semgrep supply-chain                                 |
| Automated testing        | ✅ Yes | Jest (3,984 tests) + Playwright (20 E2E tests)       |
| Secret management        | ✅ Yes | Doppler — zero secrets in source                     |
| Runtime error monitoring | ✅ Yes | Sentry (production)                                  |
| OAuth token protection   | ✅ Yes | Stored encrypted in Supabase, never logged           |
| User data deletion       | ✅ Yes | DELETE endpoint for all provider integrations        |
| HTTPS enforcement        | ✅ Yes | AWS load balancer TLS termination                    |
| Dependency locking       | ✅ Yes | yarn.lock with immutable installs                    |
