# Assignment Submission Portal

CSC418 DevOps Lab Midterm by Mansoor Ahmad, FA23-BSE-037.

A static assignment portal with automatic tests, a local JSON report receiver,
conditional GitHub Pages deployment, and configurable SMTP email reports.

## Run the portal

Install Node.js 22 or later. No npm packages are required.

```powershell
npm.cmd start
```

Open http://127.0.0.1:4173. Enter your name, registration number, assignment
title, and an HTTP or HTTPS submission URL. Saved submissions appear immediately
and remain after a reload in the same browser. This static demo uses browser
localStorage; it is not a shared department database. File upload is not needed.

## Execute tests

```powershell
npm.cmd test
```

Eight tests execute the same validation and persistence functions used by the
browser. Results are written to `reports/test-report.json`. A failed assertion
returns exit code 1. The three required cases cover valid submissions, a missing
registration number, and an invalid URL. Extra tests check whitespace, unsafe
protocols, multiple records, unchanged storage on rejection, and trimmed values.

## Start the local report receiver

```powershell
$env:REPORT_TOKEN = 'your-long-random-secret'
npm.cmd run receiver
```

Keep it running. It listens on http://127.0.0.1:5055. Completed reports are
received through authenticated `POST /reports`, saved atomically as
`test-report.json`, and archived in `report-history/`. Reports contain repository,
branch, commit SHA, run ID, execution time, individual results, failure messages,
counts, and overall status. `GET /health` confirms readiness. Local browser
views are available at `/`, `/latest`, and `/history`.

## Connect GitHub Actions to this computer

GitHub-hosted localhost is not this computer. Use a tunnel to this receiver:

```powershell
ssh -T -o ServerAliveInterval=15 -R 80:127.0.0.1:5055 nokey@localhost.run
```

Accept the SSH host-key prompt on the first connection. Set repository Actions
secrets `REPORT_RECEIVER_URL` to the printed HTTPS URL
and `REPORT_TOKEN` to the same token as the receiver. Keep both processes running.
Only authenticated POSTs can save results. Evidence-reading routes refuse tunnel
hostnames. Free-tunnel addresses change after restart; update the secret then.
The address is temporary, so check `/health` before each demonstration.
You can also use `cloudflared tunnel --url http://127.0.0.1:5055` as an alternative.
For a local delivery check, set both environment values and run `npm.cmd run deliver`.

## Configure the email bonus

Set these GitHub Actions secrets:

| Secret | Example |
| --- | --- |
| SMTP_HOST | smtp.gmail.com |
| SMTP_PORT | 587 |
| SMTP_USER | Sender account |
| SMTP_PASSWORD | Sender app password |
| SMTP_FROM | Sender account, optional |

Set repository variable `REPORT_EMAIL_TO` to the destination address. For Gmail,
use an app password with two-step verification, not the regular account password.
The script uses TLS and attaches the actual JSON report. It runs after passing
and failing tests using `always()`. Missing SMTP configuration fails visibly.
Python 3 is required to run `scripts/email-report.py` locally.

## Enable the Pages bonus

In repository Settings > Pages, select **GitHub Actions** as the publishing source.
The deployment job requires the successful test job and the `main` branch. It
publishes only `web/`. A failed test skips deployment and preserves the last site.
Every push to any branch triggers tests; `workflow_dispatch` also allows reruns.

## Demonstration sequence

1. Push the working portal to `main`. Show all tests passing, received local JSON,
   the email report, and the deployed page.
2. Temporarily break registration validation in `web/portal.mjs`. Keep the tests
   unchanged. Push to `main`. Show the failed test stage, failed report and email,
   and skipped Pages deployment. Confirm the published revision is unchanged.
3. Restore validation and push again. Show a passing run, updated JSON, email,
   and successful deployment.

Never commit `.env`, passwords, tokens, local report data, or personal submissions.
The receiver must stay online during the demonstration. See `DEMONSTRATION.md`
for the actual verified runs once the demonstration is complete. Open
http://127.0.0.1:5055/dashboard to inspect saved results and select older runs.

## Submission and CI on one page

Open `http://127.0.0.1:4173/` after `npm.cmd start`. Fill in the four fields
and click **Upload**. A valid submission is saved in browser storage and starts
a real GitHub Actions run. The right-hand panel shows that run's results, local
report delivery, email sending, and deployment. This tests the portal code on main;
it does not execute code from the submitted assignment URL.

After the first successful run, three buttons appear below the results:

- **Run Tests** starts another workflow run on main.
- **Push Defect** commits the predefined registration-validation defect to main.
- **Fix Defect and Push** commits the corresponding correction.

The latter two actions require a second click to confirm. Controls remain
available after a failed demonstration so the defect can be fixed. Select an
older run to review its results. Mail sent follows the actual SMTP sending step;
it does not claim that the recipient opened the message.

The local controller requires Windows PowerShell and a GitHub sign-in through
Git Credential Manager with permission to update this repository and run Actions.
Keep the receiver and tunnel running. The GitHub Pages portal can also connect to this local controller on the same page.
Allow local network access if the browser asks. CORS accepts only the local portal
and this account's GitHub Pages origin. Credentials stay on your computer. `/ci.html` redirects to the same single-page portal.

The controller binds to loopback, validates Host and Origin, and requires a
per-process session value for mutations. Credentials never enter browser assets.
The buttons update GitHub directly; run `git pull --ff-only` before editing the
local checkout after a demonstration.

### Submission-specific reports

Upload passes the submitted name, registration, title, URL and submission ID to
the workflow. The valid-submission test uses those entered values. Each JSON
report and email includes the exact submitted link and clearly labels the portal
repository whose validation code was tested. The linked repository's code is not
executed. Defect/fix push runs retrieve their matching submission context from
the authenticated local receiver; context files are excluded from Git and the ZIP.
