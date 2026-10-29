param([string]$Repository='Mansoor313-sami/csc418-assignment-submission-portal')
$ErrorActionPreference='Stop'
$env:GCM_INTERACTIVE='never'
$lines="protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
foreach($line in $lines){if($line.StartsWith('password=')){$env:GH_TOKEN=$line.Substring(9)}}
try {
  foreach($line in Get-Content "$PSScriptRoot/../.env"){
    if($line -match '^([A-Z_]+)=(.*)$'){
      $key=$Matches[1];$value=$Matches[2].Trim()
      if($value -and $key -ne 'REPORT_EMAIL_TO') {
        if($key -eq 'SMTP_PASSWORD'){$value=$value.Replace(' ','')}
        $value | & "$PSScriptRoot/../tools/gh/bin/gh.exe" secret set $key --repo $Repository
        if($LASTEXITCODE -ne 0){throw "Could not configure $key"}
        Write-Output "Configured secret: $key"
      }
    }
  }
} finally {Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue}
