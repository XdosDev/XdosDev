# Brevo enquiry notifications: preparation and staged release

Prepared against the source tree of `main` commit
`8d9c6c784d481fd510aa090b6dec3fa32c1bfa6f`. The known-good production version was
reported as `042855fe`; verify and record its **full version ID** before any
release. Do not discard or replace that deployment during preparation.

## Behaviour

Contact, general enquiry, demo, waitlist and chat forms POST to `/api/contact`.
The Worker sends one transactional notification to **admin@xdosdev.com**, from
verified **noreply@xdosdev.com**, with the visitor as **Reply-To**. The recipient
inbox is hosted by **Zoho Mail**. It never creates
marketing contacts or sends visitor acknowledgements. The idea-builder remains
an email draft. Brevo acceptance is not proof of inbox delivery.

Sending is disabled in the prepared configuration. **Do not merge or promote it
as-is**: the new form actions need the fully configured Worker. No credentials,
external resources, database, DNS records, account settings, live version or real
email have been created or changed by this preparation.

## Required setup, with explicit authorization

1. The user reports that **noreply@xdosdev.com** is verified in Brevo and that
   **xdosdev.com** DKIM and DMARC are configured. The user approved this sender
   while retaining **admin@xdosdev.com** as the recipient. Recheck the sender and
   domain status before release, and confirm transactional sending is active. Any required DNS
   or account-security changes need separate approval. Use Brevo's exact records;
   preserve MX records and existing mail/security configuration. Inspect Brevo's
   API IP restrictions for compatibility with distributed Cloudflare egress; never
   silently disable them.
2. The user reports creating a Brevo API key with transactional email access
   and a managed Turnstile widget for **xdosdev.com**. The public site key
   **0x4AAAAAAF39C6wqWuPC49fr** is recorded in `TURNSTILE_SITE_KEY`.
   Cloudflare authorizes all subdomains of a listed hostname, so this covers
   **www.xdosdev.com** without another entry. The Worker independently permits
   only those two exact hosts. Verify the widget settings and keep pre-clearance
   disabled. Its private key is `TURNSTILE_SECRET_KEY`; the Brevo key is
   `BREVO_API_KEY`. These user-reported resources have not been inspected here,
   and no secrets have been received. The API key is
   not an SMTP password. Never paste secrets into chat, source, build output,
   `wrangler.jsonc`, screenshots or logs.
3. The user reports creating dedicated D1 database **xdosdev-contact-budget**
   in **ENAM**, with ID **2155d463-841f-401d-b28b-d805151719fb**. That actual
   returned ID is recorded as **CONTACT_BUDGET_DB**. Its purpose is **aggregate
   send-budget counters only**, not lead storage. Confirm the account/database
   identity, then apply `schema/contact-budget.sql` once. Schema initialization
   and live binding operation have not been verified here. Reapplying the schema
   preserves existing counters. Do not create a duplicate database. Never invent an ID,
   allow upload-time auto-provisioning, or use the production site's other
   databases. Confirm budget writes use the primary database, not a replica/cache.
4. Approve the proposed limits: **20 attempted sends per UTC hour and 100 per UTC
   day for this website endpoint**. These are conservative preparation defaults,
   not inferred user volume requirements. Adjust `CONTACT_HOURLY_LIMIT` and
   `CONTACT_DAILY_LIMIT` if needed. Also confirm the proposed per-IP rate-limit
   namespace `107202601` is unused or intentionally dedicated to this endpoint.
5. Review the privacy notice and provider retention/transfer arrangements. The
   notice retains **historical Formspree** processing until old submissions are
   reviewed and deleted appropriately; do not assume a provider switch deletes
   old records. New submissions use Brevo, Zoho Mail hosts the recipient inbox,
   Turnstile protects forms, and D1 stores only aggregate counters. Confirm Brevo
   and Zoho retention match the site's stated policy before publication.
6. Assign an operator to watch Brevo transactional logs, bounces/blocks, account
   quota, and Cloudflare form failures. The application emits only the fixed
   operational event `contact_send_budget_unavailable` when a reservation cannot
   be made, never submitted fields or credentials. Configure an approved alert
   for that event and elevated 5xx errors if available. **No alert or monitoring
   automation has been configured by this patch.** Real delivery monitoring and
   message-ID retention/webhook processing are not implemented.

## D1 setup in the administrator's WSL terminal

The following commands are verified against Wrangler **4.86.0**. They are
instructions only: this preparation has not executed any remote D1 operation.
The user has already created **xdosdev-contact-budget** as recorded above;
**skip the creation command** for this setup. The creation notes below are
retained for reference, not as a request to create another database.
Use the existing site's directory and the same Cloudflare account as the
**xdosdev** Worker. First inspect the account's D1 databases and plan/usage:

