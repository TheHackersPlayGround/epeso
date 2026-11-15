# Employer portal (option 4: one system, reached through a Cloudflare tunnel)

Employers sign in to their own page and see the applicants the PESO referred to their company, their hires and their
company details, and can **ask** the PESO to change a referral status, a placement status, their contact details, or to **add / change / close a job opening**.
Nothing changes in the PESO's records until staff **accept** the request (Employment Facilitation → Employers → **Employer Updates**).

It is **one system**: the same database (`e-peso_db`), the same backend (`epeso_backend`) and the same app (`epeso`).
The employer page is a third page of the app, like the kiosk (`/apply/`) and the staff app (`/`): it is `/employer/`.

```
Employer's browser ── employers.yourdomain ── Cloudflare ── tunnel (outbound from the office) ── Apache vhost :8081 ── ePESO backend ── database
                                                                                            (only the employer page + 2 API modules)
```

## What was added

| Where | What |
|---|---|
| Database (`085_employer_portal.sql`) | `employer_portal_accounts`, `employer_requests`, `employer_login_attempts`, `employer_access_log` |
| Database (`086_employer_vacancy_requests.sql`, run after 085) | job-opening requests: `vacancies.source` ('Staff' / 'Employer'), `employer_requests.vacancy_id` / `created_vacancy_id`, two new request types |
| Database (`087_referral_shared_documents.sql`, run after 085) | `referral_shared_documents` (which uploaded Employment Facilitation documents the PESO sent to the employer for a referral) and `employer_access_log.document_id` |
| Database (optional, **required before going public**: `employer_db_role.sql`) | a limited account `employer_app` used only by employer requests |
| Backend `modules/` | `employer_accounts.php` (admin: create/reset/deactivate a login), `employer_updates.php` (staff: accept/reject), `employer_auth.php` and `employer_portal.php` (what employers call) |
| Backend `core/` | `public_gate.php` (requests through Cloudflare reach only the employer modules), `employer_session.php`, `ef_actions.php` and `ef_applicant.php` (shared code moved out of `employment.php`, unchanged), `ef_vacancy_rules.php` (the rules for a job opening an employer asks for, used when it is sent and again when staff accept it) |
| Backend existing files | `index.php` (calls the gate), `db.php` (uses the limited account for employer requests), `cors.php` (allows the `X-Portal` header), `employment.php` (the shared code is now in `core/`) |
| App `src/employer/`, `employer/index.html` | the employer page (sign-in, Overview, Referrals, Placements, Vacancies, Company, My Requests) |
| App staff screens | Employers tab → **Employer Updates** (badge + accept/reject) and **Portal Account** in each row's ⋯ menu (administrators) |
| App `vite.employer.config.ts`, `scripts/deploy-employer.ps1` | builds/publishes ONLY the employer page |
| `docs/apache-employer-vhost.conf` | the locked-down public entry the tunnel points at |

## Try it on your computer (no domain needed)

1. In pgAdmin, run `epeso_backend\migrations\085_employer_portal.sql` on `e-peso_db` (safe to run if you already ran the old 084), then `086_employer_vacancy_requests.sql` (job-opening requests) and `087_referral_shared_documents.sql` (attached documents). All are safe to run again.
2. In the staff app: **Employers → ⋯ on a NEW test company → Portal Account → Create account**. Copy the one-time password.
   (Please use a new test employer, not one of your real ones, and refer a test applicant to it from the Referrals tab.)
3. Open `http://localhost:5173/employer/` (the same address the staff app uses, plus `/employer/`). Sign in, choose your own password.
4. Try: open an applicant (Sections I–VIII only; there is no "Referred Program" and no "For PESO Office Only"), send a request, withdraw it, send it again,
   then accept/reject it in the staff app and watch the employer page update.
   Also try the **Vacancies** tab: *Request a new opening*, then *Request changes* on an opening (including setting it to Closed).
   In the staff app the request shows in Employer Updates (with a "possible duplicate" hint if that employer already has an opening with
   the same title); accepting creates/updates the opening, and the staff Vacancies list tags employer-requested ones **Employer request**.
   **Attached documents:** give the test applicant a few uploaded documents (Edit → documents: Resume, Application Letter, a Valid ID). In **Refer**, a "Documents to send to the employer" list appears
   (Resume, Application Letter and Biodata start ticked; nothing else is). Later, Referrals tab → ⋯ → **Shared Documents** changes the choice. On the employer page the applicant view has an
   **ATTACHED DOCUMENTS** section with only the ticked files (View / Download). Each download is recorded in the access log (viewing one on screen counts as viewing the applicant, which is recorded); access ends if the referral becomes **Not Hired** or is deleted, or when staff untick the file.
   Files are streamed by the backend after these checks, never linked from a public folder.
