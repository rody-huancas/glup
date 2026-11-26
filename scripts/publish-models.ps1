# Publishes Glup's own copies of the models it downloads: the release «models-v1» of
# rody-huancas/glup, marked as not the latest (it is not a version of Glup), with each model, its
# original license, a short README with its exact origin and a SHA256SUMS.txt. Glup asks for them there
# first and, if they are not there, from where they came from (services/background/download.rs).
#
# Before uploading, every model is checked against the SHA-256 Glup expects (the same list as in the
# code; a test keeps them equal). Nothing is replaced if the release already exists: only what is
# missing is uploaded.
#
#   .\scripts\publish-models.ps1                                  # the files in Downloads\glup-espejo
#   .\scripts\publish-models.ps1 -Folder D:\copias\glup-espejo -WhatIf
param(
  [string] $Folder = (Join-Path $env:USERPROFILE 'Downloads\glup-espejo'),
  [string] $Repo   = 'rody-huancas/glup',
  [string] $Tag    = 'models-v1',
  [switch] $WhatIf
)

$ErrorActionPreference = 'Stop'

# name → SHA-256 (as in background/model.rs, transcribe/model.rs and upscale/model.rs).
$models = [ordered]@{
  'birefnet-lite-fp16.onnx'   = 'd39b897ceb16ae654c1731f3dba0cf9b368d9cae74b5a57459b455cc8bfec402'
  'whisper-small-q5_1.bin'    = 'ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb'
  'whisper-medium-q5_0.bin'   = '19fea4b380c3a618ec4723c3eef2eb785ffba0d0538cf43f8f235e7b3b34220f'
  'realesr-general-x4v3.onnx' = '924ebad6532777303582d4ce7811849b88869231a3ae7093e0f21200249df8d5'
  'realesrgan-x4plus.onnx'    = '4ed6a45a8185bde6c8d7c7790a6e80e3c5b9f608946f634021068dd0fd0473c8'
}

# The licenses and the READMEs that go with them.
$documents = @(
  'birefnet-LICENSE.txt', 'birefnet-README.md',
  'whisper-LICENSE.txt', 'whisper.cpp-LICENSE.txt', 'whisper-README.md',
  'realesrgan-LICENSE.txt', 'realesrgan-README.md'
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw 'Falta el CLI de GitHub (gh): https://cli.github.com'
}
& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'gh no tiene una sesión iniciada: corre «gh auth login» primero.'
}

# Every file there, and every model exactly the one Glup expects.
$missing = @($models.Keys) + $documents | Where-Object { -not (Test-Path (Join-Path $Folder $_)) }
if ($missing) {
  throw "Faltan en ${Folder}: $($missing -join ', ')"
}

$sums = foreach ($name in $models.Keys) {
  Write-Host "Compruebo $name…"
  $hash = (Get-FileHash -Algorithm SHA256 (Join-Path $Folder $name)).Hash.ToLower()
  if ($hash -ne $models[$name]) {
    throw "$name no es el archivo que Glup espera (SHA-256 $hash)."
  }
  "$hash  $name"
}
$sumsFile = Join-Path $Folder 'SHA256SUMS.txt'
[IO.File]::WriteAllText($sumsFile, ($sums -join "`n") + "`n")

$files = @($models.Keys) + $documents + 'SHA256SUMS.txt' | ForEach-Object { Join-Path $Folder $_ }

$notes = @'
Copias de los modelos que descarga Glup, con su licencia original y un README con su origen exacto
(repositorio, revisión y autor). No es una versión de Glup: Glup las pide aquí primero y, si no están,
de su origen; en los dos casos comprueba el SHA-256 de cada archivo (ver SHA256SUMS.txt).

- BiRefNet_lite (Quitar fondo, Foto tamaño carnet): MIT.
- Whisper small y medium en formato ggml (Pasar audio a texto, Subtítulos): MIT.
- Real-ESRGAN general x4v3 y x4plus en ONNX (Mejorar calidad): BSD-3-Clause.
'@
$notesFile = Join-Path ([IO.Path]::GetTempPath()) "glup-$Tag-notes.md"
[IO.File]::WriteAllText($notesFile, $notes)

try {
  & gh release view $Tag --repo $Repo *> $null
  $exists = $LASTEXITCODE -eq 0

  if ($WhatIf) {
    Write-Host ($(if ($exists) { "El release $Tag ya existe: subiría lo que falte de:" } else { "Crearía el release $Tag (no la última versión) con:" }))
    $files | ForEach-Object { Write-Host "  $_" }
    return
  }

  if (-not $exists) {
    & gh release create $Tag --repo $Repo --title 'Modelos de Glup (v1)' --notes-file $notesFile --latest=false @files
    if ($LASTEXITCODE -ne 0) { throw 'No pude crear el release.' }
  } else {
    $present = (& gh release view $Tag --repo $Repo --json assets --jq '.assets[].name') -split "`n"
    $pending = $files | Where-Object { $present -notcontains (Split-Path $_ -Leaf) }
    if ($pending) {
      & gh release upload $Tag --repo $Repo @pending
      if ($LASTEXITCODE -ne 0) { throw 'No pude subir los archivos que faltaban.' }
    }
  }
  Write-Host "Listo: https://github.com/$Repo/releases/tag/$Tag"
} finally {
  Remove-Item $notesFile -ErrorAction SilentlyContinue
}
