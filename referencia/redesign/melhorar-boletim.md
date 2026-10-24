---
description: Aplica, em fases, as melhorias de correção, interface, cotações/fontes e tipografia do Boletim Maker, usando as imagens de referência da pasta referencia/redesign
argument-hint: "[f1 | f2 | f3 | f4 | f5 | f6 | tudo]  (vazio = só a fase 1)"
---

# Melhorar o Boletim Maker

Você vai evoluir o editor de boletim desta pasta (`index.html`, `css/style.css`, `js/app.js`, sem backend, estado no `localStorage` com a chave `boletimMaker.v1`). O dono é o Vitor. O projeto é de faculdade (Liga de Mercado Financeiro / Lab CSA UNISO) e o PDF final é o que importa.

Argumento recebido: `$ARGUMENTS`

- Vazio: execute apenas a **Fase 1** e proponha seguir.
- `f1` a `f6`: execute só aquela fase.
- `tudo`: execute em ordem, mas **pare ao fim de cada fase** e espere o Vitor dizer "continuar".

Responda sempre em português do Brasil, direto, sem rodeios.

## Antes de mexer em qualquer coisa

1. Se a pasta for um repositório git, crie uma branch `melhorias-boletim`. Se não for, copie a pasta inteira para `../Boletim_Maker_backup_AAAA-MM-DD` (sem a própria pasta de backup dentro).
2. As edições do Vitor **não estão nos arquivos**: estão no `localStorage` do navegador. Peça a ele para clicar em **Exportar JSON** em cada edição que quiser preservar e guardar os arquivos antes de qualquer migração de dados. Não prossiga com as fases 2 e 5 sem essa confirmação.
3. Leia `js/app.js`, `css/style.css` e `index.html` inteiros.
4. Abra as quatro imagens em `referencia/redesign/` com a ferramenta de leitura de imagens e olhe cada uma com atenção.

## Como usar as imagens

| Arquivo | Mostra | Fase |
|---|---|---|
| `01-editor.png` | Editor completo: barra superior, variáveis da edição, painel esquerdo (blocos e camadas), painel direito (propriedades), barra de status com o uso de cada página | 3, 4 |
| `02-verificacao-pdf.png` | Janela "Antes de exportar o PDF" | 3 |
| `03-cotacoes-fontes.png` | Cards de cotação com data/tipo/cor, aba de fontes e rodapé gerado | 5 |
| `04-tipografia-antes-depois.png` | Mesma notícia com a tipografia atual e a proposta | 6 |

As imagens são **referência de intenção, não especificação de pixel**. Regras:

- As fontes nas imagens são substitutas (Inter e Caladea). A especificação real é **IBM Plex Sans** (interface) e **Source Serif 4** (página).
- Os textos, números e datas são exemplos. "94%" e "106%" de uso de página, "4 pendências", as sparklines dos cards e o botão "Atualizar valores" são **ilustrativos**: não implemente sparklines nem busca automática de cotações (ver "Fora do escopo").
- Aparecem itens que **não existem hoje e não devem ser criados agora**: bloco "Gráfico", "Mais blocos…", aba "Dados" e o menu "Mais ações" além do que já existe na barra.
- Onde a imagem e o código divergirem em algo funcional, o código existente vence; pergunte ao Vitor.

## Regras gerais

- Compatibilidade: nunca troque a chave `boletimMaker.v1`. Toda mudança de formato de dado entra como migração única em `runOneTimeMigrations()` (com flag em `store.migrations`) e **o importador de JSON antigo continua funcionando**. Campos novos têm valor padrão quando ausentes.
- Nada de CDN, framework, build ou dependência em tempo de execução. Fontes ficam em arquivo local.
- Não apague nem reescreva edições do usuário. Não renomeie edições.
- O PDF continua sendo A4, 2 páginas, gerado por `window.print()`.
- Uma fase por vez. Mudança visual só na fase que a pede.
- Verificação ao fim de cada fase (use o mesmo método de abrir o navegador e capturar tela que já foi usado neste projeto, se houver script): carregar a edição modelo, editar um texto, desfazer/refazer, importar um JSON antigo, imprimir em PDF e conferir 2 páginas A4 sem corte.
- Relatório ao fim de cada fase: o que mudou (arquivos e funções), como foi testado, o que ficou pendente e qualquer decisão que você precisou tomar. Depois aguarde.

## Decisões do Vitor (perguntar antes de implementar a fase)

Use AskUserQuestion se estiver disponível; senão, pergunte em texto e espere.

- **Fase 4:** manter o mover blocos por `translate` (deixa buraco no layout) ou trocar por reordenar na lista de camadas? O status Rascunho/Revisado/Aprovado entra? (Recomendação: não, a menos que mais de uma pessoa edite.)
- **Fase 5:** o professor exige ABNT? Qual norma/edição? O texto do rodapé gerado depende disso.
- **Fase 6:** a nova tipografia ocupa mais altura. Depois da medição, o Vitor escolhe: cortar notícias, usar blocos em meia largura ou aceitar 3 páginas.

