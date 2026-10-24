<#
  Boletim Maker — gera o aplicativo para Windows (dist\BoletimMaker-Beta.exe).

  Uso (PowerShell, na pasta do projeto):
      powershell -ExecutionPolicy Bypass -File desktop\build.ps1
      powershell -ExecutionPolicy Bypass -File desktop\build.ps1 -SemTeste

  Usa o compilador C# que já vem no Windows (.NET Framework 4.8): não precisa
  de Visual Studio, SDK nem internet. Embute no .exe o editor (index.html,
  css, js, fontes, imagens) e as DLLs do WebView2 (desktop\lib, Microsoft,
  licença em LICENSE-WebView2.txt). Ao final roda o autoteste do .exe.
  Rode de novo sempre que o editor mudar, para o .exe levar a versão nova.
#>
param([switch]$SemTeste)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$Lib = Join-Path $PSScriptRoot "lib"
$Dist = Join-Path $Root "dist"
$Exe = Join-Path $Dist "BoletimMaker-Beta.exe"
$Ico = Join-Path $PSScriptRoot "app.ico"
if (-not (Test-Path $Csc)) { throw "Compilador C# do .NET Framework 4.8 não encontrado: $Csc" }
New-Item -ItemType Directory -Force $Dist | Out-Null

# Ícone: quadrado azul-marinho com "B" (mesma marca da barra do editor).
if (-not (Test-Path $Ico)) {
  Add-Type -AssemblyName System.Drawing
  $sizes = 256, 48, 32, 16
  $pngs = foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = "AntiAlias"; $g.TextRenderingHint = "AntiAliasGridFit"
    $r = [math]::Max(2, [int]($s * 0.22)); $d = 2 * $r
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90); $path.AddArc($s - $d - 1, 0, $d, $d, 270, 90)
    $path.AddArc($s - $d - 1, $s - $d - 1, $d, $d, 0, 90); $path.AddArc(0, $s - $d - 1, $d, $d, 90, 90); $path.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(14, 27, 59))), $path)
    $font = New-Object System.Drawing.Font "Segoe UI", ([float]($s * 0.56)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = "Center"; $fmt.LineAlignment = "Center"
    $g.DrawString("B", $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, ([float]($s * 0.02)), $s, $s), $fmt)
    $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    , $ms.ToArray()
  }
  $out = New-Object System.IO.MemoryStream; $w = New-Object System.IO.BinaryWriter $out
  $w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$sizes.Count)
  $offset = 6 + 16 * $sizes.Count
  for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]; $b = if ($s -ge 256) { 0 } else { $s }
    $w.Write([byte]$b); $w.Write([byte]$b); $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]$pngs[$i].Length); $w.Write([uint32]$offset)
    $offset += $pngs[$i].Length
  }
  foreach ($p in $pngs) { $w.Write($p) }
  [System.IO.File]::WriteAllBytes($Ico, $out.ToArray())
}

# Recursos: arquivos do editor (app/...) e DLLs (lib/... gerenciadas, native/... nativa).
$res = @()
$files = @("index.html", "css\style.css", "js\app.js", "js\firebase-config.js") +
  (Get-ChildItem (Join-Path $Root "css\fonts") -File | ForEach-Object { "css\fonts\" + $_.Name }) +
  (Get-ChildItem (Join-Path $Root "img") -File | ForEach-Object { "img\" + $_.Name })
foreach ($f in $files) { $res += "/resource:" + (Join-Path $Root $f) + ",app/" + ($f -replace "\\", "/") }
$res += "/resource:$Lib\Microsoft.Web.WebView2.Core.dll,lib/Microsoft.Web.WebView2.Core.dll"
$res += "/resource:$Lib\Microsoft.Web.WebView2.WinForms.dll,lib/Microsoft.Web.WebView2.WinForms.dll"
$res += "/resource:$Lib\WebView2Loader.dll,native/WebView2Loader.dll"

$cscArgs = @("/nologo", "/target:winexe", "/platform:x64", "/optimize+", "/codepage:65001",
  "/out:$Exe", "/win32icon:$Ico",
  "/r:System.dll", "/r:System.Core.dll", "/r:System.Drawing.dll", "/r:System.Windows.Forms.dll", "/r:System.Web.Extensions.dll",
  "/r:$Lib\Microsoft.Web.WebView2.Core.dll", "/r:$Lib\Microsoft.Web.WebView2.WinForms.dll") + $res + @((Join-Path $PSScriptRoot "BoletimMaker.cs"))
& $Csc @cscArgs
if ($LASTEXITCODE -ne 0) { throw "Falha na compilação." }
$kb = [math]::Round((Get-Item $Exe).Length / 1KB)
Write-Host "Gerado: $Exe ($kb KB)" -ForegroundColor Green

if ($SemTeste) { exit 0 }
$log = Join-Path $env:TEMP "boletim-selftest.txt"
if (Test-Path $log) { Remove-Item $log }
$p = Start-Process -FilePath $Exe -ArgumentList @("--selftest", "`"$log`"") -PassThru
if (-not $p.WaitForExit(90000)) { $p.Kill(); throw "Autoteste não terminou em 90 s." }
if (-not (Test-Path $log)) { throw "Autoteste não gerou resultado." }
# Perfis temporários dos autotestes (não são os dados do usuário)
Get-ChildItem $env:TEMP -Directory -Filter "BoletimMakerSelfTest_*" -ErrorAction SilentlyContinue | ForEach-Object { try { Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop } catch {} }
$linhas = Get-Content $log -Encoding UTF8
$linhas | ForEach-Object { Write-Host "  $_" -ForegroundColor $(if ($_ -clike "OK*") { "Green" } else { "Red" }) }
if ($p.ExitCode -ne 0 -or ($linhas | Where-Object { $_ -clike "FALHA*" })) { Write-Host "AUTOTESTE: falhou." -ForegroundColor Red; exit 1 }
Write-Host "AUTOTESTE: ok." -ForegroundColor Green
