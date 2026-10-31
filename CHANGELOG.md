# Histórico de versões

Formato: alterações agrupadas por etapa do plano
(`referencia/redesign/melhorar-boletim.md`). Datas em AAAA-MM-DD.

## [1.4.1-beta] — 2026-10-31

- **Pedido de acesso:** quem entra e não está na lista pede acesso ao autor
  (com mensagem opcional). O dono vê um número na engrenagem e aprova ("edita
  e comenta" ou "só comenta") ou recusa em Configurações → Acesso. Ao ser
  aprovado, o boletim abre sozinho. Nova coleção `pedidos/<uid>` nas regras.
- **Mensagens de login em português**, com o que fazer. Exemplo:
  `auth/operation-not-allowed` = "a entrada por link no e-mail está desligada".
- **Correção:** a confirmação de "Sair desta conta" (e as outras confirmações)
  ficava por trás da janela de Configurações; agora fica sempre por cima.
- Testes: cenários `linkoff`, pedido de acesso aprovado e confirmação por cima.

## [1.4.0-beta] — 2026-10-25

- **Pauta da semana:** coleta automática das matérias de mercado financeiro dos canais de referência, agrupadas por tema.
  - Roda no GitHub Actions todo sábado às 08h e pelo botão **Buscar agora**; não precisa abrir o Claude.
  - Aba **Pauta** no topo (Ctrl+Alt+P), com filtros por palavra, editoria, grupo e veículo.
  - Confirmar ou descartar temas; **Usar como fonte** e **Criar notícia** em rascunho, com o link de cada frase.
  - Primeira pauta: semana de 19 a 23/10/2026 (290 matérias, 49 temas, todos os links confirmados).
- **Coletor** `coleta/coletar.mjs` (Node 20, sem dependências), canais em `coleta/canais.json`, dicionário de editorias em `coleta/editorias.json`.
- **Canais:** prioridade e método de coleta editáveis; botão **Coleta** para exportar os validados.
- **Configurações → Integrações:** chave do GitHub só neste aparelho, para Buscar agora e enviar os canais.
- Testes: suíte `pauta` (36 verificações).

## [1.3.0-beta] — 2026-10-24

- **Plataforma própria:** GitHub Pages (<https://vt-iak.github.io/Boletimmaker-lmfu/>)
  + Firebase. Login por link no e-mail ou Google, sem conta Claude.
  - Funciona no celular, notebook e PC, sem depender de computador ligado.
- **Acesso** (Configurações → Acesso, só o dono): editores (editam e
  comentam) e revisores (só comentam). Aba **Conta** com saída segura.
- **Edição simultânea:** junção campo a campo ao receber e, no envio, numa
  transação. Ninguém perde o que escreveu.
- **Regras de segurança** em `firestore.rules`. Imagens em `imagens/<hash>`.
- Testes: Firebase simulado (login, sem acesso, dono, professor editando
  ao mesmo tempo, revisor). 436 verificações.

## [1.2.0-beta] — 2026-10-24

- **Atalhos de teclado ajustáveis** (F1) e **Configurações** pessoais
  (Ctrl+, ou engrenagem): tema, zoom e painéis ao abrir, textos de ajuda.
  - Online, as configurações acompanham a conta em todos os aparelhos
    (área privada `data/users/<id>/prefs`).
  - O AltGr do teclado ABNT2 não dispara atalhos.
- **Acervo de matérias** (F6 ou lupa): busca em todas as edições
  (manchetes, notícias, glossário) com filtros.
  - Abre a matéria original.
  - Copia para a edição aberta.
  - Exporta a busca para .csv (Excel).
- Testes: suítes `atalhos` e `acervo` (417 verificações).

## [1.1.0-beta] — 2026-10-24

- **Calculadora do termômetro** (⋯ menu e painel do Termômetro): a conta da
  planilha Controle-de-cotacoes.xlsx. Preço em %, taxa em bps.
  - Importa o .xlsx direto ou aceita colar do Excel.
  - "Aplicar" preenche o termômetro e os cards da página 1.
  - A Próxima edição leva o fechamento para a abertura da semana.
- **Revisão do professor:** observações só no editor (aba Revisão, marcadores
  na margem, aviso no Verificar), com respostas e status Aberta/Resolvida.
  - Online, quem não é o dono entra em modo revisão (lê e comenta).
  - Novas regras do banco: só o dono grava edições.
  - Observações vão no backup completo.
- Testes: suítes `calculadora` e `revisao` e cenários `revisor`/`autor` na
  nuvem simulada (389 verificações).

## [1.0.0-beta] — 2026-10-23 · Versão Beta

- Versão nomeada **Beta (1.0.0-beta)**, com selo "Beta" ao lado da marca.
- **Aplicativo para Windows** (`dist\BoletimMaker-Beta.exe`, ~1,4 MB) para usar
  offline, sem instalação. Usa o WebView2 do Windows.
  - PDF nativo em A4 com links clicáveis, sem janela de impressão.
  - "Salvar como" do Windows para JSON e backup; links externos no navegador.
  - Código em `desktop/`. `build.ps1` compila com o C# do próprio Windows e
    roda um autoteste.
- O editor grava ao fechar a aba ou a janela (`pagehide`), sem perder a
  última digitação.

## [Canais e praticidade] — 2026-10-23

- **Canais de referência** (aba Fontes): lista do usuário, válida para todas as
  edições e sincronizada entre aparelhos. Vem preenchida com 10 canais, todos
  "a validar": Banco Central do Brasil, IBGE, B3, IFI/Senado, InfoMoney,
  O Povo, Reuters, Investing.com, Yahoo Finance e Advisor Perspectives.
  Cada canal tem nome, domínio, grupo e validação manual.
- Colar um link numa fonte preenche o veículo pelo canal do domínio. A
  Verificação usa os canais para conferir rótulo x link.
- **⋯ → Próxima edição…**: cria a edição seguinte com número +1 (01 na
  virada do ano) e datas +7 dias. Mantém layout e textos; fontes, status e
  pendências ignoradas recomeçam.
- **⋯ → Backup completo**: todas as edições, o padrão e os canais num arquivo
  (cada imagem uma vez só). Restaure em **Importar JSON**; as edições entram
  como novas.
- Novas suítes de testes: `canais` e `praticidade` (336 verificações no total).

## [Fase 6 — Tipografia, etapa 2] — 2026-10-20

- Fonte Source Serif 4 empacotada em `css/fonts/` (5 arquivos woff2, ~105 KB,
  licença OFL em `OFL-SourceSerif4.txt`), com `@font-face` local. Ainda não é
  usada pela página: o tema clássico (Arial/Georgia) segue inalterado.
- Nova suíte de testes `fase6-tipografia` (288 verificações no total).

## [Otimização] — 2026-10-20

### Armazenamento
- Banco local de imagens com deduplicação por hash (`imgref:<hash>`) e coleta
  de imagens sem uso. 41 edições passam de 5,3 MB para 568 KB.
- `blockLayout` grava só valores diferentes do padrão (`BLOCK_LAYOUT_DEFAULTS`).
- Imagens enviadas são reduzidas a até 2000 px e, sem transparência,
  convertidas para JPEG.
- Online: índice `assetIndex` evita enviar a mesma imagem duas vezes; novo
  comando **⋯ → Limpar imagens sem uso…**.
- JSON exportado continua autossuficiente (imagens embutidas) e mais compacto.

### Desempenho e manutenção
- Cache das checagens da janela "Verificar" (recalcula só após alterações).
- Código morto removido. Novo índice de seções no topo do `app.js`.
- Documentação técnica (`README.md`) e testes automatizados em `tests/`
  (executor `run-tests.ps1`).

## [Termômetro e blocos] — 2026-10

- Termômetro redesenhado:
  - tabela de largura fixa, com números alinhados à direita;
  - variação em verde/vermelho e seta automática pela variação da semana;
  - remoção de linha na coluna Fonte.
- Coluna **FONTE** (F1; F2…) com legenda logo abaixo da tabela, em várias linhas.
- Blocos opcionais podem ser **ocultados** ou **excluídos** de verdade (texto
  da manchete, nota de rodapé, linha fina, tag, imagem, Super Quarta) e
  restaurados em "Excluídos".
- Pré-visualização do PDF no app, com **Baixar** / **Cancelar**.
- Edição 01/2026 reconstruída a partir do PDF publicado.

## [Fase 5 — Cotações e fontes]

- Cotações:
  - tipo, período e data de referência ("fech. 24/04 · semana");
  - modo de cor: sinal, neutro ou seta.
- Lista de fontes da edição (veículo, título, URL, datas). As notícias citam a
  fonte por número e as fontes do rodapé são geradas automaticamente.
- Formato de referência simples; ABNT NBR 6023 disponível (a confirmar).

## [Modo escuro]

- Tema escuro para o editor (automático, claro ou escuro), em cinzas neutros.
  A página A4 permanece clara.

## [Fase 4 — Interface]

- Nova interface:
  - painel esquerdo com Estrutura, Camadas e Fontes;
  - painel direito de propriedades (Conteúdo, Tipografia, Layout, Cor);
  - mini barra de bloco, barra de status, zoom flutuante, menu ⋯ e avisos temporários.
- Reordenar notícias pelas camadas, bloquear e ocultar blocos.
- Status da edição e das notícias (Rascunho / Revisado / Aprovado).
- Ícones SVG próprios e fonte IBM Plex Sans local.

## [Fase 3 — Verificação]

- Janela **Verificar** antes do PDF. Aponta:
  - estouro de página e campos vazios;
  - links sem rótulo do veículo e fontes faltando.
- Cada aviso tem atalho até o campo e pode ser ignorado.

## [Fase 2 — Variáveis da edição]

- Número, data, cobertura e próxima edição preenchem automaticamente
  cabeçalho, verso, rótulos e rodapé. Campos editados à mão são preservados
  (marcados como "manual").

## [Fase 1 — Correções]

- Desfazer/refazer por edição. Focar um campo sem digitar não gera passo.
- Falha de salvamento aparece em vermelho, com orientação para exportar.
- Aviso de estouro antes de imprimir, com a medição feita "como impresso".
- Importação de JSON antigo com migração (link antigo vira link no texto).
- Proteção contra URL maliciosa em imagens. Nome do arquivo exportado
  sem acentos.

## [Base]

- Editor de duas páginas A4 com edição direta na página e salvamento local.
- Tamanho de fonte global (Boletim %) e por caixa de texto (Tamanho %).
- Vários hyperlinks por texto, criados pela bolha de seleção (🔗).
- Versão online no claude.ai com sincronização entre PC, notebook e celular.
- PDF online com links clicáveis (`html2canvas` + `pdf-lib`).
