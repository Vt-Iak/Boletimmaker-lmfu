<#
  Boletim Maker — executor dos testes automatizados.

  Uso (PowerShell, na pasta do projeto):
      powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1
      powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1 -Only termometro,completa

  Funcionamento: para cada suíte, monta uma página temporária com o <body> do
  index.html, um script de preparo (setup/) antes do app e a suíte (suites/)
  depois dele. Abre a página no Microsoft Edge headless com --dump-dom, lê o
  bloco <pre> de resultado e conta as linhas "OK" e "FALHA".
  Nada é gravado no projeto: páginas e perfis ficam em %TEMP%\boletim-tests.
#>
param(
  [string[]]$Only = @(),
  [string]$Edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  [int]$Budget = 15000
)

$ErrorActionPreference = "Stop"
$Only = @($Only | ForEach-Object { $_ -split "," } | Where-Object { $_ })
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$RootUrl = "file:///" + ($Root -replace "\\", "/")
$Work = Join-Path $env:TEMP "boletim-tests"
New-Item -ItemType Directory -Force $Work | Out-Null
if (-not (Test-Path $Edge)) { throw "Microsoft Edge não encontrado em: $Edge" }

# Corpo do editor, com caminhos absolutos para css/js/fontes/imagens.
$index = Get-Content (Join-Path $Root "index.html") -Raw -Encoding UTF8
$body = [regex]::Match($index, "(?s)<body>(.*)</body>").Groups[1].Value
$body = $body -replace 'src="js/', ('src="' + $RootUrl + '/js/') -replace 'src="img/', ('src="' + $RootUrl + '/img/')

# Suíte -> preparo, parâmetro de URL, id do <pre> de saída.
$Suites = @(
  @{ Name = "fase1-correcoes";       Setup = "limpo.js";                       Query = "";            Out = "f1out" },
  @{ Name = "fase2-variaveis";       Setup = "fase2.js";                       Query = "?mode=novo";  Out = "f2out"; Label = "fase2-variaveis (modelo novo)" },
  @{ Name = "fase2-variaveis";       Setup = "fase2.js";                       Query = "?mode=migr";  Out = "f2out"; Label = "fase2-variaveis (migração)" },
  @{ Name = "fase3-verificacao";     Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "f3out" },
  @{ Name = "fase4-interface";       Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "f4out" },
  @{ Name = "fase5-cotacoes-fontes"; Setup = "fase5.js";                       Query = "?mode=novo";  Out = "f5out"; Label = "fase5-cotacoes-fontes (modelo novo)" },
  @{ Name = "fase5-cotacoes-fontes"; Setup = "fase5.js";                       Query = "?mode=migr";  Out = "f5out"; Label = "fase5-cotacoes-fontes (migração)" },
  @{ Name = "fase6-tipografia";      Setup = "limpo.js";                       Query = "";            Out = "f6out" },
  @{ Name = "canais";                Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "cnout" },
  @{ Name = "praticidade";           Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "prout" },
  @{ Name = "calculadora";           Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "ccout" },
  @{ Name = "revisao";               Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "rvout" },
  @{ Name = "atalhos";               Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "atout" },
  @{ Name = "acervo";                Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "acout" },
  @{ Name = "pauta";                 Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "ptout"; Budget = 200000 },
  @{ Name = "ocultar-blocos";        Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "hd" },
  @{ Name = "excluir-blocos";        Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "rm" },
  @{ Name = "termometro";            Setup = "limpo.js";                       Query = "";            Out = "th" },
  @{ Name = "completa";              Setup = "limpo-salvamento-imediato.js";   Query = "";            Out = "fullout"; Budget = 90000 }
)

function Invoke-Page([string]$file, [string]$query, [string]$tag, [int]$vt) {
  $prof = Join-Path $Work ("perfil-" + $tag)
  if (Test-Path $prof) { Remove-Item -Recurse -Force $prof }
  $url = "file:///" + ($file -replace "\\", "/") + $query
  $edgeArgs = @("--headless=new", "--disable-gpu", "--no-first-run", "--allow-file-access-from-files",
            "--user-data-dir=$prof", "--virtual-time-budget=$vt", "--window-size=1600,1000", "--dump-dom", $url)
  $prev = $ErrorActionPreference; $ErrorActionPreference = "SilentlyContinue"
  $dom = & $Edge @edgeArgs 2>$null | Out-String
  $ErrorActionPreference = $prev
  return $dom
}

function Get-Pre([string]$dom, [string]$id) {
  # O marcador pode aparecer também no texto das suítes; o resultado real é o último.
  $tag = "<pre id=""$id"">"
  $a = $dom.LastIndexOf($tag)
  if ($a -lt 0) { return $null }
  $a += $tag.Length
  $b = $dom.IndexOf("</pre>", $a)
  if ($b -lt 0) { return $null }
  return [System.Net.WebUtility]::HtmlDecode($dom.Substring($a, $b - $a))
}

