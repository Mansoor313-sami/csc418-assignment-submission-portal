param([Parameter(Mandatory=$true)][string]$Endpoint,[string]$Method='GET',[string]$BodyFile)
$ErrorActionPreference='Stop'
$env:GCM_INTERACTIVE='never'
$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
if ($LASTEXITCODE -ne 0) {throw 'GitHub sign in is required.'}
$credentialMap=@{}
foreach($line in $credentialLines){$pair=$line -split '=',2;if($pair.Length -eq 2){$credentialMap[$pair[0]]=$pair[1]}}
$headers=@{Authorization='Bearer '+$credentialMap['password'];'User-Agent'='CSC418-Portal';Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$options=@{Uri='https://api.github.com/'+$Endpoint.TrimStart('/');Method=$Method;Headers=$headers}
if($BodyFile){$options.Body=[System.IO.File]::ReadAllText((Resolve-Path $BodyFile));$options.ContentType='application/json'}
$response=Invoke-RestMethod @options
if($null -ne $response){$response | ConvertTo-Json -Depth 30}
