# Boletim Maker

Editor do **Boletim Econômico semanal** da Liga de Mercado Financeiro, publicado
com o Laboratório de CSA da UNISO. Produz duas páginas A4 (frente e verso) e
exporta em PDF com links clicáveis.

- Versão: **1.4.1-beta** (Beta)
- Autor: João Vitor C. Soares
- Tecnologia: HTML + CSS + JavaScript ES2017. Não usa framework, build nem servidor.
- **Plataforma principal:** <https://vt-iak.github.io/Boletimmaker-lmfu/> (GitHub Pages + Firebase; login por e-mail ou Google, sem conta Claude)
- Versão no claude.ai (reserva, privada): <https://claude.ai/artifact/SoS7CwLiUCnM2W8Gjo173J>

---

## 1. Como usar

| Modo | Como abrir | Onde ficam os dados |
|---|---|---|
| **Local** | Abra o `index.html` no Edge ou no Chrome (duplo clique) | No `localStorage` do navegador, na chave `boletimMaker.v1` |
| **Plataforma (principal)** | Abra <https://vt-iak.github.io/Boletimmaker-lmfu/> e entre com seu e-mail | No Firebase (Firestore) do projeto `boletimmaker-lmfu`, em tempo real, com cópia no navegador |
| **Online** | Abra o link do Artifact no PC, no notebook ou no celular | No banco do Artifact, sincronizado entre aparelhos, com cópia no `localStorage` |
| **Windows (offline)** | Abra `dist\BoletimMaker-Beta.exe` | No perfil do aplicativo, em `%LOCALAPPDATA%\BoletimMaker` (só neste computador) |

Fluxo de uma edição:

1. Crie a edição em **⋯ → Nova edição**.
2. Preencha número e datas na barra de variáveis. Os campos derivados (cabeçalho, verso, rótulos) se preenchem sozinhos.
3. Edite os textos direto na página.
4. Use o painel esquerdo para estrutura, camadas e fontes, e o painel direito para as propriedades do bloco selecionado.
5. Clique em **Verificar** antes de exportar, para ver estouro de página, campos vazios, links e fontes.
6. Clique em **Baixar PDF**.
   - Na versão online, o PDF é gerado no próprio app e aparece numa pré-visualização para você confirmar o download.
   - Na versão local, abre a janela de impressão. Escolha **"Salvar como PDF"**: o "Microsoft Print to PDF" perde os links.

### Plataforma própria (GitHub Pages + Firebase)

- **Hospedagem:** o GitHub Pages publica os arquivos do repositório
  `Vt-Iak/Boletimmaker-lmfu`, ramo `main`. Um `git push` atualiza o site em cerca de 1 minuto.
- **Dados e login:** o Firebase (projeto `boletimmaker-lmfu`, `js/firebase-config.js`) guarda os dados.
  - Entrada por link enviado ao e-mail (sem senha) ou pela conta Google.
    Ninguém cria senha. No Firebase precisam estar ligados, em *Authentication →
    Método de login*: **E-mail/senha** com a opção **Link do e-mail (login sem
    senha)**, e **Google**.
  - Só entra quem estiver na lista. O dono (`joaovcsoares5@gmail.com`) gerencia a lista em
    **Configurações → Acesso**:
    - **Podem editar e comentar** (ex.: o professor);
    - **Só comentam**.
  - **Pedido de acesso:** quem entra e não está na lista clica em **Pedir acesso
    ao autor**, com uma mensagem opcional (documento `pedidos/<uid>`).
    - O dono vê um número na engrenagem e os pedidos em **Configurações → Acesso**.
    - Ali, **Aprovar: edita e comenta**, **Aprovar: só comenta** ou **recusar**.
    - Ao ser aprovado, o boletim abre sozinho para quem pediu.
