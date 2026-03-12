$ErrorActionPreference = 'Stop'

$report = [ordered]@{
  ps_version = $PSVersionTable.PSVersion.ToString()
  active_code_page = (chcp)
  console_input_encoding = [Console]::InputEncoding.WebName
  console_output_encoding = [Console]::OutputEncoding.WebName
  pipeline_output_encoding = $OutputEncoding.WebName
}

Write-Output '=== Encoding Environment ==='
$report.GetEnumerator() | ForEach-Object { "{0}: {1}" -f $_.Key, $_.Value } | Write-Output

$sample =
  ([char]0x4E2D) + ([char]0x6587) + ([char]0x6B63) + ([char]0x5219) +
  ':' +
  ([char]0x7B2C) + '[\u4E00-\u4E5D]+'

$tmp = Join-Path $env:TEMP 'geminimate-encoding-probe.txt'
Set-Content -Path $tmp -Value $sample -Encoding UTF8

$bytes = [System.IO.File]::ReadAllBytes($tmp)
$decoded = [System.Text.Encoding]::UTF8.GetString($bytes)

if ($decoded -ne "$sample`r`n" -and $decoded -ne $sample) {
  Write-Error 'UTF-8 round-trip failed: file content mismatch.'
}

Write-Output "UTF-8 round-trip OK: $tmp"