```bash
npx wrangler@4.86.0 d1 list
```

This is read-only. If the dedicated name below already exists, inspect it and
its purpose before proceeding; never reuse or delete an unrelated database.
After approval to create one dedicated database, run:

```bash
npx wrangler@4.86.0 d1 create xdosdev-contact-budget --no-update-config
```

This creates a persistent Cloudflare D1 resource, but does **not** deploy the
Worker, change DNS, send mail or update local configuration. Do not add
`--binding` to this command: in 4.86.0 that option implies a local configuration
write even alongside `--no-update-config`. Stop and record the returned
`database_id`; it is an identifier, not a secret. Do not retry an uncertain
creation blindly: list databases again first. If a paid upgrade or unexpected
agreement/permission is requested, stop and review it.

Once the reviewed patch is present locally, confirm `wrangler.jsonc` contains
binding **CONTACT_BUDGET_DB**, name **xdosdev-contact-budget**, and the returned
ID **2155d463-841f-401d-b28b-d805151719fb**. Keep sending disabled. Check
`schema/contact-budget.sql`, then initialize only the dedicated database:

```bash
npx wrangler@4.86.0 d1 execute xdosdev-contact-budget --remote --file schema/contact-budget.sql
npx wrangler@4.86.0 d1 execute xdosdev-contact-budget --remote --command "SELECT id, utc_day, day_count, utc_hour, hour_count FROM contact_send_budget;"
```

Review the command's target and confirmation before accepting. Initialization
creates one table and one row, with zero counters and initial window values of
`-1`; it stores no visitor data. Reapplying the schema preserves counters. The
second command is a read-only check. Neither command publishes site changes.