- **Edição simultânea:** o app junta as alterações campo a campo (`merge3`).
  - Ao receber uma alteração de outra pessoa com mudanças ainda não enviadas aqui.
  - No envio, numa transação, quando alguém gravou no meio do caminho.
  - Se as duas pessoas mudarem o mesmo campo, vale quem enviou por último.
- **Regras de segurança:** `firestore.rules`. Para valerem, cole o arquivo em
  Firebase → Firestore → Regras → Publicar.
  - Só membros leem.
  - Editores gravam.
  - Só o dono exclui edições e altera o acesso.
  - Cada pessoa só cria o próprio pedido de acesso, com o e-mail verdadeiro da
    conta; só o dono lê e responde aos pedidos.
  - Configurações pessoais ficam privadas.
  - Sempre que `firestore.rules` mudar, cole e publique de novo.
- **Imagens:** cada imagem fica num documento `imagens/<hash>`, até ~900 KB.
  O Firebase Storage não é usado (exigiria plano pago).
- **Levar as edições do claude.ai:** lá, use **⋯ → Backup completo**. Aqui, use **⋯ → Importar JSON**.

### Versão para Windows (offline)

`dist\BoletimMaker-Beta.exe` (~1,4 MB) roda sem internet e sem instalar nada.
Usa o motor do Edge (WebView2), que já vem no Windows 11.

- **PDF:** o botão **Salvar PDF** grava direto em A4, sem margens, com fundos e
  links clicáveis. Não abre a janela de impressão.
- **Arquivos:** JSON e backup abrem a janela "Salvar como" do Windows.
- **Links:** abrem no navegador padrão.
- **Dados:** ficam só neste computador e não sincronizam com a versão online.
  Para levar edições de um lado para o outro, use **⋯ → Backup completo** e
  **⋯ → Importar JSON**.
- **Primeira execução:** o Windows pode avisar "O Windows protegeu o
  computador", porque o arquivo não tem assinatura digital. Clique em
  **Mais informações → Executar assim mesmo**.
- **Atualizar:** depois de mudar o editor, rode
  `powershell -ExecutionPolicy Bypass -File desktop\build.ps1`. O script
  compila com o C# do próprio Windows, embute o editor no .exe e roda um
  autoteste: editor carregado, dados gravados e PDF em 2 páginas A4 com
  links. As edições do aplicativo não se perdem ao atualizar.

### Pauta da semana (coleta automática de matérias)

Botão **Pauta** no topo (ou **Ctrl+Alt+P**). Mostra as matérias de mercado
financeiro da semana, coletadas só dos **canais de referência** e agrupadas
por tema. Não precisa abrir o Claude nem o GitHub.

- **Quando a coleta roda:** todo **sábado às 08h** (Brasília), no GitHub
  Actions (`.github/workflows/pauta.yml`). Cobre a semana de segunda a sexta
  que terminou e grava `pautas/<inicio>.json` e `pautas/index.json` no
  repositório. É gratuito.
- **Como a coleta funciona:** `coleta/coletar.mjs` (Node 20, sem dependências) faz quatro coisas.
  1. Lê cada canal pelo método de `coleta/canais.json`:
     - feed Atom do BC (notas à imprensa e notícias);
     - API do IBGE;
     - feed por dia do InfoMoney;
     - RSS da Advisor Perspectives;
     - busca por site no Google Notícias para os demais, com o endereço original da matéria recuperado.
  2. Filtra: domínio da lista, período, assunto econômico pelo dicionário
     `coleta/editorias.json` e duplicadas. Fontes oficiais entram sempre.
  3. Agrupa matérias parecidas em temas. O título e o resumo de cada tema são
     **frases reais** das matérias, sem IA e sem invenção.
  4. Valida o arquivo antes de gravar: link do domínio certo, data no
     período e cada frase com a matéria de origem.
