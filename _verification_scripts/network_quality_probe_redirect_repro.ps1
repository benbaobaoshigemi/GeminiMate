$ErrorActionPreference = 'Stop'

$probeUrl = 'https://gemini.google.com/'

function Get-ProbeResult {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('GET', 'HEAD')]
    [string]$Method
  )

  $responseHeaders = $null
  $responseBody = $null
  $statusLine = ''

  $curlArgs = @(
    '--silent'
    '--show-error'
    '--dump-header', '-'
    '--output', 'NUL'
    '--request', $Method
    $probeUrl
  )

  $responseText = & curl.exe @curlArgs
  if ($LASTEXITCODE -ne 0) {
    throw "curl_failed_$Method"
  }

  $lines = @($responseText -split "`r?`n")
  $statusLine = ($lines | Where-Object { $_ -match '^HTTP/' } | Select-Object -Last 1)
  $responseHeaders = @{}
  foreach ($line in $lines) {
    if ($line -notmatch '^\S+:\s+') {
      continue
    }
    $separatorIndex = $line.IndexOf(':')
    $name = $line.Substring(0, $separatorIndex)
    $value = $line.Substring($separatorIndex + 1).Trim()
    $responseHeaders[$name] = $value
  }

  return [pscustomobject]@{
    method = $Method
    statusLine = $statusLine
    location = $responseHeaders['Location']
    contentType = $responseHeaders['Content-Type']
  }
}

$result = [pscustomobject]@{
  probeUrl = $probeUrl
  get = Get-ProbeResult -Method 'GET'
  head = Get-ProbeResult -Method 'HEAD'
}

$result | ConvertTo-Json -Depth 4