As checked on **2026-11-07**, Workers Free includes D1's **5 million rows read
and 100,000 rows written daily**, **5 GB total storage**, and **10 databases**.
Exceeding Free limits blocks database operations rather than charging an
automatic overage. On an existing Paid plan, D1 has included monthly allowances
and usage/storage/database-count overage charges. Account-wide usage counts,
so check the account before promising zero cost. This one-row counter has tiny
normal usage, but the email cap is **not** a hard cap on database reads, HTTP
requests or total Cloudflare charges. Creating it does not require a plan
upgrade when the current account has capacity; do not upgrade automatically.
See the current [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

## Upload-only staging: never implicitly deploy

Keep the site's established upload-then-promote workflow. Ordinary
`wrangler secret put`, ordinary `wrangler deploy`, dashboard Save-and-deploy,
Workers Builds using their default deploy command, and some upload APIs deploy
immediately. **Do not use them to stage this change.** Check the connected GitHub
build/deploy commands before pushing/merging. A draft PR or uploaded version is
not approval to release.

Use an approved current Wrangler version and the existing **xdosdev** Worker.
No Durable Object lifecycle migration is introduced: such migrations would
require an immediate deploy and interfere with this staging/rollback workflow.
The D1 database setup is a separate authorized prerequisite, not a site deploy.

1. Run preparation checks on the disabled configuration:

   ```bash
   node scripts/check-contact-config.mjs --prepare
   ```

2. After the external setup above is verified, prepare a reviewed release
   configuration with `CONTACT_EMAIL_ENABLED` set to the string `true`, the real
   public Turnstile site key, the verified D1 binding, and approved budgets.
   Declare `BREVO_API_KEY` and `TURNSTILE_SECRET_KEY` in `secrets.required` so
   Wrangler rejects missing secret configuration. Do not put their values there.

3. Run all tests below, then the separate release-structure check:

   ```bash
   node scripts/check-contact-config.mjs --release
   ```

   The ordinary test suite works with either flag state. This release check
   catches missing configuration structure; it does **not** prove credentials,
   resources, schema, sender verification, or account settings are correct.

4. In the authorized administrator's secure environment, stage code/assets and
   both secrets together using **`wrangler versions upload --secrets-file`** with
   a private, temporary secrets file outside the repository and public build.
   Do not commit or retain that file. If a separate secret update is needed,
   **`wrangler versions secret put KEY`** creates an undeployed version; inspect
   its returned version and source because it may differ from the code version
   you intended. Never substitute ordinary `wrangler secret put`.

5. Record the **final returned version ID**. Inspect its code/assets, bindings,
   required secrets, sender, budgets and enabled flag, and confirm production
   still serves the previously recorded known-good full version ID. Use no
   credentials in browser previews. Request-hostname checks reject sends through
   `workers.dev`, preview and any non-approved hostname even with a forged Origin.
   Existing route configuration is preserved; no trigger/security changes are
   required to achieve that restriction.

6. Obtain approval to promote **that exact final version ID** and send one clearly
   labelled test notification to **admin@xdosdev.com**. Only then use the explicit
   `wrangler versions deploy` flow selecting that ID at **100% of traffic**. Do not
   use a mixed or gradual old/new deployment: the prior static version has no
   `/api/contact` handler, so the two form flows are not backward-compatible.
   Deploy Worker and assets as the same version, not static assets alone. No setup command above grants this
   release approval.

7. Confirm actual inbox receipt, spam placement and Reply-To. Check contact,
   product demo, waitlist and chat after release. Inspect Brevo logs for bounced,
   blocked or queued mail; a 201/202 alone is insufficient. Keep the known-good
   full version available until these checks pass.

## Safeguards and realistic limitations

- Fixed recipient/sender/subject, escaped content, size/field limits, rejected
  attachments and unknown/duplicate fields, server-only secrets, no payload logs.
- Both request URL and browser Origin must be approved HTTPS production hosts.
  Origin is not authentication. Scripts can forge it, so it is only one layer.
- Every real submission requires a server-verified, single-use Turnstile token
  with matching source hostname and action `contact`. A fresh token is acquired
  on each retry. Blocked/failed challenges never send. Turnstile is not infallible.
- Existing honeypot plus an approximate per-IP limiter remain. Shared networks
  can be limited. A single **atomic D1 UPDATE** reserves budget before each Brevo
  attempt, using the database clock, making the website-wide caps independent of
  IPs, edge clocks and Cloudflare edge locations. Missing schema/binding, database failure or exhausted budget fail
  closed. Failed/uncertain sends consume capacity; reservations are not refunded.
  Caps are UTC fixed windows, so traffic can straddle a boundary. This limits only
  this endpoint's send attempts, not other Brevo consumers, all account charges,
  Worker/D1 usage costs, or incoming HTTP volume. Attacks may exhaust the cap and
  temporarily stop genuine submissions; direct email remains the fallback.
- Browser helper keeps a stable UUID for retries of unchanged content during the
  same page session. Brevo receives it as `idempotencyKey`; its deduplication has
  a limited provider-defined window. Page reloads, changed content or later
  retries can still duplicate mail. No automatic retry is performed.
- Timeouts/provider 5xx/network failures say the send **could not be confirmed**,
  not that it definitely failed. A duplicate-id response is not labelled new
  delivery. Form/chat text remains available for the visitor.
- JavaScript is required for Turnstile. With JavaScript disabled, forms/chat are
  hidden and a direct **info@xdosdev.com** email link is shown. Unprotected native
  form submissions are not an alternative route. This is a deliberate change
  from Formspree's native no-JavaScript flow and requires acceptance at release.
- Notification email is not a submission database. No delivery receipt record,
  durable lead copy, automatic retries, campaign subscription or bounce handler
  is implemented. Inbox receipt and operator monitoring remain release checks.

## Verification without live credentials

```bash
node build.mjs
python3 tests/static.py
python3 tests/budget.py
node --check worker/contact.mjs
node --check worker/budget.mjs
node --check src/assets/script.js
node --check src/assets/homepage.js
node --test tests/contact.mjs tests/contact-config.mjs tests/contact-client.mjs
```

API tests inject fake Brevo and Turnstile transports. Budget tests execute the
exact SQL against local SQLite, including concurrent cap enforcement. Client
helper tests use a local simulated DOM. None proves live D1/Cloudflare behaviour.

For full browser checks, serve `public/` locally and use approved Playwright and
Chromium, then run `tests/contact-browser.cjs`, `tests/homepage.cjs` and
`tests/film-controls.cjs`. `TEST_BASE_URL` overrides `http://127.0.0.1:8787`.
These suites mock challenges and email, and block external requests. They have
not run successfully here: this executor blocks Chromium's socket creation.
Real Turnstile interaction, production binding behaviour, uploaded bundle and
live inbox delivery still need verification in an authorized environment.

## Rollback

Promote the recorded known-good full version ID after explicit rollback approval.
No Worker lifecycle migration is added, and no existing resources are deleted.
Turning the flag off only stops Brevo sends; it is not a Formspree fallback.
Never automatically forward an uncertain submission through a second provider.
Do not delete historical Formspree records or the quota database during rollback.

## Official references

- [Brevo transactional API](https://developers.brevo.com/reference/send-transac-email)
- [Brevo idempotency](https://developers.brevo.com/docs/heterogenous-versions-batch-emails)
- [Cloudflare secrets and staged versions](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/)
- [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Turnstile hostname and subdomain rules](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/)
- [Rate-limit scope](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

- [D1 primary-write routing](https://developers.cloudflare.com/d1/best-practices/read-replication/)
