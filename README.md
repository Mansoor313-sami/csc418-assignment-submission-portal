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

## CI dashboard

Open `http://127.0.0.1:4173/ci.html` after `npm.cmd start`. The navbar also links
to this dashboard. On GitHub Pages, the tab provides a link to the local controller.
The controller requires Windows PowerShell and an existing GitHub sign-in in
Git Credential Manager with permission to update this repository and run Actions.

- **Run Tests** starts the existing GitHub Actions workflow on main.
- **Push Defect** commits a predefined registration-validation defect to main.
- **Push Fix** commits the corresponding correction to main.
- Select an older run to inspect its actual test results and failure messages.
- Local Report Received is shown only when the matching run and attempt exist
  in local report history. Mail Sent follows the GitHub email step's success.
- Deployment status comes from the selected run's deploy job.

Keep the receiver and tunnel running before using these buttons. The controller
binds to loopback, validates Host and Origin, and requires a per-process session
value for mutations. Credentials never enter the browser or static Pages files.
The buttons change GitHub directly; run `git pull --ff-only` before editing the
local checkout again after a demonstration.
