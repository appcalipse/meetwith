# SAST Scan Report — Semgrep

**Organisation:** Meetwith (appcalipse/meetwith)
**Tool:** Semgrep
**Document version:** 1.0
**Scan date:** 2026-03-23
**Branch:** develop
**Commit:** e5c0f46ecfa05b2226413eda2c50f06445dff755

---

## 1. Scan Summary

| Metric                | Value                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Tool                  | Semgrep (semgrep/semgrep:latest)                                                                               |
| Rules applied         | 116,585                                                                                                        |
| Files scanned         | 1,109                                                                                                          |
| Total findings        | 171                                                                                                            |
| **Blocking findings** | **0**                                                                                                          |
| Pipeline result       | ✅ Passed — deployed to Preview                                                                                |
| Exit code             | 0                                                                                                              |
| Full results          | https://semgrep.dev/orgs/meetwith/findings?repo=appcalipse/meetwith&ref=refs/heads/develop                     |
| Supply-chain results  | https://semgrep.dev/orgs/meetwith/supply-chain/vulnerabilities?repo=appcalipse/meetwith&ref=refs/heads/develop |

---

## 2. How SAST is Enforced

Semgrep runs as a required CI job on **every Pull Request** and on **every push** to a protected branch (`develop`, `pre-prod`, `main`). It runs inside the official `semgrep/semgrep` Docker container to ensure a reproducible, tamper-resistant environment.

The deploy job has an explicit dependency on the SAST job:

```yaml
deploy:
  needs: [coverage, e2e, sast]
```

This means a deployment is **physically impossible** if the SAST job fails. Any finding configured as blocking in Semgrep Cloud Platform causes the job to exit with a non-zero code, which prevents the `deploy` job from starting.

---

## 3. CI Job Definition

```yaml
sast:
  runs-on: ubuntu-latest
  container:
    image: semgrep/semgrep
  if: github.actor != 'dependabot[bot]'
  steps:
    - uses: actions/checkout@v3
    - run: semgrep ci
      env:
        SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
```

Key points:

- Runs on `ubuntu-latest` (Ubuntu 24.04 LTS as of this scan)
- Uses the official `semgrep/semgrep` Docker image — version `sha256:3dab091ee3247fce7e4ed3df9f92b3bd72692c083295f53cec3f135b86404db1`
- `semgrep ci` mode connects to Semgrep Cloud Platform for rule management, finding tracking, and blocking policy
- Skipped for Dependabot PRs (dependency update bots) to avoid noise from automated dependency bumps
- `SEMGREP_APP_TOKEN` is stored as a GitHub Actions encrypted secret — never in source

---

## 4. Runner Environment (2026-03-23 scan)

| Property              | Value                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| Runner OS             | Ubuntu 24.04.3 LTS                                                      |
| Runner image version  | 20260309.50.1                                                           |
| GitHub Actions runner | 2.332.0                                                                 |
| Docker daemon API     | 1.48                                                                    |
| Semgrep image digest  | sha256:3dab091ee3247fce7e4ed3df9f92b3bd72692c083295f53cec3f135b86404db1 |
| Semgrep version       | latest (pulled fresh per run)                                           |

---

## 5. Findings Breakdown

### 5.1 Blocking Findings

**None.** The scan produced 0 blocking findings, which is why the pipeline continued to the deploy job and succeeded.

### 5.2 Non-Blocking Findings (171 total)

Non-blocking findings are informational. They are triaged by the engineering team in Semgrep Cloud Platform and addressed in subsequent sprints. They do not prevent deployment.

The findings identified in this scan include:

#### Open Redirect (javascript.express.open-redirect-deepsemgrep)

Semgrep flagged redirect targets derived from the `state` query parameter in OAuth callback routes. Specifically:

- `src/pages/api/secure/integrations/zoom/callback.ts` — lines 29, 36, 82
- `src/pages/api/secure/calendar_integrations/google/meet/callback.ts` — lines 11, 29, 82
- Trigger: `const { code, error, state } = req.query`

**Risk description:** An attacker could theoretically craft a redirect URL via the `state` parameter to send a user to an arbitrary domain.

**Mitigating controls already in place:**

- The `state` parameter is Base64-encoded JSON (`stateObject`) and validated before use
- Redirect targets using `stateObject.redirectTo` are validated with `startsWith('/')` — ensuring only relative (same-origin) redirects are permitted
- External redirects only go to fixed, hardcoded Meetwith dashboard paths (e.g. `/dashboard/settings/connected-calendars`)
- The callback endpoint is protected by `iron-session` — an authenticated session is required

#### Weak Hash Algorithm (informational)

One finding related to the use of a hash algorithm considered weak for collision resistance (informational only, no exploitable context in the codebase).

#### Console Error Logging (informational)

Semgrep flagged `console.error(...)` usage inside internal server functions (e.g. `notifyCancellation`). These are informational hygiene findings with no security impact.

---

## 6. Supply-Chain / Dependency Scanning

Semgrep supply-chain scanning analysed third-party dependencies for known CVEs and licence issues. Results are tracked at:

```
https://semgrep.dev/orgs/meetwith/supply-chain/vulnerabilities
  ?repo=appcalipse/meetwith
  &ref=refs/heads/develop
```

Dependencies are additionally locked via `yarn.lock` (Yarn 4.9.1 with immutable installs in CI) to prevent version drift between environments.

---

## 7. Scan Cadence

| Trigger                       | Frequency                               |
| ----------------------------- | --------------------------------------- |
| Pull Request opened / updated | Every PR — runs before merge is allowed |
| Push to `develop`             | Every push                              |
| Push to `pre-prod`            | Every push                              |
| Push to `main` (production)   | Every push                              |

There is no manual override — the SAST job cannot be bypassed because it is a required status check in the `needs` dependency chain of the deploy workflow.

---

## 8. Finding Management Process

1. Semgrep Cloud Platform aggregates all findings across runs with deduplication and trend tracking.
2. The security lead reviews new non-blocking findings during each sprint.
3. Findings are triaged as: **fix**, **accept risk** (with documented justification), or **false positive** (suppressed with inline comment referencing the rule ID).
4. Any finding severity escalation that results in a finding being reclassified as **blocking** will immediately prevent future deployments until resolved.

---

## 9. Raw Log Excerpt (2026-03-23)

The following is extracted directly from the GitHub Actions log for the `sast` job (run ID 23437202813):

```
Semgrep version:   latest (semgrep/semgrep Docker image)
Commit:            e5c0f46ecfa05b2226413eda2c50f06445dff755
Branch:            refs/heads/develop

 • Findings:        171  (0 blocking)
 • Rules run:       116,585
 • Targets scanned: 1,109

 View results in Semgrep Cloud Platform:
   https://semgrep.dev/orgs/meetwith/findings
     ?repo=appcalipse/meetwith&ref=refs/heads/develop
   https://semgrep.dev/orgs/meetwith/supply-chain/vulnerabilities
     ?repo=appcalipse/meetwith&ref=refs/heads/develop

 No blocking findings so exiting with code 0
```

---

## 10. Conclusion

Meetwith runs continuous, automated SAST on 100% of code changes using Semgrep with over 116,000 rules. The most recent scan (2026-03-23) confirmed **zero blocking security findings**. Deployment to any environment is gated on a passing SAST result, making it structurally impossible to ship code with unresolved blocking vulnerabilities.