## Fase 1 — Correções (sem mudar o visual)

1. **Estouro de página.** Medir cada `.page` (`scrollHeight` contra 297 mm em px, `297 * 96 / 25.4`) com debounce após render e edição (ResizeObserver ou MutationObserver). Mostrar um selo discreto (só na tela, `no-print`) no canto da página quando estourar e quanto. O CSS de impressão atual (`max-height:297mm; overflow:hidden`) corta o excedente em silêncio: manter, mas avisar. Antes de `window.print()`, se houver estouro, perguntar se quer imprimir assim mesmo.
2. **Histórico de desfazer.** `pushHistory()` é chamado em todo `focusin`, mesmo sem alteração, e enche a pilha com passos vazios. Empurrar o snapshot só no primeiro `input` depois do foco. O Ctrl+Z global usa `preventDefault` até dentro de texto e desfaz o estado inteiro: dentro de um campo `contenteditable`, deixar o desfazer nativo do navegador agir (o handler de `input` já regrava o estado) e usar o desfazer global só fora de campos de texto.
3. **Salvamento honesto.** `persist()` mostra "Salvo às HH:MM" mesmo quando o `setItem` falha (armazenamento cheio, imagens em base64). Fazer `persist()` devolver sucesso/falha e mostrar uma mensagem vermelha "Não foi possível salvar — exporte o JSON" em caso de falha. Verificar também o custo de `JSON.stringify` do estado inteiro 60 vezes no histórico quando há imagens grandes; se for um problema, limitar ou comprimir o histórico.
4. **Nome do arquivo exportado.** `ed.name.replace(/[^\w\-]+/g, "_")` perde acentos ("Edição" vira "Edi_o"). Normalizar com `normalize("NFD")` e remover marcas combinantes antes.
5. **Escapar URLs de imagem.** `imageSlot`, `logoImageLayer` e as prévias do inspetor inserem `src` sem `esc()`: um JSON importado pode injetar atributos HTML. Escapar e aceitar só `data:image/`, caminho relativo do projeto ou `http(s)`.
6. **`fixModeloLogoToMatchExemplo()`** roda em todo carregamento e sobrescreve a geometria da logo de uma edição pelo nome exato. Transformar em migração única com flag, ou remover. Confirmar com o Vitor antes de remover.
7. **Diálogo de impressão.** Testar se `@page{size:A4;margin:0}` e `print-color-adjust:exact` já bastam no Chrome e no Edge. Se sim, remover o `confirm()` com instruções de margem e fundo e deixar uma nota curta. Se não, manter e documentar o motivo.

Critério de aceite: nenhuma mudança visível, exceto o selo de estouro e as mensagens.

## Fase 2 — Variáveis da edição

Fonte única para o que hoje é digitado em vários lugares (número da edição, data, cobertura, próxima edição).

- Novo `meta.vars = { edicao, data, cobertura, proxima }`.
- Campos derivados dessas variáveis: `masthead.line1/line2`, `page2Header.editionLabel`, `footerBack.editionInfo`, subtítulos do termômetro e do calendário.
- Cada campo derivado tem um indicador de "editar manualmente" (override). Em edições existentes, a migração marca override ligado em todos para **não mudar nada** do que já está escrito.
- Faixa "Variáveis da edição" logo abaixo da barra superior (ver `01-editor.png`).
- Definir `document.title` antes de imprimir com o nome sugerido do PDF (ex.: `boletim_2026-01_edicao`), já que o navegador usa o título como nome do arquivo.
- Corrigir os textos fixos de data no modelo (por exemplo o título "29 DE ABRIL" do destaque) tornando-os editáveis sem depender da data.

## Fase 3 — Verificação antes do PDF (`02-verificacao-pdf.png`)

Substitui o `confirm()` do botão de exportar por uma janela de verificação. O botão "Verificar" da barra mostra o número de pendências.

Checagens, cada uma com o botão de ação indicado na imagem e a opção "ignorar":

1. **Estouro de página** (da Fase 1), com quanto estoura.
2. **Campos vazios ou placeholders**: resumo da manchete, parágrafos vazios, corpo de notícia vazio, ativo com "ATIVO"/"0,00".
3. **Fonte x link**: notícia sem URL; rótulo que cita um veículo cujo domínio não bate com o link (heurística simples e transparente).
4. **Números divergentes**: comparar o valor de cada card com números citados perto do nome do ativo no texto. É heurística e gera **falso positivo**: apresentar como "revisar", nunca como erro bloqueante.
5. **Variáveis** (Fase 2): campos em override com edição ou data diferente das variáveis.
6. **Cotações sem data/tipo** (Fase 5, quando existir).