- **Na aba:**
  - filtre por palavra, editoria, grupo e veículo;
  - **confirme** ou **descarte** temas (fica salvo na edição);
  - **Usar como fonte** transforma a matéria em fonte numerada;
  - **Criar notícia com este tema** cria a notícia em **rascunho**: cada frase
    leva o link da matéria de onde saiu e o selo `[n]` aponta para a principal.
    O texto é dos veículos e precisa ser reescrito antes de aprovar.
- **Buscar agora:** escolha um período e, se quiser, uma palavra-chave (ex.:
  "Petrobras"). A coleta roda na hora (3 a 7 minutos) e a pauta abre sozinha
  quando fica pronta.
  - Exige uma **chave do GitHub neste aparelho**: Configurações →
    **Integrações**, token *fine-grained* só deste repositório, com *Actions*
    e *Contents* em *Read and write*. A chave fica só no navegador.
  - Sem a chave, o botão abre o GitHub (*Actions → Pauta → Run workflow*).
- **Canais da coleta:**
  - Cada canal tem **prioridade** (o número antes do nome) e **método de
    coleta**, editáveis no painel do canal.
  - O botão **Coleta** (Fontes → Canais de referência) envia os canais
    **validados** para `coleta/canais.json`: direto, com a chave, ou baixando
    o arquivo.
  - O app também reaplica o filtro ao abrir a pauta: a matéria de um canal que
    saiu da lista fica oculta.
- **Offline, no Windows ou no claude.ai:** fica a última pauta aberta no
  aparelho, ou importe um arquivo `.json` de pauta.
- **Formato do arquivo:** `boletimMaker.pauta`, descrito em `CONTEXTO.md`, seção 5.3.

### Atalhos de teclado e configurações

Abra com **F1** (atalhos) ou **Ctrl+,** / ícone de engrenagem (interface).

- **Atalhos ajustáveis:** clique em **Alterar** e pressione a combinação nova.
  - Valem só combinações com Ctrl ou Alt, ou as teclas F1–F12, para não
    atrapalhar a digitação.
  - Combinações do navegador são recusadas.
  - Se o atalho já for de outro comando, esse outro fica sem atalho e o app
    avisa.
  - O AltGr do teclado ABNT2 (que o Windows envia como Ctrl+Alt) é ignorado,
    para que digitar §, ¹ ou ² nunca dispare um atalho.
- **Padrões:**

  | Atalho | Ação |
  |---|---|
  | F1 | Atalhos e configurações |
  | Ctrl+S | Salvar agora |
  | F2 | Verificar |
  | Ctrl+P | Exportar PDF |
  | F3 | Calculadora |
  | F4 | Nova observação |
  | F6 | Acervo |
  | Ctrl+Alt+M | Nova notícia |
  | Ctrl+Alt+N | Próxima edição |
  | Ctrl+Alt+B | Backup |
  | Alt+PageUp / Alt+PageDown | Trocar de edição |
  | Alt+1, Alt+2, Alt+3 | Abas do painel |
  | Ctrl+\ | Mostrar ou ocultar painéis |
  | Ctrl+Alt+0 / = / - | Zoom |
  | Ctrl+Alt+T | Tema |
  | Ctrl+Alt+P | Abrir ou fechar a Pauta |

- **Interface:** tema, zoom ao abrir, painéis ao abrir e textos de ajuda.
- **Pessoais:** as configurações ficam no navegador
  (`localStorage["boletimMaker.prefs"]`). Na versão online, também ficam em
  `data/users/<id>/prefs`, uma área privada do banco que acompanha a conta em
  todos os aparelhos. Cada pessoa (você, o professor) tem as suas.

### Acervo de matérias

**F6** ou o ícone de lupa abre a busca em todas as edições.

- **O que entra:** manchetes, notícias e termos do glossário.
- **Busca:** ignora acentos e maiúsculas e cobre título, texto, editoria,
  veículo e nome da edição. Há filtros por tipo, ano e editoria.
- **Abrir a edição:** leva até a matéria original.
- **Copiar para a edição aberta:** traz a notícia como rascunho, com a fonte
  vinculada, ou o termo do glossário.
