# Secure Software Development Lifecycle (SSDLC)

**Organisation:** Meetwith (appcalipse/meetwith)
**Document version:** 1.0
**Last updated:** 2026-03-23

---

## 1. Overview

Meetwith operates a fully automated Secure Software Development Lifecycle (SSDLC) enforced through GitHub Actions CI/CD pipelines. No code can reach a production environment without passing every security and quality gate defined below. This document describes the process, tooling, and evidence of compliance.

---

## 2. Development Workflow

### 2.1 Branch Strategy

| Branch     | Environment       | Protection                         |
| ---------- | ----------------- | ---------------------------------- |
| `develop`  | Preview (staging) | All CI jobs must pass before merge |
| `pre-prod` | Pre-production    | All CI jobs must pass before merge |
| `main`     | Production        | All CI jobs must pass before merge |

All changes are introduced via Pull Requests. Direct pushes to protected branches are not permitted.

### 2.2 Pipeline Overview

Every Pull Request triggers the `test.yml` workflow. Every merge to `develop`, `pre-prod`, or `main` triggers the `deploy.yml` workflow. The deploy job has an explicit `needs: [coverage, e2e, sast]` dependency — **deployment is blocked unless all three jobs succeed**.

```
Pull Request / Push to protected branch
        │
        ├─── coverage job   ──── Unit tests + coverage gate (Jest, 177 suites)
        │
        ├─── e2e job        ──── End-to-end browser tests (Playwright, Chromium)
        │
        ├─── sast job       ──── Static Analysis (Semgrep, 116,585 rules)
        │
        └─── deploy job     ──── Only runs if ALL above pass ✓
```

---

## 3. Security Gates

### 3.1 Static Application Security Testing (SAST)

- **Tool:** Semgrep (official `semgrep/semgrep` Docker image)
- **Trigger:** Every Pull Request and every push to a protected branch
- **Scope:** 1,109 source files scanned per run
- **Rules applied:** 116,585 Semgrep rules
- **Policy:** Any finding classified as **blocking** prevents deployment. Non-blocking findings are triaged in Semgrep Cloud Platform.
- **Results dashboard:** `https://semgrep.dev/orgs/meetwith/findings`

#### Evidence — run on 2026-03-23 (commit `e5c0f46`, branch `develop`)

```
• Findings:       171  (0 blocking)
• Rules run:      116,585
• Targets scanned: 1,109
• Exit code:      0  ✓  (no blocking findings — pipeline continued to deploy)
```

### 3.2 Dependency & Supply-Chain Scanning

Semgrep supply-chain scanning runs in the same job, covering third-party dependencies for known vulnerabilities. Results are available at:
`https://semgrep.dev/orgs/meetwith/supply-chain/vulnerabilities`

### 3.3 Secret Management

All application secrets (API keys, database credentials, OAuth client IDs and secrets) are managed exclusively through **Doppler**. The Doppler CLI is installed at the start of every CI job. Secrets are injected at runtime via `DOPPLER_TOKEN` (stored as GitHub Actions encrypted secrets) and are never committed to the repository. This is enforced at the infrastructure level — there are no plaintext secrets in any source file or workflow definition.

---

## 4. Quality Gates

### 4.1 Unit & Integration Tests

- **Framework:** Jest (Node.js 20.17.0)
- **Latest result (2026-03-23):**

```
Test Suites:  177 passed,  177 total
Tests:        3,984 passed,  1 skipped,  0 failed,  3,985 total
Snapshots:    0 total
```

All 177 test suites must pass before a deployment proceeds.

### 4.2 End-to-End Tests

- **Framework:** Playwright (Chromium)
- **Scope:** Full browser-level flows including authentication, scheduling, API-level signup, and error handling
- **Latest result (2026-03-23):** 20 passed in 4.6 minutes

Selected E2E test cases:

- `signup.spec.ts` — wallet signup, cookie validation, authenticated redirect
- `schedule-meeting.spec.ts` — grid navigation, Jitsi scheduling, multi-participant scheduling, 409 conflict handling, empty-data rejection

### 4.3 Linting & Type Checking

The PR workflow runs:

- `yarn lint` — Biome static linter (see `biome.json`)
- `yarn typecheck` — TypeScript strict-mode type checking (`tsconfig.json` with `"strict": true`)

Both must pass before the build step is attempted.

### 4.4 Build Verification

`yarn build` is executed as part of every PR and deployment pipeline to ensure the application compiles successfully against the current state of the codebase before any test or deployment proceeds.

---

## 5. Deployment Process

Deployments are performed via **AWS Copilot** to Amazon ECS (region `eu-west-1`). The process is:

1. All gate jobs (`coverage`, `e2e`, `sast`) complete successfully.
2. The `deploy` job provisions the correct environment based on the source branch:
   - `develop` → Preview environment
   - `pre-prod` → Pre-production environment
   - `main` → Production environment
3. AWS credentials are injected via GitHub Actions secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
4. A Discord notification is sent to the engineering team upon completion, including deployment status, environment, deploying actor, and a link to the GitHub Actions run.

#### Evidence — deployment on 2026-03-23

```
Environment:   🧪 Preview
Status:        ✅ Successful
Deployed by:   Onyelaudochukwuka
Run:           https://github.com/appcalipse/meetwith/actions/runs/23437202813
```

---

## 6. Error Monitoring & Incident Response

Runtime exceptions and security-relevant errors are captured automatically by **Sentry** (`@sentry/nextjs`). Sentry is integrated at:

- API route level — all Zoom OAuth and meeting creation handlers
- Client-side — Next.js page-level error boundaries
- Edge middleware — via `sentry.edge.config.ts`

Sentry is enabled only in the production environment (`NEXT_PUBLIC_ENV === 'production'`) to ensure signal quality.

---

## 7. Infrastructure Security

| Control             | Implementation                                                                      |
| ------------------- | ----------------------------------------------------------------------------------- |
| Container isolation | Docker (AWS ECS via Copilot)                                                        |
| Secret injection    | Doppler CLI — runtime only, never in source                                         |
| Network             | AWS VPC with Copilot-managed environments                                           |
| HTTPS               | Enforced at load balancer level                                                     |
| Database            | Supabase (PostgreSQL) with row-level security and encrypted credentials             |
| Token storage       | OAuth tokens stored encrypted in Supabase; never logged or exposed in API responses |

---

## 8. Responsible Disclosure

Security issues may be reported to the engineering team via the Meetwith Discord server or by contacting the maintainers directly through the repository. Reported vulnerabilities are triaged within 72 hours.

---

## 9. Summary

| SSDLC Control                        | Status                            |
| ------------------------------------ | --------------------------------- |
| SAST on every commit                 | ✅ Semgrep (116,585 rules)        |
| Supply-chain scanning                | ✅ Semgrep supply-chain           |
| Unit & integration tests             | ✅ 3,984 tests, 177 suites        |
| End-to-end browser tests             | ✅ Playwright, 20 flows           |
| Linting & type safety                | ✅ Biome + TypeScript strict      |
| Build gate                           | ✅ yarn build required            |
| Secret management                    | ✅ Doppler (no secrets in code)   |
| Deployment gate (all jobs must pass) | ✅ `needs: [coverage, e2e, sast]` |
| Runtime error monitoring             | ✅ Sentry                         |
| Infrastructure isolation             | ✅ AWS ECS + Docker               |