"Exportar mesmo assim" sempre disponível. Nada aqui bloqueia o PDF.

## Fase 4 — Interface (`01-editor.png`)

Reorganizar sem perder nenhuma função existente.

- **Barra superior:** marca, seletor de edição com selo de status, menu "⋯" com Nova, Duplicar, Renomear, Excluir, Importar JSON, Exportar JSON, Definir como padrão, Padrão original. Desfazer/refazer em ícones. Estado de salvamento à direita. "Verificar" e "Exportar PDF" como único botão de destaque. Excluir sempre com confirmação.
- **Ícones SVG** inline no lugar de emoji e símbolos (↶ ↷ ✥ 💾 🗑).
- **Substituir `confirm()`, `prompt()` e `alert()`** por um modal e um aviso temporário simples, no mesmo estilo.
- **Painel esquerdo, aba "Estrutura":** "Adicionar bloco" usando **só** as ações que já existem (notícia, ativo, linha do calendário, termo do glossário, parágrafo, linha, faixa, caixa de texto) e a lista de camadas (clicar seleciona e rola até o bloco; travar por item; ↑/↓ para reordenar onde os dados são uma lista, como notícias e ativos). O "Travar tudo" vira um item de menu.
- **Painel direito, "Propriedades":** reorganizar o inspetor atual em seções (Conteúdo, Tipografia, Layout, Cor). Adicionar tamanho, entrelinha e alinhamento em `blockLayout` (com valores padrão iguais ao CSS atual).
- **Barra de status:** uso de cada página (%) e estouro, usando a medição da Fase 1.
- **Canvas:** botão × e alças de mover só no hover ou na seleção; mini barra flutuante no bloco selecionado (subir, descer, travar, duplicar, remover); atalhos Delete, Ctrl+D e setas (Shift = passo maior).
- **Fontes da interface:** IBM Plex Sans. A página continua com as fontes atuais até a Fase 6.

Não implementar: bloco "Gráfico", "Mais blocos…", aba "Dados", páginas dinâmicas.

## Fase 5 — Cotações e fontes (`03-cotacoes-fontes.png`)

**Cotações**

- Cada ativo ganha `refData` (data de referência), `tipo` (fechamento) e `periodo` (dia/semana). O card mostra "fech. 09/10 · semana".
- `modoCor`: `sinal` (verde sobe, vermelho cai, **derivado do sinal do valor**, não mais da seta marcada à mão) ou `neutro` (cinza). Migração: ativos existentes ficam como estão (`sinal`) para não mudar o PDF.
- Marca "manual" quando o valor foi digitado (hoje tudo é manual; só mostrar a marca quando houver uma origem automática, o que não existe ainda).

**Fontes**

- `sources[]` por edição: `{ id, veiculo, titulo, url, publicadoEm, acessoEm }`. Cada notícia ganha `sourceId`.
- Aba "Fontes" no painel esquerdo, como na imagem, com o estado Completa/Incompleta.
- Na página, no lugar da URL crua, o selo "[n] Veículo · data". O campo de URL continua na tela (`no-print`) para edição.
- Rodapé de fontes gerado a partir da lista. Formato conforme a decisão do Vitor sobre ABNT (ver "Decisões").
- Migração: para cada notícia com `linkUrl`, criar uma fonte com o veículo inferido do domínio e os demais campos vazios (Incompleta). Manter `linkText`/`linkUrl` até o Vitor confirmar que pode removê-los.

## Fase 6 — Tipografia (`04-tipografia-antes-depois.png`)

1. Centralizar em variáveis CSS: `--font-serif`, `--font-sans`, `--fs-body`, `--lh-body`, `--text-align`, tamanhos mínimos.
2. Empacotar as fontes em `css/fonts/` (woff2 de IBM Plex Sans e Source Serif 4, licença OFL), com `@font-face` local. Sem CDN.
3. Criar `meta.tipografia` com dois temas: `classico` (valores atuais) e `novo` (Source Serif 4, corpo 9,5 pt, entrelinha 1,4, alinhado à esquerda, `hyphens:auto`, rótulos mínimos de 7 pt). **Padrão: `classico` para todas as edições existentes.**
4. **Medir** o modelo nos dois temas (altura usada de cada página e número de páginas) e **apresentar a tabela ao Vitor**. Ele decide como lidar com o espaço (cortar, meia largura, 3 páginas) antes de `novo` virar o padrão de edições novas.
5. Tamanhos abaixo de 7 pt no print (rótulos dos cards, rodapés) entram na medição, pois subir para 7 pt também custa espaço.

## Fora do escopo desta rodada (não faça)

- Busca automática de cotações / botão "Atualizar valores" / qualquer chamada de rede.
- Qualquer uso de chave de API ou chamada de IA a partir da página.
- Páginas dinâmicas, bloco de gráfico, salvamento direto em pasta, módulos ES, build, framework.
- Reescrever o editor do zero.