- **Exportar planilha (.csv):** abre no Excel com acentos e separador `;`.
- **Armazenamento:** o acervo é um índice montado na hora a partir das
  edições salvas. Online, elas já estão no banco, então nada é duplicado.

### Calculadora do termômetro

Em **⋯ → Calculadora do termômetro…**, ou no painel do bloco Termômetro, você
preenche o fechamento e três bases de cada ativo: abertura do dia, abertura da
semana e base do ano. Os resultados aparecem na hora. A conta é a mesma da
planilha `Controle-de-cotacoes.xlsx`:

- **Preço:** variação % = fechamento ÷ base − 1.
- **Taxa (DI, Selic, T-Bond):** diferença em bps = (fechamento − base) × 100,
  como o boletim mostra.

Formas de preencher:

- **Importar planilha (.xlsx):** lê a primeira aba no formato da sua planilha.
  As colunas são Índice, Fechamento, Abertura, Var, Abertura, Var, Abertura,
  Var e Fontes, e os ativos são casados pelo nome.
- **Colar do Excel:** copie as linhas no mesmo formato e cole na janela.

**Aplicar ao boletim** preenche o termômetro: fechamento, variações, seta e
códigos F1/F2 da planilha onde a fonte estava vazia. Também atualiza os cards
de cotação da página 1 do mesmo ativo (valor, variação do período do card e
data). Em **Próxima edição**, o fechamento desta semana vira a abertura da
semana seguinte.

### Revisão do professor (observações)

Observações aparecem só no editor, nunca no PDF. Elas ficam na aba
**Revisão** e em marcadores amarelos na margem da página. Há três formas de
criar uma:

- selecionar um trecho e clicar no ícone de balão na barrinha;
- clicar no mesmo ícone na barra de um bloco;
- clicar em **Geral**, na aba Revisão.

Cada observação pode receber respostas e ser marcada como resolvida.
Enquanto houver observações em aberto, a janela Verificar avisa.

Para o professor revisar online:

1. Na versão online, abra **Compartilhar** e convide o e-mail dele como
   **Editor**. Não ative o link público: com ele, um convidado de fora da
   organização perde o acesso de escrita.
2. Ele entra com a conta dele no claude.ai e abre o link. O app o reconhece
   como revisor e mostra **Modo revisão**: ele lê tudo e só comenta.
3. As regras do banco garantem isso também no servidor: só o dono grava
   edições e configurações, e observações qualquer Editor grava.

### Backup

Em **⋯ → Backup completo**, todas as edições, o padrão, os canais e as observações de revisão vão num arquivo só. Para restaurar, use **⋯ → Importar JSON**; as edições entram como novas. Recomendado uma vez por mês.

Por edição: em **⋯ → Exportar JSON**, cada edição vira um arquivo autossuficiente, com as
imagens embutidas. Para restaurar, use **⋯ → Importar JSON**. Edições antigas
são migradas automaticamente na importação.

---

## 2. Estrutura do projeto

```
index.html                 interface (toolbar, painéis, diálogos, sprite de ícones)
css/style.css              tokens de UI (claro/escuro), editor e a página A4
css/fonts/                 IBM Plex Sans (interface) e Source Serif 4 (página, Fase 6) — woff2, OFL
js/app.js                  aplicação inteira (IIFE única, ~5.200 linhas)
img/                       logo do parceiro (arquivo padrão do modelo)
tests/                     testes automatizados (ver seção 8)
desktop/                   aplicativo Windows: BoletimMaker.cs, build.ps1, ícone, DLLs do WebView2
dist/                      BoletimMaker-Beta.exe gerado pelo build
coleta/                    coletor da Pauta: coletar.mjs, canais.json, editorias.json
pautas/                    pautas geradas pela coleta (index.json + uma por semana ou busca)
.github/workflows/pauta.yml coleta agendada (sábado 08h) e manual no GitHub Actions
referencia/redesign/       plano de melhorias e telas de referência
```

