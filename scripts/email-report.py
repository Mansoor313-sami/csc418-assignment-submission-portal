"""Send actual test results and JSON attachment using SMTP environment settings."""
import json, os, smtplib, ssl
from email.message import EmailMessage
from pathlib import Path

report_path = Path('reports/test-report.json')
report = json.loads(report_path.read_text())
required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'REPORT_EMAIL_TO']
missing = [key for key in required if not os.getenv(key)]
if missing:
    raise SystemExit('Missing email configuration: ' + ', '.join(missing))
message = EmailMessage()
submission = report.get('submission') or {}
title = ' '.join(submission.get('title', 'Portal CI').split())[:80]
message['Subject'] = f"[{report['overall_status'].upper()}] {title} | {report['pipeline_run_id']}"
message['From'] = os.getenv('SMTP_FROM') or os.environ['SMTP_USER']
message['To'] = os.environ['REPORT_EMAIL_TO']
lines = [f"Tested portal repository: {report['repository']}", f"Branch: {report['branch']}", f"Commit: {report['commit_sha']}", f"Run: {report['pipeline_run_id']}", f"Result: {report['overall_status'].upper()}", f"Total: {report['total']} | Passed: {report['passed']} | Failed: {report['failed']}", '']
if submission:
    lines = [f"Student: {submission['name']}", f"Registration: {submission['registration']}", f"Assignment: {submission['title']}", f"Submitted link: {submission['url']}", f"Submission ID: {submission['id']}", '', 'Scope: These results test the assignment portal using the submitted details. They do not test code inside the linked repository.', ''] + lines
for test in report['tests']:
    lines.append(f"{test['result'].upper()}: {test['name']}")
    if test.get('failure_message'):
        lines.append(test['failure_message'])
message.set_content('\n'.join(lines))
message.add_attachment(report_path.read_bytes(), maintype='application', subtype='json', filename='test-report.json')
port = int(os.getenv('SMTP_PORT', '587'))
if port == 465:
    connection = smtplib.SMTP_SSL(os.environ['SMTP_HOST'], port, context=ssl.create_default_context(), timeout=30)
else:
    connection = smtplib.SMTP(os.environ['SMTP_HOST'], port, timeout=30)
    connection.starttls(context=ssl.create_default_context())
with connection as smtp:
    smtp.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
    smtp.send_message(message)
print(f"Email sent for {report['overall_status']} run {report['pipeline_run_id']}")
