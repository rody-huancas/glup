# Builds glup-voz.exe (apps/desktop/src-tauri/voz): "Pasar audio a texto" on the graphics card, with
# whisper.cpp and Vulkan. It is built on its own, never together with Glup (Cargo would join
# whisper-rs's features and Glup would link Vulkan too).
#
#   pnpm voz:build             target/debug/glup-voz.exe, next to the glup.exe of `pnpm dev`
#   pnpm voz:build -Sidecar    the same, also copied where Tauri bundles it (binaries/): CI's installer
#   pnpm voz:build -Release    target/release/glup-voz.exe, and the copy Tauri bundles (binaries/)
#
# Needs CMake and the Vulkan SDK (VULKAN_SDK set, glslc in its Bin). Without them Glup still builds
# and runs: it just listens on the processor.
param([switch]$Release, [switch]$Sidecar)

$ErrorActionPreference = 'Stop'
$tauri = Join-Path $PSScriptRoot '..\apps\desktop\src-tauri' | Resolve-Path

if (-not $env:VULKAN_SDK -or -not (Test-Path (Join-Path $env:VULKAN_SDK 'Bin\glslc.exe'))) {
    Write-Error 'Falta el Vulkan SDK (VULKAN_SDK con Bin\glslc.exe). Ver CONTRIBUTING.md.'
}
$env:Path = "$(Join-Path $env:VULKAN_SDK 'Bin');$env:Path"

# whisper.cpp's shader generator is a CMake ExternalProject; deep inside Cargo's build folder its paths
# pass 260 characters, which MSVC cannot open. This moves that one project to target/vk.
$env:CMAKE_PROJECT_INCLUDE = (Join-Path $tauri 'voz\short-paths.cmake') -replace '\\', '/'

Push-Location $tauri
try {
    $build = if ($Release) { 'release' } else { 'debug' }
    if ($Release) { cargo build --locked --release -p glup-voz } else { cargo build --locked -p glup-voz }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    if ($Release -or $Sidecar) {
        # Tauri's sidecars carry the target triple in their name (tauri.release.conf.json, externalBin).
        $triple = (rustc -vV | Select-String '^host: (.+)$').Matches[0].Groups[1].Value
        New-Item -ItemType Directory -Force binaries | Out-Null
        Copy-Item "target\$build\glup-voz.exe" "binaries\glup-voz-$triple.exe" -Force
    }
} finally {
    Pop-Location
}