O `js/app.js` começa com um **índice de seções**. Para achar uma parte do
código, procure o título da seção (ex.: `Armazenamento enxuto`, `Nuvem`,
`Verificação antes do PDF`).

---

## 3. Modelo de dados

### 3.1 Store (`localStorage["boletimMaker.v1"]`)

```js
{
  editions:   { "<id>": { id, name, updatedAt, data: <Edição> } },
  order:      ["<id>", ...],          // ordem no seletor de edições
  currentId:  "<id>",
  migrations: { "<flag>": true },     // migrações únicas já aplicadas
  customDefaultTemplate: <Edição>|null,
  images:     { "<hash>": "data:image/..." },   // banco local de imagens
  assetIndex: { "<hash>": "<assetId>" },        // imagem → arquivo online
  canais:     [{ id, nome, dominio, grupo, validado }], canaisAt,  // canais de referência
  notas:      { "<id>": <Observação> },  // revisão (online: cópia do banco)
  cloudLinked, cloudKnownIds          // estado da sincronização
}
```

Observação de revisão, fora da edição para não haver conflito com o texto:

```js
{ id, edicaoId, alvo: "<data-path>" | "block:<id>" | "edicao", trecho, texto,
  autorId, papel: "autor" | "revisor", criadoEm, status: "aberta" | "resolvida",
  respostas: [{ autorId, papel, texto, em }] }
```

Cálculo do termômetro: cada linha guarda as entradas em
`thermometer.groups[g].rows[r].calc = { tipo: "preco"|"taxa", fech, abDia, abSem, abAno }`.

### 3.2 Edição (`data`)

| Chave | Conteúdo |
|---|---|
| `meta` | Título, logos, `vars` (edição, data, cobertura, próxima), `overrides`, `status`, `refFormat`, `ignoredChecks`, tamanho de fonte global |
| `masthead`, `headline` | Cabeçalho e manchete (tag, título, linha fina, imagem, parágrafos) |
| `ticker` | Cotações: valor, variação, `tipo`, `periodo`, `refData`, `modoCor` |
| `columns` | Notícias: texto rico, `sourceId`, `status` |
| `sources` | Fontes: `{id, veiculo, titulo, url, publicadoEm, acessoEm}` |
| `weekTable`, `thermometer`, `calendar`, `superQuarta`, `glossary` | Blocos das páginas 1 e 2 |
| `footerFront`, `page2Header`, `footerBack`, `note` | Rodapés e cabeçalho do verso |
| `elements` | Camada livre: textos, imagens e linhas posicionados |
| `blockLayout` | Ajustes por bloco. Só grava o que difere do padrão (ver 4.2) |

Textos ricos são HTML sanitizado (`sanitizeRichHtml`). Ficam só
negrito/itálico/cor/tamanho em `span`, `br` e links `a.inline-link` com URL
validada (`safeHref`).

### 3.3 Referências de imagem

| Forma | Onde aparece |
|---|---|
| `imgref:<hash>` | No armazenamento local. Aponta para `store.images[hash]` |
| `/_blob/<assetId>` | No banco online. Arquivo enviado ao Artifact |
| `data:image/...` | No JSON exportado e durante a edição, antes de salvar |
| `img/...` ou `https://...` | Arquivos do projeto ou links externos |

---

## 4. Estratégia de armazenamento (uso por anos)

O `localStorage` comporta ~5 MB por site. O app foi otimizado para caber
centenas de edições:

1. **Banco de imagens com deduplicação.** Ao salvar, cada imagem em base64 é
   trocada por `imgref:<hash>` e guardada **uma única vez** em
   `store.images`. A logo repetida em 40 edições ocupa o espaço de uma.
   Imagens sem referência (incluindo histórico de desfazer) são removidas.