$total = 0; $falhas = 0; $resumo = @()
$i = 0

foreach ($s in $Suites) {
  $i++
  if ($Only.Count -and ($Only -notcontains $s.Name)) { continue }
  $label = if ($s.Label) { $s.Label } else { $s.Name }
  $setup = Get-Content (Join-Path $PSScriptRoot ("setup\" + $s.Setup)) -Raw -Encoding UTF8
  $steps = Get-Content (Join-Path $PSScriptRoot ("suites\" + $s.Name + ".js")) -Raw -Encoding UTF8
  # Amostras: /*FIXTURE:arquivo.json*/null na suíte vira o conteúdo de tests\fixtures\arquivo.json
  $steps = [regex]::Replace($steps, '/\*FIXTURE:([\w.-]+)\*/null', { param($m) Get-Content (Join-Path $PSScriptRoot ("fixtures\" + $m.Groups[1].Value)) -Raw -Encoding UTF8 })
  $html = "<!DOCTYPE html><html lang=""pt-BR""><head><meta charset=""UTF-8""><title>Boletim Maker</title>" +
          "<link rel=""stylesheet"" href=""$RootUrl/css/style.css""><script>`n$setup`n</script></head><body>" +
          $body + "<script>`n$steps`n</script></body></html>"
  $file = Join-Path $Work ("teste-$i.html")
  [System.IO.File]::WriteAllText($file, $html, (New-Object System.Text.UTF8Encoding $false))
  $out = Get-Pre (Invoke-Page $file $s.Query "s$i" $(if ($s.Budget) { $s.Budget } else { $Budget })) $s.Out
  if ($null -eq $out) {
    Write-Host "[SEM RESULTADO] $label" -ForegroundColor Red
    $falhas++; $resumo += "{0,-42} sem resultado" -f $label; continue
  }
  $lines = $out -split "`n" | Where-Object { $_.Trim() }
  $ok = @($lines | Where-Object { $_ -clike "OK*" }).Count
  $bad = @($lines | Where-Object { $_ -clike "FALHA*" -or $_ -clike "ERRO*" })
  $total += $ok + $bad.Count; $falhas += $bad.Count
  $cor = if ($bad.Count) { "Red" } else { "Green" }
  Write-Host ("{0,-42} {1,3} OK  {2,2} falha(s)" -f $label, $ok, $bad.Count) -ForegroundColor $cor
  $bad | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
}

# Sincronização online com window.claude simulado (cenários: banco vazio e edição remota).
if (-not $Only.Count -or $Only -contains "nuvem") {
  $tpl = Get-Content (Join-Path $PSScriptRoot "setup\nuvem-simulada.html") -Raw -Encoding UTF8
  $page = $tpl.Replace("__ROOT__", $RootUrl).Replace("<!--BODY-->", $body)
  $file = Join-Path $Work "teste-nuvem.html"
  [System.IO.File]::WriteAllText($file, $page, (New-Object System.Text.UTF8Encoding $false))
  foreach ($sc in @("empty", "remote", "revisor", "autor")) {
    $raw = Get-Pre (Invoke-Page $file "?scenario=$sc" "n$sc" $Budget) "testout"
    $checks = @()
    if ($null -eq $raw) { $checks += "FALHA sem resultado" }
    else {
      $r = $raw | ConvertFrom-Json
      if ($sc -eq "revisor") {
        $minhas = @($r.notas | Where-Object { $_.autorId -eq "prof_1" -and $_.texto -eq "Conferir a fonte do Brent." })
        $checks += $(if ($r.reviewer -and $r.bannerVisible) { "OK professor entra em modo revisão" } else { "FALHA modo revisão não ativado" })
        $checks += $(if ($r.editableOff) { "OK página só para leitura" } else { "FALHA campos ainda editáveis" })
        $checks += $(if ($r.editionWrites -eq 0) { "OK revisor não grava a edição" } else { "FALHA revisor gravou edição/config ($($r.editionWrites))" })
        $checks += $(if ($r.headlineOnPage -eq "ALTERADO EM OUTRO APARELHO") { "OK revisor vê as alterações do autor ao vivo" } else { "FALHA revisor não recebeu a alteração" })
        $checks += $(if ($minhas.Count -eq 1 -and $minhas[0].papel -eq "revisor" -and $minhas[0].edicaoId -eq "ed_remote_1") { "OK observação do revisor gravada no banco" } else { "FALHA observação não gravada" })
      } else {
        $checks += $(if (@($r.docIds | Where-Object { $_ -like "editions/*" }).Count -ge 1) { "OK edições gravadas no banco" } else { "FALHA nenhuma edição no banco" })
        $checks += $(if ($r.docIds -contains "app/settings") { "OK configurações gravadas" } else { "FALHA app/settings ausente" })
        $checks += $(if ($r.overlayHidden) { "OK tela de conexão fechada" } else { "FALHA tela de conexão aberta" })
        $checks += $(if ($r.tagInCloud -eq "DIGITADO AQUI") { "OK edição local enviada" } else { "FALHA edição local não enviada" })
        if ($sc -eq "remote") {
          $checks += $(if ($r.headlineOnPage -eq "ALTERADO EM OUTRO APARELHO") { "OK alteração remota aplicada" } else { "FALHA alteração remota não aplicada" })
          $checks += $(if ("$($r.logoInCloud)" -like "/_blob/*") { "OK imagem enviada como asset" } else { "FALHA imagem não externalizada" })
        }
      }
      if ($sc -eq "autor") {
        $checks += $(if ($r.notasCount -eq "1") { "OK autor vê 1 observação em aberto" } else { "FALHA contador de observações: $($r.notasCount)" })
        $checks += $(if ($r.pins -ge 1) { "OK marcador no campo comentado" } else { "FALHA sem marcador na página" })
        $checks += $(if (@($r.notaMeta | Where-Object { $_ -like "Prof. Ana*revisor*" }).Count -ge 1) { "OK nome do professor exibido" } else { "FALHA nome do professor: $($r.notaMeta -join " | ")" })
        $checks += $(if (-not $r.reviewer) { "OK dono continua editando" } else { "FALHA dono caiu no modo revisão" })
      }
    }
    $ok = @($checks | Where-Object { $_ -clike "OK*" }).Count
    $bad = @($checks | Where-Object { $_ -like "FALHA*" })
    $total += $checks.Count; $falhas += $bad.Count
    $cor = if ($bad.Count) { "Red" } else { "Green" }
    Write-Host ("{0,-42} {1,3} OK  {2,2} falha(s)" -f "nuvem ($sc)", $ok, $bad.Count) -ForegroundColor $cor
    $bad | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
  }
}

# Plataforma própria com Firebase simulado (login, acesso, edição simultânea).
if (-not $Only.Count -or $Only -contains "firebase") {
  $tpl = Get-Content (Join-Path $PSScriptRoot "setup\firebase-simulado.html") -Raw -Encoding UTF8
  $page = $tpl.Replace("__ROOT__", $RootUrl).Replace("<!--BODY-->", $body)
  $file = Join-Path $Work "teste-firebase.html"
  [System.IO.File]::WriteAllText($file, $page, (New-Object System.Text.UTF8Encoding $false))
  foreach ($sc in @("semlogin", "linkoff", "semacesso", "dono", "editor", "revisor")) {
    $raw = Get-Pre (Invoke-Page $file "?cenario=$sc" "f$sc" 12000) "testout"
    $checks = @()
    if ($null -eq $raw) { $checks += "FALHA sem resultado" }
    else {
      $r = $raw | ConvertFrom-Json
      $semUndef = -not ($r.log | Where-Object { $_ -like "ERRO undefined*" })
      switch ($sc) {
        "semlogin" {
          $checks += $(if ($r.loginVisivel) { "OK tela de entrada aparece" } else { "FALHA sem tela de entrada" })
          $checks += $(if ($r.log -contains "link para prof@uniso.br volta em url") { "OK envia link de acesso (e-mail normalizado)" } else { "FALHA link não enviado: $($r.log -join ' | ')" })
          $checks += $(if ($r.loginMsg -like "*Enviamos um link*") { "OK orienta a abrir o e-mail" } else { "FALHA mensagem: $($r.loginMsg)" })
          $checks += $(if (-not ($r.docIds | Where-Object { $_ -like "editions/*" })) { "OK nada gravado sem login" } else { "FALHA gravou sem login" })
        }
        "linkoff" {
          $checks += $(if ($r.loginVisivel -and $r.loginMsg -like "*link no e-mail está desligada*" -and $r.loginMsg -like "*Entrar com Google*") { "OK link desligado no Firebase: mensagem clara (sem código)" } else { "FALHA mensagem: $($r.loginMsg)" })
        }
        "semacesso" {
          $e = $r.extra
          $checks += $(if ($e.pedidoVisivel) { "OK fora da lista: oferece pedir acesso" } else { "FALHA sem botão de pedir acesso" })
          $checks += $(if ($e.pedido -and $e.pedido.email -eq "estranho@gmail.com" -and $e.pedido.uid -eq "u_x" -and $e.pedido.mensagem -eq "Sou o professor orientador.") { "OK pedido gravado com e-mail e mensagem" } else { "FALHA pedido: $($e.pedido | ConvertTo-Json -Compress)" })
          $checks += $(if ($e.msgAposPedido -like "*Pedido de acesso enviado*") { "OK confirma o envio do pedido" } else { "FALHA mensagem: $($e.msgAposPedido)" })
          $checks += $(if ($e.gravacoesAntes -eq 0) { "OK nada gravado antes da aprovação" } else { "FALHA gravou antes de aprovado" })
          $checks += $(if (-not $r.loginVisivel -and $r.notOwner -and -not $r.reviewer) { "OK aprovado pelo dono: o boletim abre sozinho" } else { "FALHA não abriu após aprovação" })
        }
        "dono" {
          $checks += $(if (@($r.docIds | Where-Object { $_ -like "editions/*" }).Count -ge 1) { "OK dono envia as edições" } else { "FALHA edições não enviadas" })
          $checks += $(if ($r.acesso -and ($r.acesso.editores -contains "prof@uniso.br")) { "OK dono adiciona o professor (Configurações > Acesso)" } else { "FALHA lista de acesso: $($r.acesso | ConvertTo-Json -Compress)" })
          $checks += $(if (($r.abas -contains "conta") -and ($r.abas -contains "acesso")) { "OK abas Conta e Acesso para o dono" } else { "FALHA abas: $($r.abas -join ',')" })
          $checks += $(if (-not $r.notOwner -and $r.versao -like "*servidor próprio*") { "OK identificado como dono no servidor próprio" } else { "FALHA identificação: $($r.versao)" })
          $checks += $(if ($semUndef) { "OK nenhum campo undefined enviado" } else { "FALHA undefined no banco" })
          $e = $r.extra
          $checks += $(if ($e.badge -eq "1" -and $e.abaAberta -eq "acesso" -and $e.pedidoNaTela) { "OK pedido de acesso avisado na engrenagem e listado em Acesso" } else { "FALHA aviso do pedido: $($e | ConvertTo-Json -Compress)" })
          $checks += $(if (($r.acesso.revisores -contains "novo@uniso.br") -and $null -eq $r.pedidoDono) { "OK aprovar o pedido libera o acesso e apaga o pedido" } else { "FALHA aprovação: $($r.acesso | ConvertTo-Json -Compress)" })
          $checks += $(if ($e.sairPorCima) { "OK confirmação de Sair aparece por cima das Configurações" } else { "FALHA confirmação de Sair escondida" })
        }
        "editor" {
          $e = $r.edicao
          $checks += $(if ($e.columns[0].title -eq "Notícia um — editada pelo professor" -and $e.columns[1].title -eq "Notícia dois — editada pelo dono") { "OK edição simultânea: as duas notícias preservadas" } else { "FALHA junção 1: $($e.columns[0].title) | $($e.columns[1].title)" })
          $checks += $(if ($e.headline.title -eq "Manchete — editada pelo professor" -and $e.headline.deck -eq "Resumo — editado pelo dono") { "OK gravação cruzada juntada na transação" } else { "FALHA junção 2: $($e.headline.title) | $($e.headline.deck)" })
          $checks += $(if ($r.log -contains "transacao") { "OK envio por transação" } else { "FALHA sem transação" })
          $checks += $(if ($r.notOwner -and -not $r.reviewer -and ($r.abas -contains "conta") -and -not ($r.abas -contains "acesso")) { "OK professor edita, mas não gerencia acesso nem exclui" } else { "FALHA papel do professor" })
          $checks += $(if ($semUndef) { "OK nenhum campo undefined enviado" } else { "FALHA undefined no banco" })
        }
        "revisor" {
          $checks += $(if ($r.reviewer -and $r.editableOff) { "OK revisor só lê (modo revisão)" } else { "FALHA modo revisão" })
          $checks += $(if ($r.editionWrites -eq 0) { "OK revisor não grava a edição" } else { "FALHA revisor gravou edição" })
          $checks += $(if ($r.nota -and $r.nota.autorNome -eq "Leitor" -and $r.nota.papel -eq "revisor") { "OK observação gravada com o nome de quem escreveu" } else { "FALHA observação: $($r.nota | ConvertTo-Json -Compress)" })
        }
      }
    }
    $ok = @($checks | Where-Object { $_ -clike "OK*" }).Count
    $bad = @($checks | Where-Object { $_ -like "FALHA*" })
    $total += $checks.Count; $falhas += $bad.Count
    $cor = if ($bad.Count) { "Red" } else { "Green" }
    Write-Host ("{0,-42} {1,3} OK  {2,2} falha(s)" -f "firebase ($sc)", $ok, $bad.Count) -ForegroundColor $cor
    $bad | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
  }
}

Write-Host ""
if ($falhas) { Write-Host "RESULTADO: $falhas falha(s) em $total verificações." -ForegroundColor Red; exit 1 }
Write-Host "RESULTADO: todas as $total verificações passaram." -ForegroundColor Green
exit 0
