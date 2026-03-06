## How to run

- Full CI run:
  - `yarn test:ci`
- Coverage run (enforces thresholds from `jest.config.js`):
  - `yarn test:ci --coverage`
- Local coverage:
  - `yarn test:cov`

## Test coverage profile

The suite spans:

- UI/component smoke tests (imports + export checks).
- Hooks validation and render behavior.
- Utilities (helpers, schemas, analytics, storage, etc).
- Services (Google, CalDAV, Office365, Stripe, Discord, Telegram, POAP, Onramp, etc).
- API routes (secure and server endpoints).
- Workers/queues.

## Notable suites and areas

### Component smoke suites

Coverage includes major UI modules:

- `calendar-view`, `schedule`, `profile`, `meeting-settings`, `quickpoll`, `group`, `contact`, `notifications`, `connected-calendars`, `landing`, `billing`, `nav`, `misc-components`, `loading`, `icons`, `og-images`.
  These suites validate imports and exported symbols for large UI surfaces.

### Hooks

`src/hooks` and `src/hooks/availability` are validated for:

- Import stability and expected exports.
- Basic hook behavior using `renderHook`.

### Database layer

Extensive coverage for `src/utils/database.ts`:

- initialization, query chaining, edge cases.
- subscription lifecycle functions.
- availability blocks, quickpoll, group management.
- payment preferences and related error handling.

### Services

High-coverage on:

- Calendar services: Google, Office365, CalDAV, WebCal.
- Messaging: Discord, Telegram.
- Payments: Stripe, OnRamp Money.
- Auth/crypto: wallet-kit, cryptography helpers.
- Utilities: retry service, calendar helpers, analytics.

### API endpoints

Large API surface tested (secure/server/quickpoll/etc). Many suites include explicit error path validation.

## Observed runtime behavior

### Expected console noise

The log includes deliberate error/console output from negative tests and mock errors. Examples:

- `secp256k1 unavailable, reverting to browser version` from `eccrypto` (appears repeatedly).
- Controlled `console.error` from API/service error-path tests (Stripe, billing, meetings, subscriptions, group invites, etc).
- Controlled `console.warn` from retry logic and service fallbacks (API retries, CalDAV/Google fetch fallbacks).
- `Connected to Ably!` info logs from pub-sub helper tests.

These are expected given the tests intentionally trigger error handling paths.

### Known noisy areas to expect

- Google Calendar service tests: repeated `Google Calendar API error: Not found`.
- CalDAV service tests: repeated `Failed to fetch events...` warnings during fallback/error flows.
- API helper tests: `API call failed, retrying...` for retry scenarios.
- Stripe/ billing endpoints: error logs on mocked failures.

## Recommendations (hard requirements for stability)

1. **Keep error-path logs deterministic.**
   Tests rely on consistent error handling paths; ensure logging structure doesn’t change without updating snapshots/expectations.

2. **Avoid introducing nondeterminism in service tests.**
   Any new network-touching logic must remain mocked; flakiness will show up as intermittent retries/timeouts.

3. **Limit noisy logs in CI.**
   If CI log size becomes an issue, consider silencing expected warnings/errors in tests via mock console wrappers _only_ for the specific suites.

4. **Maintain coverage thresholds.**
   Coverage gates are currently enforced globally in `jest.config.js`. Any new file additions must include coverage or be explicitly excluded.

## Quick reference: file groups covered

- Components: `src/__tests__/components/**`
- Hooks: `src/__tests__/hooks/**`
- Utils: `src/__tests__/utils/**`
- API routes: `src/__tests__/pages/api/**`
- Services: `src/__tests__/utils/services/**`
- Workers: `src/__tests__/utils/workers/**`

## Failure diagnosis hints

- If failures are in `services/*` tests, inspect mocked client behavior and error scenarios.
- If failures are in `pages/api/*`, verify request parameter validation and error mapping.
- If failures are in smoke tests, verify exports and index barrels did not change.

## Notes

- The test log indicates the suite currently passes despite extensive `console.error`/`console.warn` output.
- Those logs are largely intentional and reflect validated error handling behavior.