2. **Layout compacto.** `blockLayout` grava só os valores diferentes de
   `BLOCK_LAYOUT_DEFAULTS`. A leitura sempre passa por `readBlockLayout()`.
3. **Otimização de imagem no envio.** O lado maior fica em até 2000 px. Sem
   transparência, a imagem é convertida para JPEG 0,88, e o app mantém a versão
   menor.
4. **Online:** imagens viram arquivos (`/_blob/…`) enviados uma única vez
   (`store.assetIndex`). O banco guarda só texto (~17 KB por edição). Use
   **⋯ → Limpar imagens sem uso…** para apagar arquivos órfãos.

Medição: 41 edições com logo ocupam **568 KB** (antes: 5,3 MB, acima do limite).
A capacidade local estimada é de **~450 edições**. O Artifact tem 1 GB para
arquivos.

Se o salvamento falhar (cota cheia), o status fica vermelho e pede para exportar o JSON.

---

## 5. Migrações e compatibilidade

- A chave `boletimMaker.v1` **nunca muda**.
- Há dois mecanismos de mudança de formato:
  - **Migração única:** fica em `runOneTimeMigrations()`, marcada por uma flag em `store.migrations`.
  - **Normalização idempotente:** `ensureVars`, `ensurePhase5` e `fillDefaults` rodam em toda renderização e importação. Por isso também valem para edições vindas da nuvem ou de JSON antigo.
- Uma migração nunca apaga texto escrito pelo usuário. Campo editado à mão é
  marcado em `meta.overrides` e deixa de ser gerado automaticamente.

---

## 6. Sincronização online

- No Artifact, o app usa o banco do Artifact (capacidades `db`, `assets`,
  `downloads` e `user`, este com escopo `profile` para mostrar os nomes):
  - `editions/<id>` guarda `{name, updatedAt, json}`;
  - `app/settings` guarda `{json: {order, customDefaultTemplate, migrations, assetIndex, canais, canaisAt}, updatedAt}`;
  - `notas/<id>` guarda uma observação de revisão.
- Regras de acesso do banco:
  - `editions` e `app`: leitura `view`, escrita `owner`;
  - `notas`: leitura `view`, escrita `interact`.
  Ao republicar com outras capacidades, declare o conjunto completo, regras inclusive.
- Quem não é o dono (`user.me().isOwner === false`) entra no modo revisão.
- Os aparelhos recebem alterações em tempo real (`onSnapshot`). Em caso de
  conflito, vence a gravação mais recente. `touchEdition` garante que
  `updatedAt` nunca regrida, mesmo com relógios diferentes entre aparelhos.
- O `localStorage` continua sendo cache e funciona offline.

### Republicar após alterar o código

1. Gere a página do Artifact com o `<body>` do `index.html`, mais `<title>` e o link de `css/style.css`.
2. Publique de novo no **mesmo URL**, com os arquivos `css/style.css`, `js/app.js`, `css/fonts/*` e `img/*`.

Os dados no banco não são afetados.

---

## 7. PDF

| Versão | Como gera | Links |
|---|---|---|
| Local | `window.print()` com CSS `@media print` | Preservados com "Salvar como PDF" |
| Online | `html2canvas` 1.4.1 + `pdf-lib` 1.17.1 (cdnjs), com pré-visualização no app | Recriados como anotações clicáveis sobre a imagem da página |

Durante a captura, o app trava o zoom e esconde os elementos de tela
(`body.pdf-capture`). A medição de estouro também é feita "como impresso".

---

## 8. Testes

Requisito: Microsoft Edge instalado (usado em modo headless).

```powershell
powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1
powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1 -Only termometro,completa
```