5. Use `localhost` for everything while testing (the sign-in cookie is `SameSite=Lax`, so page and API must be on the same site).

## Before the portal is opened to the internet (required)

1. Run `epeso_backend\migrations\employer_db_role.sql` in pgAdmin **after replacing the placeholder password** with a long random one,
   then add to `epeso_backend\config.php`:
   `'employer_db' => ['host' => 'localhost', 'port' => '5432', 'name' => 'e-peso_db', 'user' => 'employer_app', 'pass' => '<that password>'],`
   Without it the backend answers **503** to anything arriving through Cloudflare (it fails closed). With it, employer requests use a
   database account that cannot read staff accounts/passwords/permissions/logs and cannot change any record except employer requests.
2. Install the public entry: copy `docs\apache-employer-vhost.conf` to `C:\xampp\apache\conf\extra\httpd-employer.conf`, add
   `Include conf/extra/httpd-employer.conf` at the end of `httpd.conf`, set `ServerTokens Prod`, restart Apache. It listens on
   **127.0.0.1:8081 only**. **The tunnel must point at 8081, never at 8080** (8080 serves all of `htdocs`).
3. Publish the page: `powershell -ExecutionPolicy Bypass -File scripts\deploy-employer.ps1` (builds only the employer page into
   `C:\xampp\htdocs\epeso_employer_public`). Check `http://localhost:8081/employer/`.
4. (Optional) in `config.php` add `'employer_public_hosts' => ['employers.yourdomain'],` so requests for that host name are treated as public too.

## Cloudflare steps (when you have a domain)

1. Put the domain on Cloudflare (nameservers). Make a subdomain plan: `employers.yourdomain`.
2. Zero Trust → Networks → Tunnels → create a tunnel, install `cloudflared` on the office server **as a Windows service**.
3. Public hostname `employers.yourdomain` → service `http://localhost:8081`.
4. (Optional, recommended) Zero Trust → Access → self-hosted application for `employers.yourdomain` with a policy that allows only the
   employers' email addresses (one-time code). It adds a login before the page loads; skip it if employers find it annoying.
5. Cloudflare → Security → rate-limit `/epeso_backend/api/employer_auth/login` (for example 10 per minute per visitor), turn on Bot Fight Mode,
   "Always use HTTPS".
6. Test from a phone on mobile data: the page loads, an employer can sign in, `https://employers.yourdomain/epeso_backend/api/auth/login` answers 404.

**Without a domain** you can still try the tunnel from outside with a temporary address (`cloudflared tunnel --url http://localhost:8081`):
random address, no login gate, **fake data only**, stop it afterwards.

## How it stays safe

- Employer accounts are in their own table and cookie (`EPESOEMPLOYER`): an employer session never satisfies a staff check, and a staff cookie never works on employer routes.
- Every employer query is scoped by the signed-in account's company (from the session, never from the browser); an applicant opens only if referred to / hired by that company; every opening is logged (`employer_access_log`).
- Sections I–VIII only. Section IX (referred program) and Section X (date applied, received by, uploaded documents, photo) are never returned.
- Sign-in: hashed passwords, forced change at first login, lockout after 5 wrong passwords per username (25 per visitor address) for 15 minutes, 2-hour idle limit, switched-off account/company cut off on the next request.
- Writes need the `X-Portal` header (plus SameSite cookies and one allowed CORS origin); responses are `no-store`; an unexpected error shows the visitor a plain message, never a path or SQL.
- Three layers on the public side: Cloudflare (HTTPS, rate limit, optional email gate) → Apache vhost (only the page and two API modules exist) → backend gate (`public_gate.php`, only employer modules for anything arriving via Cloudflare) → limited database account.

## Good to know

- Employers need the office's internet and server to be up. Staff, the kiosk and everything on the office network keep working with no internet.
- A UPS for the server and router, and `cloudflared` as a Windows service, make outages short.
- Job openings: an employer can have at most 10 new-opening requests waiting at once; an opening can't be lowered below the number of people already hired into it; staff can still create and edit openings by hand exactly as before.

## Removing it

Delete the files listed above, restore `index.php`, `db.php`, `cors.php`, `employment.php` and the three edited app files from git, and run:
`DROP TABLE IF EXISTS employer_access_log; DROP TABLE IF EXISTS employer_login_attempts; DROP TABLE IF EXISTS employer_requests; DROP TABLE IF EXISTS employer_portal_accounts;`
(and `DROP OWNED BY employer_app; DROP ROLE employer_app;` if you created the limited account).
