# Frees space in target without losing the incremental build: deletes what Cargo has not used in the
# last days, folder by folder, in build/ (one folder per crate and build: build/<crate>/<hash>) and in
# incremental/. Cargo rebuilds anything missing, so at worst a crate compiles again.
#
# "Used" is the newest access or write time of any file in the folder: Cargo reads the fingerprint of
# every crate on each build, even when it does not recompile it, and Windows keeps access times on C:.
#
# Usage: pnpm sweep (deletes) · pnpm sweep:dry (only lists what it would delete and how much).
param(
  [int]    $Days   = 3,
  [switch] $DryRun,
  [string] $Target = (Join-Path $PSScriptRoot '..\apps\desktop\src-tauri\target')
)

$ErrorActionPreference = 'Stop'

function Format-Size([double] $Bytes) {
  if ($Bytes -ge 1GB) { return '{0:N2} GB' -f ($Bytes / 1GB) }
  return '{0:N0} MB' -f ($Bytes / 1MB)
}

function Format-Folders([int] $Count) {
  if ($Count -eq 1) { return '1 carpeta' }
  return "$Count carpetas"
}

# The last time Cargo touched anything in the folder, and what it all weighs.
function Get-FolderUse([string] $Path) {
  $files = @(Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue)
  $last  = [datetime]::MinValue
  $bytes = 0

  foreach ($file in $files) {
    $bytes += $file.Length
    if ($file.LastAccessTime -gt $last) { $last = $file.LastAccessTime }
    if ($file.LastWriteTime -gt $last) { $last = $file.LastWriteTime }
  }

  if ($files.Count -eq 0) { $last = (Get-Item -LiteralPath $Path -Force).LastWriteTime }
  [pscustomobject]@{ Path = $Path; LastUse = $last; Bytes = $bytes }
}

if (-not (Test-Path -LiteralPath $Target)) {
  Write-Host "No hay carpeta target en ${Target}: no hay nada que limpiar."
  exit 0
}

$Target = (Resolve-Path -LiteralPath $Target).Path
if ((Split-Path $Target -Leaf) -ne 'target') {
  Write-Host "Esto no parece una carpeta target de Cargo: $Target"
  exit 1
}

# While Cargo builds, its folders are in use: better to sweep afterwards.
if (Get-Process cargo, rustc -ErrorAction SilentlyContinue) {
  Write-Host 'Cargo está compilando (quizá tauri dev). Vuelve a correrlo cuando termine.'
  exit 1
}

$limit   = (Get-Date).AddDays(-$Days)
$folders = @()

# Every profile folder (debug, and release if there is one) has its build/ and incremental/.
foreach ($profileDir in Get-ChildItem -LiteralPath $Target -Directory -Force) {
  $build       = Join-Path $profileDir.FullName 'build'
  $incremental = Join-Path $profileDir.FullName 'incremental'

  if (Test-Path -LiteralPath $build) {
    foreach ($crate in Get-ChildItem -LiteralPath $build -Directory -Force) {
      $folders += @(Get-ChildItem -LiteralPath $crate.FullName -Directory -Force | ForEach-Object { $_.FullName })
    }
  }

  if (Test-Path -LiteralPath $incremental) {
    $folders += @(Get-ChildItem -LiteralPath $incremental -Directory -Force | ForEach-Object { $_.FullName })
  }
}

$stale = @($folders | ForEach-Object { Get-FolderUse $_ } | Where-Object { $_.LastUse -lt $limit } | Sort-Object Bytes -Descending)
$total = ($stale | Measure-Object Bytes -Sum).Sum
if (-not $total) { $total = 0 }

if ($stale.Count -eq 0) {
  Write-Host "Todo lo de target se usó en los últimos $Days días: no hay nada que borrar."
  exit 0
}

if ($DryRun) {
  Write-Host "Modo de prueba: borraría $(Format-Folders $stale.Count) sin usar hace más de $Days días ($(Format-Size $total)):"
  foreach ($folder in $stale) {
    $relative = $folder.Path.Substring($Target.Length + 1)
    Write-Host ('  {0,10}  {1:yyyy-MM-dd}  {2}' -f (Format-Size $folder.Bytes), $folder.LastUse, $relative)
  }
  Write-Host 'No borré nada. Para borrarlo: pnpm sweep'
  exit 0
}

$freed  = 0
$failed = 0

foreach ($folder in $stale) {
  try {
    Remove-Item -LiteralPath $folder.Path -Recurse -Force
    $freed += $folder.Bytes
  } catch {
    $failed += 1
  }
}

# A crate whose every build went leaves its folder empty in build/.
foreach ($parent in @($stale | ForEach-Object { Split-Path $_.Path -Parent } | Sort-Object -Unique)) {
  if ((Split-Path (Split-Path $parent -Parent) -Leaf) -eq 'build' -and (Test-Path -LiteralPath $parent) -and -not (Get-ChildItem -LiteralPath $parent -Force)) {
    Remove-Item -LiteralPath $parent -Force
  }
}

Write-Host "Liberé $(Format-Size $freed) ($(Format-Folders ($stale.Count - $failed)) sin usar hace más de $Days días)."
if ($failed -gt 0) { Write-Host "$(Format-Folders $failed) en uso no se pudieron borrar; quedan para la próxima." }