| Suíte | Cobre |
|---|---|
| `fase1-correcoes` | Desfazer/refazer, falha de salvamento, importação antiga, estouro, aviso antes de imprimir |
| `fase2-variaveis` | Campos derivados, edição manual e migração de edição antiga |
| `fase3-verificacao` | Checagens da janela "Verificar" |
| `fase4-interface` | Painéis, camadas, seleção, atalhos, status, zoom |
| `fase5-cotacoes-fontes` | Cotações (cor, seta, data) e fontes numeradas, incluindo migração |
| `fase6-tipografia` | Fontes locais carregam (com acentos) e a página segue no tema clássico |
| `canais` | Canais de referência: semeadura, validação, domínio, veículo automático, remoção |
| `praticidade` | Próxima edição (número e datas) e backup completo (gerar e restaurar) |
| `calculadora` | Calculadora do termômetro: contas, bps, colar do Excel, ler o .xlsx, aplicar e próxima edição |
| `revisao` | Observações: pelo trecho e pelo bloco, marcador, Verificar, responder, resolver, backup, excluir |
| `atalhos` | Atalhos: F1, alterar, recusar reservados, conflito, padrão, AltGr ignorado, Ctrl+S, F4, Alt+1, F6, Ctrl+, e preferências de interface |
| `acervo` | Acervo: busca em várias edições, destaque, filtros, copiar notícia, exportar .csv, abrir a edição |
| `pauta` | Aba Pauta com GitHub simulado: leitura, filtros, confirmar e descartar, usar como fonte (inclusive link não confirmado), criar notícia com link por frase, filtro de canais, Buscar agora sem e com chave, exportar canais, importar |
| `ocultar-blocos`, `excluir-blocos`, `termometro` | Visibilidade e exclusão de blocos, tabela do termômetro |
| `completa` | Percurso completo de uso (87 verificações) |
| `nuvem` | Sincronização com `window.claude` simulado: banco vazio, edição remota, professor revisando e dono recebendo observações |
| `firebase` | Plataforma própria com Firebase simulado: tela de entrada e link, e-mail sem acesso, dono (acesso), professor editando ao mesmo tempo, revisor |

O executor monta páginas temporárias em `%TEMP%\boletim-tests`. Cada página
leva um script de preparo (`tests/setup/`), o app e a suíte (`tests/suites/`).
O executor lê o bloco `<pre>` de resultado e conta as linhas `OK`/`FALHA`.
O código de saída é 1 se houver qualquer falha.

> O preparo `limpo-salvamento-imediato.js` executa na hora os `setTimeout`
> de 400 ms (o salvamento adiado). Por isso, nas suítes, use esperas
> diferentes de 400 ms.

Para escrever uma suíte nova:

1. Crie `tests/suites/<nome>.js` usando `ok(nome, condição, detalhe)`.
2. Ao final, anexe o resultado num `<pre id="...">`.
3. Registre a suíte na tabela `$Suites` do `run-tests.ps1`.

---

## 9. Convenções

- Código e comentários em português, com estilo uniforme ao do arquivo.
  Não há dependências na versão local. As bibliotecas de PDF vêm de CDN só na versão online.
- Todo campo editável tem `data-path` (ex.: `columns.0.title`). Leitura e
  escrita passam por `getPath`/`setPath`.
- Toda alteração estrutural passa por `handleAction`, que registra o
  desfazer e agenda o salvamento.
- Cores e espaçamentos da interface usam os tokens `--ui-*`. A página A4 tem
  paleta própria e fica sempre clara.
- Tamanhos de fonte da página usam `calc(Xpt * var(--fs,1) * var(--fs-all,1))`:
  `--fs-all` é o tamanho global e `--fs` é o da caixa de texto.
- Antes de entregar uma alteração, rode `tests\run-tests.ps1`.

## 10. Pendências conhecidas

- Formato de referência ABNT NBR 6023 disponível, a validar com o professor.
- Fase 6 (tipografia) em andamento: etapa 2 concluída (fontes empacotadas); faltam variáveis CSS, temas clássico/novo e a medição.

Histórico de versões: [CHANGELOG.md](CHANGELOG.md).
