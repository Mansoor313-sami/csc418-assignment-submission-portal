# Use the existing Windows Git credential without writing it to the project.
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$CliArgs)
$ErrorActionPreference='Stop'
$env:GCM_INTERACTIVE='never'
$lines="protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
foreach($line in $lines){if($line.StartsWith('password=')){$env:GH_TOKEN=$line.Substring(9)}}
if(!$env:GH_TOKEN){throw 'Sign in to GitHub first.'}
try { & "$PSScriptRoot/../tools/gh/bin/gh.exe" @CliArgs; $result=$LASTEXITCODE } finally {Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue}
exit $result
