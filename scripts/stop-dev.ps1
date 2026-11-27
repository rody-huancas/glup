# pnpm dev:stop: closes what development left running, and nothing else. Chosen by the path of each
# program, never by its name: the installed Glup (where NSIS puts it, e.g. AppData\Local\Glup or
# AppData\Local\Programs\Glup) is also glup.exe and is never touched.
#
#   - glup.exe and glup-voz.exe that run from this repo's target folder (pnpm dev, cargo, tauri build --debug)
#   - the node of `pnpm dev` / `tauri dev` / Vite started from this repo
#
#   pnpm dev:stop          closes them
#   pnpm dev:stop -DryRun  only lists them
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$repo   = (Join-Path $PSScriptRoot '..' | Resolve-Path).Path.TrimEnd('\') + '\'
$target = Join-Path $repo 'apps\desktop\src-tauri\target\'

$inside = { param($path, $folder) $path -and $path.StartsWith($folder, [StringComparison]::OrdinalIgnoreCase) }

$found = Get-CimInstance Win32_Process | Where-Object {
  $path = $_.ExecutablePath
  $line = $_.CommandLine
  $dev  = ($_.Name -in 'glup.exe', 'glup-voz.exe') -and (& $inside $path $target)
  $node = ($_.Name -eq 'node.exe') -and $line -and ($line.IndexOf($repo, [StringComparison]::OrdinalIgnoreCase) -ge 0) -and ($line -match 'tauri(\.js)?"?\s+dev|vite|pnpm\.cjs"?\s+(--filter\s+\S+\s+)?(tauri\s+)?dev')
  $dev -or $node
}

if (-not $found) {
  Write-Output 'No hay nada de desarrollo corriendo.'
  exit 0
}

foreach ($process in $found) {
  $what = if ($process.ExecutablePath -and $process.Name -ne 'node.exe') { $process.ExecutablePath } else { $process.CommandLine }
  if ($DryRun) {
    Write-Output "Cerraría $($process.ProcessId): $what"
  } else {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Output "Cerré $($process.ProcessId): $what"
  }
}
