# CSC418 implementation and evidence checklist

| Requirement | Implementation | Evidence needed |
|---|---|---|
| Student name, registration, title, URL | web/index.html | Browser form |
| Required fields and URL validation | web/portal.mjs | Missing registration and invalid URL screenshots |
| Save and display submissions | Browser localStorage | Valid submission and reload screenshots |
| GitHub project and README | Repository and README.md | Repository URL and source screenshot |
| Tests on every push | .github/workflows/ci.yml | Three actual push-triggered runs |
| Three required test cases | tests/run.mjs plus five extra checks | Executed results |
| Failure makes test stage fail | npm test exits 1 | Failed CI test step |
| Automatic localhost delivery | receiver/server.mjs and scripts/deliver-report.mjs | Receiver log and JSON history |
| Report metadata and counts | reports/test-report.json | Actual passing and failing reports |
| Pass, defect, fix demonstration | Three separate revisions | Run IDs and SHA mapping |
| Conditional GitHub Pages | deploy job needs successful test job | URL and unchanged deployment during failed run |
| Automatic email both outcomes | scripts/email-report.py | SMTP sending and received messages |
| Documentation | Editable Word report | Rendered and checked pages |
