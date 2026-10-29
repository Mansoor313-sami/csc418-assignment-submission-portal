# Verified midterm demonstration

Completed on 29 October 2026. These were separate pushes to `main`; the tests
were executed by GitHub Actions for each pushed revision.

| Demonstration | Commit | Run ID | Tests | Pipeline | Pages | Email |
| --- | --- | --- | --- | --- | --- | --- |
| Working portal | 6a76b9773084550ee1c4f925ee9298b1ba8d982c | 40879585847 | 8 passed, 0 failed | Success | Deployed | Received |
| Deliberate registration defect | 8adcc0efb5c969951d8d3bd2da1b2a9776cb4356 | 40879892173 | 6 passed, 2 failed | Failure | Skipped | Received |
| Corrected validation | bb9803d53667dc726376aac3644e84e7504b3273 | 40880075026 | 8 passed, 0 failed | Success | Deployed | Sent by CI |

## Run links

- Passing: https://github.com/Mansoor313-sami/csc418-assignment-submission-portal/actions/runs/40879585847
- Failing: https://github.com/Mansoor313-sami/csc418-assignment-submission-portal/actions/runs/40879892173
- Corrected: https://github.com/Mansoor313-sami/csc418-assignment-submission-portal/actions/runs/40880075026
- Live portal: https://mansoor313-sami.github.io/csc418-assignment-submission-portal/

## What failed and why

The deliberate defect skipped required-field validation for the registration
number. The missing-registration test and the whitespace-required-fields test
failed. The test command exited with code 1. The tests were not changed.
Report delivery, email delivery, and report artifact upload still ran.

## Automatic local delivery

The local receiver saved these reports through HTTP POST requests from CI:

- `report-history/40879585847-1-passed.json`
- `report-history/40879892173-1-failed.json`
- `report-history/40880075026-1-passed.json`

The receiver also updated `test-report.json` after each request. The CI reports
were not manually downloaded or copied. Each saved report includes its received
timestamp and matches the run ID and commit SHA from Actions.

## Pages protection

Before and after the failed push, the latest Pages deployment ID remained
`7413121938` for commit `6a76b9773084550ee1c4f925ee9298b1ba8d982c`.
The published `portal.mjs` still matched that tested revision. The failed run's
deployment job was skipped. The corrected push then deployed successfully.

## Keep these running for the viva

The local receiver and its SSH tunnel must remain running. If the tunnel is
restarted, replace the `REPORT_RECEIVER_URL` Actions secret with its new HTTPS
address before pushing. See README.md for setup and commands.
