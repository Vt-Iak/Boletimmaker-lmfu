/* ==========================================================================
   Boletim Maker — editor de boletim econômico semanal (A4, 2 páginas, PDF)

   Execução: arquivo único, JavaScript ES2017 sem dependências nem build.
   Aberto direto do disco (file://), salva no localStorage do navegador.
   Publicado como Artifact no claude.ai, também sincroniza com o banco
   online do Artifact (seção "Nuvem") e gera o PDF sem a janela de
   impressão (seção "PDF na versão online"). Documentação: README.md.
   Testes automatizados: tests/run-tests.ps1.

   Índice (procure pelo título da seção):
     Template padrão ............ modelos de edição (referência e em branco)
     Store / Armazenamento enxuto  localStorage, banco de imagens, compactação
     Nuvem ...................... sincronização online (db + arquivos)
     Caixa de diálogo própria ... confirmar/avisar/pedir nome, download
     Desfazer / Refazer ......... histórico por edição
     Utilidades ................. escape, sanitização de HTML, caminhos
     Variáveis da edição ........ campos gerados a partir de número/datas
     Fase 5 ..................... cotações (data/cor) e fontes da edição
     Render — Página 1 / 2 ...... montagem das duas folhas
     Seleção / Camada livre / Blocos  seleção e ajustes de bloco
     Estouro de página .......... medição como impresso, barra de status
     Verificação antes do PDF ... checagens e janela "Verificar"
     Painel de propriedades ..... painel direito
     Fontes / Camadas ........... painel esquerdo
     Reordenar / Mini barra / Aviso temporário
     Ações estruturais .......... handleAction (adicionar/remover/estilos)
     PDF na versão online ....... html2canvas + pdf-lib + pré-visualização
     Delegação de eventos / Arrastar / Toolbar / Formatação por seleção
     Atalhos / Zoom / Painéis / Tema / Boot

   Formato dos dados: chave localStorage "boletimMaker.v1" (nunca muda).
   Mudança de formato entra como migração única em runOneTimeMigrations()
   (flag em store.migrations) ou como ensure*() idempotente aplicado no
   render/importação, sempre preservando o que já foi escrito.
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "boletimMaker.v1";
  var APP_VERSION = "1.4.2-beta";
  // Logo oficial do parceiro (Laboratório de CSA UNISO), em cores originais —
  // arquivo enviado pelo usuário, salvo como asset do projeto em vez de
  // embutido em base64 aqui (mantém o app.js enxuto).
  var DEFAULT_PUBLISHER_LOGO = "img/logo-parceiro-csa-uniso.png";

  /* ---------------------------------------------------------------------
     Template padrão — reproduz a edição de referência (05/2026)
     --------------------------------------------------------------------- */
  // Linhas divisórias do cabeçalho: uma entre a logo e "BOLETIM ECONÔMICO"
  // na faixa navy, outra entre a data/edição e "Publicado por" na barra
  // slim — mesma convenção visual da logo do parceiro (ícone | linha |
  // texto). São elementos "linha" livres normais: arraste, redimensione
  // (Comprimento/Espessura no painel) ou apague como qualquer outro.
  function headerDividerElements() {
    return [
      { id: "hdr-div-band", page: 1, type: "line", x: 152, y: 52, width: 2, height: 110, bgColor: "rgba(255,255,255,.55)", locked: false },
      { id: "hdr-div-slim", page: 1, type: "line", x: 502, y: 8, width: 1.5, height: 24, bgColor: "rgba(17,17,17,.18)", locked: false }
    ];
  }

  function referenceTemplate() {
    return {
      meta: {
        title: "PANORAMA ECONÔMICO",
        subtitle: "CONJUNTURA FINANCEIRA, POLÍTICA E ECONÔMICA — BRASIL E MUNDO",
        logo: null,
        logoWidth: 185,
        logoHeight: 154,
        logoX: 0,
        logoY: 0,
        logoLocked: false,
        logoZoom: 100,
        logoFitX: 50,
        logoFitY: 50,
        publisherLogo: DEFAULT_PUBLISHER_LOGO,
        publisherLogoWidth: 80,
        publisherLogoHeight: 26,
        publisherLogoX: 0,
        publisherLogoY: 0,
        publisherLogoLocked: false,
        publisherLogoZoom: 100,
        publisherLogoFitX: 50,
        publisherLogoFitY: 50,
        vars: { edicao: "05/2026", data: "2026-04-25", coberturaInicio: "2026-04-19", coberturaFim: "2026-04-24", proxima: "2026-05-02" },
        overrides: {},
        phase5: true,
        refFormat: "simples"
      },
      locked: false,
      elements: headerDividerElements(),
      blockLayout: {},
      masthead: {
        line1: "SÁBADO, 25 DE ABRIL DE 2026 · SEMANAL · EDIÇÃO COMPACTA",
        line2: "EDIÇÃO N° 05/2026 · COBERTURA 19 A 24 DE ABRIL"
      },
      headline: {
        tag: "CHOQUE DE OFERTA",
        title: "Ormuz volta a fechar, Brent sobe 18% e o Copom perde margem de manobra",
        deck: "Ibovespa interrompe 16 recordes consecutivos e cai 2,55% na semana. O real resiste em R$ 4,98, sustentado pelo diferencial de juros. Decisão da Selic sai na quarta, 29/04.",
        image: null,
        paragraphs: [
          "O Irã reforçou o controle sobre o Estreito de Ormuz — rota de cerca de um quarto do petróleo marítimo global — e suspendeu as negociações com os EUA. O Brent saiu de US$ 90 para US$ 106,12 no fechamento de sexta, alta semanal de 17,8%, a maior desde 2022. O canal de transmissão para o Brasil é duplo: beneficia Petrobras e exportadoras de commodities, mas pressiona combustíveis, frete e a inflação implícita de 12 meses.",
          "O Boletim Focus desta segunda já reflete o desconforto: a mediana do IPCA 2026 subiu pela sexta semana seguida, para 4,80%, acima do teto da meta, e a Selic projetada para o fim do ano passou de 12,75% para 13,00%. Com a Selic corrente em 14,75%, o Copom chega à reunião de 28 e 29/04 com três caminhos: cortar 0,25 p.p., pausar para observar o repasse do petróleo, ou — cenário improvável — reabrir o debate sobre alta. O mercado está dividido entre os dois primeiros.",
          "Por que isso importa: petróleo em alta chega ao bolso por três vias — combustível, frete e alimento. Isso eleva a inflação esperada, trava o ciclo de corte da Selic e mantém caro o crédito, do financiamento imobiliário ao rotativo do cartão."
        ]
      },
      ticker: [
        { label: "IBOVESPA", value: "190.745", change: "-2,55%", trend: "down", tipo: "fechamento", periodo: "semana", refData: "", modoCor: "sinal" },
        { label: "DÓLAR (USD/BRL)", value: "R$ 4,98", change: "+0,28%", trend: "up", tipo: "fechamento", periodo: "semana", refData: "", modoCor: "sinal" },
        { label: "BRENT", value: "US$ 106,12", change: "+17,82%", trend: "up", tipo: "fechamento", periodo: "semana", refData: "", modoCor: "sinal" },
        { label: "OURO", value: "US$ 4.741", change: "-2,84%", trend: "down", tipo: "fechamento", periodo: "semana", refData: "", modoCor: "sinal" },
        { label: "S&P 500", value: "7.165", change: "+0,60%", trend: "up", tipo: "fechamento", periodo: "semana", refData: "", modoCor: "sinal" },
        { label: "BITCOIN", value: "US$ 78.126", change: "-1,08%", trend: "down", tipo: "fechamento", periodo: "semana", refData: "", modoCor: "sinal" }
      ],
      columns: [
        {
          tag: "WALL STREET",
          title: "S&P 500 e Nasdaq renovam máximas históricas apesar da tensão",
          body: "Intel disparou 23% em um único pregão após resultado do 1T26 e contrato de data-centers de IA dentro do CHIPS Act. O índice descolou do risco geopolítico: S&P +0,60% e Nasdaq +1,50% na semana, contra Dow -0,40%.",
          linkText: "Ler análise completa →",
          image: null
        },
        {
          tag: "BRASIL · POLÍTICA MONETÁRIA",
          title: "Focus eleva IPCA 2026 pela 6ª semana e projeta Selic a 13%",
          body: "Mediana de ~130 instituições foi a 4,80%, acima do teto de 4,5%. A revisão veio antes do agravamento em Ormuz, o que sugere pressão adicional na leitura da próxima segunda.",
          linkText: "Ver série do Focus →",
          image: null
        },
        {
          tag: "FISCAL",
          title: "Pacote eleitoral avança e contamina a curva de juros",
          body: "Isenção de IR até R$ 5.000, isenção sobre PLR e redução de jornada. A IFI estima até R$ 148 bi fora do limite fiscal em 2026, com dívida bruta caminhando para 84% do PIB.",
          linkText: "Relatório da IFI →",
          image: null
        }
      ],
      note: "Os textos em azul abrem a fonte original em nova aba.",
      weekTable: {
        title: "A SEMANA, DIA A DIA — IBOVESPA",
        rows: [
          { day: "SEG 20/04", text: "Abertura em leve alta aos 196.132 pontos, liquidez fraca na véspera do feriado. Sabesp (+4,36%) lidera após acelerar plano de investimentos. Brent já sobe 1,6%.", change: "+0,20%", trend: "up" },
          { day: "TER 21/04", text: "Feriado de Tiradentes, B3 fechada. Lá fora, S&P e Nasdaq renovam máximas e o Treasury de 10 anos recua a 4,28% em busca de proteção.", change: "Sem pregão", trend: "flat" },
          { day: "QUA 22/04", text: "Reabertura em queda forte, abaixo dos 193 mil. Bancos lideram perdas (Itaú -2,1%, Bradesco -1,9%) com DI mais alto; dólar volta a superar R$ 5,00.", change: "-1,66%", trend: "down" },
          { day: "QUI 23/04", text: "Perdas se estendem aos 191.378 pontos. Yduqs cai 3,8% após relatório do JP Morgan. CPI preliminar da Zona do Euro vem a +2,8% a.a. e pressiona o BCE.", change: "-0,78%", trend: "down" },
          { day: "SEX 24/04", text: "Fecha aos 190.745 pontos, com dólar recuando a R$ 4,98 por fluxo estrangeiro positivo. Brent encerra a US$ 106,12 e o salto de 23% da Intel leva o Nasdaq a novo recorde.", change: "-0,33%", trend: "down" }
        ]
      },
      footerFront: {
        fontes: "Fontes: Banco Central do Brasil · IBGE · B3 · Reuters · InfoMoney · Investing.com · Trading Economics · IFI/Senado",
        autoria: "Autoria: João Vitor C. Soares",
        verso: "Verso: Termômetro da Semana e agenda de 27/04 a 02/05.",
        disclaimer: "Conteúdo informativo e educacional. Não constitui recomendação de investimento nem consultoria de valores mobiliários."
      },
      page2Header: {
        editionLabel: "EDIÇÃO N° 05/2026",
        note: "VERSO · DADOS E AGENDA"
      },
      thermometer: {
        title: "Termômetro da Semana",
        subtitle: "Fechamentos de sexta-feira, 24/04/2026. Variação de 2026 no acumulado do ano.",
        groups: [
          {
            name: "BRASIL",
            rows: [
              { ativo: "Ibovespa (pts)", fechamento: "190.745", varDia: "-0,33%", varSemana: "-2,55%", var2026: "+18,80%", trend: "down" },
              { ativo: "USD/BRL (R$)", fechamento: "4,9802", varDia: "-0,60%", varSemana: "+0,28%", var2026: "-9,90%", trend: "up" },
              { ativo: "EUR/BRL (R$)", fechamento: "5,4192", varDia: "-0,42%", varSemana: "-0,53%", var2026: "-7,15%", trend: "down" },
              { ativo: "DI Jan/27 (%)", fechamento: "14,38", varDia: "+8 bps", varSemana: "+22 bps", var2026: "-220 bps", trend: "up" },
              { ativo: "Selic Atual (%)", fechamento: "14,75", varDia: "—", varSemana: "—", var2026: "-25 bps", trend: "up" }
            ]
          },
          {
            name: "MUNDO",
            rows: [
              { ativo: "S&P 500 (pts)", fechamento: "7.165,08", varDia: "+0,80%", varSemana: "+0,60%", var2026: "+12,80%", trend: "up" },
              { ativo: "Nasdaq (pts)", fechamento: "24.836,60", varDia: "+1,63%", varSemana: "+1,50%", var2026: "+15,40%", trend: "up" },
              { ativo: "Dow Jones (pts)", fechamento: "49.230,71", varDia: "-0,16%", varSemana: "-0,40%", var2026: "+8,20%", trend: "down" },
              { ativo: "Brent (US$/bbl)", fechamento: "106,12", varDia: "+0,30%", varSemana: "+17,82%", var2026: "+38,40%", trend: "up" },
              { ativo: "WTI (US$/bbl)", fechamento: "97,40", varDia: "+0,70%", varSemana: "+14,53%", var2026: "+33,80%", trend: "up" },
              { ativo: "Ouro (US$/oz)", fechamento: "4.740,90", varDia: "+0,35%", varSemana: "-2,84%", var2026: "+18,22%", trend: "down" },
              { ativo: "Bitcoin (US$)", fechamento: "78.126", varDia: "+0,40%", varSemana: "-1,08%", var2026: "+5,40%", trend: "down" },
              { ativo: "T-Bond 10 anos (%)", fechamento: "4,31", varDia: "-3 bps", varSemana: "-7 bps", var2026: "-29 bps", trend: "down" },
              { ativo: "VIX (volatilidade)", fechamento: "18,2", varDia: "+0,9", varSemana: "+15,2%", var2026: "+9,6%", trend: "up" }
            ]
          }
        ]
      },
      calendar: {
        title: "O Que Vem Por Aí",
        subtitle: "Calendário de eventos que devem mexer com os mercados — semana de 27 de abril a 2 de maio.",
        rows: [
          { data: "Seg, 27/04", evento: "Boletim Focus + Crédito bancário (mar)", pais: "Brasil", relevancia: "MÉDIA", bold: false },
          { data: "Seg, 27/04", evento: "Decisão de juros do Banco do Japão", pais: "Japão", relevancia: "ALTA", bold: false },
          { data: "Ter, 28/04", evento: "Confiança do Consumidor (Conference Board)", pais: "EUA", relevancia: "MÉDIA", bold: false },
          { data: "Ter, 28/04", evento: "PMIs Caixin (industrial e serviços)", pais: "China", relevancia: "ALTA", bold: false },
          { data: "Ter–Qua, 28-29/04", evento: "Reunião do Copom — Decisão da Selic", pais: "Brasil", relevancia: "ALTA", bold: true },
          { data: "Qua, 29/04", evento: "IPCA-15 de abril (prévia da inflação)", pais: "Brasil", relevancia: "ALTA", bold: false },
          { data: "Qua, 29/04", evento: "Decisão FOMC + coletiva Powell", pais: "EUA", relevancia: "ALTA", bold: true },
          { data: "Qui, 30/04", evento: "PIB EUA preliminar 1T26", pais: "EUA", relevancia: "ALTA", bold: false },
          { data: "Qui, 30/04", evento: "IGP-M abril completo + IPP março", pais: "Brasil", relevancia: "MÉDIA", bold: false },
          { data: "Qui, 30/04", evento: "CPI Zona do Euro abril", pais: "Eurozona", relevancia: "ALTA", bold: false },
          { data: "Sex, 01/05", evento: "FERIADO — Dia do Trabalho (B3 fechada)", pais: "Brasil/Mundo", relevancia: "—", bold: false },
          { data: "Sáb, 02/05", evento: "Próxima edição do Panorama Econômico", pais: "—", relevancia: "—", bold: false }
        ]
      },
      superQuarta: {
        title: "A “SUPER QUARTA” DE 29 DE ABRIL",
        body: "Em um único dia o Brasil divulga o IPCA-15 e o Copom anuncia a Selic, enquanto o Fed decide os juros nos EUA. É a combinação capaz de redefinir o tom da curva de juros e do câmbio até o payroll de maio."
      },
      glossary: {
        title: "GLOSSÁRIO RÁPIDO",
        items: [
          { term: "Carry trade", def: "Tomar recurso em moeda de juro baixo e aplicar onde o juro é alto. Sustenta o real mesmo em semanas de estresse." },
          { term: "DI futuro", def: "Contrato da B3 que precifica a expectativa de juros para uma data. É o termômetro da curva." },
          { term: "bps (pontos-base)", def: "Centésimo de ponto percentual. 25 bps = 0,25 p.p. Padrão para variação de juros." },
          { term: "IFI", def: "Instituição Fiscal Independente do Senado. Produz projeções fiscais sem vínculo com o Executivo." }
        ]
      },
      sources: [],
      footerBack: {
        editionInfo: "Panorama Econômico — Edição N° 05/2026 · Cobertura 19/04 a 24/04/2026 · Emitido em 25/04/2026 · Próxima edição: 02/05/2026.",
        fontes: "Fontes: BCB · IBGE · B3 · Investing.com · Reuters · InfoMoney · Money Times · ADVFN · CNBC · Trading Economics · IFI/Senado · FGV/IBRE.",
        disclaimer: "Conteúdo exclusivamente informativo e educacional. Não constitui recomendação de investimento, consultoria de valores mobiliários, oferta de venda ou solicitação de compra de qualquer ativo. Variações refletem fechamentos públicos e podem ser revisadas pelas fontes oficiais."
      }
    };
  }

  function blankTemplate() {
    return {
      meta: {
        title: "SEU BOLETIM", subtitle: "SUBTÍTULO — EDITE AQUI",
        logo: null, logoWidth: 185, logoHeight: 154, logoX: 0, logoY: 0, logoLocked: false, logoZoom: 100, logoFitX: 50, logoFitY: 50,
        publisherLogo: DEFAULT_PUBLISHER_LOGO, publisherLogoWidth: 80, publisherLogoHeight: 26, publisherLogoX: 0, publisherLogoY: 0, publisherLogoLocked: false, publisherLogoZoom: 100, publisherLogoFitX: 50, publisherLogoFitY: 50,
        vars: emptyVars(), overrides: {}, phase5: true, refFormat: "simples"
      },
      locked: false,
      elements: headerDividerElements(),
      blockLayout: { "headline-body": { x: 0, y: 0, locked: false, fontFamily: null, textColor: null, removed: true }, note: { x: 0, y: 0, locked: false, fontFamily: null, textColor: null, removed: true } },
      masthead: { line1: "DIA, DD DE MÊS DE AAAA · PERIODICIDADE", line2: "EDIÇÃO N° 00/0000 · COBERTURA" },
      headline: {
        tag: "CATEGORIA",
        title: "Manchete principal da edição",
        deck: "Resumo curto de uma a duas linhas sobre a manchete.",
        image: null,
        paragraphs: []
      },
      ticker: [{ label: "ATIVO", value: "0,00", change: "+0,00%", trend: "flat", tipo: "fechamento", periodo: "semana", refData: "", modoCor: "sinal" }],
      columns: [{ tag: "SEÇÃO", title: "Título da notícia", body: "", linkText: "Leia mais →", image: null }],
      note: "",
      weekTable: { title: "A SEMANA, DIA A DIA", rows: [{ day: "SEG", text: "", change: "+0,00%", trend: "flat" }] },
      footerFront: { fontes: "Fontes: ", autoria: "Autoria: ", verso: "Verso: ", disclaimer: "Conteúdo informativo e educacional. Não constitui recomendação de investimento nem consultoria de valores mobiliários." },
      page2Header: { editionLabel: "EDIÇÃO N° 00/0000", note: "VERSO · DADOS E AGENDA" },
      thermometer: { title: "Termômetro da Semana", subtitle: "", fontesLegenda: "", groups: [{ name: "GRUPO", rows: [{ ativo: "", fechamento: "", varDia: "", varSemana: "", var2026: "", trend: "flat", fonte: "" }] }] },
      calendar: { title: "O Que Vem Por Aí", subtitle: "", rows: [{ data: "", evento: "", pais: "", relevancia: "MÉDIA", bold: false }] },
      superQuarta: { title: "DESTAQUE DA SEMANA", body: "" },
      glossary: { title: "GLOSSÁRIO RÁPIDO", items: [{ term: "", def: "" }] },
      sources: [],
      footerBack: { editionInfo: "", fontes: "Fontes: ", disclaimer: "Conteúdo exclusivamente informativo e educacional. Não constitui recomendação de investimento, consultoria de valores mobiliários, oferta de venda ou solicitação de compra de qualquer ativo." }
    };
  }

  /* ---------------------------------------------------------------------
     Store — coleção de edições persistida em localStorage
     --------------------------------------------------------------------- */
  var store = { editions: {}, order: [], currentId: null };

  function uid() {
    return "ed_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function newElementId() {
    return "el_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  }

  // A logo de "Edição 05/2026 (modelo)" ficou com uma geometria distorcida
  // (não quadrada), resquício de uma edição manual anterior ao bloqueio de
  // proporção 1:1 da logo. "Edição de Exemplo" é a referência que o usuário
  // definiu como correta, então alinhamos a geometria (tamanho e posição) do
  // modelo à do exemplo — a imagem da logo em si de cada edição não é
  // alterada, só onde/como ela é exibida. Roda só uma vez (ver
  // store.migrations.modeloLogoMatch em runOneTimeMigrations): rodar em todo
  // carregamento desfaria de novo um ajuste manual que o usuário tenha feito
  // depois na logo do modelo.
  function fixModeloLogoToMatchExemplo() {
    var modelo = null, exemplo = null;
    Object.keys(store.editions).forEach(function (id) {
      var ed = store.editions[id];
      if (ed.name === "Edição 05/2026 (modelo)") modelo = ed;
      if (ed.name === "Edição de Exemplo") exemplo = ed;
    });
    if (!modelo || !exemplo || !modelo.data || !exemplo.data) return;
    var src = exemplo.data.meta, dst = modelo.data.meta;
    if (!src || !dst) return;
    dst.logoWidth = src.logoWidth;
    dst.logoHeight = src.logoHeight;
    dst.logoX = src.logoX;
    dst.logoY = src.logoY;
    dst.logoLocked = src.logoLocked;
  }

  // Edições já salvas antes da logo do parceiro existir não têm esse campo
  // preenchido — como o arquivo oficial já está disponível no projeto,
  // preenchemos automaticamente em vez de exigir upload manual de novo.
  // Preenchimentos de "uma vez só": rodam apenas se ainda não rodaram
  // (marcados em store.migrations), para que apagar a logo do parceiro ou
  // uma linha divisória depois não a traga de volta sozinha no próximo
  // carregamento.
  // Completa o que faltar numa edição (JSON antigo ou editado à mão, edição
  // vinda de outra versão) com os valores padrão da edição em branco — só
  // preenche o que está ausente, nunca troca o que existe. Sem isso, uma
  // seção faltando quebrava o render e travava o editor nessa edição.
  function fillDefaults(target, defaults) {
    Object.keys(defaults).forEach(function (k) {
      var dv = defaults[k], tv = target[k];
      // Ajustes de layout (inclusive blocos excluídos na edição em branco)
      // nunca vêm do modelo: uma edição existente sem eles fica como está.
      if (k === "blockLayout") {
        if (!tv || typeof tv !== "object") target[k] = {};
        return;
      }
      if (tv === undefined || (tv === null && dv && typeof dv === "object")) {
        target[k] = k === "elements" ? [] : JSON.parse(JSON.stringify(dv));
      } else if (dv && typeof dv === "object" && !Array.isArray(dv) && tv && typeof tv === "object" && !Array.isArray(tv)) {
        fillDefaults(tv, dv);
      }
    });
    return target;
  }

  // Também usada ao importar JSON (edições exportadas antes da mudança).
  function moveNewsLinksInline(d) {
    (d && d.columns || []).forEach(function (c) {
      var href = safeHref(c.linkUrl);
      if (href && c.linkText) c.linkText = '<a href="' + esc(href) + '">' + c.linkText + "</a>";
      delete c.linkUrl;
    });
  }

  function runOneTimeMigrations() {
    store.migrations = store.migrations || {};
    if (!store.migrations.publisherLogo) {
      Object.keys(store.editions).forEach(function (id) {
        var m = store.editions[id].data && store.editions[id].data.meta;
        if (m && !m.publisherLogo) m.publisherLogo = DEFAULT_PUBLISHER_LOGO;
      });
      store.migrations.publisherLogo = true;
    }
    if (!store.migrations.headerDividers) {
      Object.keys(store.editions).forEach(function (id) {
        var d = store.editions[id].data;
        if (!d) return;
        d.elements = d.elements || [];
        var ids = d.elements.map(function (e) { return e.id; });
        headerDividerElements().forEach(function (div) {
          if (ids.indexOf(div.id) === -1) d.elements.push(div);
        });
      });
      store.migrations.headerDividers = true;
    }
    // Título, subtítulo, data e edição eram estilizados via o bloco
    // "masthead" (compartilhado); agora cada um tem posição/cor/fonte
    // próprias. Uma edição que já tinha cor/fonte customizada em
    // "masthead" antes disso leva essa mesma customização para os 4
    // blocos novos, para não "perder" o ajuste já feito.
    if (!store.migrations.independentMastheadText) {
      Object.keys(store.editions).forEach(function (id) {
        var d = store.editions[id].data;
        var bl = d && d.blockLayout && d.blockLayout.masthead;
        if (!bl || (!bl.fontFamily && !bl.textColor)) return;
        ["masthead-title", "masthead-subtitle", "slim-date", "slim-edition"].forEach(function (blockId) {
          d.blockLayout[blockId] = d.blockLayout[blockId] || { x: 0, y: 0, locked: false, fontFamily: null, textColor: null };
          if (!d.blockLayout[blockId].fontFamily) d.blockLayout[blockId].fontFamily = bl.fontFamily;
          if (!d.blockLayout[blockId].textColor) d.blockLayout[blockId].textColor = bl.textColor;
        });
      });
      store.migrations.independentMastheadText = true;
    }
    // A posição padrão original da linha "hdr-div-band" (x:197) caía em
    // cima do título (que agora começa numa posição fixa, não mais
    // centralizada) e chegava a bloquear o clique na alcinha de arrastar
    // dele. Reposiciona só quem ainda está exatamente no valor antigo —
    // se o usuário já arrastou a linha para outro lugar, não mexe.
    if (!store.migrations.headerDividerBandXFix) {
      Object.keys(store.editions).forEach(function (id) {
        var d = store.editions[id].data;
        var el = d && d.elements && d.elements.filter(function (e) { return e.id === "hdr-div-band"; })[0];
        if (el && el.x === 197) el.x = 152;
      });
      store.migrations.headerDividerBandXFix = true;
    }
    // fixModeloLogoToMatchExemplo() rodava em todo loadStore(), fora do
    // mecanismo de migração — sobrescrevia a logo do modelo sem parar nunca,
    // mesmo que o usuário tivesse ajustado manualmente depois. Agora roda só
    // uma vez.
    if (!store.migrations.modeloLogoMatch) {
      fixModeloLogoToMatchExemplo();
      store.migrations.modeloLogoMatch = true;
    }
    // O link dos blocos de notícia tinha um campo de URL separado
    // (columns[i].linkUrl); agora links ficam dentro do próprio texto
    // (barrinha de seleção → 🔗). Leva a URL que já existia para dentro do
    // texto do link, para não perder nenhum link já cadastrado.
    if (!store.migrations.inlineNewsLinks) {
      Object.keys(store.editions).forEach(function (id) {
        moveNewsLinksInline(store.editions[id].data);
      });
      moveNewsLinksInline(store.customDefaultTemplate);
      store.migrations.inlineNewsLinks = true;
    }
    // Fase 2: variáveis da edição. Edições existentes ganham meta.vars com
    // todos os campos derivados marcados como "editados à mão" — nada do
    // que já está escrito muda até a pessoa escolher usar o automático.
    if (!store.migrations.phase2Vars) {
      Object.keys(store.editions).forEach(function (id) {
        ensureVars(store.editions[id].data);
      });
      ensureVars(store.customDefaultTemplate);
      store.migrations.phase2Vars = true;
    }
    // Fase 5: cotações com dado/período/data/cor e lista de fontes
    if (!store.migrations.phase5) {
      Object.keys(store.editions).forEach(function (id) { ensurePhase5(store.editions[id].data); });
      ensurePhase5(store.customDefaultTemplate);
      store.migrations.phase5 = true;
    }
    // Canais de referência: semeia a lista inicial uma vez (cada canal nasce
    // "a validar"); depois disso a lista é só do usuário.
    if (!store.migrations.canais) {
      if (!Array.isArray(store.canais)) store.canais = defaultCanais();
      store.migrations.canais = true;
    }
    // Pauta: os canais padrão ganham prioridade e método de coleta (sem mexer
    // no que o usuário já editou nem em canais que ele criou).
    if (!store.migrations.canaisColeta) {
      var mudou = false;
      (Array.isArray(store.canais) ? store.canais : []).forEach(function (c) {
        var p = COLETA_PADRAO[c.id];
        if (!p) return;
        if (c.prioridade == null) { c.prioridade = p.prioridade; mudou = true; }
        if (!c.coleta) { c.coleta = JSON.parse(JSON.stringify(p.coleta)); mudou = true; }
      });
      if (mudou) store.canaisAt = Date.now();
      store.migrations.canaisColeta = true;
    }
  }

  function loadStore() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.editions) {
          store = parsed;
          runOneTimeMigrations();
          persist();
          return;
        }
      } catch (e) { /* fall through to seed */ }
    }
    var id = uid();
    store = {
      editions: {},
      order: [id],
      currentId: id,
      // referenceTemplate() já nasce com logo do parceiro e divisórias —
      // marca como já migrado para não reinserir o que o usuário apagar depois.
      migrations: { publisherLogo: true, headerDividers: true, independentMastheadText: true, headerDividerBandXFix: true, modeloLogoMatch: true, inlineNewsLinks: true, phase2Vars: true, phase5: true, canais: true, canaisColeta: true },
      canais: defaultCanais()
    };
    store.editions[id] = { id: id, name: "Edição 05/2026 (modelo)", updatedAt: Date.now(), data: referenceTemplate() };
    persist();
  }

  // Devolve true/false (sucesso/falha) em vez de assumir que sempre deu
  // certo — sem isso, "Salvo às HH:MM" aparecia mesmo quando o
  // armazenamento estava cheio (comum com imagens em base64) e o usuário
  // perdia trabalho sem nenhum aviso.
  /* ---------------------------------------------------------------------
     Armazenamento enxuto
     - Banco de imagens local: cada imagem (data:image/...) fica uma vez só em
       store.images[hash]; as edições guardam "imgref:<hash>". Antes, cada
       edição duplicada carregava a própria cópia (~120 KB por logo) e o
       limite de ~5 MB do navegador acabava em algumas dezenas de edições.
       Imagens sem uso (nem em edições, nem no padrão, nem no desfazer) saem.
     - Ajustes de bloco iguais ao padrão não são gravados (compactLayout).
     --------------------------------------------------------------------- */
  // Hash rápido (cyrb53) — identifica o conteúdo da imagem; não é criptográfico.
  function contentHash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  function internalizeImages() {
    store.images = store.images || {};
    var used = {};
    function walk(o) {
      if (!o || typeof o !== "object") return;
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (typeof v === "string") {
          if (/^data:image\//i.test(v) && v.length > 1024) {
            var h = contentHash(v);
            store.images[h] = v;
            o[k] = "imgref:" + h;
            used[h] = 1;
          } else if (/^imgref:/.test(v)) {
            used[v.slice(7)] = 1;
          }
        } else if (v && typeof v === "object") {
          walk(v);
        }
      });
    }
    Object.keys(store.editions).forEach(function (id) { walk(store.editions[id].data); });
    walk(store.customDefaultTemplate);
    // Desfazer/refazer podem trazer de volta uma imagem já removida
    undoStack.concat(redoStack).forEach(function (snap) {
      (snap.match(/imgref:[0-9a-z]+/g) || []).forEach(function (r) { used[r.slice(7)] = 1; });
    });
    Object.keys(store.images).forEach(function (h) { if (!used[h]) delete store.images[h]; });
  }

  // Cópia da edição com as imagens por extenso (para exportar JSON portátil).
  function withInlineImages(data) {
    return JSON.parse(JSON.stringify(data), function (k, v) {
      return typeof v === "string" && /^imgref:/.test(v) ? ((store.images || {})[v.slice(7)] || null) : v;
    });
  }

  /* Backup completo: todas as edições, o padrão e os canais num arquivo só.
     Cada imagem vai uma vez (tabela images, referenciada por imgref:<hash>),
     inclusive as que só existem online (/_blob/…), que são baixadas aqui. */
  var BACKUP_FORMATO = "boletimMaker.backup";

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  async function buildBackup() {
    var images = {}, remotos = {};
    var pacote = {
      formato: BACKUP_FORMATO, versao: 1, exportadoEm: new Date().toISOString(),
      canais: canais(),
      customDefaultTemplate: store.customDefaultTemplate || null,
      edicoes: store.order.filter(function (id) { return store.editions[id]; }).map(function (id) {
        return { id: id, name: store.editions[id].name, data: store.editions[id].data };
      }),
      notas: Object.keys(store.notas || {}).map(function (k) { return store.notas[k]; })
        .filter(function (n) { return n && store.editions[n.edicaoId]; })
    };
    var txt = JSON.stringify(pacote);
    (txt.match(/\/_blob\/[0-9a-zA-Z_-]+/g) || []).forEach(function (u) { remotos[u] = null; });
    await Promise.all(Object.keys(remotos).map(async function (u) {
      try { remotos[u] = await blobToDataUrl(await (await fetch(u)).blob()); } catch (e) { remotos[u] = null; }
    }));
    var out = JSON.parse(txt, function (k, v) {
      if (typeof v !== "string") return v;
      var dataUrl = null;
      if (/^imgref:/.test(v)) dataUrl = (store.images || {})[v.slice(7)] || null;
      else if (/^\/_blob\//.test(v)) dataUrl = remotos[v] || null;
      else if (/^data:image\//i.test(v) && v.length > 1024) dataUrl = v;
      if (!dataUrl) return /^(imgref:|\/_blob\/)/.test(v) ? null : v;
      var h = contentHash(dataUrl);
      images[h] = dataUrl;
      return "imgref:" + h;
    });
    out.images = images;
    return out;
  }

  // Restaura um backup: edições entram como novas (nada existente é
  // sobrescrito), canais ausentes são acrescentados, o padrão só entra se
  // não houver um. Devolve o número de edições adicionadas.
  function restoreBackup(b) {
    store.images = store.images || {};
    Object.keys(b.images || {}).forEach(function (h) {
      if (/^data:image\//i.test(b.images[h])) store.images[h] = b.images[h];
    });
    var n = 0, novoId = {};
    (b.edicoes || []).forEach(function (e) {
      var data = e && e.data;
      if (!data || typeof data !== "object" || Array.isArray(data)) return;
      ensureVars(data);
      ensurePhase5(data);
      fillDefaults(data, blankTemplate());
      moveNewsLinksInline(data);
      var id = uid();
      store.editions[id] = { id: id, name: String(e.name || "Edição restaurada"), updatedAt: Date.now() + n, data: data };
      store.order.push(id);
      if (e.id) novoId[e.id] = id;
      if (!n) store.currentId = id;
      n++;
    });
    // Observações de revisão acompanham as edições restauradas (ids novos).
    (b.notas || []).forEach(function (nt) {
      if (!nt || !novoId[nt.edicaoId] || typeof nt.texto !== "string") return;
      var c = JSON.parse(JSON.stringify(nt));
      c.id = newNotaId();
      c.edicaoId = novoId[nt.edicaoId];
      saveNota(c);
    });
    if (Array.isArray(b.canais)) {
      var dominios = canais().map(function (c) { return c.dominio; });
      var novos = b.canais.filter(function (c) { return c && c.dominio && dominios.indexOf(c.dominio) === -1; });
      if (novos.length) { store.canais = canais().concat(novos); store.canaisAt = Date.now(); }
    }
    if (b.customDefaultTemplate && !store.customDefaultTemplate) store.customDefaultTemplate = b.customDefaultTemplate;
    return n;
  }

  function saveLocal() {
    try {
      internalizeImages();
      Object.keys(store.editions).forEach(function (id) { compactLayout(store.editions[id].data); });
      compactLayout(store.customDefaultTemplate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch (e) {
      return false;
    }
  }

  function hhmm() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function setSaveStatus(text, isError) {
    var el = document.getElementById("saveStatus");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("save-status-error", !!isError);
  }

  // Versão online (Artifact): grava no navegador como cache e agenda o envio
  // para o banco online, que é a cópia que vale entre aparelhos.
  function persist() {
    var ok = saveLocal();
    // Revisor: a edição não é dele; só as observações são gravadas (saveNota).
    if (REVIEWER) { setSaveStatus("Modo revisão · suas observações são salvas"); return ok; }
    if (cloud.mode === "online") {
      setSaveStatus("Salvando…");
      scheduleCloudFlush();
      return true;
    }
    if (cloud.mode === "connecting") return ok;
    if (ok) setSaveStatus((cloud.mode === "offline" ? "Salvo só neste navegador às " : "Salvo às ") + hhmm());
    else setSaveStatus("Não foi possível salvar — exporte o JSON", true);
    return ok;
  }

  /* ---------------------------------------------------------------------
     Nuvem — só quando aberto como Artifact no claude.ai (window.claude).
     Cada edição é um documento "editions/<id>" ({name, updatedAt, json});
     ordem, padrão personalizado e migrações ficam em "app/settings".
     Imagens vão para o armazenamento de arquivos do Artifact e a edição
     guarda só o endereço "/_blob/<id>" (cada documento aceita até 256 KB).
     Aberto direto do arquivo (file://), nada disso roda: tudo continua só
     no localStorage, como antes.
     --------------------------------------------------------------------- */
  var IN_ARTIFACT = !!(window.claude && typeof window.claude.use === "function");
  // Versão desktop (BoletimMaker-Beta.exe, WebView2): o aplicativo recebe
  // mensagens da página para gerar o PDF nativo (A4, links preservados) e
  // salvar arquivos pela janela do Windows. Ver desktop/BoletimMaker.cs.
  var DESKTOP = !IN_ARTIFACT && window.chrome && window.chrome.webview ? window.chrome.webview : null;
  // Plataforma própria (site publicado + Firebase): login por e-mail ou Google,
  // sem conta Claude. Configuração em js/firebase-config.js; só liga no site
  // publicado (https), nunca no arquivo local nem no aplicativo Windows.
  var FB = window.BOLETIM_FIREBASE || null;
  var IN_FIREBASE = !IN_ARTIFACT && !DESKTOP && !!(FB && FB.config) && (FB.teste === true || (location.protocol === "https:" &&
    ((FB.hosts || []).indexOf(location.hostname) !== -1 || /\.github\.io$/.test(location.hostname)))); // teste: Firebase simulado (tests/)
  var MAX_DOC_CHARS = (IN_FIREBASE ? 900 : 250) * 1024; // Firestore aceita ~1 MiB por documento
  var cloud = {
    mode: IN_ARTIFACT || IN_FIREBASE ? "connecting" : "local", // local | connecting | online | offline
    baseStr: {},       // id da edição -> último JSON sincronizado (base da junção campo a campo)
    db: null, assets: null, downloads: null,
    pushedAt: {},      // id da edição -> updatedAt já enviado
    settingsStr: null, // último app/settings enviado/recebido
    flushTimer: null, flushing: false, flushAgain: false,
    deferred: {}       // alteração remota da edição aberta, aplicada ao sair do campo
  };

  function settingsPayload() {
    return JSON.stringify({
      order: store.order,
      customDefaultTemplate: store.customDefaultTemplate || null,
      migrations: store.migrations || {},
      assetIndex: store.assetIndex || {},
      canais: store.canais || [],
      canaisAt: store.canaisAt || 0
    });
  }

  // Lista de canais vinda de outro aparelho: vale a alteração mais recente.
  function mergeRemoteCanais(s) {
    if (!s || !Array.isArray(s.canais)) return;
    if ((s.canaisAt || 0) >= (store.canaisAt || 0)) {
      store.canais = s.canais;
      store.canaisAt = s.canaisAt || 0;
    }
  }

  function scheduleCloudFlush() {
    clearTimeout(cloud.flushTimer);
    cloud.flushTimer = setTimeout(flushCloud, 700);
  }

  function cloudErrorText(e) {
    var code = e && e.code;
    if (code === "quota_exceeded") return "Espaço online cheio — exclua edições antigas";
    if (code === "invalid_argument") return "Edição grande demais para salvar online (verifique as imagens)";
    if (code === "revoked" || code === "not_granted") return "Sem acesso ao salvamento online — recarregue a página";
    return "Não foi possível salvar online — tentando de novo na próxima alteração";
  }

  function dataUrlToBlob(dataUrl) {
    var m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(dataUrl);
    if (!m) return null;
    var bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  }

  // Troca toda imagem embutida (data:image/...) por um arquivo enviado ao
  // armazenamento do Artifact. Devolve true se mudou algo.
  async function externalizeImages(obj) {
    if (!cloud.assets || !obj || typeof obj !== "object") return false;
    var changed = false;
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], v = obj[k];
      // Imagem do banco local (imgref:) ou embutida (data:) → arquivo do
      // Artifact. O índice store.assetIndex (hash do conteúdo → id) evita
      // reenviar a mesma imagem e vale entre aparelhos (vai em app/settings).
      if (typeof v === "string" && /^imgref:/.test(v)) v = (store.images || {})[v.slice(7)] || v;
      if (typeof v === "string" && /^data:image\//i.test(v)) {
        var hash = contentHash(v);
        store.assetIndex = store.assetIndex || {};
        if (!store.assetIndex[hash]) {
          var blob = dataUrlToBlob(v);
          if (!blob) continue;
          try {
            var res = await cloud.assets.upload(blob, { type: blob.type });
            store.assetIndex[hash] = res.id;
          } catch (e) {
            continue; // fica embutida; se não couber, o envio avisa
          }
        }
        obj[k] = "/_blob/" + store.assetIndex[hash];
        changed = true;
      } else if (v && typeof v === "object") {
        if (await externalizeImages(v)) changed = true;
      }
    }
    return changed;
  }

  async function flushCloud() {
    if (cloud.mode !== "online" || REVIEWER) return;
    if (cloud.flushing) { cloud.flushAgain = true; return; }
    cloud.flushing = true;
    var failed = null;
    try {
      var ids = store.order.slice();
      for (var i = 0; i < ids.length; i++) {
        var ed = store.editions[ids[i]];
        if (!ed || (cloud.pushedAt[ed.id] || 0) >= ed.updatedAt) continue;
        await externalizeImages(ed.data);
        if (IN_FIREBASE) await uploadImgrefs(ed.data);
        var body = { name: ed.name, updatedAt: ed.updatedAt, json: JSON.stringify(ed.data) };
        if (body.json.length > MAX_DOC_CHARS) { failed = { code: "invalid_argument" }; continue; }
        try {
          var sent = await pushEdition(ed, body);
          if (sent.json !== body.json) {
            // Juntou com alterações de outra pessoa que chegaram no meio do envio.
            // Se alguém digitou aqui durante o envio, junta isso também.
            ed.data = ed.updatedAt === body.updatedAt ? JSON.parse(sent.json) : merge3(JSON.parse(body.json), ed.data, JSON.parse(sent.json));
            if (ed.updatedAt === body.updatedAt) ed.updatedAt = sent.updatedAt;
            else ed.updatedAt = Math.max(ed.updatedAt, sent.updatedAt + 1);
            if (ed.id === store.currentId && !isEditingText()) render();
          }
          cloud.baseStr[ed.id] = sent.json;
          cloud.pushedAt[ed.id] = sent.json === body.json ? body.updatedAt : sent.updatedAt;
          store.cloudKnownIds = store.cloudKnownIds || [];
          if (store.cloudKnownIds.indexOf(ed.id) === -1) store.cloudKnownIds.push(ed.id);
        } catch (e) {
          failed = e;
        }
      }
      if (store.customDefaultTemplate) await externalizeImages(store.customDefaultTemplate);
      var settings = settingsPayload();
      if (settings !== cloud.settingsStr) {
        if (settings.length > MAX_DOC_CHARS) {
          failed = { code: "invalid_argument" };
        } else {
          try {
            await cloud.db.doc("app/settings").set({ json: settings, updatedAt: Date.now() });
            cloud.settingsStr = settings;
          } catch (e) {
            failed = e;
          }
        }
      }
    } finally {
      cloud.flushing = false;
      saveLocal(); // guarda também os endereços /_blob/ que substituíram imagens
      if (failed) setSaveStatus(cloudErrorText(failed), true);
      else setSaveStatus("Salvo online às " + hhmm());
      if (cloud.flushAgain) { cloud.flushAgain = false; scheduleCloudFlush(); }
    }
  }

  // Arquivos do Artifact que nenhuma edição, padrão ou passo de desfazer usa
  // (sobra de imagens trocadas ou de edições excluídas). Apagar é definitivo,
  // por isso só roda por pedido explícito e com confirmação.
  async function cleanOrphanAssets() {
    if (!cloud.assets) { uiAlert("A limpeza só funciona no editor online, com o salvamento online ativo."); return; }
    var list;
    try { list = await cloud.assets.list(); } catch (e) { uiAlert("Não foi possível listar os arquivos agora. Tente de novo em instantes."); return; }
    var refs = JSON.stringify(store.editions) + JSON.stringify(store.customDefaultTemplate || null) + undoStack.join("") + redoStack.join("");
    var orphans = (list.assets || []).filter(function (a) { return refs.indexOf("/_blob/" + a.id) === -1; });
    if (!orphans.length) { uiToast("Nenhuma imagem sem uso. Espaço usado: " + Math.round((list.usage && list.usage.bytes || 0) / 1024) + " KB."); return; }
    var kb = Math.round(orphans.reduce(function (t, a) { return t + (a.sizeBytes || 0); }, 0) / 1024);
    var yes = await uiConfirm(orphans.length + (orphans.length === 1 ? " imagem não é usada" : " imagens não são usadas") + " por nenhuma edição (" + kb + " KB). Apagar do armazenamento online? Isso não pode ser desfeito.", "Apagar");
    if (!yes) return;
    var apagadas = 0;
    for (var i = 0; i < orphans.length; i++) {
      try { await cloud.assets.delete(orphans[i].id); apagadas++; } catch (e) { /* segue com as demais */ }
    }
    Object.keys(store.assetIndex || {}).forEach(function (h) {
      if (orphans.some(function (a) { return a.id === store.assetIndex[h]; })) delete store.assetIndex[h];
    });
    persist();
    uiToast(apagadas + (apagadas === 1 ? " imagem apagada" : " imagens apagadas") + " (" + kb + " KB liberados).");
  }

  /* Edição simultânea: junção campo a campo (3 vias).
     base = última versão que os dois tinham; a = daqui; b = de outra pessoa.
     O que só um lado mudou, fica; se os dois mudaram o mesmo campo, vale o
     daqui (que é o envio mais recente). Listas do mesmo tamanho juntam item a
     item; se só um lado mudou o tamanho (incluiu ou removeu), vale a lista
     dele, com as mudanças do outro nos itens da mesma posição. */
  function isPlainObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function merge3(base, a, b) {
    var sa = JSON.stringify(a), sb = JSON.stringify(b), so = JSON.stringify(base);
    if (sa === sb || sb === so) return a;
    if (sa === so) return b;
    if (isPlainObj(a) && isPlainObj(b) && isPlainObj(base)) {
      var out = {}, keys = {};
      [base, a, b].forEach(function (o) { Object.keys(o).forEach(function (k) { keys[k] = 1; }); });
      Object.keys(keys).forEach(function (k) {
        var v = merge3(base[k], a[k], b[k]);
        if (v !== undefined) out[k] = v;
      });
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b) && Array.isArray(base)) {
      var porItem = function (lista, outra) {
        return lista.map(function (x, i) { return i < base.length && i < outra.length ? merge3(base[i], lista === a ? x : outra[i], lista === a ? outra[i] : x) : x; });
      };
      if (a.length === base.length && b.length === base.length) return porItem(a, b);
      if (a.length === base.length) return porItem(b, a);
      if (b.length === base.length) return porItem(a, b);
    }
    return a;
  }

  // Envia a edição. No Firebase, numa transação: se outra pessoa gravou
  // depois da nossa base, junta campo a campo antes de gravar (ninguém perde
  // o que fez). Devolve o corpo efetivamente gravado.
  async function pushEdition(ed, body) {
    var ref = cloud.db.doc("editions/" + ed.id);
    if (!IN_FIREBASE || !cloud.db.runTransaction) { await ref.set(body); return body; }
    return cloud.db.runTransaction(async function (t) {
      var snap = await t.get(ref);
      var out = body;
      var remoto = snap.exists ? snap.data() : null;
      if (remoto && typeof remoto.json === "string" && remoto.json !== body.json && cloud.baseStr[ed.id] && remoto.json !== cloud.baseStr[ed.id]) {
        var merged = merge3(JSON.parse(cloud.baseStr[ed.id]), JSON.parse(body.json), JSON.parse(remoto.json));
        out = { name: body.name, updatedAt: Math.max(body.updatedAt, (remoto.updatedAt || 0) + 1), json: JSON.stringify(merged) };
      }
      t.set(ref, out);
      return out;
    });
  }

  // Firebase: imagens do banco local (imgref:<hash>) vão para imagens/<hash>
  // uma vez só; as edições guardam só a referência.
  var imagensNaNuvem = {};
  async function uploadImgrefs(data) {
    var hashes = (JSON.stringify(data).match(/imgref:[0-9a-z]+/g) || []).map(function (r) { return r.slice(7); });
    for (var i = 0; i < hashes.length; i++) {
      var h = hashes[i], url = (store.images || {})[h];
      if (imagensNaNuvem[h] || !url) continue;
      if (url.length > MAX_DOC_CHARS) { uiToast("Uma imagem é grande demais para o servidor (máx. ~900 KB). Use uma versão menor."); continue; }
      try { await cloud.db.doc("imagens/" + h).set({ data: url }); imagensNaNuvem[h] = 1; } catch (e) { /* tenta no próximo envio */ }
    }
  }
  // Busca as imagens que a edição usa e ainda não estão neste aparelho.
  async function ensureImages(data) {
    if (!IN_FIREBASE || !cloud.db) return false;
    var faltam = (JSON.stringify(data || null).match(/imgref:[0-9a-z]+/g) || []).map(function (r) { return r.slice(7); })
      .filter(function (h, i, arr) { return arr.indexOf(h) === i && !(store.images || {})[h]; });
    if (!faltam.length) return false;
    store.images = store.images || {};
    await Promise.all(faltam.map(function (h) {
      return cloud.db.doc("imagens/" + h).get().then(function (s) {
        if (s.exists && /^data:image\//.test(s.data().data || "")) { store.images[h] = s.data().data; imagensNaNuvem[h] = 1; }
      }).catch(function () {});
    }));
    return true;
  }

  function cloudDeleteEdition(id) {
    if (cloud.mode !== "online") return;
    delete cloud.pushedAt[id];
    cloud.db.doc("editions/" + id).delete().catch(function (e) {
      setSaveStatus(cloudErrorText(e), true);
    });
  }

  function parseEditionDoc(id, body) {
    if (!body || typeof body.json !== "string") return null;
    try {
      return { id: id, name: body.name || "Edição", updatedAt: body.updatedAt || 0, data: JSON.parse(body.json) };
    } catch (e) {
      return null;
    }
  }

  function isEditingText() {
    var a = document.activeElement;
    return !!(a && a.hasAttribute && a.hasAttribute("contenteditable") && a.closest("#workspace"));
  }

  function applyRemoteEdition(id, body) {
    var ed = parseEditionDoc(id, body);
    if (!ed) return;
    if (cloud.baseStr[id] === body.json) return; // eco do nosso envio, nada novo
    var local = store.editions[id];
    var dirty = !!local && (cloud.pushedAt[id] || 0) < local.updatedAt; // alterações daqui ainda não enviadas
    // Mais antiga que o que já temos: eco atrasado ou cópia velha.
    if (local && ed.updatedAt <= (dirty ? (cloud.pushedAt[id] || 0) : local.updatedAt)) return;
    // Sem base para juntar (aparelho que acabou de conectar): vale a mais nova.
    if (dirty && !cloud.baseStr[id] && local.updatedAt >= ed.updatedAt) return;
    if (id === store.currentId && isEditingText()) {
      cloud.deferred[id] = body;
      return;
    }
    delete cloud.deferred[id];
    if (dirty && cloud.baseStr[id]) {
      // Os dois mexeram ao mesmo tempo: junta campo a campo e reenvia.
      local.data = merge3(JSON.parse(cloud.baseStr[id]), local.data, ed.data);
      local.updatedAt = Math.max(local.updatedAt, ed.updatedAt + 1);
      cloud.pushedAt[id] = ed.updatedAt;
      cloud.baseStr[id] = body.json;
      scheduleCloudFlush();
    } else {
      cloud.pushedAt[id] = ed.updatedAt;
      cloud.baseStr[id] = body.json;
      store.editions[id] = ed;
    }
    if (store.order.indexOf(id) === -1) store.order.push(id);
    if (id === store.currentId) { resetHistory(); clearSelection(true); }
    saveLocal();
    render();
    ensureImages(store.editions[id].data).then(function (veio) { if (veio) { saveLocal(); render(); } });
  }

  function applyRemoteRemoval(id) {
    if (!store.editions[id]) return;
    delete store.editions[id];
    delete cloud.pushedAt[id];
    store.order = store.order.filter(function (x) { return x !== id; });
    if (!store.order.length) {
      var nid = uid();
      store.editions[nid] = { id: nid, name: "Nova edição", updatedAt: Date.now(), data: blankTemplate() };
      store.order.push(nid);
    }
    if (!store.editions[store.currentId]) {
      store.currentId = store.order[0];
      resetHistory();
      clearSelection(true);
    }
    saveLocal();
    render();
  }

  function applyRemoteSettings(body) {
    if (!body || typeof body.json !== "string" || body.json === cloud.settingsStr) return;
    var s;
    try { s = JSON.parse(body.json); } catch (e) { return; }
    var order = (s.order || []).filter(function (id) { return store.editions[id]; });
    store.order.forEach(function (id) { if (order.indexOf(id) === -1) order.push(id); });
    store.order = order;
    if (s.customDefaultTemplate) store.customDefaultTemplate = s.customDefaultTemplate;
    else delete store.customDefaultTemplate;
    store.migrations = Object.assign({}, s.migrations || {}, store.migrations || {});
    store.assetIndex = Object.assign({}, s.assetIndex || {}, store.assetIndex || {});
    mergeRemoteCanais(s);
    cloud.settingsStr = body.json;
    saveLocal();
    renderToolbar();
    invalidateChecks();
    renderSourcesTab();
    if (selection && selection.kind === "canal") renderInspector();
  }

  function subscribeCloud() {
    cloud.db.collection("editions").onSnapshot(function (snap) {
      store.cloudKnownIds = snap.docs.map(function (d) { return d.id; });
      snap.docChanges().forEach(function (ch) {
        if (ch.type === "removed") applyRemoteRemoval(ch.doc.id);
        else applyRemoteEdition(ch.doc.id, ch.doc.data());
      });
    }, function (e) {
      setSaveStatus(cloudErrorText(e), true);
    });
    cloud.db.collection("notas").onSnapshot(function (snap) {
      store.notas = store.notas || {};
      snap.docChanges().forEach(function (ch) {
        if (ch.type === "removed") delete store.notas[ch.doc.id];
        else { var n = ch.doc.data(); if (n && n.id) store.notas[n.id] = n; }
      });
      saveLocal();
      invalidateChecks();
      resolveNomes();
      renderNotas();
      updateCheckBadge();
    }, function () {});
    cloud.db.doc("app/settings").onSnapshot(function (snap) {
      if (snap.exists) applyRemoteSettings(snap.data());
    }, function () { /* a coleção de edições já avisa */ });

    // Alteração remota da edição aberta que chegou enquanto se digitava.
    document.getElementById("workspace").addEventListener("focusout", function () {
      setTimeout(function () {
        if (isEditingText()) return;
        Object.keys(cloud.deferred).forEach(function (id) {
          var body = cloud.deferred[id];
          delete cloud.deferred[id];
          applyRemoteEdition(id, body); // junta com o que foi digitado enquanto isso
        });
      }, 0);
    });
  }

  /* ---------------------------------------------------------------------
     Plataforma própria — Firebase (Google): login sem conta Claude
     - Entrar: link de acesso enviado ao e-mail (sem senha) ou conta Google.
     - Quem entra: o dono (FB.owner) e os e-mails que ele cadastra em
       Configurações → Acesso (documento app/acesso: { editores, revisores }).
       Editores escrevem e comentam; revisores só comentam.
     - Mesmas coleções do Artifact (editions, app/settings, notas,
       data/users/<uid>/prefs) + imagens/<hash>. Regras: firestore.rules.
     --------------------------------------------------------------------- */
  var FB_SDK = "https://www.gstatic.com/firebasejs/10.14.1/";
  var LOGIN_EMAIL_KEY = "boletimMaker.loginEmail";
  var IS_OWNER = !IN_FIREBASE; // fora do Firebase, quem usa é o dono
  var acessoAtual = { editores: [], revisores: [] };

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = res;
      s.onerror = function () { rej(new Error("não carregou " + src)); };
      document.head.appendChild(s);
    });
  }
  async function loadFirebaseSdk() {
    if (window.firebase && window.firebase.firestore && window.firebase.auth) return;
    await loadScript(FB_SDK + "firebase-app-compat.js");
    await Promise.all([loadScript(FB_SDK + "firebase-auth-compat.js"), loadScript(FB_SDK + "firebase-firestore-compat.js")]);
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ok */ } }
  function normEmail(e) { return String(e || "").trim().toLowerCase(); }

  // Erros do login do Firebase em português, com o que fazer.
  function erroLogin(err, via) {
    var c = (err && err.code) || "";
    if (c === "auth/operation-not-allowed") return via === "google"
      ? "A entrada com Google está desligada neste boletim. Use o link por e-mail ou peça ao autor para ligar o Google no Firebase."
      : "A entrada por link no e-mail está desligada neste boletim. Use \"Entrar com Google\" ou peça ao autor para ligar o \"Link do e-mail (login sem senha)\" no Firebase.";
    if (c === "auth/invalid-email") return "Este e-mail não parece válido. Confira e tente de novo.";
    if (c === "auth/quota-exceeded" || c === "auth/too-many-requests") return "Muitos pedidos de link agora. Espere alguns minutos ou use \"Entrar com Google\".";
    if (c === "auth/unauthorized-continue-uri" || c === "auth/unauthorized-domain") return "Este endereço do site ainda não está autorizado no Firebase. O autor precisa adicioná-lo em Authentication → Configurações → Domínios autorizados.";
    if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "A janela do Google foi fechada antes de terminar. Tente de novo.";
    if (c === "auth/network-request-failed") return "Sem conexão com a internet agora. Tente de novo em instantes.";
    return "Não foi possível entrar (" + (c || "erro") + "). Tente de novo.";
  }

  // modo: "login" | "enviado" | "semAcesso" (pode pedir acesso) | "pedidoEnviado"
  function showLogin(modo, email, extra) {
    var tela = document.getElementById("loginScreen");
    if (!tela) return;
    tela.hidden = false;
    document.getElementById("loginForm").hidden = modo !== "login";
    document.getElementById("loginGoogle").hidden = modo !== "login";
    document.getElementById("loginOr").hidden = modo !== "login";
    document.getElementById("loginPedido").hidden = modo !== "semAcesso";
    document.getElementById("loginSair").hidden = modo !== "semAcesso" && modo !== "pedidoEnviado";
    var msg = document.getElementById("loginMsg");
    msg.classList.toggle("is-error", false);
    msg.classList.toggle("is-ok", modo === "pedidoEnviado" || modo === "enviado");
    msg.textContent = modo === "enviado"
      ? "Pronto! Enviamos um link para " + email + ". Abra o e-mail (remetente noreply@" + ((FB && FB.config && FB.config.authDomain) || "firebaseapp.com") + ") e toque no link para entrar. Se não aparecer em 1 minuto, confira o spam. Pode fechar esta aba."
      : modo === "semAcesso"
        ? "O e-mail " + email + " ainda não tem acesso a este boletim. Peça acesso ao autor: ele recebe o aviso no Boletim e libera com um clique."
        : modo === "pedidoEnviado"
          ? "Pedido de acesso enviado" + (extra && extra.criadoEm ? " em " + quando(extra.criadoEm) : "") + ". Assim que o autor aprovar, o boletim abre aqui sozinho — pode deixar esta aba aberta ou voltar depois com o mesmo e-mail."
          : "Entre com o seu e-mail para abrir o boletim. Não precisa de senha nem de conta no Claude.";
  }

  // Quem entrou mas não está na lista: pode pedir acesso (pedidos/<uid>) e
  // o boletim abre sozinho quando o dono aprovar (escuta app/acesso).
  var pararEsperaAcesso = null;
  async function mostrarSemAcesso(user, email) {
    var db = cloud.db;
    cloud.mode = "offline";
    var pedido = null;
    try { var p = await db.doc("pedidos/" + user.uid).get(); if (p.exists) pedido = p.data(); } catch (e) { /* sem pedido */ }
    showLogin(pedido ? "pedidoEnviado" : "semAcesso", email, pedido);
    var btn = document.getElementById("loginPedidoBtn");
    btn.onclick = async function () {
      btn.disabled = true;
      var dados = { uid: user.uid, email: email, nome: String(user.displayName || email).slice(0, 120), mensagem: (document.getElementById("loginPedidoMsg").value || "").trim().slice(0, 500), criadoEm: Date.now(), status: "pendente" };
      try {
        await db.doc("pedidos/" + user.uid).set(dados);
        showLogin("pedidoEnviado", email, dados);
      } catch (e) {
        var m = document.getElementById("loginMsg");
        m.classList.add("is-error");
        m.textContent = "Não foi possível enviar o pedido (" + ((e && e.code) || "erro") + "). Avise o autor por outro meio ou tente de novo.";
      } finally { btn.disabled = false; }
    };
    if (pararEsperaAcesso) pararEsperaAcesso();
    pararEsperaAcesso = db.doc("app/acesso").onSnapshot(function (snap) {
      if (!snap.exists) return;
      var d = snap.data();
      var lista = (d.editores || []).concat(d.revisores || []).map(normEmail);
      if (lista.indexOf(email) === -1) return;
      if (pararEsperaAcesso) { pararEsperaAcesso(); pararEsperaAcesso = null; }
      uiToast("Acesso liberado pelo autor. Bem-vindo!");
      startFirebaseSession(user);
    }, function () { /* sem permissão de leitura: segue esperando um novo login */ });
  }

  // Dono: lista dos pedidos de acesso (pedidos/*), com aviso na engrenagem.
  var pedidosAcesso = [];
  var pedidosVistos = null;
  function assinarPedidos(db) {
    db.collection("pedidos").onSnapshot(function (snap) {
      pedidosAcesso = snap.docs.map(function (d) { return d.data(); }).filter(function (p) { return p && p.email; })
        .sort(function (a, b) { return (a.criadoEm || 0) - (b.criadoEm || 0); });
      var badge = document.getElementById("pedidosBadge");
      if (badge) { badge.hidden = !pedidosAcesso.length; badge.textContent = String(pedidosAcesso.length); }
      var btn = document.getElementById("btnSettings");
      if (btn) btn.title = pedidosAcesso.length ? pedidosAcesso.length + " pedido(s) de acesso — Configurações → Acesso" : "Configurações e atalhos (Ctrl+,)";
      var novos = pedidosAcesso.filter(function (p) { return !pedidosVistos || pedidosVistos.indexOf(p.uid) === -1; });
      if (novos.length) uiToast(novos.length === 1 ? (novos[0].nome || novos[0].email) + " pediu acesso ao boletim (Configurações → Acesso)." : novos.length + " pedidos de acesso aguardando (Configurações → Acesso).");
      pedidosVistos = pedidosAcesso.map(function (p) { return p.uid; });
      if (!document.getElementById("settingsDialog").hidden && settingsAba === "acesso") renderSettings();
    }, function () { /* regras antigas sem "pedidos": ignora */ });
  }
  function responderPedido(uid, papel) {
    var p = pedidosAcesso.filter(function (x) { return x.uid === uid; })[0];
    if (!p || !cloud.db) return;
    if (papel) {
      var l = papel === "editor" ? "editores" : "revisores", outra = papel === "editor" ? "revisores" : "editores";
      var email = normEmail(p.email);
      if (acessoAtual[l].indexOf(email) === -1) acessoAtual[l].push(email);
      acessoAtual[outra] = acessoAtual[outra].filter(function (x) { return x !== email; });
      salvarAcesso();
    }
    cloud.db.doc("pedidos/" + uid).delete().then(function () {
      uiToast(papel ? (p.nome || p.email) + " agora tem acesso (" + (papel === "editor" ? "edita e comenta" : "só comenta") + ")." : "Pedido de " + (p.nome || p.email) + " recusado.");
    }).catch(function () { uiAlert("Não foi possível atualizar o pedido. Confira se as regras novas do Firebase foram publicadas."); });
  }

  function initLoginScreen() {
    var form = document.getElementById("loginForm");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = normEmail(document.getElementById("loginEmail").value);
      if (!email) return;
      var btn = form.querySelector("button");
      btn.disabled = true;
      try {
        await firebase.auth().sendSignInLinkToEmail(email, { url: location.origin + location.pathname, handleCodeInApp: true });
        lsSet(LOGIN_EMAIL_KEY, email);
        showLogin("enviado", email);
      } catch (err) {
        var m = document.getElementById("loginMsg");
        m.classList.add("is-error");
        m.textContent = erroLogin(err, "link");
      } finally { btn.disabled = false; }
    });
    document.getElementById("loginGoogle").addEventListener("click", async function () {
      var provider = new firebase.auth.GoogleAuthProvider();
      try {
        var r = await firebase.auth().signInWithPopup(provider);
        if (r && r.user) { document.getElementById("loginScreen").hidden = true; await startFirebaseSession(r.user); }
      } catch (err) {
        // Celular costuma bloquear janelas: entra pelo redirecionamento.
        if (err && /popup-blocked|operation-not-supported/.test(err.code || "")) firebase.auth().signInWithRedirect(provider);
        else { var mg = document.getElementById("loginMsg"); mg.classList.add("is-error"); mg.textContent = erroLogin(err, "google"); }
      }
    });
    document.getElementById("loginSair").addEventListener("click", sairDaConta);
  }

  async function sairDaConta() {
    try { await firebase.auth().signOut(); } catch (e) { /* segue */ }
    // O navegador guardava uma cópia para abrir rápido: em computador
    // compartilhado, não deve ficar nada depois de sair.
    lsSet(STORAGE_KEY, null);
    location.reload();
  }

  async function connectFirebase() {
    var overlay = document.getElementById("cloudOverlay");
    if (overlay) overlay.hidden = false;
    setSaveStatus("Conectando ao servidor…");
    try {
      await loadFirebaseSdk();
      if (!firebase.apps.length) firebase.initializeApp(FB.config);
    } catch (e) {
      cloud.mode = "offline";
      if (overlay) overlay.hidden = true;
      setSaveStatus("Sem conexão com o servidor — salvando só neste navegador", true);
      return;
    }
    initLoginScreen();
    var auth = firebase.auth();
    // E-mail do link de acesso e janela do Google em português (o texto do
    // e-mail é o modelo do Firebase; o nome que aparece nele é o "Nome
    // público" do projeto, em Configurações do projeto no console).
    auth.languageCode = "pt-BR";
    // Voltando pelo link de acesso enviado por e-mail
    if (auth.isSignInWithEmailLink(location.href)) {
      var email = lsGet(LOGIN_EMAIL_KEY);
      if (overlay) overlay.hidden = true;
      if (!email) email = normEmail(await uiPrompt("Para confirmar, digite o e-mail em que você recebeu o link:", ""));
      try { await auth.signInWithEmailLink(email, location.href); lsSet(LOGIN_EMAIL_KEY, null); }
      catch (e) { uiAlert("Este link de acesso expirou ou já foi usado. Peça um novo na tela de entrada."); }
      history.replaceState(null, "", location.pathname);
    }
    var user = await new Promise(function (res) { var off = auth.onAuthStateChanged(function (u) { off(); res(u); }); });
    if (overlay) overlay.hidden = true;
    if (!user) { cloud.mode = "offline"; setSaveStatus("Entre para abrir o boletim"); showLogin("login"); return; }
    await startFirebaseSession(user);
  }

  async function startFirebaseSession(user) {
    var db = firebase.firestore();
    cloud.db = db;
    var email = normEmail(user.email);
    IS_OWNER = email === normEmail(FB.owner);
    document.body.classList.toggle("not-owner", !IS_OWNER);
    try {
      var a = await db.doc("app/acesso").get();
      if (a.exists) acessoAtual = { editores: (a.data().editores || []).map(normEmail), revisores: (a.data().revisores || []).map(normEmail) };
      else if (IS_OWNER) await db.doc("app/acesso").set(acessoAtual);
    } catch (e) { /* sem leitura: decide pelo dono */ }
    var editor = IS_OWNER || acessoAtual.editores.indexOf(email) !== -1;
    var revisor = !editor && acessoAtual.revisores.indexOf(email) !== -1;
    if (!editor && !revisor) { await mostrarSemAcesso(user, email); return; }
    if (IS_OWNER) assinarPedidos(db);
    REVIEWER = revisor;
    viewer = { id: user.uid, papel: IS_OWNER ? "autor" : "revisor", nome: user.displayName || email, email: email };
    nomes[user.uid] = viewer.nome;
    document.getElementById("loginScreen").hidden = true;
    var overlay = document.getElementById("cloudOverlay");
    if (overlay) overlay.hidden = false;
    renderSettings();
    await startCloudSync(db, overlay);
  }

  function salvarAcesso() {
    if (!cloud.db || !IS_OWNER) return;
    cloud.db.doc("app/acesso").set(acessoAtual).then(function () { uiToast("Acesso atualizado."); })
      .catch(function () { uiAlert("Não foi possível salvar a lista de acesso. Confira a conexão e tente de novo."); });
  }

  async function connectCloud() {
    if (IN_FIREBASE) return connectFirebase();
    if (!IN_ARTIFACT) return;
    var overlay = document.getElementById("cloudOverlay");
    if (overlay) overlay.hidden = false;
    setSaveStatus("Conectando ao salvamento online…");
    window.claude.use("downloads").then(function (d) { cloud.downloads = d; });
    window.claude.use("assets").then(function (a) { cloud.assets = a; });
    var db = await window.claude.use("db");
    if (!db) {
      cloud.mode = "offline";
      if (overlay) overlay.hidden = true;
      setSaveStatus("Sem salvamento online — salvando só neste navegador", true);
      return;
    }
    cloud.db = db;
    // Quem é: o dono escreve; qualquer outra pessoa com acesso revisa.
    try {
      userCap = await window.claude.use("user");
      if (userCap) {
        var me = await userCap.me();
        REVIEWER = !me.isOwner;
        viewer = { id: me.id || ("anon_" + (localStorage.getItem("boletimMaker.anon") || (function () { var a = Math.random().toString(36).slice(2, 10); try { localStorage.setItem("boletimMaker.anon", a); } catch (e) {} return a; })())), papel: REVIEWER ? "revisor" : "autor" };
      }
    } catch (e) { /* sem identidade: segue como autor */ }
    await startCloudSync(db, overlay);
  }

  // Parte comum (Artifact e Firebase), depois de saber quem é: carrega edições,
  // configurações e observações da nuvem, junta com o que há aqui e assina as mudanças.
  async function startCloudSync(db, overlay) {
    document.body.classList.toggle("is-reviewer", REVIEWER);
    var banner = document.getElementById("reviewBanner");
    if (banner) banner.hidden = !REVIEWER;
    try {
      var results = await Promise.all([db.collection("editions").get(), db.doc("app/settings").get(), db.collection("notas").get()]);
      var snap = results[0], settingsSnap = results[1];
      // Observações: a nuvem manda; as escritas aqui sem conexão (_pendente) sobem agora.
      var locais = store.notas || {};
      store.notas = {};
      results[2].docs.forEach(function (d) { var n = d.data(); if (n && n.id) store.notas[n.id] = n; });
      Object.keys(locais).forEach(function (id) {
        var n = locais[id];
        if (!n._pendente || store.notas[id]) return;
        delete n._pendente;
        store.notas[id] = n;
        db.doc("notas/" + id).set(n).catch(function () {});
      });
      loadCloudPrefs();
      resolveNomes();
      var remote = {};
      snap.docs.forEach(function (d) {
        var ed = parseEditionDoc(d.id, d.data());
        if (ed) { remote[d.id] = ed; cloud.baseStr[d.id] = d.data().json; }
      });
      var remoteIds = Object.keys(remote);
      if (remoteIds.length) {
        // A nuvem manda. Num aparelho que já sincronizou antes, mantém só
        // o que foi alterado aqui depois do último envio, ou criado aqui sem
        // conexão; num aparelho novo, a cópia local (modelo inicial) é descartada.
        var linked = !!store.cloudLinked;
        var known = store.cloudKnownIds || [];
        var merged = {};
        remoteIds.forEach(function (id) {
          var local = linked ? store.editions[id] : null;
          merged[id] = (local && local.updatedAt > remote[id].updatedAt) ? local : remote[id];
          cloud.pushedAt[id] = remote[id].updatedAt;
        });
        if (linked) {
          Object.keys(store.editions).forEach(function (id) {
            if (!remote[id] && known.indexOf(id) === -1) merged[id] = store.editions[id];
          });
        }
        var settings = null;
        if (settingsSnap.exists) {
          try { settings = JSON.parse(settingsSnap.data().json); } catch (e) { settings = null; }
          cloud.settingsStr = settingsSnap.data().json;
        }
        var order = ((settings && settings.order) || []).filter(function (id) { return merged[id]; });
        Object.keys(merged)
          .filter(function (id) { return order.indexOf(id) === -1; })
          .sort(function (a, b) { return merged[a].updatedAt - merged[b].updatedAt; })
          .forEach(function (id) { order.push(id); });
        store.editions = merged;
        store.order = order;
        if (settings) {
          if (settings.customDefaultTemplate) store.customDefaultTemplate = settings.customDefaultTemplate;
          else delete store.customDefaultTemplate;
          store.migrations = Object.assign({}, settings.migrations || {}, store.migrations || {});
          store.assetIndex = Object.assign({}, settings.assetIndex || {}, store.assetIndex || {});
          // Aparelho novo: a lista semeada aqui (canaisAt 0) cede à da nuvem.
          mergeRemoteCanais(settings);
        }
        if (!store.editions[store.currentId]) store.currentId = store.order[0];
        runOneTimeMigrations();
      }
      store.cloudLinked = true;
      store.cloudKnownIds = remoteIds;
      cloud.mode = "online";
      await Promise.all(store.order.map(function (id) { return ensureImages(store.editions[id] && store.editions[id].data); }).concat([ensureImages(store.customDefaultTemplate)]));
      saveLocal();
      resetHistory();
      clearSelection(true);
      render();
      subscribeCloud();
      flushCloud(); // envia o que só existe aqui (primeiro acesso, ou alterações sem conexão)
    } catch (e) {
      cloud.mode = "offline";
      setSaveStatus("Sem salvamento online — salvando só neste navegador", true);
    } finally {
      if (overlay) overlay.hidden = true;
    }
  }

  /* ---------------------------------------------------------------------
     Caixa de diálogo própria — substitui confirm()/alert()/prompt(), que o
     Artifact do claude.ai não mostra. Devolve uma Promise:
     confirmar → true/false; pedir texto → o texto ou null.
     --------------------------------------------------------------------- */
  function showDialog(opts) {
    return new Promise(function (resolve) {
      var box = document.getElementById("appDialog");
      var msg = document.getElementById("appDialogMsg");
      var input = document.getElementById("appDialogInput");
      var ok = document.getElementById("appDialogOk");
      var cancel = document.getElementById("appDialogCancel");
      var hasInput = opts.input != null;
      msg.textContent = opts.message;
      input.hidden = !hasInput;
      input.value = hasInput ? opts.input : "";
      ok.textContent = opts.okLabel || "OK";
      cancel.hidden = opts.cancel === false;
      box.hidden = false;
      (hasInput ? input : ok).focus();
      if (hasInput) input.select();

      function close(result) {
        box.hidden = true;
        ok.removeEventListener("click", onOk);
        cancel.removeEventListener("click", onCancel);
        box.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onOk() { close(hasInput ? input.value : true); }
      function onCancel() { close(hasInput ? null : false); }
      function onKey(e) {
        if (e.key === "Enter") { e.preventDefault(); onOk(); }
        else if (e.key === "Escape") { e.preventDefault(); if (opts.cancel === false) onOk(); else onCancel(); }
      }
      ok.addEventListener("click", onOk);
      cancel.addEventListener("click", onCancel);
      box.addEventListener("keydown", onKey);
    });
  }
  function uiAlert(message) { return showDialog({ message: message, cancel: false }); }
  function uiConfirm(message, okLabel) { return showDialog({ message: message, okLabel: okLabel }); }
  function uiPrompt(message, value) { return showDialog({ message: message, input: value || "" }); }

  // Baixar um arquivo gerado: no Artifact, só pelo recurso de downloads
  // (links de download são bloqueados lá); fora dele, link normal.
  // Ponte com o aplicativo desktop: cada pedido leva um id e a resposta
  // volta pela mesma via ({ id, ok, arquivo, cancelado, erro }).
  var desktopPending = {};
  function desktopCall(msg) {
    return new Promise(function (resolve) {
      msg.id = "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      desktopPending[msg.id] = resolve;
      DESKTOP.postMessage(msg);
    });
  }
  if (DESKTOP) {
    DESKTOP.addEventListener("message", function (e) {
      var r = e.data || {};
      if (r.id && desktopPending[r.id]) { desktopPending[r.id](r); delete desktopPending[r.id]; }
    });
  }
  function desktopResult(r, oQue) {
    if (r.ok) uiToast(oQue + " salvo: " + r.arquivo);
    else if (!r.cancelado) uiAlert("Não foi possível salvar o " + oQue + (r.erro ? ": " + r.erro : "."));
  }

  function offerFile(filename, data) {
    if (DESKTOP && typeof data === "string") {
      return desktopCall({ tipo: "salvar", nome: filename, texto: data }).then(function (r) { desktopResult(r, "arquivo"); });
    }
    if (IN_ARTIFACT) {
      if (!cloud.downloads) return uiAlert("Não foi possível baixar o arquivo aqui. Recarregue a página e tente de novo.");
      return cloud.downloads.save({ filename: filename, data: data }).catch(function (e) {
        if (e && e.code === "declined") return;
        return uiAlert("Não foi possível baixar o arquivo" + (e && e.message ? ": " + e.message : "."));
      });
    }
    var blob = data instanceof Blob ? data : new Blob([data], { type: "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return Promise.resolve();
  }

  function safeFileName(name) {
    // normalize("NFD") separa a letra da marca de acento (p.ex. "ç" vira
    // "c" + marca combinante), que a regex seguinte descarta — sem isso,
    // "Edição" virava "Edi_o" no nome do arquivo.
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\-]+/g, "_");
  }

  function current() { return store.editions[store.currentId]; }
  function state() { return current().data; }

  // Marca a edição como alterada. Nunca anda para trás: se outro aparelho
  // com relógio adiantado gravou antes, a alteração daqui continua sendo a
  // mais nova (e é enviada).
  function touchEdition(ed) {
    ed.updatedAt = Math.max(Date.now(), (ed.updatedAt || 0) + 1);
  }

  var saveDebounce = null;
  function scheduleSave() {
    invalidateChecks();
    touchEdition(current());
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(persist, 400);
  }

  /* ---------------------------------------------------------------------
     Desfazer / Refazer — histórico por edição (conteúdo, não gestão de
     edições: novo/duplicar/excluir/importar/trocar de edição zeram a pilha)
     --------------------------------------------------------------------- */
  var undoStack = [];
  var redoStack = [];
  var MAX_HISTORY = 60;
  // Edição com imagens grandes em base64: 60 cópias inteiras do estado em
  // memória pesam de verdade. Acima desse tamanho por snapshot, reduz o
  // teto do histórico em vez de guardar 60 cópias de alguns MB cada.
  var MAX_HISTORY_LARGE_STATE = 15;
  var LARGE_STATE_THRESHOLD = 2 * 1024 * 1024;
  var restoringHistory = false;

  function resetHistory() {
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
  }

  function pushHistory() {
    if (restoringHistory) return;
    var snapshot = JSON.stringify(state());
    undoStack.push(snapshot);
    var cap = snapshot.length > LARGE_STATE_THRESHOLD ? MAX_HISTORY_LARGE_STATE : MAX_HISTORY;
    while (undoStack.length > cap) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(state()));
    var prev = undoStack.pop();
    restoringHistory = true;
    current().data = JSON.parse(prev);
    restoringHistory = false;
    clearSelection(true);
    scheduleSave();
    render();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(state()));
    var next = redoStack.pop();
    restoringHistory = true;
    current().data = JSON.parse(next);
    restoringHistory = false;
    clearSelection(true);
    scheduleSave();
    render();
  }

  function updateUndoRedoButtons() {
    var u = document.getElementById("btnUndo");
    var r = document.getElementById("btnRedo");
    if (u) u.disabled = undoStack.length === 0;
    if (r) r.disabled = redoStack.length === 0;
  }

  /* ---------------------------------------------------------------------
     Utilidades
     --------------------------------------------------------------------- */
  function esc(s) {
    return (s == null ? "" : String(s))
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Só aceita http(s)/mailto, ou completa com https:// quando não há esquema
  // nenhum (ex.: "reuters.com/x"); qualquer outro esquema (javascript:,
  // data:, etc.) é bloqueado — o link vira texto normal, não clicável.
  function safeHref(url) {
    var u = (url || "").trim();
    if (!u) return "";
    if (/^(https?:)?\/\//i.test(u) || /^mailto:/i.test(u)) return u;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) return "https://" + u;
    return "";
  }

  // Só aceita imagem embutida (data:image/...), caminho relativo do projeto
  // (ex.: "img/logo.png") ou http(s) — um JSON importado não pode injetar
  // outro esquema (javascript:, etc.) nem, mais importante, escapar do
  // atributo HTML via aspas cruas (ver uso com esc() em imageSlot/
  // logoImageLayer/prévias do inspetor).
  function safeImageSrc(url) {
    var u = (url || "").trim();
    if (!u) return "";
    // Referência ao banco de imagens local (cada imagem guardada uma vez só)
    if (/^imgref:/.test(u)) u = (store.images || {})[u.slice(7)] || "";
    if (/^data:image\//i.test(u)) return u;
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return "";
    return u;
  }

  // Sanitiza HTML de campos editáveis: mantém só texto, <br> (quebra de
  // linha) e formatação por trecho — cor, fonte, negrito, itálico,
  // sublinhado — normalizada sempre para <span style="..."> com só essas
  // cinco propriedades (b/strong/i/em/u/font viram esse mesmo span) —
  // descarta qualquer outra tag/atributo. Usada tanto
  // para o que sai de um contenteditable (digitação, colar, formatação por
  // seleção) quanto — por ser aplicada de novo em todo render() — como
  // barreira contra HTML malicioso vindo de um JSON importado.
  var SCRIPT_OR_STYLE_BLOCK = /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi;
  var DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|img|svg|link|meta|form|input|button|textarea|select|video|audio|source)[^>]*>/gi;
  function sanitizeRichHtml(html) {
    var raw = String(html == null ? "" : html)
      .replace(SCRIPT_OR_STYLE_BLOCK, "")
      .replace(DANGEROUS_TAGS, "");
    var tmp = document.createElement("div");
    tmp.innerHTML = raw;
    (function clean(parent) {
      var node = parent.firstChild;
      while (node) {
        var next = node.nextSibling;
        if (node.nodeType === 1) {
          clean(node);
          var tag = node.tagName.toLowerCase();
          if (tag === "br") {
            // mantém como está
          } else if (tag === "span" || tag === "font" || tag === "b" || tag === "strong" || tag === "i" || tag === "em" || tag === "u") {
            var color = (node.style && node.style.color) || node.getAttribute("color") || "";
            var family = (node.style && node.style.fontFamily) || node.getAttribute("face") || "";
            var weight = (node.style && node.style.fontWeight) || "";
            var fstyle = (node.style && node.style.fontStyle) || "";
            var decoration = (node.style && (node.style.textDecorationLine || node.style.textDecoration)) || "";
            if (tag === "b" || tag === "strong") weight = weight || "bold";
            if (tag === "i" || tag === "em") fstyle = fstyle || "italic";
            if (tag === "u") decoration = decoration || "underline";
            var isBold = weight === "bold" || weight === "bolder" || parseInt(weight, 10) >= 600;
            // "normal" também vale: é como o N/I da barrinha tira o negrito/
            // itálico de um texto que já nasce assim (títulos, por exemplo).
            var isUnbold = !isBold && (weight === "normal" || weight === "lighter" || (parseInt(weight, 10) > 0 && parseInt(weight, 10) < 600));
            var isItalic = fstyle === "italic" || fstyle === "oblique";
            var isUnitalic = fstyle === "normal";
            var isUnderline = decoration.indexOf("underline") !== -1;
            if (color || family || isBold || isUnbold || isItalic || isUnitalic || isUnderline) {
              var span = document.createElement("span");
              if (color) span.style.color = color;
              if (family) span.style.fontFamily = family;
              if (isBold) span.style.fontWeight = "bold";
              if (isUnbold) span.style.fontWeight = "normal";
              if (isItalic) span.style.fontStyle = "italic";
              if (isUnitalic) span.style.fontStyle = "normal";
              if (isUnderline) span.style.textDecoration = "underline";
              while (node.firstChild) span.appendChild(node.firstChild);
              parent.replaceChild(span, node);
            } else {
              while (node.firstChild) parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
            }
          } else if (tag === "a") {
            // Link no meio do texto (barrinha de seleção): só href seguro
            // (http/https/mailto), sempre abrindo em nova aba.
            var linkHref = safeHref(node.getAttribute("href"));
            if (linkHref) {
              var a = document.createElement("a");
              a.className = "inline-link";
              a.setAttribute("href", linkHref);
              a.setAttribute("target", "_blank");
              a.setAttribute("rel", "noopener");
              a.setAttribute("title", linkHref + " (Ctrl+clique para abrir)");
              while (node.firstChild) a.appendChild(node.firstChild);
              parent.replaceChild(a, node);
            } else {
              while (node.firstChild) parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
            }
          } else if (tag === "div" || tag === "p") {
            if (node.previousSibling) parent.insertBefore(document.createElement("br"), node);
            while (node.firstChild) parent.insertBefore(node.firstChild, node);
            parent.removeChild(node);
          } else {
            while (node.firstChild) parent.insertBefore(node.firstChild, node);
            parent.removeChild(node);
          }
        } else if (node.nodeType !== 3) {
          parent.removeChild(node);
        }
        node = next;
      }
    })(tmp);
    return tmp.innerHTML.replace(/(<br>\s*){3,}/gi, "<br><br>");
  }

  // Valor pronto para inserir cru (sem escapar) no innerHTML de um campo
  // contenteditable — usar só aí, nunca em atributos/rótulos de UI (esses
  // continuam usando esc()).
  function richHtml(s) {
    if (s == null) return "";
    return sanitizeRichHtml(String(s));
  }

  function setPath(obj, path, value) {
    var parts = path.split(".");
    var node = obj;
    for (var i = 0; i < parts.length - 1; i++) node = node[parts[i]];
    node[parts[parts.length - 1]] = value;
  }

  function getPath(obj, path) {
    var parts = path.split(".");
    var node = obj;
    for (var i = 0; i < parts.length; i++) {
      if (node == null) return undefined;
      node = node[parts[i]];
    }
    return node;
  }

  function nextTrend(t) {
    return t === "up" ? "down" : t === "down" ? "flat" : "up";
  }
  function trendArrow(t) {
    return t === "up" ? "▲" : t === "down" ? "▼" : "—";
  }

  function relClass(text) {
    var v = (text || "").toUpperCase();
    if (v.indexOf("ALTA") !== -1) return "rel-alta";
    if (v.indexOf("MÉD") !== -1 || v.indexOf("MED") !== -1) return "rel-media";
    return "rel-baixa";
  }

  /* ---------------------------------------------------------------------
     Variáveis da edição (Fase 2) — número, data, cobertura e próxima
     edição digitados uma vez só (faixa abaixo da barra superior). Os campos
     derivados abaixo são gerados a partir delas, a menos que tenham sido
     editados à mão (meta.overrides[path] = true). Se faltar uma variável
     de que o campo precisa, o texto atual fica como está.
     --------------------------------------------------------------------- */
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

  function emptyVars() {
    return { edicao: "", data: "", coberturaInicio: "", coberturaFim: "", proxima: "" };
  }

  // "AAAA-MM-DD" (valor de <input type="date">) -> Date local, ou null.
  function parseIsoDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function ddmm(d) { return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1); }
  function ddmmaaaa(d) { return ddmm(d) + "/" + d.getFullYear(); }
  function diaSemanaCurto(d) { return DIAS_SEMANA[d.getDay()].replace("-feira", ""); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  // Primeira segunda-feira depois da data (a semana que a agenda cobre).
  function proximaSegunda(d) { return addDays(d, ((8 - d.getDay()) % 7) || 7); }

  function plainText(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return (tmp.textContent || "").trim();
  }

  // "PANORAMA ECONÔMICO" -> "Panorama Econômico" (preposições em minúsculas)
  function titleCase(s) {
    return s.toLowerCase().split(/\s+/).map(function (w, i) {
      if (i > 0 && /^(de|da|do|das|dos|e|em|a|o)$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");
  }

  // "28 a 03 de outubro" ou "28 de setembro a 03 de outubro"
  function intervalo(d1, d2, comAno) {
    var fim = pad2(d2.getDate()) + " de " + MESES[d2.getMonth()] + (comAno ? " de " + d2.getFullYear() : "");
    if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) return pad2(d1.getDate()) + " a " + fim;
    return pad2(d1.getDate()) + " de " + MESES[d1.getMonth()] + " a " + fim;
  }

  // Cada gerador recebe (vars já convertidas, estado) e devolve o texto,
  // ou null quando falta alguma variável (o texto atual fica como está).
  var DERIVED_FIELDS = {
    "masthead.line1": {
      label: "Data (barra superior)",
      gen: function (v, s) {
        if (!v.data) return null;
        // Mantém o que vem depois da data (ex.: "· SEMANAL · EDIÇÃO COMPACTA").
        var atual = plainText(s.masthead.line1);
        var i = atual.indexOf("·");
        var sufixo = i !== -1 ? " " + atual.slice(i).trim() : " · SEMANAL";
        return (diaSemanaCurto(v.data) + ", " + v.data.getDate() + " de " + MESES[v.data.getMonth()] + " de " + v.data.getFullYear()).toUpperCase() + sufixo;
      }
    },
    "masthead.line2": {
      label: "Edição e cobertura (barra superior)",
      gen: function (v) {
        if (!v.edicao || !v.ini || !v.fim) return null;
        return ("Edição N° " + v.edicao + " · Cobertura " + intervalo(v.ini, v.fim)).toUpperCase();
      }
    },
    "page2Header.editionLabel": {
      label: "Edição (cabeçalho do verso)",
      gen: function (v) { return v.edicao ? "EDIÇÃO N° " + v.edicao : null; }
    },
    "thermometer.subtitle": {
      label: "Subtítulo do Termômetro",
      gen: function (v) {
        if (!v.fim) return null;
        return "Fechamentos de " + DIAS_SEMANA[v.fim.getDay()] + ", " + ddmmaaaa(v.fim) + ". Variação de " + v.fim.getFullYear() + " no acumulado do ano.";
      }
    },
    "calendar.subtitle": {
      label: "Subtítulo da agenda",
      gen: function (v) {
        if (!v.data) return null;
        var ini = proximaSegunda(v.data);
        var fim = v.prox || addDays(ini, 5);
        return "Calendário de eventos que devem mexer com os mercados — semana de " +
          ini.getDate() + (ini.getMonth() === fim.getMonth() ? "" : " de " + MESES[ini.getMonth()]) +
          " a " + fim.getDate() + " de " + MESES[fim.getMonth()] + ".";
      }
    },
    "footerFront.verso": {
      label: "Verso (rodapé da página 1)",
      gen: function (v) {
        if (!v.data) return null;
        var ini = proximaSegunda(v.data);
        var fim = v.prox || addDays(ini, 5);
        return "Verso: Termômetro da Semana e agenda de " + ddmm(ini) + " a " + ddmm(fim) + ".";
      }
    },
    "footerBack.editionInfo": {
      label: "Informações da edição (rodapé do verso)",
      gen: function (v, s) {
        if (!v.edicao || !v.ini || !v.fim || !v.data) return null;
        return titleCase(plainText(s.meta.title)) + " — Edição N° " + v.edicao +
          " · Cobertura " + ddmm(v.ini) + " a " + ddmmaaaa(v.fim) +
          " · Emitido em " + ddmmaaaa(v.data) +
          (v.prox ? " · Próxima edição: " + ddmmaaaa(v.prox) : "") + ".";
      }
    }
  };

  function varsOf(s) {
    var raw = (s.meta && s.meta.vars) || emptyVars();
    return {
      edicao: (raw.edicao || "").trim(),
      data: parseIsoDate(raw.data),
      ini: parseIsoDate(raw.coberturaInicio),
      fim: parseIsoDate(raw.coberturaFim),
      prox: parseIsoDate(raw.proxima)
    };
  }

  function isDerived(path) { return Object.prototype.hasOwnProperty.call(DERIVED_FIELDS, path); }
  function isOverridden(s, path) { return !!(s.meta.overrides && s.meta.overrides[path]); }

  // Regrava os campos automáticos a partir das variáveis (chamada no render).
  function applyVars(s) {
    if (!s.meta.vars) return;
    var v = varsOf(s);
    Object.keys(DERIVED_FIELDS).forEach(function (path) {
      if (isOverridden(s, path)) return;
      var txt = DERIVED_FIELDS[path].gen(v, s);
      // Texto puro (escapado) ou { html } já montado (rodapé de fontes com links)
      if (txt != null) setPath(s, path, typeof txt === "object" ? sanitizeRichHtml(txt.html) : esc(txt));
    });
  }

  // Atributo que marca o campo como automático/manual (só efeito de tela).
  function varAttr(s, path) {
    if (!s.meta.vars || !isDerived(path)) return "";
    var manual = isOverridden(s, path);
    return ' data-var="' + (manual ? "manual" : "auto") + '" title="' +
      (manual ? "Editado à mão — não acompanha as Variáveis da edição (veja o painel lateral)"
              : "Texto automático, gerado pelas Variáveis da edição. Editar aqui passa este campo para manual.") + '"';
  }

  // Título da coluna "Var. AAAA" do Termômetro segue o ano da edição.
  function anoDaEdicao(s) {
    var v = varsOf(s);
    var d = v.fim || v.data;
    return d ? d.getFullYear() : 2026;
  }

  // Nome sugerido do PDF: "boletim_2026-05_edicao" a partir de "05/2026".
  function pdfBaseName() {
    var s = state();
    var m = /^(\d{1,3})\s*\/\s*(\d{4})$/.exec(((s.meta.vars && s.meta.vars.edicao) || "").trim());
    if (m) return "boletim_" + m[2] + "-" + pad2(m[1]) + "_edicao";
    return "boletim_" + safeFileName(current().name);
  }

  // Faixa "Variáveis da edição": valores, nome do PDF e quantos campos
  // estão editados à mão (com atalho para voltar todos ao automático).
  function renderVarsBar() {
    var bar = document.getElementById("varsBar");
    if (!bar) return;
    var s = state();
    var vars = s.meta.vars || emptyVars();
    Array.prototype.forEach.call(bar.querySelectorAll("[data-var-field]"), function (inp) {
      if (document.activeElement !== inp) inp.value = vars[inp.dataset.varField] || "";
    });
    var hint = document.getElementById("varsHint");
    if (hint) {
      hint.innerHTML = "Usadas em: cabeçalho, verso, rodapé e nome do arquivo (<strong>" + esc(pdfBaseName()) + ".pdf</strong>)";
    }
    var manual = Object.keys(DERIVED_FIELDS).filter(function (p) { return isOverridden(s, p); }).length;
    var btn = document.getElementById("btnVarsAutoAll");
    if (btn) {
      btn.hidden = manual === 0;
      btn.textContent = manual + (manual === 1 ? " campo editado à mão" : " campos editados à mão") + " · usar automático";
      btn.title = "Faz os campos que dependem das variáveis voltarem a ser gerados a partir delas";
    }
  }

  // Próxima edição: cópia da edição com número +1 e todas as datas +7 dias.
  // Mantém layout e textos (para sobrescrever), zera o que é da semana que
  // passou: fontes, vínculos de fonte, status e pendências ignoradas.
  function isoOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function shiftIso(v, n) { var d = parseIsoDate(v); return d ? isoOf(addDays(d, n)) : v; }
  function nextEditionData(src) {
    var d = JSON.parse(JSON.stringify(src));
    ensureVars(d);
    var v = d.meta.vars;
    var anoAntes = (parseIsoDate(v.data) || new Date()).getFullYear();
    ["data", "coberturaInicio", "coberturaFim", "proxima"].forEach(function (k) { v[k] = shiftIso(v[k], 7); });
    var anoDepois = (parseIsoDate(v.data) || new Date()).getFullYear();
    var m = /^(\d{1,3})\/(\d{4})$/.exec(v.edicao || "");
    if (m) {
      var num = parseInt(m[1], 10) + 1, ano = parseInt(m[2], 10);
      if (anoDepois > anoAntes) { num = 1; ano = anoDepois; } // virada de ano: recomeça em 01
      v.edicao = pad2(num) + "/" + ano;
    }
    (d.ticker || []).forEach(function (t) { if (t.refData) t.refData = shiftIso(t.refData, 7); });
    (d.columns || []).forEach(function (c) { delete c.sourceId; c.status = "rascunho"; });
    d.sources = [];
    d.meta.status = "rascunho";
    d.meta.ignoredChecks = [];
    delete d.pauta; // a pauta é da semana: a próxima edição escolhe a sua
    // Calculadora: o fechamento desta semana vira a abertura da próxima;
    // o fechamento novo e a abertura do dia ficam para preencher. Na virada
    // do ano a base anual também precisa ser trocada (fica vazia).
    ((d.thermometer && d.thermometer.groups) || []).forEach(function (g) {
      (g.rows || []).forEach(function (r) {
        if (!r.calc) return;
        r.calc = { tipo: r.calc.tipo, fech: "", abDia: "", abSem: r.calc.fech || "", abAno: anoDepois > anoAntes ? "" : (r.calc.abAno || "") };
      });
    });
    if (d.thermometer) delete d.thermometer.calcData;
    return d;
  }

  // Edição criada antes das variáveis: todos os campos derivados ficam
  // "editados à mão" para nada do que já está escrito mudar. Tenta só
  // aproveitar o número da edição que já aparece no texto.
  function ensureVars(d) {
    if (!d || typeof d !== "object") return;
    d.meta = d.meta || {};
    if (d.meta.vars) return;
    var vars = emptyVars();
    var m = /EDI[ÇC][ÃA]O\s*N[°º]?\s*(\d{1,3}\s*\/\s*\d{4})/i.exec(plainText((d.page2Header && d.page2Header.editionLabel) || "") + " " + plainText((d.masthead && d.masthead.line2) || ""));
    if (m) vars.edicao = m[1].replace(/\s+/g, "");
    d.meta.vars = vars;
    d.meta.overrides = {};
    Object.keys(DERIVED_FIELDS).forEach(function (path) { d.meta.overrides[path] = true; });
  }

  /* ---------------------------------------------------------------------
     Fase 5 — Cotações (dado, período, data de referência, modo de cor) e
     fontes da edição (lista numerada que alimenta o selo de cada notícia e
     o rodapé de fontes do verso).
     --------------------------------------------------------------------- */
  var TICKER_TIPOS = [["fechamento", "Fechamento", "fech."], ["abertura", "Abertura", "abert."], ["cotacao", "Cotação do dia", "cot."]];
  var TICKER_PERIODOS = [["dia", "No dia", "dia"], ["semana", "Na semana", "semana"], ["mes", "No mês", "mês"], ["ano", "No ano", "no ano"]];
  var TICKER_CORES = [["sinal", "Por sinal"], ["neutro", "Neutra"], ["seta", "Pela seta (manual)"]];

  function lookup(list, key, col) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === key) return list[i][col];
    return "";
  }

  // -1 / 0 / +1 a partir do texto da variação ("-2,55%", "+0,28%", "—")
  function signOfChange(text) {
    var t = plainText(text).replace(/\s/g, "");
    var m = /^([+\-−–])?(\d[\d.]*,?\d*)/.exec(t);
    if (!m) return 0;
    var v = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
    if (!v) return 0;
    return m[1] && m[1] !== "+" ? -1 : 1;
  }

  // Direção da seta: no modo "seta" é a marcada à mão; nos outros, vem do
  // sinal do valor (verde sobe, vermelho cai — ou cinza, no modo neutro).
  function tickerTrend(t) {
    if (!t.modoCor || t.modoCor === "seta") return t.trend || "flat";
    var sg = signOfChange(t.change);
    return sg > 0 ? "up" : sg < 0 ? "down" : "flat";
  }
  function tickerColor(t) {
    return t.modoCor === "neutro" ? "flat" : tickerTrend(t);
  }
  function tickerRefLine(t) {
    var d = parseIsoDate(t.refData);
    if (!d) return "";
    return (lookup(TICKER_TIPOS, t.tipo || "fechamento", 2) + " " + ddmm(d) + " · " + lookup(TICKER_PERIODOS, t.periodo || "semana", 2)).trim();
  }

  function sourceById(s, id) {
    return (s.sources || []).filter(function (x) { return x.id === id; })[0] || null;
  }
  function sourceNumber(s, id) {
    var list = s.sources || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i + 1;
    return 0;
  }
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\d?\./, ""); } catch (e) { return ""; }
  }
  // "infomoney.com.br" -> "InfoMoney" (canais do usuário, depois a lista de
  // veículos conhecidos) ou o próprio domínio.
  function inferVeiculo(host) {
    var lista = veiculosConhecidos();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i][1] && host.indexOf(lista[i][1].replace(/^www\./, "")) !== -1) return lista[i][0];
    }
    var base = host.split(".")[0] || host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  function newSourceId() { return "src_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6); }

  // O que falta para a fonte estar completa (vazio = completa).
  function sourceMissing(src) {
    var f = [];
    if (!plainText(src.veiculo)) f.push("veículo");
    if (!plainText(src.titulo)) f.push("título");
    if (!safeHref(src.url) || !/^https?:/i.test(safeHref(src.url))) f.push("link");
    if (!parseIsoDate(src.acessoEm)) f.push("data de acesso");
    return f;
  }

  // Selo da notícia na página: "[2] IBGE · 09/10/2026"
  function sourceSeloText(src, n) {
    var d = parseIsoDate(src.publicadoEm);
    return "[" + n + "] " + (plainText(src.veiculo) || hostOf(src.url) || "Fonte") + (d ? " · " + ddmmaaaa(d) : "");
  }

  var MESES_ABNT = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  function dataAbnt(d) { return pad2(d.getDate()) + " " + MESES_ABNT[d.getMonth()] + " " + d.getFullYear(); }

  // Uma referência no rodapé, em HTML (com link clicável).
  function sourceRefHtml(src, n, formato) {
    var href = safeHref(src.url);
    var link = href ? '<a href="' + esc(href) + '">' + esc(formato === "abnt" ? href.replace(/^https?:\/\//, "") : hostOf(href)) + "</a>" : "";
    var veic = plainText(src.veiculo), tit = plainText(src.titulo);
    var pub = parseIsoDate(src.publicadoEm), ac = parseIsoDate(src.acessoEm);
    if (formato === "abnt") {
      return "[" + n + "] " + esc(veic.toUpperCase()) + ". " + (tit ? "<b>" + esc(tit) + ".</b> " : "") +
        (pub ? dataAbnt(pub) + ". " : "") + (link ? "Disponível em: " + link + ". " : "") + (ac ? "Acesso em: " + dataAbnt(ac) + "." : "");
    }
    return "[" + n + "] " + [esc(veic), esc(tit), pub ? ddmmaaaa(pub) : "", link].filter(Boolean).join(" · ");
  }

  // Rodapé de fontes do verso gerado a partir da lista (campo derivado, com
  // a mesma lógica automático/editado à mão das variáveis da edição).
  DERIVED_FIELDS["footerBack.fontes"] = {
    label: "Fontes (rodapé do verso)",
    gen: function (v, s) {
      var list = s.sources || [];
      if (!list.length) return null;
      var formato = s.meta.refFormat === "abnt" ? "abnt" : "simples";
      return { html: "Fontes: " + list.map(function (src, i) { return sourceRefHtml(src, i + 1, formato); }).join(formato === "abnt" ? " " : "; ") };
    }
  };

  // Edição de antes da Fase 5: cria a lista de fontes a partir dos links já
  // existentes nas notícias (veículo deduzido do domínio, resto em branco =
  // "Incompleta"), sem apagar o texto do link; cotações recebem os campos
  // novos sem mudar a aparência (cor continua pela seta se ela não bater com
  // o sinal do valor); o rodapé de fontes fica "editado à mão".
  function ensurePhase5(d) {
    if (!d || typeof d !== "object" || (d.meta && d.meta.phase5)) return;
    d.meta = d.meta || {};
    d.sources = d.sources || [];
    (d.columns || []).forEach(function (c) {
      if (c.sourceId) return;
      var tmp = document.createElement("div");
      tmp.innerHTML = sanitizeRichHtml(String(c.linkText || ""));
      var a = tmp.querySelector("a[href]");
      if (!a) return;
      var url = a.getAttribute("href");
      var existing = d.sources.filter(function (x) { return x.url === url; })[0];
      if (!existing) {
        existing = { id: newSourceId(), veiculo: inferVeiculo(hostOf(url)), titulo: "", url: url, publicadoEm: "", acessoEm: "" };
        d.sources.push(existing);
      }
      c.sourceId = existing.id;
    });
    (d.ticker || []).forEach(function (t) {
      if (!t.tipo) t.tipo = "fechamento";
      if (!t.periodo) t.periodo = "semana";
      if (t.refData == null) t.refData = "";
      if (!t.modoCor) {
        var probe = { modoCor: "sinal", change: t.change };
        t.modoCor = tickerTrend(probe) === (t.trend || "flat") ? "sinal" : "seta";
      }
    });
    if (d.meta.vars) {
      d.meta.overrides = d.meta.overrides || {};
      d.meta.overrides["footerBack.fontes"] = true;
    }
    if (!d.meta.refFormat) d.meta.refFormat = "simples";
    d.meta.phase5 = true;
  }

  /* ---------------------------------------------------------------------
     Render — Página 1
     --------------------------------------------------------------------- */
  function tickerCard(t, i) {
    return (
      '<div class="ticker-card">' +
        '<div class="ticker-label"' + blockTextStyleAttr("ticker") + ' contenteditable data-path="ticker.' + i + '.label">' + richHtml(t.label) + "</div>" +
        '<div class="ticker-value"' + blockTextStyleAttr("ticker") + ' contenteditable data-path="ticker.' + i + '.value">' + richHtml(t.value) + "</div>" +
        '<div class="ticker-change trend-' + tickerColor(t) + '">' +
          // Seta marcada à mão só no modo "seta"; nos outros, segue o sinal do valor.
          (!t.modoCor || t.modoCor === "seta"
            ? '<button class="trend-btn" data-action="cycle-trend" data-path="ticker.' + i + '.trend" title="Alternar seta (cor pela seta)">' + trendArrow(t.trend) + "</button>"
            : '<span class="trend-arrow" title="Seta e cor seguem o sinal do valor (propriedades do bloco)">' + trendArrow(tickerTrend(t)) + "</span>") +
          '<span contenteditable data-path="ticker.' + i + '.change">' + richHtml(t.change) + "</span>" +
        "</div>" +
        (tickerRefLine(t) ? '<div class="ticker-ref">' + esc(tickerRefLine(t)) + "</div>" : "") +
        '<button class="btn-x no-print" data-action="remove-ticker" data-index="' + i + '" title="Remover ativo" style="position:absolute;top:3px;right:3px;">×</button>' +
      "</div>"
    );
  }

  // Camada de imagem com zoom/corte: 100%/50/50 reproduz exatamente o
  // antigo object-fit:cover centralizado; zoom>100 amplia em torno do
  // ponto (fitX,fitY), que também serve de âncora de reposicionamento —
  // é assim que a logo principal e a logo do parceiro suportam ajuste de
  // enquadramento sem precisar de uma ferramenta de recorte por arraste.
  function logoImageLayer(src, zoom, fitX, fitY) {
    var safeSrc = safeImageSrc(src);
    if (!safeSrc) return '<div class="logo-crop-layer"></div>';
    var z = zoom || 100;
    var fx = (fitX == null ? 50 : fitX);
    var fy = (fitY == null ? 50 : fitY);
    // Dentro de url('...') no CSS, esc() não basta: o navegador desfaz o
    // &#39; antes de ler o CSS, e uma aspa/parêntese no endereço fecharia o
    // url() e injetaria estilo. Codifica esses caracteres no próprio endereço.
    var cssSrc = safeSrc.replace(/['"()\\\s]/g, function (c) {
      return "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
    });
    return '<div class="logo-crop-layer" style="background-image:url(\'' + esc(cssSrc) + '\'); background-position:' + fx + '% ' + fy + '%; transform:scale(' + (z / 100) + '); transform-origin:' + fx + '% ' + fy + '%;"></div>';
  }

  function imageSlot(pathBase, imgUrl, cssClass, blockId) {
    if (!imgUrl && !blockId) return "";
    var mb = blockId ? blockExtraMarkup(blockId) : null;
    var html = mb ? ('<div class="img-slot' + mb.extraClass + '"' + mb.extraAttrs + '>') : '<div class="img-slot">';
    if (blockId) html += blockControlsHtml(blockId);
    var safeSrc = imgUrl ? safeImageSrc(imgUrl) : "";
    if (safeSrc) {
      html += '<img class="' + cssClass + '" src="' + esc(safeSrc) + '" alt="">';
    }
    html += "</div>";
    return html;
  }

  function columnBlock(c, i) {
    var mb = blockExtraMarkup("news-" + i);
    return (
      '<div class="news-block' + mb.extraClass + '"' + mb.extraAttrs + '>' +
        blockControlsHtml("news-" + i) +
        '<button class="btn-x no-print" data-action="remove-column" data-index="' + i + '" title="Remover bloco" style="position:absolute;top:2px;right:0;">×</button>' +
        imageSlot("columns." + i + ".image", c.image, "news-image") +
        '<div class="news-tag"' + blockTextStyleAttr("news-" + i) + ' contenteditable data-path="columns.' + i + '.tag">' + richHtml(c.tag) + "</div>" +
        '<div class="news-title"' + blockTextStyleAttr("news-" + i) + ' contenteditable data-placeholder="Título da notícia" data-path="columns.' + i + '.title">' + richHtml(c.title) + "</div>" +
        '<div class="news-body" contenteditable data-placeholder="Texto da notícia" data-path="columns.' + i + '.body">' + richHtml(c.body) + "</div>" +
        newsSourceLine(c, i) +
      "</div>"
    );
  }

  // Notícia com fonte vinculada: selo "[n] Veículo · data" com link para a
  // matéria (a citação completa vai para o rodapé do verso). Sem fonte: o
  // texto de link editável de antes ("Leia mais →").
  function newsSourceLine(c, i) {
    var s = state();
    var src = c.sourceId ? sourceById(s, c.sourceId) : null;
    if (!src) {
      return '<div class="news-link"' + blockTextStyleAttr("news-" + i) + ' contenteditable data-placeholder="Texto do link (selecione e use 🔗)" data-path="columns.' + i + '.linkText">' + richHtml(c.linkText) + "</div>";
    }
    var href = safeHref(src.url);
    var txt = esc(sourceSeloText(src, sourceNumber(s, src.id)));
    return '<div class="news-link news-source" data-source-of="' + i + '"' + blockTextStyleAttr("news-" + i) + ">" +
      (href ? '<a class="inline-link source-selo" href="' + esc(href) + '" target="_blank" rel="noopener" title="' + esc(href) + ' (Ctrl+clique para abrir)">' + txt + "</a>" : '<span class="source-selo">' + txt + "</span>") +
      "</div>";
  }

  function weekRow(r, i) {
    return (
      "<tr>" +
        '<td class="day" contenteditable data-path="weekTable.rows.' + i + '.day">' + richHtml(r.day) + "</td>" +
        '<td contenteditable data-path="weekTable.rows.' + i + '.text">' + richHtml(r.text) + "</td>" +
        '<td class="num trend-' + r.trend + '">' +
          '<div class="row-actions">' +
            '<button class="trend-btn no-print" data-action="cycle-trend" data-path="weekTable.rows.' + i + '.trend">' + trendArrow(r.trend) + "</button>" +
            '<span contenteditable data-path="weekTable.rows.' + i + '.change">' + richHtml(r.change) + "</span>" +
            '<button class="btn-x no-print" data-action="remove-week-row" data-index="' + i + '" title="Remover linha">×</button>' +
          "</div>" +
        "</td>" +
      "</tr>"
    );
  }

  /* ---------------------------------------------------------------------
     Seleção — qual item está com o painel de edição aberto à esquerda.
     Não é persistida (é só estado de UI da sessão).
     --------------------------------------------------------------------- */
  var selection = null; // { kind: "logo" | "block" | "element", blockId, elId }

  function selectItem(item) {
    // Caixa de texto (campo editável) clicada dentro do bloco — é nela que o
    // "Tamanho (%)" do painel age, não no bloco inteiro.
    var active = document.activeElement;
    var fieldPath = active && active.hasAttribute && active.hasAttribute("contenteditable") &&
      active.dataset.path && item.contains(active) ? active.dataset.path : null;
    selection = { kind: item.dataset.kind, blockId: item.dataset.blockId, elId: item.dataset.elId, fieldPath: fieldPath };
    // Atualização leve (sem re-render de página): clicar num texto para
    // selecioná-lo não pode reconstruir o DOM, ou o cursor que o navegador
    // acabou de posicionar ali seria perdido.
    var prev = document.querySelectorAll(".is-selected");
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove("is-selected");
    item.classList.add("is-selected");
    renderInspector();
    renderLayers();
    updateBlockToolbar();
  }

  function clearSelection(skipRender) {
    selection = null;
    if (!skipRender) render();
  }

  function isSelected(kind, blockIdOrElId) {
    if (!selection || selection.kind !== kind) return false;
    if (kind === "block") return selection.blockId === blockIdOrElId;
    if (kind === "element") return selection.elId === blockIdOrElId;
    return true; // "logo", "publisher-logo": instância única, kind já confere
  }

  /* ---------------------------------------------------------------------
     Camada livre: linhas, faixas e caixas de texto de posição livre
     --------------------------------------------------------------------- */
  function getElementById(id) {
    return (state().elements || []).find(function (x) { return x.id === id; });
  }

  /* ---------------------------------------------------------------------
     Blocos existentes do template — travar, mover/posicionar e ajustar
     cor/fonte de qualquer seção já presente no boletim (sem redimensionar:
     isso fica exclusivo da logo e dos elementos da camada livre acima).
     --------------------------------------------------------------------- */
  // Ajustes de bloco guardam só o que difere do padrão (ver compactLayout):
  // readBlockLayout() devolve uma cópia já completada com os padrões, para
  // leitura (render); getBlockLayout() devolve o objeto guardado, para
  // alterar — e só ele cria a entrada, então desenhar a página não grava nada.
  var BLOCK_LAYOUT_DEFAULTS = { x: 0, y: 0, locked: false, fontFamily: null, textColor: null, lineHeight: null, textAlign: null, hidden: false, removed: false };

  function readBlockLayout(blockId) {
    var stored = (state().blockLayout || {})[blockId];
    return Object.assign({}, BLOCK_LAYOUT_DEFAULTS, stored || {});
  }

  function getBlockLayout(blockId) {
    var s = state();
    if (!s.blockLayout) s.blockLayout = {};
    if (!s.blockLayout[blockId]) s.blockLayout[blockId] = {};
    return s.blockLayout[blockId];
  }

  // Remove de blockLayout tudo o que é igual ao padrão (e entradas vazias).
  // Edições antigas tinham ~25 entradas só com padrões (~12% do tamanho).
  function compactLayout(d) {
    if (!d || !d.blockLayout || typeof d.blockLayout !== "object") return;
    Object.keys(d.blockLayout).forEach(function (id) {
      var bl = d.blockLayout[id];
      if (!bl || typeof bl !== "object") { delete d.blockLayout[id]; return; }
      Object.keys(bl).forEach(function (k) {
        var v = bl[k];
        if (v === BLOCK_LAYOUT_DEFAULTS[k] || ((v === "" || v === null) && k in BLOCK_LAYOUT_DEFAULTS)) delete bl[k];
      });
      if (!Object.keys(bl).length) delete d.blockLayout[id];
    });
  }

  function blockExtraMarkup(blockId) {
    var bl = readBlockLayout(blockId);
    var locked = !!state().locked || bl.locked;
    var selected = isSelected("block", blockId);
    var extraClass = " draggable-item block-wrap" + (selected ? " is-selected" : "") + (bl.hidden || bl.removed ? " is-hidden-block" : "");
    var styleExtra = blockTextStyleInline(blockId);
    var extraAttrs = ' data-kind="block" data-block-id="' + blockId + '" data-x="' + bl.x + '" data-y="' + bl.y +
      '" style="position:relative; transform:translate(' + bl.x + 'px,' + bl.y + 'px); cursor:default;' + styleExtra + '"';
    return { extraClass: extraClass, extraAttrs: extraAttrs };
  }

  // Estilo de texto (cor/fonte) do bloco, como fragmento CSS cru — usado no
  // wrapper (cascade p/ texto sem cor própria) e, via blockTextStyleAttr(),
  // aplicado direto em elementos "de marca" (título, tag, etc.) cujo CSS já
  // fixa cor/fonte explícitas: essas nunca herdariam do wrapper, então sem
  // isso a troca no painel parecia não fazer nada nesses casos.
  function blockTextStyleInline(blockId) {
    var bl = readBlockLayout(blockId);
    var s = "";
    if (bl.textColor) s += "color:" + bl.textColor + ";";
    if (bl.fontFamily) s += "font-family:" + bl.fontFamily + ";";
    // Entrelinha e alinhamento: --lh/--ta valem também para os textos que
    // têm entrelinha/alinhamento próprios no CSS (var(--lh, padrão)).
    if (bl.lineHeight && /^[\d.]+$/.test(String(bl.lineHeight))) s += "--lh:" + bl.lineHeight + ";line-height:" + bl.lineHeight + ";";
    if (bl.textAlign === "left" || bl.textAlign === "justify") s += "--ta:" + bl.textAlign + ";text-align:" + bl.textAlign + ";";
    return s;
  }

  // Atributo style="..." pronto para inserir num elemento específico,
  // ou string vazia se o bloco não tem override (não polui o HTML à toa).
  function blockTextStyleAttr(blockId) {
    var s = blockTextStyleInline(blockId);
    return s ? ' style="' + s + '"' : "";
  }

  // Fase 4: blocos do modelo não são mais arrastados livremente (deixava
  // buraco no layout) — a ordem muda pelas camadas. A alça de mover fica só
  // para logos e elementos livres; deslocamentos antigos continuam valendo.
  function blockControlsHtml() {
    return "";
  }

  function elementBoxHtml(el, idx) {
    var globalLocked = !!state().locked;
    var itemLocked = globalLocked || !!el.locked;
    var selected = isSelected("element", el.id);
    var wrapStyle = "width:" + el.width + "px; height:" + el.height + "px; " +
      "transform:translate(" + el.x + "px," + el.y + "px); cursor:" + (itemLocked ? "default" : "move") + ";";
    var attrs = 'class="free-el draggable-item' + (selected ? " is-selected" : "") + '" data-kind="element" data-el-id="' + el.id +
      '" data-el-type="' + el.type + '" data-resize-mode="box" data-x="' + el.x + '" data-y="' + el.y +
      '" style="' + wrapStyle + '"';

    var inner;
    if (el.type === "text") {
      inner = '<div class="free-el-text" contenteditable data-placeholder="Texto" data-path="elements.' + idx + '.text" ' +
        'style="color:' + el.textColor + ';background:' + (el.bgColor || "transparent") + ';' +
        "font-family:" + el.fontFamily + ";font-size:" + el.fontSize + "px;font-weight:" + el.fontWeight + ';">' +
        richHtml(el.text) + "</div>";
    } else {
      inner = '<div style="width:100%;height:100%;background:' + el.bgColor + ';"></div>';
    }

    var handle = itemLocked ? "" : '<span class="drag-handle-mini no-print" title="Mover">' + icon("move") + '</span>';
    var resizeHandle = itemLocked ? "" : '<div class="resize-handle no-print" title="Arraste para redimensionar"></div>';

    return "<div " + attrs + ">" + inner + handle + resizeHandle + "</div>";
  }

  function slimBarHtml(s) {
    var html = '<div class="masthead-slim">';
    html += '<div class="slim-meta">';
    var mbDate = blockExtraMarkup("slim-date");
    html += '<div class="' + mbDate.extraClass.trim() + '"' + mbDate.extraAttrs + '>' + blockControlsHtml("slim-date") +
      '<span class="slim-date"' + blockTextStyleAttr("slim-date") + ' contenteditable data-path="masthead.line1"' + varAttr(s, "masthead.line1") + '>' + richHtml(s.masthead.line1) + "</span></div>";
    var mbEdition = blockExtraMarkup("slim-edition");
    html += '<div class="' + mbEdition.extraClass.trim() + '"' + mbEdition.extraAttrs + '>' + blockControlsHtml("slim-edition") +
      '<span class="slim-edition"' + blockTextStyleAttr("slim-edition") + ' contenteditable data-path="masthead.line2"' + varAttr(s, "masthead.line2") + '>' + richHtml(s.masthead.line2) + "</span></div>";
    html += "</div>"; // slim-meta
    html += '<div class="slim-publisher">';
    if (s.meta.publisherLogo) {
      var pw = s.meta.publisherLogoWidth || 80;
      var ph = s.meta.publisherLogoHeight || 26;
      var px = s.meta.publisherLogoX || 0;
      var py = s.meta.publisherLogoY || 0;
      var pubLocked = !!s.locked || !!s.meta.publisherLogoLocked;
      var pubSelected = isSelected("publisher-logo", null);
      html += '<span class="slim-publisher-label">Publicado por</span>';
      html += '<div class="publisher-logo-draggable draggable-item' + (pubSelected ? " is-selected" : "") + '" data-kind="publisher-logo" data-resize-mode="box" data-x="' + px + '" data-y="' + py + '" style="transform:translate(' + px + 'px,' + py + 'px); cursor:' + (pubLocked ? "default" : "move") + ';">' +
        '<div class="publisher-logo-img" style="width:' + pw + 'px; height:' + ph + 'px;">' +
        logoImageLayer(s.meta.publisherLogo, s.meta.publisherLogoZoom, s.meta.publisherLogoFitX, s.meta.publisherLogoFitY) +
        "</div>";
      if (!pubLocked) {
        html += '<span class="drag-handle-mini no-print" title="Mover">' + icon("move") + '</span>' +
          '<div class="resize-handle no-print" title="Arraste para redimensionar"></div>';
      }
      html += "</div>";
    }
    html += "</div>"; // slim-publisher
    html += "</div>"; // masthead-slim
    return html;
  }

  function renderFreeLayer(pageNum) {
    var s = state();
    var all = s.elements || [];
    var html = '<div class="free-layer">';
    all.forEach(function (el, idx) {
      if (el.page === pageNum) html += elementBoxHtml(el, idx);
    });
    html += "</div>";
    return html;
  }

  function renderPage1() {
    var s = state();
    var html = "";

    html += slimBarHtml(s);

    var mbMasthead = blockExtraMarkup("masthead");
    html += '<div class="brand-band' + mbMasthead.extraClass + '"' + mbMasthead.extraAttrs + '>';
    html += blockControlsHtml("masthead");
    html += '<div class="brand-band-logo">';
    if (s.meta.logo) {
      var lw = s.meta.logoWidth || 155;
      var lh = s.meta.logoHeight || 154;
      var lx = s.meta.logoX || 0;
      var ly = s.meta.logoY || 0;
      var logoLocked = !!s.meta.logoLocked;
      var logoItemLocked = !!s.locked || logoLocked;
      var logoSelected = isSelected("logo", null);
      html += '<div class="logo-draggable draggable-item' + (logoSelected ? " is-selected" : "") + '" data-kind="logo" data-resize-mode="square" data-x="' + lx + '" data-y="' + ly + '" style="transform:translate(' + lx + 'px,' + ly + 'px); cursor:' + (logoItemLocked ? "default" : "move") + ';">' +
        '<div class="brand-logo-img" style="width:' + lw + 'px; height:' + lh + 'px;">' +
        logoImageLayer(s.meta.logo, s.meta.logoZoom, s.meta.logoFitX, s.meta.logoFitY) +
        "</div>";
      if (!logoItemLocked) {
        html += '<span class="drag-handle-mini no-print" title="Mover">' + icon("move") + '</span>' +
          '<div class="resize-handle no-print" title="Arraste para redimensionar"></div>';
      }
      html += "</div>";
    }
    html += "</div>"; // brand-band-logo

    // O título/subtítulo têm posição própria e fixa (para dar de arrastar
    // cada um independente da logo) — mas se a logo for redimensionada ou
    // deslocada além da caixa padrão de 155px (41mm), sem isso o texto
    // ficaria escondido atrás dela. Empurra o texto para a direita só o
    // necessário para nunca sobrepor a logo, de acordo com o tamanho/
    // posição reais que ela tiver nessa edição.
    var logoRightEdge = s.meta.logo ? (s.meta.logoX || 0) + (s.meta.logoWidth || 155) : 0;
    var logoOverflowPx = Math.max(0, logoRightEdge - 155);

    html += '<div class="brand-band-text">';
    html += '<div class="masthead-main" style="margin-left:' + logoOverflowPx + 'px;">';

    var mbTitle = blockExtraMarkup("masthead-title");
    html += '<div class="' + mbTitle.extraClass.trim() + '"' + mbTitle.extraAttrs + '>' + blockControlsHtml("masthead-title") +
      '<h1 class="brand-title"' + blockTextStyleAttr("masthead-title") + ' contenteditable data-path="meta.title">' + richHtml(s.meta.title) + "</h1></div>";
    html += '<div class="title-divider"></div>';
    var mbSubtitle = blockExtraMarkup("masthead-subtitle");
    html += '<div class="' + mbSubtitle.extraClass.trim() + '"' + mbSubtitle.extraAttrs + '>' + blockControlsHtml("masthead-subtitle") +
      '<div class="brand-subtitle"' + blockTextStyleAttr("masthead-subtitle") + ' contenteditable data-path="meta.subtitle">' + richHtml(s.meta.subtitle) + "</div></div>";

    html += "</div>";
    html += "</div>"; // brand-band-text
    html += "</div>"; // brand-band

    var mbTag = blockExtraMarkup("tag");
    html += '<div class="tag-row' + mbTag.extraClass + '"' + mbTag.extraAttrs + '>' + blockControlsHtml("tag") +
      '<span class="tag"' + blockTextStyleAttr("tag") + ' contenteditable data-path="headline.tag">' + richHtml(s.headline.tag) + "</span></div>";

    var mbHTitle = blockExtraMarkup("headline-title");
    html += '<div class="' + mbHTitle.extraClass.trim() + '"' + mbHTitle.extraAttrs + '>' + blockControlsHtml("headline-title") +
      '<h2 class="headline-title"' + blockTextStyleAttr("headline-title") + ' contenteditable data-path="headline.title">' + richHtml(s.headline.title) + "</h2></div>";

    var mbHDeck = blockExtraMarkup("headline-deck");
    html += '<div class="' + mbHDeck.extraClass.trim() + '"' + mbHDeck.extraAttrs + '>' + blockControlsHtml("headline-deck") +
      '<div class="headline-deck"' + blockTextStyleAttr("headline-deck") + ' contenteditable data-path="headline.deck">' + richHtml(s.headline.deck) + "</div></div>";

    html += imageSlot("headline.image", s.headline.image, "headline-image", "headline-image");

    var mbHBody = blockExtraMarkup("headline-body");
    html += '<div class="headline-body' + mbHBody.extraClass + '"' + mbHBody.extraAttrs + '>';
    html += blockControlsHtml("headline-body");
    s.headline.paragraphs.forEach(function (p, i) {
      html += '<div class="item-with-remove"><p class="grow" contenteditable data-placeholder="Texto do parágrafo" data-path="headline.paragraphs.' + i + '">' + richHtml(p) + "</p>" +
        '<button class="btn-x no-print" data-action="remove-paragraph" data-index="' + i + '" title="Remover parágrafo">×</button></div>';
    });
    if (!s.headline.paragraphs.length) {
      html += '<button class="btn-mini no-print" data-action="add-paragraph" style="margin:0 0 3px;padding:0 6px;font-size:7pt;">+ Parágrafo</button>';
    }
    html += "</div>";

    var mbTicker = blockExtraMarkup("ticker");
    html += '<div class="ticker-row' + mbTicker.extraClass + '"' + mbTicker.extraAttrs + '>';
    html += blockControlsHtml("ticker");
    s.ticker.forEach(function (t, i) { html += tickerCard(t, i); });
    html += "</div>";

    var mbNewsList = blockExtraMarkup("news-list");
    html += '<div class="news-list' + mbNewsList.extraClass + '"' + mbNewsList.extraAttrs + '>';
    html += blockControlsHtml("news-list");
    s.columns.forEach(function (c, i) { html += columnBlock(c, i); });
    html += "</div>";

    var mbWeek = blockExtraMarkup("week-table");
    html += '<div class="week-table-wrap' + mbWeek.extraClass + '"' + mbWeek.extraAttrs + '>';
    html += blockControlsHtml("week-table");
    html += '<div class="section-title" contenteditable data-path="weekTable.title">' + richHtml(s.weekTable.title) + "</div>";
    html += '<table class="data-table"><thead><tr><th style="width:14%">Dia</th><th>Resumo</th><th style="width:16%">Variação</th></tr></thead><tbody>';
    s.weekTable.rows.forEach(function (r, i) { html += weekRow(r, i); });
    html += "</tbody></table>";
    html += "</div>";

    var mbNote = blockExtraMarkup("note");
    html += '<div class="' + mbNote.extraClass.trim() + '"' + mbNote.extraAttrs + '>' + blockControlsHtml("note") +
      '<div class="note-italic"' + blockTextStyleAttr("note") + ' contenteditable data-path="note">' + richHtml(s.note) + "</div></div>";

    var mbFooterF = blockExtraMarkup("footer-front");
    html += '<div class="footer-front' + mbFooterF.extraClass + '"' + mbFooterF.extraAttrs + '>' + blockControlsHtml("footer-front") +
      '<div contenteditable data-path="footerFront.fontes">' + richHtml(s.footerFront.fontes) + "</div>" +
      '<div><span contenteditable data-path="footerFront.autoria">' + richHtml(s.footerFront.autoria) + '</span> · <span contenteditable data-path="footerFront.verso"' + varAttr(s, "footerFront.verso") + '>' + richHtml(s.footerFront.verso) + "</span></div>" +
      '<div class="disclaimer" contenteditable data-path="footerFront.disclaimer">' + richHtml(s.footerFront.disclaimer) + "</div>" +
    "</div>";

    html += renderFreeLayer(1);

    document.getElementById("page1").innerHTML = html;
  }

  /* ---------------------------------------------------------------------
     Render — Página 2
     --------------------------------------------------------------------- */
  // Termômetro: variações coloridas pelo sinal e seta da coluna Sinal
  // automática, pela variação na semana ("—" quando não há variação).
  function signClass(text) {
    var sg = signOfChange(text);
    return sg > 0 ? "v-up" : sg < 0 ? "v-down" : "";
  }
  function thermoTrend(r) {
    var sg = signOfChange(r.varSemana);
    return sg > 0 ? "up" : sg < 0 ? "down" : "flat";
  }

  function thermoRow(r, gi, ri) {
    var p = "thermometer.groups." + gi + ".rows." + ri;
    var tr = thermoTrend(r);
    return (
      "<tr>" +
        '<td contenteditable data-path="' + p + '.ativo">' + richHtml(r.ativo) + "</td>" +
        '<td class="num" contenteditable data-path="' + p + '.fechamento">' + richHtml(r.fechamento) + "</td>" +
        '<td class="num ' + signClass(r.varDia) + '" contenteditable data-path="' + p + '.varDia">' + richHtml(r.varDia) + "</td>" +
        '<td class="num ' + signClass(r.varSemana) + '" contenteditable data-path="' + p + '.varSemana">' + richHtml(r.varSemana) + "</td>" +
        '<td class="num ' + signClass(r.var2026) + '" contenteditable data-path="' + p + '.var2026">' + richHtml(r.var2026) + "</td>" +
        '<td class="sinal trend-' + tr + '" title="Automático: segue a variação na semana">' + trendArrow(tr) + "</td>" +
        '<td class="thermo-fonte"><span contenteditable data-placeholder="F1" data-path="' + p + '.fonte">' + richHtml(r.fonte) + "</span>" +
          '<button class="btn-x no-print thermo-row-x" data-action="remove-thermo-row" data-group="' + gi + '" data-index="' + ri + '" title="Remover linha">×</button>' +
        "</td>" +
      "</tr>"
    );
  }

  function calRow(r, i) {
    var boldClass = r.bold ? " cal-bold" : "";
    return (
      "<tr>" +
        '<td class="' + boldClass.trim() + '" contenteditable data-path="calendar.rows.' + i + '.data">' + richHtml(r.data) + "</td>" +
        '<td class="' + boldClass.trim() + '" contenteditable data-path="calendar.rows.' + i + '.evento">' + richHtml(r.evento) + "</td>" +
        '<td class="' + boldClass.trim() + '" contenteditable data-path="calendar.rows.' + i + '.pais">' + richHtml(r.pais) + "</td>" +
        '<td>' +
          '<div class="row-actions" style="justify-content:flex-start;">' +
            '<span class="relevance-dot ' + relClass(r.relevancia) + '"></span>' +
            '<span contenteditable data-path="calendar.rows.' + i + '.relevancia">' + richHtml(r.relevancia) + "</span>" +
            '<button class="btn-mini no-print" data-action="toggle-cal-bold" data-index="' + i + '" title="Destacar linha (negrito)" style="margin:0;padding:1px 5px;">N</button>' +
            '<button class="btn-x no-print" data-action="remove-calendar-row" data-index="' + i + '" title="Remover linha">×</button>' +
          "</div>" +
        "</td>" +
      "</tr>"
    );
  }

  function glossaryItem(it, i) {
    return (
      '<div class="gloss-item">' +
        '<button class="btn-x no-print" data-action="remove-glossary-item" data-index="' + i + '" title="Remover termo" style="position:absolute;top:2px;right:0;">×</button>' +
        '<div class="gloss-term" contenteditable data-placeholder="Termo" data-path="glossary.items.' + i + '.term">' + richHtml(it.term) + "</div>" +
        '<div class="gloss-def"' + blockTextStyleAttr("glossary") + ' contenteditable data-placeholder="Definição" data-path="glossary.items.' + i + '.def">' + richHtml(it.def) + "</div>" +
      "</div>"
    );
  }

  function renderPage2() {
    var s = state();
    var html = "";

    var mbP2Top = blockExtraMarkup("page2-top");
    html += '<div class="page2-top' + mbP2Top.extraClass + '"' + mbP2Top.extraAttrs + '>' + blockControlsHtml("page2-top") +
      '<span><span contenteditable data-path="meta.title">' + richHtml(s.meta.title) + '</span> · <span contenteditable data-path="page2Header.editionLabel"' + varAttr(s, "page2Header.editionLabel") + '>' + richHtml(s.page2Header.editionLabel) + "</span></span>" +
      '<span contenteditable data-path="page2Header.note">' + richHtml(s.page2Header.note) + "</span>" +
    "</div>";

    // Termômetro
    var mbThermo = blockExtraMarkup("thermo");
    html += '<div class="thermo-wrap' + mbThermo.extraClass + '"' + mbThermo.extraAttrs + '>';
    html += blockControlsHtml("thermo");
    html += '<div class="section-title" contenteditable data-path="thermometer.title">' + richHtml(s.thermometer.title) + "</div>";
    html += '<div class="section-sub"' + blockTextStyleAttr("thermo") + ' contenteditable data-path="thermometer.subtitle"' + varAttr(s, "thermometer.subtitle") + '>' + richHtml(s.thermometer.subtitle) + "</div>";
    html += '<table class="data-table thermo-table"><thead><tr><th>Ativo</th><th>Fechamento</th><th>Var. dia</th><th>Var. semana</th><th>Var. ' + anoDaEdicao(s) + '</th><th>Sinal</th><th>Fonte</th></tr></thead><tbody>';
    s.thermometer.groups.forEach(function (g, gi) {
      html += '<tr class="group-row"><td colspan="7"><div class="row-actions" style="justify-content:space-between;">' +
        '<span' + blockTextStyleAttr("thermo") + ' contenteditable data-path="thermometer.groups.' + gi + '.name">' + richHtml(g.name) + "</span>" +
        '<button class="btn-x no-print" data-action="remove-thermo-group" data-group="' + gi + '" title="Remover grupo">×</button>' +
      "</div></td></tr>";
      g.rows.forEach(function (r, ri) { html += thermoRow(r, gi, ri); });
    });
    html += "</tbody></table>";
    html += '<div class="thermo-fontes-legenda" contenteditable data-placeholder="Fontes: F1 = ...; F2 = ...; F3 = ..." data-path="thermometer.fontesLegenda">' + richHtml(s.thermometer.fontesLegenda) + "</div>";
    html += "</div>";

    // Calendário
    var mbCal = blockExtraMarkup("calendar");
    html += '<div class="calendar-wrap' + mbCal.extraClass + '"' + mbCal.extraAttrs + '>';
    html += blockControlsHtml("calendar");
    html += '<div class="section-title" contenteditable data-path="calendar.title">' + richHtml(s.calendar.title) + "</div>";
    html += '<div class="section-sub"' + blockTextStyleAttr("calendar") + ' contenteditable data-path="calendar.subtitle"' + varAttr(s, "calendar.subtitle") + '>' + richHtml(s.calendar.subtitle) + "</div>";
    html += '<table class="data-table"><thead><tr><th style="width:15%">Data</th><th>Evento</th><th style="width:16%">País</th><th style="width:18%">Relevância</th></tr></thead><tbody>';
    s.calendar.rows.forEach(function (r, i) { html += calRow(r, i); });
    html += "</tbody></table>";
    html += "</div>";

    // Super quarta / destaque
    var mbSq = blockExtraMarkup("sq");
    html += '<div class="sq-box' + mbSq.extraClass + '"' + mbSq.extraAttrs + '>' + blockControlsHtml("sq") +
      '<div class="sq-title" contenteditable data-path="superQuarta.title">' + richHtml(s.superQuarta.title) + "</div>" +
      '<div class="sq-body" contenteditable data-placeholder="Texto de destaque" data-path="superQuarta.body">' + richHtml(s.superQuarta.body) + "</div>" +
    "</div>";

    // Glossário
    var mbGloss = blockExtraMarkup("glossary");
    html += '<div class="glossary' + mbGloss.extraClass + '"' + mbGloss.extraAttrs + '>';
    html += blockControlsHtml("glossary");
    html += '<div class="glossary-title" contenteditable data-path="glossary.title">' + richHtml(s.glossary.title) + "</div>";
    html += '<div class="glossary-grid">';
    s.glossary.items.forEach(function (it, i) { html += glossaryItem(it, i); });
    html += "</div>";
    html += "</div>";

    var mbFooterB = blockExtraMarkup("footer-back");
    html += '<div class="footer-back' + mbFooterB.extraClass + '"' + mbFooterB.extraAttrs + '>' + blockControlsHtml("footer-back") +
      '<div contenteditable data-path="footerBack.editionInfo"' + varAttr(s, "footerBack.editionInfo") + '>' + richHtml(s.footerBack.editionInfo) + "</div>" +
      '<div contenteditable data-path="footerBack.fontes"' + varAttr(s, "footerBack.fontes") + '>' + richHtml(s.footerBack.fontes) + "</div>" +
      '<div class="disclaimer" contenteditable data-path="footerBack.disclaimer">' + richHtml(s.footerBack.disclaimer) + "</div>" +
    "</div>";

    html += renderFreeLayer(2);

    document.getElementById("page2").innerHTML = html;
  }

  // Escala global do texto (meta.fontScaleAll, em %) — vale para as duas
  // páginas; o campo do painel lateral é fixo no HTML, então é sincronizado
  // aqui (troca de edição, desfazer etc.).
  function applyFontScaleAll() {
    var pct = Math.min(200, Math.max(50, state().meta.fontScaleAll || 100));
    ["page1", "page2"].forEach(function (id) {
      var pg = document.getElementById(id);
      if (pg) pg.style.setProperty("--fs-all", String(pct / 100));
    });
    var inp = document.getElementById("fontScaleAll");
    if (inp && document.activeElement !== inp) inp.value = pct;
  }

  // Aplica o tamanho próprio de cada caixa de texto: mede o tamanho que ela
  // teria normalmente (já com a escala geral) e multiplica — funciona tanto
  // em caixas com tamanho próprio no CSS quanto nas que herdam do bloco.
  function applyFieldFontScales() {
    var map = state().fieldFontScale || {};
    Object.keys(map).forEach(function (path) {
      var pct = map[path];
      if (!pct || pct === 100) return;
      var els = document.querySelectorAll('#page1 [contenteditable][data-path="' + path + '"], #page2 [contenteditable][data-path="' + path + '"]');
      Array.prototype.forEach.call(els, function (el) {
        el.style.fontSize = "";
        var base = parseFloat(getComputedStyle(el).fontSize);
        if (base) el.style.fontSize = (base * pct / 100) + "px";
      });
    });
  }

  function render() {
    invalidateChecks();
    // Edição sem variáveis (vinda de outro aparelho, de JSON antigo etc.):
    // migra aqui também, para nunca sobrescrever texto escrito à mão.
    ensureVars(state()); // antes de fillDefaults, que criaria variáveis vazias sem proteger o texto
    ensurePhase5(state()); // idem: cria fontes a partir dos links antes dos padrões
    fillDefaults(state(), blankTemplate());
    applyVars(state());
    renderVarsBar();
    applyFontScaleAll();
    renderPage1();
    renderPage2();
    applyFieldFontScales();
    renderToolbar();
    renderInspector();
    renderLayers();
    renderSourcesTab();
    renderNotas();
    lockForReview();
    if (modoAtual === "pauta") renderPauta();
    updateBlockToolbar();
    scheduleOverflowCheck();
  }

  /* ---------------------------------------------------------------------
     Estouro de página (Fase 1) — a impressão já corta em silêncio
     (.page{max-height:297mm;overflow:hidden} no @media print) o que passar
     da folha A4; aqui só avisamos na tela, sem mudar esse corte.
     --------------------------------------------------------------------- */
  var PAGE_HEIGHT_PX = 297 * 96 / 25.4; // 297mm em px CSS (96dpi)
  var pageOverflowMm = { 1: 0, 2: 0 };
  var overflowCheckTimer = null;

  function fmtMm(mm) {
    return mm.toFixed(1).replace(".", ",");
  }

  function measurePageOverflow(pageNum) {
    var page = document.getElementById("page" + pageNum);
    var badge = document.getElementById("page" + pageNum + "Overflow");
    if (!page || !badge) return;
    var overflowPx = page.scrollHeight - PAGE_HEIGHT_PX;
    if (overflowPx > 1) {
      var mm = overflowPx / (96 / 25.4);
      pageOverflowMm[pageNum] = mm;
      badge.textContent = "⚠ Estoura " + fmtMm(mm) + " mm — seria cortado no PDF";
      badge.hidden = false;
    } else {
      pageOverflowMm[pageNum] = 0;
      badge.hidden = true;
    }
  }

  var pageUsedCache = { 1: 0, 2: 0 };

  // Mede como sai impresso: esconde por um instante o que é só de tela
  // (botões "+ Parágrafo", "N" da agenda, × etc.), que ocupam espaço no
  // editor mas não existem no PDF. Tudo síncrono: nada pisca na tela.
  function measurePages() {
    invalidateChecks();
    var body = document.body;
    var already = body.classList.contains("pdf-capture");
    if (!already) body.classList.add("pdf-capture");
    try {
      measurePageOverflow(1);
      measurePageOverflow(2);
      [1, 2].forEach(function (n) { var pg = document.getElementById("page" + n); if (pg) pageUsedCache[n] = pageUsedPx(pg); });
    } finally {
      if (!already) body.classList.remove("pdf-capture");
    }
  }

  // Mede as páginas e atualiza pendências (botão Verificar e camadas) e a
  // barra de status.
  function checkPageOverflow() {
    measurePages();
    renderNotaPins();
    updateCheckBadge();
    updateStatusBar();
    renderLayers();
  }

  // Altura ocupada pelo conteúdo da página (não pela folha, que tem sempre
  // pelo menos 297 mm): até o fim do último bloco + margem de baixo.
  function pageUsedPx(page) {
    var bottom = 0;
    Array.prototype.forEach.call(page.children, function (ch) {
      if (ch.classList.contains("free-layer")) return;
      var cs = getComputedStyle(ch);
      bottom = Math.max(bottom, ch.offsetTop + ch.offsetHeight + (parseFloat(cs.marginBottom) || 0));
    });
    (state().elements || []).forEach(function (el) {
      if ("page" + el.page === page.id) bottom = Math.max(bottom, (el.y || 0) + (el.height || 0));
    });
    return Math.max(bottom + (parseFloat(getComputedStyle(page).paddingBottom) || 0), page.scrollHeight > PAGE_HEIGHT_PX + 1 ? page.scrollHeight : 0);
  }

  function updateStatusBar() {
    [1, 2].forEach(function (n) {
      var out = document.getElementById("statusPage" + n);
      var page = document.getElementById("page" + n);
      if (!out || !page) return;
      var pct = Math.round((pageUsedCache[n] || pageUsedPx(page)) / PAGE_HEIGHT_PX * 100);
      var over = pageOverflowMm[n] > 0;
      var cls = over ? "is-over" : pct >= 97 ? "is-tight" : "";
      out.innerHTML = "Pág. " + n + ' <span class="meter ' + cls + '" role="img" aria-label="' + pct + '% da folha"><i style="width:' + Math.min(100, pct) + '%"></i></span> ' +
        (over ? '<span class="is-over-text">' + pct + "% · estoura " + fmtMm(pageOverflowMm[n]) + " mm (seria cortado no PDF)</span>" : pct + "% · cabe");
    });
  }

  // Debounce: digitar/arrastar dispara render()/ResizeObserver repetidas
  // vezes em sequência rápida — não precisamos medir a cada uma.
  function scheduleOverflowCheck() {
    clearTimeout(overflowCheckTimer);
    overflowCheckTimer = setTimeout(checkPageOverflow, 150);
  }

  function initPageOverflowWatch() {
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(scheduleOverflowCheck);
      var p1 = document.getElementById("page1"), p2 = document.getElementById("page2");
      if (p1) ro.observe(p1);
      if (p2) ro.observe(p2);
    }
    scheduleOverflowCheck();
  }

  /* ---------------------------------------------------------------------
     Verificação antes do PDF (Fase 3) — lista de pontos para revisar.
     Nada aqui bloqueia o PDF: "Exportar mesmo assim" está sempre disponível.
     Cada pendência pode ser ignorada; a chave inclui o conteúdo, então se o
     texto mudar a pendência volta a aparecer.
     Item: { key, level: "error"|"warn"|"ok", title, desc, action, target }
     target: data-path de um campo, "page:N" ou "vars".
     --------------------------------------------------------------------- */
  var VEICULOS = [
    ["Reuters", "reuters.com"], ["InfoMoney", "infomoney.com.br"], ["Money Times", "moneytimes.com.br"],
    ["Valor", "valor.globo.com"], ["G1", "g1.globo.com"], ["Folha", "folha.uol.com.br"],
    ["Estadão", "estadao.com.br"], ["Bloomberg", "bloomberg"], ["CNN", "cnn"], ["CNBC", "cnbc.com"],
    ["Investing", "investing.com"], ["IBGE", "ibge.gov.br"], ["Banco Central", "bcb.gov.br"], ["BCB", "bcb.gov.br"],
    ["B3", "b3.com.br"], ["IFI", "senado.leg.br"], ["Senado", "senado.leg.br"], ["Trading Economics", "tradingeconomics.com"],
    ["ADVFN", "advfn.com"], ["Exame", "exame.com"], ["Poder360", "poder360.com.br"], ["BBC", "bbc."],
    ["Estado de Minas", "em.com.br"], ["CNN Brasil", "cnnbrasil.com.br"], ["Seu Dinheiro", "seudinheiro.com"],
    ["FGV", "fgv.br"], ["Tesouro", "tesouro"], ["Agência Brasil", "agenciabrasil.ebc.com.br"],
    ["O Povo", "opovo.com.br"], ["Yahoo Finance", "yahoo.com"], ["Advisor Perspectives", "advisorperspectives.com"], ["Datafolha", "folha.uol.com.br"]
  ];

  function semAcento(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  // Números no formato brasileiro ("190.745", "R$ 4,98", "193 mil"),
  // ignorando percentuais e pontos-base.
  var NUM_RE = /((?:R\$|US\$|€)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(\s*(?:%|p\.p\.|bps|pb)\b|\s*%)?(\s*mil\b)?/gi;
  function parseNumbers(text) {
    var out = [], m;
    NUM_RE.lastIndex = 0;
    while ((m = NUM_RE.exec(text))) {
      if (m[3]) continue;
      var v = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
      if (m[4]) v *= 1000;
      if (!isNaN(v)) out.push({ value: v, raw: m[0].trim() });
    }
    return out;
  }

  function fieldLabel(path) {
    var m;
    if (path === "headline.title") return "Título da manchete";
    if (path === "headline.deck") return "Resumo da manchete";
    if (path === "headline.tag") return "Categoria da manchete";
    if (path === "meta.title") return "Título do boletim";
    if (path === "meta.subtitle") return "Subtítulo do boletim";
    if (path === "superQuarta.body") return "Texto do destaque";
    if (path === "footerFront.fontes" || path === "footerBack.fontes") return "Fontes do rodapé";
    if (path === "footerFront.autoria") return "Autoria";
    if (isDerived(path)) return DERIVED_FIELDS[path].label;
    if ((m = /^headline\.paragraphs\.(\d+)$/.exec(path))) return "Parágrafo " + (+m[1] + 1) + " da manchete";
    if ((m = /^columns\.(\d+)\.(\w+)$/.exec(path))) return "Notícia " + (+m[1] + 1) + " (" + ({ title: "título", body: "texto", tag: "categoria", linkText: "link" }[m[2]] || m[2]) + ")";
    if ((m = /^ticker\.(\d+)\.(\w+)$/.exec(path))) return "Card de cotação " + (+m[1] + 1);
    if ((m = /^weekTable\.rows\.(\d+)/.exec(path))) return "Linha " + (+m[1] + 1) + " da semana";
    if ((m = /^thermometer\.groups\.(\d+)\.rows\.(\d+)/.exec(path))) return "Termômetro, linha " + (+m[2] + 1);
    if ((m = /^calendar\.rows\.(\d+)/.exec(path))) return "Agenda, linha " + (+m[1] + 1);
    if ((m = /^glossary\.items\.(\d+)/.exec(path))) return "Glossário, termo " + (+m[1] + 1);
    return path;
  }

  // measure=false: usa a última medição de página (quem chamou acabou de medir).
  // Bloco da página que contém o campo (para não cobrar campos de blocos ocultos).
  function blockOfPath(path) {
    var m;
    if (/^headline\.deck/.test(path)) return "headline-deck";
    if (/^headline\.tag/.test(path)) return "tag";
    if (/^headline\.title/.test(path)) return "headline-title";
    if (/^headline\.paragraphs/.test(path)) return "headline-body";
    if (/^headline\.image/.test(path)) return "headline-image";
    if ((m = /^columns\.(\d+)/.exec(path))) return "news-" + m[1];
    if (/^masthead\.line1/.test(path)) return "slim-date";
    if (/^masthead\.line2/.test(path)) return "slim-edition";
    if (/^meta\.title/.test(path)) return "masthead-title";
    if (/^meta\.subtitle/.test(path)) return "masthead-subtitle";
    var map = { note: "note", ticker: "ticker", weekTable: "week-table", page2Header: "page2-top", thermometer: "thermo",
      calendar: "calendar", superQuarta: "sq", glossary: "glossary", footerFront: "footer-front", footerBack: "footer-back" };
    return map[path.split(".")[0]] || null;
  }
  function pathHidden(s, path) {
    var b = blockOfPath(path);
    var bl = s.blockLayout || {};
    if (!b) return false;
    if (/^news-/.test(b) && bl["news-list"] && bl["news-list"].hidden) return true;
    return !!(bl[b] && (bl[b].hidden || bl[b].removed));
  }

  // Resultado guardado até algo mudar (edição, render ou nova medição): o
  // selo do Verificar e os avisos das Camadas pedem a mesma lista em seguida.
  var checksCache = null;
  function invalidateChecks() { checksCache = null; }

  function runChecks(measure) {
    if (measure === false && checksCache) return checksCache.slice();
    var s = state();
    var items = [];
    var txt = function (path) { return plainText(getPath(s, path)); };

    // 1. Estouro de página
    if (measure !== false) measurePages();
    var anyOverflow = false;
    [1, 2].forEach(function (n) {
      var mm = pageOverflowMm[n];
      if (mm > 0) {
        anyOverflow = true;
        items.push({
          key: "overflow:" + n + ":" + Math.round(mm), level: "error",
          title: "Página " + n + " estoura em " + fmtMm(mm) + " mm",
          desc: "O que passar da folha A4 seria cortado no PDF. Encurte textos, remova itens ou reduza o tamanho do texto.",
          action: "Ir à página", target: "page:" + n
        });
      }
    });
    if (!anyOverflow) items.push({ level: "ok", title: "As duas páginas cabem na folha A4", desc: "Nada será cortado no PDF." });

    // 2. Campos vazios ou com texto de exemplo
    var PLACEHOLDERS = {
      "meta.title": ["SEU BOLETIM"], "meta.subtitle": ["SUBTÍTULO — EDITE AQUI"],
      "headline.tag": ["CATEGORIA"], "headline.title": ["Manchete principal da edição"],
      "headline.deck": ["Resumo curto de uma a duas linhas sobre a manchete."],
      "masthead.line1": ["DIA, DD DE MÊS DE AAAA · PERIODICIDADE"], "masthead.line2": ["EDIÇÃO N° 00/0000 · COBERTURA"],
      "page2Header.editionLabel": ["EDIÇÃO N° 00/0000"]
    };
    var vazios = [];
    function exigir(path, extras) {
      var t = txt(path);
      var vazio = !t || /^(fontes|autoria|verso):?$/i.test(t) || (extras || []).indexOf(t) !== -1 || (PLACEHOLDERS[path] || []).indexOf(t) !== -1;
      if (vazio) vazios.push(path);
    }
    ["meta.title", "headline.title", "headline.deck", "masthead.line1", "masthead.line2", "page2Header.editionLabel", "footerFront.fontes", "footerFront.autoria"].forEach(function (p) { exigir(p); });
    s.headline.paragraphs.forEach(function (p, i) { exigir("headline.paragraphs." + i); });
    s.columns.forEach(function (c, i) { exigir("columns." + i + ".title", ["Título da notícia"]); exigir("columns." + i + ".body"); });
    s.ticker.forEach(function (t, i) {
      if (plainText(t.label) === "ATIVO" || !plainText(t.label)) vazios.push("ticker." + i + ".label");
      else if (plainText(t.value) === "0,00" || !plainText(t.value)) vazios.push("ticker." + i + ".value");
    });
    s.weekTable.rows.forEach(function (r, i) { exigir("weekTable.rows." + i + ".text"); });
    (s.thermometer.groups || []).forEach(function (g, gi) {
      (g.rows || []).forEach(function (r, ri) {
        if (!plainText(r.ativo)) vazios.push("thermometer.groups." + gi + ".rows." + ri + ".ativo");
        else if (!plainText(r.fechamento)) vazios.push("thermometer.groups." + gi + ".rows." + ri + ".fechamento");
      });
    });
    s.calendar.rows.forEach(function (r, i) { exigir("calendar.rows." + i + ".evento"); });
    s.glossary.items.forEach(function (it, i) {
      if (!plainText(it.term)) vazios.push("glossary.items." + i + ".term");
      else if (!plainText(it.def)) vazios.push("glossary.items." + i + ".def");
    });
    if (plainText(s.superQuarta.title)) exigir("superQuarta.body");
    vazios = vazios.filter(function (p) { return !pathHidden(s, p); });
    if (vazios.length === 1) {
      items.push({
        key: "empty:" + vazios[0], level: "warn",
        title: fieldLabel(vazios[0]) + " está vazio ou com texto de exemplo",
        desc: "O campo ocupa espaço na página e sairia assim no PDF.", action: "Preencher", target: vazios[0]
      });
    } else if (vazios.length > 1) {
      var nomes = vazios.slice(0, 5).map(fieldLabel).join(", ") + (vazios.length > 5 ? " e mais " + (vazios.length - 5) : "");
      items.push({
        key: "empty:" + vazios.join(","), level: "warn",
        title: vazios.length + " campos vazios ou com texto de exemplo",
        desc: nomes + ". \"Preencher\" leva ao primeiro.", action: "Preencher", target: vazios[0]
      });
    } else {
      items.push({ level: "ok", title: "Nenhum campo vazio ou com texto de exemplo", desc: "Manchete, notícias, tabelas, agenda e glossário preenchidos." });
    }

    // 3. Fonte x link das notícias
    var linkProblems = 0;
    s.columns.forEach(function (c, i) {
      if (pathHidden(s, "columns." + i + ".linkText")) return; // notícia oculta
      // Com fonte vinculada, quem é conferida é a fonte (abaixo)
      if (c.sourceId && sourceById(s, c.sourceId)) return;
      var tmp = document.createElement("div");
      tmp.innerHTML = richHtml(c.linkText);
      var a = tmp.querySelector("a[href]");
      var path = "columns." + i + ".linkText";
      if (!a) {
        linkProblems++;
        items.push({
          key: "nolink:" + i + ":" + plainText(c.title), level: "warn",
          title: "Notícia " + (i + 1) + " sem link para a fonte",
          desc: "Selecione o texto \"" + (plainText(c.linkText) || "Leia mais") + "\" e use 🔗 na barrinha para ligar à matéria original.",
          action: "Vincular", target: path
        });
        return;
      }
      // Cada link é conferido com o próprio texto ("Agência Brasil" →
      // agenciabrasil...). Com um link só, vale o texto da linha inteira
      // ("Leia na Money Times →"). Entre os veículos citados, conta o que
      // aparece primeiro no texto ("O Povo (Estadão Conteúdo)" = O Povo).
      var anchors = tmp.querySelectorAll("a[href]");
      Array.prototype.some.call(anchors, function (anc) {
        var host = "";
        try { host = new URL(anc.getAttribute("href")).hostname.toLowerCase(); } catch (e) { host = ""; }
        var rotulo = semAcento(anchors.length === 1 ? plainText(c.linkText) : (anc.textContent || ""));
        var citado = null, pos = Infinity;
        veiculosConhecidos().forEach(function (v) {
          var m = new RegExp("(^|[^\\w])" + semAcento(v[0]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^\\w])").exec(rotulo);
          if (m && m.index < pos) { pos = m.index; citado = v; }
        });
        if (citado && host && host.indexOf(citado[1].replace(/^www\./, "")) === -1) {
          linkProblems++;
          items.push({
            key: "linkmismatch:" + i + ":" + rotulo + ":" + host, level: "warn",
            title: "Notícia " + (i + 1) + ": o rótulo da fonte não bate com o link",
            desc: "Rótulo cita \"" + citado[0] + "\", mas o link vai para " + host + ". Corrija o link ou o rótulo.",
            action: "Revisar", target: path
          });
          return true;
        }
        return false;
      });
    });
    // Fontes da lista (Fase 5): completas e com veículo que bate com o link
    (s.sources || []).forEach(function (src, k) {
      var n = k + 1;
      var falta = sourceMissing(src);
      if (falta.length) {
        linkProblems++;
        items.push({
          key: "srcmissing:" + src.id + ":" + falta.join(","), level: "warn",
          title: "Fonte [" + n + "] incompleta",
          desc: "Falta " + falta.join(", ") + ". Sem isso a referência sai incompleta no rodapé do verso.",
          action: "Completar", target: "source:" + src.id
        });
        return;
      }
      var host = hostOf(src.url), citado = null;
      veiculosConhecidos().forEach(function (v) { if (!citado && semAcento(plainText(src.veiculo)) === semAcento(v[0])) citado = v; });
      if (citado && host && host.indexOf(citado[1].replace(/^www\./, "")) === -1) {
        linkProblems++;
        items.push({
          key: "srcmismatch:" + src.id + ":" + plainText(src.veiculo) + ":" + host, level: "warn",
          title: "Fonte [" + n + "]: o veículo não bate com o link",
          desc: "Veículo \"" + plainText(src.veiculo) + "\", link para " + host + ". Corrija o veículo ou o link.",
          action: "Revisar", target: "source:" + src.id
        });
      }
    });
    if (!linkProblems && s.columns.length) items.push({ level: "ok", title: "Todas as notícias têm fonte com link", desc: s.columns.length + " de " + s.columns.length + " notícias com fonte." });

    // 6. Cotações sem data de referência (Fase 5)
    var semData = pathHidden(s, "ticker") ? [] : s.ticker.filter(function (t) { return plainText(t.label) && !parseIsoDate(t.refData); });
    if (semData.length) {
      items.push({
        key: "tickerdate:" + semData.length + ":" + s.ticker.map(function (t) { return t.refData || ""; }).join(","), level: "warn",
        title: (semData.length === s.ticker.length ? "As cotações estão" : semData.length + " cotação(ões) está(ão)") + " sem data de referência",
        desc: "Sem a data, o leitor não sabe de quando é cada valor. Defina dado, variação e data nas propriedades do bloco de cotações.",
        action: "Revisar", target: "ticker.0.value"
      });
    } else if (s.ticker.length) {
      var t0 = s.ticker[0];
      items.push({ level: "ok", title: "Todas as cotações têm data e tipo de variação", desc: s.ticker.length + " de " + s.ticker.length + " cards com \"" + lookup(TICKER_TIPOS, t0.tipo || "fechamento", 1).toLowerCase() + "\" e \"variação " + lookup(TICKER_PERIODOS, t0.periodo || "semana", 1).toLowerCase() + "\"." });
    }

    // 4. Números dos cards x texto (heurística: só "revisar", nunca erro)
    // Busca o nome do ativo no texto sem acento/minúsculo, mas lê os números
    // do texto original (mesmas posições) para mostrar como foi escrito.
    var originais = [s.headline.title, s.headline.deck].concat(s.headline.paragraphs)
      .concat(s.columns.map(function (c) { return c.title; }), s.columns.map(function (c) { return c.body; }))
      .concat(s.weekTable.rows.map(function (r) { return r.text; }), [s.superQuarta.body])
      .map(function (h) { return plainText(h).normalize("NFC"); });
    var textos = originais.map(semAcento);
    var numProblems = 0, numChecked = 0;
    s.ticker.forEach(function (t, i) {
      var label = plainText(t.label);
      var card = parseNumbers(plainText(t.value).replace(/\s/g, " "))[0];
      if (!label || !card || label === "ATIVO") return;
      var chave = semAcento(label.split("(")[0].trim().split(/\s+/)[0]);
      if (!chave) return;
      var kwRe = new RegExp("(^|[^a-z0-9&])" + chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-z])", "g");
      var perto = [];
      textos.forEach(function (tx, ti) {
        var m, orig = originais[ti];
        kwRe.lastIndex = 0;
        while ((m = kwRe.exec(tx))) {
          var fonte = orig.length === tx.length ? orig : tx;
          var janela = fonte.slice(m.index + m[0].length, m.index + m[0].length + 70);
          parseNumbers(janela).forEach(function (n) {
            var r = n.value / card.value;
            if (r > 0.5 && r < 2) perto.push(n);
          });
        }
      });
      if (!perto.length) return;
      numChecked++;
      var bate = perto.some(function (n) { return Math.abs(n.value - card.value) <= Math.abs(card.value) * 0.005; });
      if (!bate) {
        numProblems++;
        var citados = perto.map(function (n) { return n.raw; }).filter(function (v, k, arr) { return arr.indexOf(v) === k; });
        items.push({
          key: "num:" + i + ":" + plainText(t.value) + ":" + citados.join("|"), level: "warn",
          title: label + ": card e texto divergem",
          desc: "Card mostra " + plainText(t.value) + ". O texto cita " + citados.slice(0, 3).join(" e ") + " perto de \"" + label.split("(")[0].trim() + "\". Pode ser de outra data — confirme cada número.",
          action: "Revisar", target: "ticker." + i + ".value"
        });
      }
    });
    if (!numProblems && numChecked) items.push({ level: "ok", title: "Cards de cotação batem com o texto", desc: numChecked + " ativo(s) citado(s) no texto com o mesmo valor do card." });

    // 5. Variáveis da edição
    var vars = s.meta.vars || emptyVars();
    var v = varsOf(s);
    if (!v.edicao || !v.data || !v.ini || !v.fim) {
      items.push({
        key: "varsempty:" + [vars.edicao, vars.data, vars.coberturaInicio, vars.coberturaFim].join("|"), level: "warn",
        title: "Variáveis da edição incompletas",
        desc: "Preencha edição, data e cobertura na faixa abaixo da barra superior: elas atualizam cabeçalho, verso, rodapé e o nome do PDF.",
        action: "Preencher", target: "vars"
      });
    } else {
      var divergentes = [];
      Object.keys(DERIVED_FIELDS).forEach(function (path) {
        if (!isOverridden(s, path) || pathHidden(s, path)) return;
        var t = plainText(getPath(s, path));
        var ed = /EDI[ÇC][ÃA]O\s*N[°º]?\s*(\d{1,3}\s*\/\s*\d{4})/i.exec(t);
        if (ed && ed[1].replace(/\s+/g, "") !== v.edicao) divergentes.push(path);
        else if (path === "masthead.line1" && semAcento(t).indexOf(v.data.getDate() + " de " + semAcento(MESES[v.data.getMonth()])) === -1) divergentes.push(path);
      });
      if (divergentes.length) {
        items.push({
          key: "varsdiff:" + divergentes.join(",") + ":" + vars.edicao + ":" + vars.data, level: "warn",
          title: "Campo editado à mão diferente das variáveis",
          desc: divergentes.map(fieldLabel).join(", ") + " não mostra a edição " + v.edicao + " / data " + ddmmaaaa(v.data) + ". Clique no campo e use \"Voltar ao texto automático\" no painel.",
          action: "Revisar", target: divergentes[0]
        });
      } else {
        items.push({
          level: "ok", title: "Variáveis da edição consistentes",
          desc: "Edição " + v.edicao + " e data " + ddmmaaaa(v.data) + " iguais no cabeçalho, no verso, no rodapé e no nome do arquivo (" + pdfBaseName() + ".pdf)."
        });
      }
    }

    // Observações de revisão em aberto (não bloqueiam o PDF)
    var abertas = notasAbertas();
    if (abertas.length) {
      items.push({
        key: "notas:" + abertas.map(function (n) { return n.id + (n.respostas || []).length; }).join(","), level: "warn",
        title: abertas.length === 1 ? "1 observação de revisão em aberto" : abertas.length + " observações de revisão em aberto",
        desc: abertas.slice(0, 3).map(function (n) { return alvoLabel(n.alvo) + ": " + (n.texto.length > 60 ? n.texto.slice(0, 60) + "…" : n.texto); }).join(" · ") +
          (abertas.length > 3 ? " · …" : "") + ". Responda ou marque como resolvida na aba Revisão.",
        action: "Ver", target: "notas"
      });
    }

    var ignored = (s.meta.ignoredChecks || []);
    items.forEach(function (it) { it.ignored = !!(it.key && ignored.indexOf(it.key) !== -1); });
    checksCache = items.slice();
    return items;
  }

  function pendingOf(items) {
    return items.filter(function (it) { return it.level !== "ok" && !it.ignored; });
  }

  function updateCheckBadge() {
    var badge = document.getElementById("checkBadge");
    if (!badge || !current()) return;
    var pend = pendingOf(runChecks(false));
    badge.hidden = pend.length === 0;
    badge.textContent = String(pend.length);
    badge.classList.toggle("has-error", pend.some(function (it) { return it.level === "error"; }));
    badge.title = pend.length ? pend.length + " ponto(s) para revisar" : "";
  }

  function gotoCheckTarget(target) {
    closeCheckDialog();
    if (!target) return;
    var el;
    if (target === "vars") {
      var vars = state().meta.vars || {};
      el = document.getElementById(!vars.edicao ? "varEdicao" : !vars.data ? "varData" : !vars.coberturaInicio ? "varCobIni" : "varCobFim");
      if (el) { el.focus(); el.classList.add("check-flash"); setTimeout(function () { el.classList.remove("check-flash"); }, 1700); }
      return;
    }
    if (target === "notas") {
      notaFiltro = "abertas";
      showLeftTab("revisao");
      renderNotas(true);
      return;
    }
    if (/^source:/.test(target)) {
      selection = { kind: "source", sourceId: target.slice(7) };
      showLeftTab("fontes");
      render();
      return;
    }
    if (/^page:/.test(target)) {
      el = document.getElementById("page" + target.split(":")[1]);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "end" });
      return;
    }
    el = document.querySelector('#workspace [data-path="' + target + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("check-flash");
    setTimeout(function () { el.classList.remove("check-flash"); }, 1700);
    if (el.hasAttribute("contenteditable")) el.focus({ preventScroll: true });
  }

  var checkExportHandler = null;

  function renderCheckDialog() {
    var items = runChecks();
    var pend = pendingOf(items);
    var list = document.getElementById("checkList");
    var order = { error: 0, warn: 1, ok: 3 };
    items.sort(function (a, b) {
      var ra = a.ignored ? 2 : order[a.level], rb = b.ignored ? 2 : order[b.level];
      return ra - rb;
    });
    list.innerHTML = items.map(function (it, idx) {
      var lvl = it.ignored ? "ignored" : it.level;
      var icon = it.level === "ok" ? "✓" : it.level === "error" ? "✕" : "!";
      var actions = "";
      if (it.level !== "ok") {
        actions = '<div class="check-actions">' +
          (it.ignored ? "" : '<button type="button" class="check-btn" data-check-go="' + idx + '">' + esc(it.action) + "</button>") +
          '<button type="button" class="check-link" data-check-ignore="' + idx + '">' + (it.ignored ? "Voltar a mostrar" : "Ignorar") + "</button>" +
          "</div>";
      }
      return '<li class="check-item' + (it.ignored ? " is-ignored" : "") + '">' +
        '<span class="check-icon lvl-' + lvl + '" aria-hidden="true">' + icon + "</span>" +
        '<div class="check-text"><div class="check-item-title">' + esc(it.title) + (it.ignored ? " (ignorado)" : "") + "</div>" +
        '<div class="check-item-desc">' + esc(it.desc) + "</div></div>" + actions + "</li>";
    }).join("");
    list._items = items;

    var summary = document.getElementById("checkSummary");
    summary.textContent = pend.length
      ? (pend.length === 1 ? "1 ponto precisa de atenção." : pend.length + " pontos precisam de atenção.") + " Nada aqui impede o PDF."
      : "Tudo certo para exportar.";
    document.getElementById("checkNote").textContent = IN_ARTIFACT
      ? "A4 · 2 páginas · o PDF é montado aqui mesmo, com os links clicáveis."
      : DESKTOP ? "A4 · 2 páginas · o PDF é gerado direto pelo aplicativo, com os links clicáveis."
      : "A4 · 2 páginas · na janela de impressão, escolha Margens \"Nenhuma\" e marque \"Gráficos de segundo plano\".";
    var exportBtn = document.getElementById("checkExport");
    var fixBtn = document.getElementById("checkFix");
    exportBtn.textContent = pend.length ? "Exportar mesmo assim" : (IN_ARTIFACT ? "Baixar PDF" : DESKTOP ? "Salvar PDF" : "Imprimir / Exportar PDF");
    exportBtn.classList.toggle("primary", !pend.length);
    fixBtn.hidden = !pend.length;
    updateCheckBadge();
  }

  function openCheckDialog() {
    var box = document.getElementById("checkDialog");
    renderCheckDialog();
    box.hidden = false;
    var fix = document.getElementById("checkFix");
    (fix.hidden ? document.getElementById("checkExport") : fix).focus();
  }

  function closeCheckDialog() {
    document.getElementById("checkDialog").hidden = true;
  }

  function initCheckDialog() {
    var box = document.getElementById("checkDialog");
    document.getElementById("btnCheck").addEventListener("click", openCheckDialog);
    document.getElementById("checkClose").addEventListener("click", closeCheckDialog);
    document.getElementById("checkExport").addEventListener("click", function () {
      closeCheckDialog();
      if (checkExportHandler) checkExportHandler();
    });
    document.getElementById("checkFix").addEventListener("click", function () {
      var pend = pendingOf(document.getElementById("checkList")._items || []);
      if (pend.length) gotoCheckTarget(pend[0].target);
    });
    document.getElementById("checkList").addEventListener("click", function (e) {
      var items = this._items || [];
      var go = e.target.closest("[data-check-go]");
      var ign = e.target.closest("[data-check-ignore]");
      if (go) { gotoCheckTarget(items[+go.dataset.checkGo].target); return; }
      if (ign) {
        var it = items[+ign.dataset.checkIgnore];
        var s = state();
        s.meta.ignoredChecks = (s.meta.ignoredChecks || []).filter(function (k) { return k !== it.key; });
        if (!it.ignored) s.meta.ignoredChecks.push(it.key);
        scheduleSave();
        renderCheckDialog();
      }
    });
    box.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeCheckDialog(); }
    });
    box.addEventListener("click", function (e) {
      if (e.target === box) closeCheckDialog();
    });
  }

  function renderToolbar() {
    var sel = document.getElementById("editionSelect");
    sel.innerHTML = "";
    store.order.forEach(function (id) {
      var ed = store.editions[id];
      if (!ed) return;
      var opt = document.createElement("option");
      opt.value = id;
      opt.textContent = ed.name;
      if (id === store.currentId) opt.selected = true;
      sel.appendChild(opt);
    });

    var chkLock = document.getElementById("chkLockAll");
    if (chkLock) chkLock.checked = !!state().locked;

    var status = document.getElementById("editionStatus");
    if (status) {
      var st = state().meta.status || "rascunho";
      status.value = st;
      status.dataset.status = st;
    }

    updateUndoRedoButtons();
  }

  /* ---------------------------------------------------------------------
     Painel de propriedades (direita) — seções Conteúdo, Tipografia, Layout
     e Cor do item selecionado; sem seleção, mostra as opções do documento.
     --------------------------------------------------------------------- */
  function icon(name) {
    return '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  var BLOCK_ADD_ACTIONS = {
    "ticker": [{ label: "Adicionar cotação", action: "add-ticker" }],
    "news-list": [{ label: "Adicionar notícia", action: "add-column" }],
    "week-table": [{ label: "Adicionar dia", action: "add-week-row" }],
    "calendar": [{ label: "Adicionar evento", action: "add-calendar-row" }],
    "glossary": [{ label: "Adicionar termo", action: "add-glossary-item" }],
    "headline-body": [{ label: "Adicionar parágrafo", action: "add-paragraph" }]
  };

  var BLOCK_LABELS = {
    "masthead": "Cabeçalho",
    "masthead-title": "Título do boletim",
    "masthead-subtitle": "Subtítulo do boletim",
    "slim-date": "Data (barra superior)",
    "slim-edition": "Edição e cobertura",
    "tag": "Categoria da manchete",
    "headline-title": "Manchete",
    "headline-deck": "Resumo da manchete",
    "headline-image": "Imagem da manchete",
    "headline-body": "Texto da manchete",
    "ticker": "Cotações",
    "news-list": "Lista de notícias",
    "note": "Nota",
    "week-table": "A semana, dia a dia",
    "footer-front": "Rodapé",
    "page2-top": "Cabeçalho do verso",
    "thermo": "Termômetro da semana",
    "calendar": "Agenda",
    "sq": "Destaque",
    "glossary": "Glossário",
    "footer-back": "Rodapé do verso"
  };
  var PAGE2_BLOCKS = ["page2-top", "thermo", "calendar", "sq", "glossary", "footer-back"];
  // Blocos de texto opcionais que podem ser excluídos de verdade (o resto só se oculta)
  var REMOVABLE_BLOCKS = ["headline-body", "note", "headline-deck", "tag", "headline-image", "sq"];

  function confirmRemoveBlock(blockId) {
    uiConfirm("Excluir \"" + blockLabel(blockId) + "\"? O texto do bloco é apagado e ele sai da página e do PDF. Dá para restaurar depois (vazio), em Excluídos, no fim das Camadas.", "Excluir").then(function (yes) {
      if (!yes) return;
      var fb = document.createElement("button");
      fb.dataset.blockId = blockId;
      handleAction("remove-block", fb);
    });
  }
  var CRUMBS = {
    "masthead": "Cabeçalho", "masthead-title": "Cabeçalho", "masthead-subtitle": "Cabeçalho", "slim-date": "Cabeçalho", "slim-edition": "Cabeçalho",
    "tag": "Manchete", "headline-title": "Manchete", "headline-deck": "Manchete", "headline-image": "Manchete", "headline-body": "Manchete",
    "ticker": "Cotações", "news-list": "Notícias", "note": "Rodapé", "footer-front": "Rodapé", "footer-back": "Rodapé"
  };

  function blockLabel(blockId) {
    if (BLOCK_LABELS[blockId]) return BLOCK_LABELS[blockId];
    var m = /^news-(\d+)$/.exec(blockId);
    if (m) return "Notícia " + (parseInt(m[1], 10) + 1);
    return blockId;
  }
  function blockPage(blockId) { return PAGE2_BLOCKS.indexOf(blockId) !== -1 ? 2 : 1; }
  function blockCrumb(blockId) {
    var area = /^news-/.test(blockId) ? "Notícias" : (CRUMBS[blockId] || blockLabel(blockId));
    return "Página " + blockPage(blockId) + " › " + area;
  }

  var FONT_OPTIONS = [
    ["", "Padrão do modelo"],
    ["Arial, Helvetica, sans-serif", "Arial"],
    ["Georgia, 'Times New Roman', serif", "Georgia"],
    ["'Courier New', monospace", "Courier"]
  ];
  var COLOR_SWATCHES = [["#111111", "Preto"], ["#0e1b3b", "Azul-marinho"], ["#c0202b", "Vermelho"], ["#5a5a5a", "Cinza"]];

  function fontSelect(attrs, current, withDefault) {
    var cur = current || "";
    return "<select " + attrs + ">" + FONT_OPTIONS.filter(function (o) { return withDefault || o[0]; }).map(function (o) {
      var sel = o[0] ? (cur && cur.indexOf(o[0].split(",")[0]) === 0) : !cur;
      return '<option value="' + esc(o[0]) + '"' + (sel ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("") + "</select>";
  }

  function propHead(crumb, title, lockAction, locked, extraAttrs) {
    return '<div class="prop-head"><div class="prop-crumb">' + esc(crumb) + "</div>" +
      '<h2 class="prop-title">' + esc(title) + "</h2>" +
      (lockAction ? '<button type="button" class="lock-toggle' + (locked ? " is-on" : "") + '" data-action="' + lockAction + '"' + (extraAttrs || "") +
        ' title="' + (locked ? "Destravar" : "Travar (impede mover e redimensionar)") + '" aria-pressed="' + (locked ? "true" : "false") + '">' + icon(locked ? "lock" : "unlock") + "</button>" : "") +
      "</div>";
  }

  function chkRow(label, checked, action, extraAttrs) {
    return '<label class="prop-check"><input type="checkbox" ' + (checked ? "checked " : "") +
      'data-action="' + action + '"' + (extraAttrs || "") + "> " + esc(label) + "</label>";
  }

  function imageUploadButtonHtml(path, label) {
    return '<label class="prop-btn dashed">' + icon("upload") + esc(label) +
      '<input type="file" accept="image/*" class="img-input" data-path="' + path + '" hidden></label>';
  }

  function imageControls(path, src, what) {
    var html = "";
    if (src) html += '<img src="' + esc(safeImageSrc(src)) + '" alt="" class="prop-preview">';
    html += imageUploadButtonHtml(path, src ? "Trocar " + what : "Enviar " + what);
    if (src) html += '<button type="button" class="prop-btn danger" data-action="remove-image" data-path="' + path + '">' + icon("trash") + "Remover " + what + "</button>";
    return html;
  }

  function segButtons(items, attrsFor, isActive) {
    return '<div class="seg">' + items.map(function (it) {
      return '<button type="button" ' + attrsFor(it) + (isActive(it) ? ' class="is-active" aria-pressed="true"' : ' aria-pressed="false"') + ">" + it[1] + "</button>";
    }).join("") + "</div>";
  }

  function colorSection(attrsBase, current, field) {
    var cur = (current || "").toLowerCase();
    var html = '<div class="swatches">';
    html += '<button type="button" class="swatch swatch-default' + (!cur ? " is-active" : "") + '" data-action="set-block-style" ' + attrsBase + ' data-field="' + field + '" data-value="" title="Cor padrão do modelo" aria-label="Cor padrão do modelo"></button>';
    COLOR_SWATCHES.forEach(function (c) {
      html += '<button type="button" class="swatch' + (cur === c[0] ? " is-active" : "") + '" style="background:' + c[0] + '" data-action="set-block-style" ' + attrsBase + ' data-field="' + field + '" data-value="' + c[0] + '" title="' + c[1] + '" aria-label="' + c[1] + '"></button>';
    });
    html += '<input type="color" ' + attrsBase + ' data-field="' + field + '" value="' + (current || "#111111") + '" title="Outra cor">';
    return html + "</div>";
  }

  function renderDocumentInspector() {
    var s = state();
    var html = '<div class="prop-head"><div class="prop-crumb">Documento</div><h2 class="prop-title">' + esc(current().name) + "</h2></div>";
    html += '<div class="prop-section"><p class="prop-note">Clique numa caixa da página, ou numa camada à esquerda, para editar.</p>' +
      '<p class="prop-note">Atalhos com um bloco selecionado: <strong>Delete</strong> remove, <strong>Ctrl+D</strong> duplica, <strong>setas</strong> movem logos e elementos livres (Shift = passo maior).</p></div>';
    html += '<div class="prop-section"><div class="prop-label">Tipografia</div>' +
      '<div class="prop-field"><label for="fontScaleAll">Tamanho de todo o texto (%)</label>' +
      '<input type="number" id="fontScaleAll" data-meta-field="fontScaleAll" value="' + (s.meta.fontScaleAll || 100) + '" min="50" max="200" step="5"></div></div>';
    return html;
  }

  // which: "logo" (principal, na faixa navy) ou "publisher-logo" (parceiro, na barra slim)
  function renderLogoInspector(which) {
    var isPub = which === "publisher-logo";
    var prefix = isPub ? "publisherLogo" : "logo";
    var s = state();
    var src = isPub ? s.meta.publisherLogo : s.meta.logo;
    var locked = isPub ? s.meta.publisherLogoLocked : s.meta.logoLocked;
    var zoom = (isPub ? s.meta.publisherLogoZoom : s.meta.logoZoom) || 100;
    var fitX = isPub ? s.meta.publisherLogoFitX : s.meta.logoFitX;
    var fitY = isPub ? s.meta.publisherLogoFitY : s.meta.logoFitY;
    if (fitX == null) fitX = 50;
    if (fitY == null) fitY = 50;
    var lockAction = isPub ? "toggle-publisher-logo-lock" : "toggle-logo-lock";
    var html = propHead("Página 1 › Cabeçalho", isPub ? "Logo do parceiro" : "Logo", lockAction, locked);
    html += '<div class="prop-section"><div class="prop-label">Imagem</div>' + imageControls("meta." + prefix, src, "logo") + "</div>";
    if (src) {
      html += '<div class="prop-section"><div class="prop-label">Enquadramento</div>' +
        '<div class="prop-field"><label>Zoom</label><input type="range" min="100" max="300" data-meta-field="' + prefix + 'Zoom" value="' + zoom + '"></div>' +
        '<div class="prop-field"><label>Posição horizontal</label><input type="range" min="0" max="100" data-meta-field="' + prefix + 'FitX" value="' + fitX + '"></div>' +
        '<div class="prop-field"><label>Posição vertical</label><input type="range" min="0" max="100" data-meta-field="' + prefix + 'FitY" value="' + fitY + '"></div></div>';
    }
    html += '<div class="prop-section"><div class="prop-label">Layout</div>' +
      chkRow("Travar (impede mover e redimensionar)", !!locked, lockAction) +
      '<p class="prop-note" style="margin-top:10px">Arraste a logo na página para mover; a bolinha no canto redimensiona.</p></div>';
    return html;
  }

  function newsLinkInfo(col) {
    var tmp = document.createElement("div");
    tmp.innerHTML = richHtml(col.linkText);
    var a = tmp.querySelector("a[href]");
    if (!a) return null;
    try { return new URL(a.getAttribute("href")).hostname.replace(/^www\./, ""); } catch (e) { return a.getAttribute("href"); }
  }

  function renderBlockInspector(blockId) {
    var bl = readBlockLayout(blockId);
    var s = state();
    var html = propHead(blockCrumb(blockId), blockLabel(blockId), "toggle-block-lock", !!bl.locked, ' data-block-id="' + blockId + '"');
    var attrsBase = 'data-block-id="' + blockId + '"';
    var fieldPath = selection && selection.fieldPath;

    // Conteúdo
    var content = "";
    var newsMatch = /^news-(\d+)$/.exec(blockId);
    if (newsMatch) {
      var ci = parseInt(newsMatch[1], 10);
      var col = s.columns[ci];
      if (col) {
        var st = col.status || "rascunho";
        content += '<div class="prop-field"><span class="prop-field-label">Status (não aparece no PDF)</span>' +
          segButtons([["rascunho", "Rascunho"], ["revisado", "Revisado"], ["aprovado", "Aprovado"]],
            function (it) { return 'data-action="set-news-status" data-index="' + ci + '" data-value="' + it[0] + '"'; },
            function (it) { return it[0] === st; }) + "</div>";
        var linked = col.sourceId ? sourceById(s, col.sourceId) : null;
        content += '<div class="prop-field"><label>Fonte vinculada</label><select data-news-source="' + ci + '">' +
          '<option value="">Nenhuma (usa o texto do link)</option>' +
          (s.sources || []).map(function (src, k) {
            return '<option value="' + esc(src.id) + '"' + (linked && linked.id === src.id ? " selected" : "") + ">[" + (k + 1) + "] " + esc(plainText(src.veiculo) || "Fonte") + (plainText(src.titulo) ? " · " + esc(plainText(src.titulo)) : "") + "</option>";
          }).join("") +
          '<option value="__new">+ Nova fonte…</option></select></div>';
        if (linked) {
          var falta = sourceMissing(linked);
          content += '<div class="source-card">' +
            '<div class="source-card-title">' + esc(sourceSeloText(linked, sourceNumber(s, linked.id))) + "</div>" +
            '<div class="source-card-meta">' + esc(hostOf(linked.url) || "sem link") + "</div>" +
            (falta.length ? '<span class="chip chip-incompleta">Incompleta: falta ' + esc(falta.join(", ")) + "</span>" : '<span class="chip chip-aprovado">Link ok</span>') +
            '<button type="button" class="prop-btn" style="margin-top:10px" data-action="select-source" data-source-id="' + esc(linked.id) + '">' + icon("edit") + "Editar fonte</button></div>";
        } else {
          var host = newsLinkInfo(col);
          content += host
            ? '<div class="var-status is-auto">' + icon("link") + " Link no texto: " + esc(host) + '. Escolha "+ Nova fonte…" para numerá-la e levá-la ao rodapé.</div>'
            : '<div class="var-status is-manual">Sem fonte. Escolha "+ Nova fonte…" acima, ou selecione o texto do link na página e use ' + icon("link") + " na barrinha.</div>";
        }
        content += '<div class="prop-field"><span class="prop-field-label">Imagem</span>' + imageControls("columns." + ci + ".image", col.image, "imagem") + "</div>";
        content += '<div class="prop-grid">' +
          '<button type="button" class="prop-btn" data-action="move-column" data-index="' + ci + '" data-dir="-1"' + (ci === 0 ? " disabled" : "") + ">" + icon("up") + "Subir</button>" +
          '<button type="button" class="prop-btn" data-action="move-column" data-index="' + ci + '" data-dir="1"' + (ci === s.columns.length - 1 ? " disabled" : "") + ">" + icon("down") + "Descer</button></div>";
        content += '<button type="button" class="prop-btn" style="margin-top:8px" data-action="duplicate-column" data-index="' + ci + '">' + icon("copy") + "Duplicar notícia</button>";
        content += '<button type="button" class="prop-btn danger" data-action="remove-column" data-index="' + ci + '">' + icon("trash") + "Remover notícia</button>";
      }
    }
    if (blockId === "ticker") {
      // Dado / variação / data valem para todos os cards de uma vez
      var t0 = s.ticker[0] || {};
      var same = function (f) { return s.ticker.every(function (t) { return (t[f] || "") === (t0[f] || ""); }) ? (t0[f] || "") : ""; };
      var opts = function (list, cur) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? " selected" : "") + ">" + o[1] + "</option>"; }).join(""); };
      content += '<div class="prop-grid">' +
        '<div class="prop-field"><label>Dado</label><select data-ticker-all="tipo">' + (same("tipo") ? "" : '<option value="">Vários</option>') + opts(TICKER_TIPOS, same("tipo")) + "</select></div>" +
        '<div class="prop-field"><label>Variação</label><select data-ticker-all="periodo">' + (same("periodo") ? "" : '<option value="">Vários</option>') + opts(TICKER_PERIODOS, same("periodo")) + "</select></div></div>" +
        '<div class="prop-field" style="margin-top:12px"><label>Data de referência</label><input type="date" data-ticker-all="refData" value="' + esc(same("refData")) + '"></div>' +
        '<p class="prop-note">Com a data preenchida, cada card mostra "' + esc(tickerRefLine({ refData: same("refData") || "2026-10-09", tipo: same("tipo") || "fechamento", periodo: same("periodo") || "semana" })) + '". Os valores continuam digitados nos cards.</p>';
      content += '<div class="prop-label" style="margin-top:4px">Cards e cor da variação</div>';
      content += '<div class="list-edit">' + s.ticker.map(function (t, i) {
        return '<div class="list-edit-row"><span>' + esc(plainText(t.label) || "Ativo") + " · " + esc(plainText(t.value)) + "</span>" +
          '<span class="layer-tail">' +
          '<select class="mini-select" data-ticker-cor="' + i + '" title="Como a cor da variação é decidida" aria-label="Cor da variação">' + opts(TICKER_CORES, t.modoCor || "seta") + "</select>" +
          '<button type="button" class="layer-btn" data-action="move-ticker" data-index="' + i + '" data-dir="-1" title="Mover para a esquerda" aria-label="Mover para a esquerda"' + (i === 0 ? " disabled" : "") + ">" + icon("up") + "</button>" +
          '<button type="button" class="layer-btn" data-action="move-ticker" data-index="' + i + '" data-dir="1" title="Mover para a direita" aria-label="Mover para a direita"' + (i === s.ticker.length - 1 ? " disabled" : "") + ">" + icon("down") + "</button>" +
          '<button type="button" class="layer-btn" data-action="remove-ticker" data-index="' + i + '" title="Remover" aria-label="Remover">' + icon("trash") + "</button>" +
          "</span></div>";
      }).join("") + "</div>";
    }
    if (blockId === "masthead") {
      content += '<div class="prop-field"><span class="prop-field-label">Logo</span>' + imageControls("meta.logo", s.meta.logo, "logo") + "</div>";
      content += '<div class="prop-field"><span class="prop-field-label">Logo do parceiro ("Publicado por")</span>' + imageControls("meta.publisherLogo", s.meta.publisherLogo, "logo do parceiro") + "</div>";
    }
    if (blockId === "headline-image") {
      content += imageControls("headline.image", s.headline.image, "imagem");
    }
    if (blockId === "thermo") {
      content += '<button type="button" class="prop-btn primary-btn" style="width:100% !important;justify-content:center" data-action="open-thermo-calc">' + icon("chart") + "Calculadora (fechamento e bases)…</button>";
      content += '<button type="button" class="prop-btn" data-action="add-thermo-group">' + icon("plus") + "Adicionar grupo (ex.: BRASIL)</button>";
      (s.thermometer.groups || []).forEach(function (g, gi) {
        content += '<button type="button" class="prop-btn" data-action="add-thermo-row" data-group="' + gi + '">' + icon("plus") + "Ativo em " + esc(plainText(g.name) || ("grupo " + (gi + 1))) + "</button>";
      });
    } else if (BLOCK_ADD_ACTIONS[blockId]) {
      BLOCK_ADD_ACTIONS[blockId].forEach(function (a) {
        content += '<button type="button" class="prop-btn" data-action="' + a.action + '">' + icon("plus") + esc(a.label) + "</button>";
      });
    }
    if (fieldPath && s.meta.vars && isDerived(fieldPath)) {
      var manual = isOverridden(s, fieldPath);
      content += '<div class="prop-field"><span class="prop-field-label">Variáveis da edição · ' + esc(DERIVED_FIELDS[fieldPath].label) + "</span>" +
        '<div class="var-status ' + (manual ? "is-manual" : "is-auto") + '">' +
        (manual ? "Editado à mão: não acompanha as variáveis." : "Automático: segue as variáveis da edição.") + "</div>" +
        (manual
          ? '<button type="button" class="prop-btn" data-action="var-auto" data-var-path="' + esc(fieldPath) + '">' + icon("reset") + "Voltar ao texto automático</button>"
          : '<button type="button" class="prop-btn" data-action="var-manual" data-var-path="' + esc(fieldPath) + '">' + icon("edit") + "Editar à mão (congelar este texto)</button>") +
        "</div>";
    }
    if (content) html += '<div class="prop-section"><div class="prop-label">Conteúdo</div>' + content + "</div>";

    // Tipografia
    html += '<div class="prop-section"><div class="prop-label">Tipografia</div>';
    html += '<div class="prop-field"><label>Fonte</label>' + fontSelect('data-field="fontFamily" ' + attrsBase, bl.fontFamily, true) + "</div>";
    if (fieldPath) {
      var fieldEl = document.querySelector('#workspace [contenteditable][data-path="' + fieldPath + '"]');
      var preview = fieldEl ? (fieldEl.innerText || "").trim().replace(/\s+/g, " ") : "";
      if (preview.length > 30) preview = preview.slice(0, 30) + "…";
      html += '<div class="prop-field"><label>Tamanho desta caixa (%)' + (preview ? ' · “' + esc(preview) + "”" : "") + "</label>" +
        '<input type="number" data-field-font-path="' + esc(fieldPath) + '" value="' + ((s.fieldFontScale || {})[fieldPath] || 100) + '" min="50" max="300" step="5"></div>';
    } else {
      html += '<p class="prop-note">Para mudar o tamanho de um texto, clique dentro dele.</p>';
    }
    html += '<div class="prop-field"><label>Entrelinha</label><select data-field="lineHeight" ' + attrsBase + ">" +
      [["", "Padrão do modelo"], ["1.1", "1,1"], ["1.2", "1,2"], ["1.3", "1,3"], ["1.4", "1,4"], ["1.5", "1,5"], ["1.6", "1,6"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (String(bl.lineHeight || "") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></div>";
    html += '<div class="prop-field"><span class="prop-field-label">Alinhamento</span>' +
      segButtons([["", "Padrão"], ["left", "Esquerda"], ["justify", "Justificado"]],
        function (it) { return 'data-action="set-block-style" ' + attrsBase + ' data-field="textAlign" data-value="' + it[0] + '"'; },
        function (it) { return (bl.textAlign || "") === it[0]; }) + "</div>";
    html += "</div>";

    // Layout
    html += '<div class="prop-section"><div class="prop-label">Layout</div>' +
      chkRow("Travar (impede editar a posição)", !!bl.locked, "toggle-block-lock", " " + attrsBase);
    if (blockId !== "masthead") {
      html += '<button type="button" class="prop-btn" style="margin-top:12px" data-action="toggle-block-hidden" ' + attrsBase + ">" +
        icon(bl.hidden ? "eye" : "eye-off") + (bl.hidden ? "Mostrar este bloco de novo" : "Ocultar este bloco (sai da página e do PDF)") + "</button>";
    }
    if (REMOVABLE_BLOCKS.indexOf(blockId) !== -1) {
      html += '<button type="button" class="prop-btn danger" data-confirm-remove-block="' + blockId + '">' + icon("trash") + "Excluir este bloco (apaga o texto)</button>";
    }
    if (bl.x || bl.y) {
      html += '<p class="prop-note" style="margin-top:10px">Este bloco foi deslocado à mão (' + Math.round(bl.x) + ", " + Math.round(bl.y) + ' px). Blocos do modelo agora mudam de ordem pelas camadas.</p>' +
        '<button type="button" class="prop-btn" data-action="reset-block-pos" ' + attrsBase + ">" + icon("reset") + "Voltar à posição original</button>";
    }
    html += "</div>";

    // Cor
    html += '<div class="prop-section"><div class="prop-label">Cor do texto</div>' + colorSection(attrsBase, bl.textColor, "textColor") + "</div>";
    return html;
  }

  function renderElementInspector(elId) {
    var el = getElementById(elId);
    if (!el) return "";
    var typeName = el.type === "line" ? "Linha" : el.type === "band" ? "Faixa" : "Caixa de texto";
    var attrsBase = 'data-el-id="' + el.id + '"';
    var html = propHead("Página " + el.page + " › Elementos livres", typeName, "toggle-element-lock", !!el.locked, " " + attrsBase);
    if (el.type === "text") {
      html += '<div class="prop-section"><div class="prop-label">Tipografia</div>' +
        '<div class="prop-field"><label>Fonte</label>' + fontSelect('data-field="fontFamily" ' + attrsBase, el.fontFamily, false) + "</div>" +
        '<div class="prop-field"><label>Tamanho (px)</label><input type="number" data-field="fontSize" ' + attrsBase + ' value="' + el.fontSize + '" min="8" max="72"></div></div>';
      html += '<div class="prop-section"><div class="prop-label">Cor do texto</div><div class="swatches">' +
        COLOR_SWATCHES.map(function (c) {
          return '<button type="button" class="swatch' + ((el.textColor || "").toLowerCase() === c[0] ? " is-active" : "") + '" style="background:' + c[0] + '" data-action="set-element-style" ' + attrsBase + ' data-field="textColor" data-value="' + c[0] + '" title="' + c[1] + '" aria-label="' + c[1] + '"></button>';
        }).join("") +
        '<input type="color" data-field="textColor" ' + attrsBase + ' value="' + el.textColor + '" title="Outra cor"></div></div>';
    } else {
      html += '<div class="prop-section"><div class="prop-label">Cor</div><div class="swatches">' +
        COLOR_SWATCHES.map(function (c) {
          return '<button type="button" class="swatch' + ((el.bgColor || "").toLowerCase() === c[0] ? " is-active" : "") + '" style="background:' + c[0] + '" data-action="set-element-style" ' + attrsBase + ' data-field="bgColor" data-value="' + c[0] + '" title="' + c[1] + '" aria-label="' + c[1] + '"></button>';
        }).join("") +
        '<input type="color" data-field="bgColor" ' + attrsBase + ' value="' + (/^#/.test(el.bgColor) ? el.bgColor : "#0e1b3b") + '" title="Outra cor"></div></div>';
    }
    html += '<div class="prop-section"><div class="prop-label">Layout</div>';
    if (el.type === "line" || el.type === "band") {
      html += '<div class="prop-grid"><div class="prop-field"><label>Comprimento</label><input type="number" data-field="width" ' + attrsBase + ' value="' + Math.round(el.width) + '" min="4" max="2000"></div>' +
        '<div class="prop-field"><label>Espessura</label><input type="number" data-field="height" ' + attrsBase + ' value="' + Math.round(el.height) + '" min="1" max="500"></div></div><div style="height:12px"></div>';
    }
    html += chkRow("Travar (impede mover e redimensionar)", !!el.locked, "toggle-element-lock", " " + attrsBase) +
      '<button type="button" class="prop-btn" style="margin-top:12px" data-action="duplicate-element" ' + attrsBase + ">" + icon("copy") + "Duplicar</button>" +
      '<button type="button" class="prop-btn danger" data-action="remove-element" ' + attrsBase + ">" + icon("trash") + "Remover elemento</button></div>";
    return html;
  }

  /* ---------------------------------------------------------------------
     Acervo de matérias — o banco de dados das edições: busca em todas
     (manchetes, notícias e glossário), filtra por tipo, ano e editoria,
     abre a matéria original, copia para a edição atual e exporta para
     planilha (.csv). É um índice montado na hora a partir de store.editions
     (que online já é o banco sincronizado): nada é duplicado.
     --------------------------------------------------------------------- */
  var ACERVO_TIPOS = { manchete: "Manchete", noticia: "Notícia", glossario: "Glossário" };
  var acervoItens = [];

  function linksDe(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = richHtml(html || "");
    return Array.prototype.map.call(tmp.querySelectorAll("a[href]"), function (a) { return a.getAttribute("href"); });
  }
  function montarAcervo() {
    var itens = [];
    store.order.forEach(function (id, ordem) {
      var ed = store.editions[id];
      var d = ed && ed.data;
      if (!d) return;
      var data = parseIsoDate(d.meta && d.meta.vars && d.meta.vars.data);
      var base = { edId: id, edNome: ed.name, data: data, ano: data ? data.getFullYear() : null, ordem: ordem };
      if (d.headline && plainText(d.headline.title)) {
        itens.push(Object.assign({ tipo: "manchete", idx: 0, tag: plainText(d.headline.tag), titulo: plainText(d.headline.title),
          texto: [plainText(d.headline.deck)].concat((d.headline.paragraphs || []).map(plainText)).filter(Boolean).join(" "),
          links: [], path: "headline.title" }, base));
      }
      (d.columns || []).forEach(function (c, i) {
        if (!plainText(c.title) && !plainText(c.body)) return;
        var src = c.sourceId ? (d.sources || []).filter(function (x) { return x.id === c.sourceId; })[0] : null;
        itens.push(Object.assign({ tipo: "noticia", idx: i, tag: plainText(c.tag), titulo: plainText(c.title), texto: plainText(c.body),
          links: linksDe(c.linkText).concat(src && src.url ? [src.url] : []), status: c.status || "rascunho", path: "columns." + i + ".title" }, base));
      });
      ((d.glossary && d.glossary.items) || []).forEach(function (g, i) {
        if (!plainText(g.term)) return;
        itens.push(Object.assign({ tipo: "glossario", idx: i, tag: "", titulo: plainText(g.term), texto: plainText(g.def), links: [], path: "glossary.items." + i + ".term" }, base));
      });
    });
    itens.forEach(function (it) { it.busca = semAcento([it.titulo, it.tag, it.texto, it.links.map(hostOf).join(" "), it.edNome].join(" ")); });
    // Mais recentes primeiro (data da edição; sem data, pela ordem da lista)
    itens.sort(function (a, b) { return ((b.data ? +b.data : 0) - (a.data ? +a.data : 0)) || (b.ordem - a.ordem) || (a.idx - b.idx); });
    return itens;
  }

  function acervoFiltrados() {
    var q = semAcento(document.getElementById("acervoBusca").value).split(/\s+/).filter(Boolean);
    var tipo = document.getElementById("acervoTipo").value;
    var ano = document.getElementById("acervoAno").value;
    var tag = document.getElementById("acervoTag").value;
    return acervoItens.filter(function (it) {
      if (tipo && it.tipo !== tipo) return false;
      if (ano && String(it.ano) !== ano) return false;
      if (tag && semAcento(it.tag).indexOf(semAcento(tag)) === -1) return false;
      return q.every(function (t) { return it.busca.indexOf(t) !== -1; });
    });
  }

  // Trecho do texto em volta do primeiro termo buscado, com os termos marcados.
  function realce(texto, termos, max) {
    var t = String(texto || "");
    var norm = semAcento(t), ini = 0;
    if (termos.length) {
      var p = norm.indexOf(termos[0]);
      if (p > 60) ini = p - 60;
    }
    var trecho = t.slice(ini, ini + (max || 220)), nt = semAcento(trecho);
    var marcas = [];
    termos.forEach(function (term) {
      var k = 0;
      while ((k = nt.indexOf(term, k)) !== -1) { marcas.push([k, k + term.length]); k += term.length; }
    });
    marcas.sort(function (a, b) { return a[0] - b[0]; });
    var out = "", pos = 0;
    marcas.forEach(function (m) {
      if (m[0] < pos) return;
      out += esc(trecho.slice(pos, m[0])) + "<mark>" + esc(trecho.slice(m[0], m[1])) + "</mark>";
      pos = m[1];
    });
    out += esc(trecho.slice(pos));
    return (ini > 0 ? "…" : "") + out + (ini + (max || 220) < t.length ? "…" : "");
  }

  function renderAcervo() {
    var lista = acervoFiltrados();
    var termos = semAcento(document.getElementById("acervoBusca").value).split(/\s+/).filter(Boolean);
    var eds = {};
    lista.forEach(function (it) { eds[it.edId] = 1; });
    document.getElementById("acervoResumo").textContent = lista.length
      ? lista.length + (lista.length === 1 ? " resultado" : " resultados") + " em " + Object.keys(eds).length + (Object.keys(eds).length === 1 ? " edição" : " edições") + (lista.length > 150 ? " (mostrando 150; refine a busca)" : "")
      : "Nada encontrado com esses filtros.";
    document.getElementById("acervoLista").innerHTML = lista.slice(0, 150).map(function (it) {
      var k = acervoItens.indexOf(it);
      var atual = it.edId === store.currentId;
      return '<li class="acervo-item">' +
        '<div class="acervo-meta"><span class="chip acervo-tipo-' + it.tipo + '">' + ACERVO_TIPOS[it.tipo] + "</span>" +
        "<span>" + esc(it.edNome) + (it.data ? " · " + ddmmaaaa(it.data) : "") + (atual ? " · edição aberta" : "") + "</span>" +
        (it.tag ? '<span class="acervo-tag">' + realce(it.tag, termos, 80) + "</span>" : "") + "</div>" +
        '<div class="acervo-titulo">' + realce(it.titulo, termos, 200) + "</div>" +
        (it.texto ? '<div class="acervo-texto">' + realce(it.texto, termos, 240) + "</div>" : "") +
        (it.links.length ? '<div class="acervo-links">' + it.links.slice(0, 4).map(function (u) {
          var h = safeHref(u);
          return h ? '<a href="' + esc(h) + '" target="_blank" rel="noopener">' + esc(hostOf(u) || u) + "</a>" : "";
        }).join(" · ") + "</div>" : "") +
        '<div class="acervo-acoes"><button type="button" class="check-btn" data-acervo-act="abrir" data-k="' + k + '">' + (atual ? "Mostrar na página" : "Abrir a edição") + "</button>" +
        (!REVIEWER && it.tipo !== "manchete" && !atual ? '<button type="button" class="check-btn" data-acervo-act="copiar" data-k="' + k + '">Copiar para a edição aberta</button>' : "") +
        "</div></li>";
    }).join("");
  }

  function openAcervo() {
    acervoItens = montarAcervo();
    var anos = {}, tags = {};
    acervoItens.forEach(function (it) {
      if (it.ano) anos[it.ano] = 1;
      if (it.tag) it.tag.split(/\s*[·|]\s*/).forEach(function (t) { var n = t.trim(); if (n) tags[n.toUpperCase()] = 1; });
    });
    var selAno = document.getElementById("acervoAno"), selTag = document.getElementById("acervoTag");
    var anoAtual = selAno.value, tagAtual = selTag.value;
    selAno.innerHTML = '<option value="">Todos os anos</option>' + Object.keys(anos).sort().reverse().map(function (a) { return '<option value="' + a + '">' + a + "</option>"; }).join("");
    selTag.innerHTML = '<option value="">Todas as editorias</option>' + Object.keys(tags).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("");
    selAno.value = anoAtual; selTag.value = tagAtual;
    document.getElementById("acervoTotal").textContent = acervoItens.length + (acervoItens.length === 1 ? " item em " : " itens em ") + store.order.length + (store.order.length === 1 ? " edição" : " edições");
    renderAcervo();
    document.getElementById("acervoDialog").hidden = false;
    var busca = document.getElementById("acervoBusca");
    busca.focus();
    busca.select();
  }

  function copiarDoAcervo(it) {
    var origem = store.editions[it.edId] && store.editions[it.edId].data;
    if (!origem) return;
    var s = state();
    pushHistory();
    if (it.tipo === "glossario") {
      s.glossary.items.push(JSON.parse(JSON.stringify(origem.glossary.items[it.idx])));
    } else {
      var c = JSON.parse(JSON.stringify(origem.columns[it.idx]));
      c.status = "rascunho";
      var src = c.sourceId ? (origem.sources || []).filter(function (x) { return x.id === c.sourceId; })[0] : null;
      delete c.sourceId;
      if (src) {
        var ns = JSON.parse(JSON.stringify(src));
        ns.id = newSourceId();
        s.sources = s.sources || [];
        s.sources.push(ns);
        c.sourceId = ns.id;
      }
      s.columns.push(c);
    }
    scheduleSave();
    render();
    uiToast((it.tipo === "glossario" ? "Termo" : "Notícia") + " copiada para a edição aberta" + (it.tipo === "noticia" ? " (no fim das notícias, como rascunho)." : "."));
  }

  function exportarAcervoCsv() {
    var lista = acervoFiltrados();
    var cel = function (v) { var t = String(v == null ? "" : v).replace(/\r?\n/g, " "); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    var linhas = [["Edição", "Data", "Tipo", "Editoria", "Título", "Texto", "Status", "Links"]].concat(lista.map(function (it) {
      return [it.edNome, it.data ? ddmmaaaa(it.data) : "", ACERVO_TIPOS[it.tipo], it.tag, it.titulo, it.texto, it.status || "", it.links.join(" ")];
    }));
    var d = new Date();
    offerFile("acervo_boletim_" + d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + ".csv",
      "﻿" + linhas.map(function (l) { return l.map(cel).join(";"); }).join("\r\n"));
  }

  function initAcervo() {
    var dlg = document.getElementById("acervoDialog");
    if (!dlg) return;
    var timer = null;
    document.getElementById("acervoBusca").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(renderAcervo, 120); });
    ["acervoTipo", "acervoAno", "acervoTag"].forEach(function (id) { document.getElementById(id).addEventListener("change", renderAcervo); });
    document.getElementById("acervoClose").addEventListener("click", function () { dlg.hidden = true; });
    document.getElementById("acervoCsv").addEventListener("click", exportarAcervoCsv);
    document.getElementById("btnAcervo").addEventListener("click", openAcervo);
    var btnExpCanais = document.getElementById("btnExportCanais");
    if (btnExpCanais) btnExpCanais.addEventListener("click", exportarCanaisColeta);
    dlg.addEventListener("keydown", function (e) { if (e.key === "Escape") dlg.hidden = true; });
    document.getElementById("acervoLista").addEventListener("click", function (e) {
      var b = e.target.closest("[data-acervo-act]");
      if (!b) return;
      var it = acervoItens[+b.dataset.k];
      if (!it) return;
      if (b.dataset.acervoAct === "copiar") { copiarDoAcervo(it); renderAcervo(); return; }
      dlg.hidden = true;
      if (it.edId !== store.currentId) {
        var sel = document.getElementById("editionSelect");
        sel.value = it.edId;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setTimeout(function () {
        var el = document.querySelector('#workspace [data-path="' + it.path + '"]');
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("check-flash");
        setTimeout(function () { el.classList.remove("check-flash"); }, 1700);
      }, 60);
    });
  }

  /* ---------------------------------------------------------------------
     Pauta — matérias da semana, coletadas e agrupadas por tema
     O coletor (coleta/coletar.mjs) roda no GitHub Actions todo sábado às 08h
     ou pelo botão "Buscar agora" e grava pautas/<inicio>.json no repositório.
     Esta aba lê o arquivo (API do GitHub com a chave deste aparelho,
     raw.githubusercontent.com ou o próprio site), permite confirmar ou
     descartar temas e transforma tema em notícia (columns[]) e matéria em
     fonte numerada (sources[]). Nada aqui inventa texto ou link.
     Estado por edição: s.pauta = { arquivo, estado: { <arquivo>: { temas: { id: "confirmado"|"descartado" }, criadas: { id: true } } } }
     Formato do arquivo: CONTEXTO.md, seção 5.3 ("boletimMaker.pauta").
     --------------------------------------------------------------------- */
  var GH_KEY = "boletimMaker.github";
  var PAUTA_CACHE_KEY = "boletimMaker.pautaCache";
  var PAUTA_GRUPOS = [["", "Todos"], ["oficial", "Oficiais"], ["br", "Imprensa BR"], ["intl", "Internacional"]];
  var GRUPO_NOME = { oficial: "Oficial", br: "Imprensa BR", intl: "Internacional" };
  var modoAtual = "pagina";
  var pauta = { indice: null, atual: null, arquivo: null, sel: null, detGrupo: "", ocultas: 0, msg: "", erro: "", buscando: null,
    filtros: { q: "", editoria: "", grupo: "", veiculo: "" } };

  // ---- GitHub (chave só neste aparelho, nunca no servidor) ----
  function ghRepo() { return (FB && FB.repo) || "Vt-Iak/Boletimmaker-lmfu"; }
  function ghToken() { try { var o = JSON.parse(localStorage.getItem(GH_KEY) || "null"); return (o && o.token) || ""; } catch (e) { return ""; } }
  function ghSetToken(t) { try { if (t) localStorage.setItem(GH_KEY, JSON.stringify({ token: t })); else localStorage.removeItem(GH_KEY); } catch (e) { /* ok */ } }
  async function ghApi(method, caminho, corpo, accept) {
    var r = await fetch("https://api.github.com" + caminho, {
      method: method, cache: "no-store",
      headers: { Authorization: "Bearer " + ghToken(), Accept: accept || "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    if (!r.ok) {
      var err = new Error("GitHub respondeu " + r.status);
      err.status = r.status;
      try { err.detalhe = (await r.json()).message; } catch (e) { /* sem corpo */ }
      throw err;
    }
    if (r.status === 204) return null;
    return accept && /raw/.test(accept) ? r.text() : r.json();
  }
  async function ghPutFile(caminho, texto, mensagem) {
    var atual = null;
    try { atual = await ghApi("GET", "/repos/" + ghRepo() + "/contents/" + caminho + "?ref=main"); } catch (e) { if (e.status !== 404) throw e; }
    return ghApi("PUT", "/repos/" + ghRepo() + "/contents/" + caminho, {
      message: mensagem, branch: "main", content: btoa(unescape(encodeURIComponent(texto))), sha: atual ? atual.sha : undefined
    });
  }
  // Lê um arquivo do repositório: pela API (com chave, sempre atualizado),
  // pelo raw do GitHub (público) ou pelo próprio site publicado.
  async function lerArquivoRepo(caminho) {
    var tentativas = [];
    if (ghToken()) tentativas.push(function () { return ghApi("GET", "/repos/" + ghRepo() + "/contents/" + caminho + "?ref=main", null, "application/vnd.github.raw+json").then(JSON.parse); });
    tentativas.push(function () {
      return fetch("https://raw.githubusercontent.com/" + ghRepo() + "/main/" + caminho + "?t=" + Date.now(), { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("raw " + r.status); return r.json(); });
    });
    if (location.protocol === "https:" && !IN_ARTIFACT) tentativas.push(function () {
      return fetch(caminho + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("site " + r.status); return r.json(); });
    });
    var ultimo = null;
    for (var i = 0; i < tentativas.length; i++) {
      try { return await tentativas[i](); } catch (e) { ultimo = e; }
    }
    throw ultimo || new Error("sem acesso");
  }

  // ---- Dados ----
  function dataCurta(isoTxt) { var d = parseIsoDate(isoTxt); return d ? ddmm(d) : ""; }
  function rotuloPauta(p) {
    var ger = p.geradoEm ? new Date(p.geradoEm) : null;
    return (p.tipo === "busca" ? "Busca \"" + (p.termo || "") + "\"" : "Semana " + dataCurta(p.inicio) + " a " + dataCurta(p.fim)) +
      (ger && !isNaN(ger) ? " · " + ddmm(ger) + " " + pad2(ger.getHours()) + ":" + pad2(ger.getMinutes()) : "");
  }
  function pautaEstado() {
    var s = state();
    var e = pauta.arquivo && s.pauta && s.pauta.estado && s.pauta.estado[pauta.arquivo];
    return { temas: (e && e.temas) || {}, criadas: (e && e.criadas) || {} };
  }
  // Grava o estado da pauta na edição (sincroniza como o resto da edição).
  function salvarPautaEstado(mudar) {
    if (REVIEWER || !pauta.arquivo) return;
    var s = state();
    s.pauta = s.pauta || {};
    s.pauta.arquivo = pauta.arquivo;
    s.pauta.estado = s.pauta.estado || {};
    var e = s.pauta.estado[pauta.arquivo] = s.pauta.estado[pauta.arquivo] || { temas: {}, criadas: {} };
    e.temas = e.temas || {};
    e.criadas = e.criadas || {};
    mudar(e);
    scheduleSave();
  }
  function todasMaterias() {
    if (!pauta.atual) return [];
    var out = [];
    (pauta.atual.temas || []).forEach(function (t) { out = out.concat(t.materias || []); });
    return out.concat(pauta.atual.avulsas || []);
  }
  function materiaPorId(id) { return todasMaterias().filter(function (m) { return m.id === id; })[0] || null; }
  function fonteDaMateria(m) {
    var s = state();
    var list = s.sources || [];
    for (var i = 0; i < list.length; i++) if (list[i].url && list[i].url === m.url) return i + 1;
    return 0;
  }
  // O app reaplica o filtro de canais: matéria de domínio que saiu da lista some.
  function aplicarPauta(json, arquivo) {
    if (!json || json.formato !== "boletimMaker.pauta" || !Array.isArray(json.temas)) throw new Error("não é um arquivo de pauta do Boletim Maker");
    var doms = canais().map(function (c) { return c.dominio; }).filter(Boolean);
    var vale = function (m) {
      if (!m || !/^https?:\/\//.test(m.url || "")) return false;
      if (!doms.length) return true;
      var d = String(m.dominio || "").replace(/^www\d*\./, "");
      return doms.some(function (x) { return d === x || d.slice(-(x.length + 1)) === "." + x; });
    };
    var ocultas = 0;
    var copia = JSON.parse(JSON.stringify(json));
    copia.temas = copia.temas.map(function (t) {
      var antes = (t.materias || []).length;
      t.materias = (t.materias || []).filter(vale);
      ocultas += antes - t.materias.length;
      return t;
    }).filter(function (t) { return t.materias.length; });
    var antesAv = (copia.avulsas || []).length;
    copia.avulsas = (copia.avulsas || []).filter(vale);
    ocultas += antesAv - copia.avulsas.length;
    pauta.atual = copia;
    pauta.arquivo = arquivo;
    pauta.ocultas = ocultas;
    pauta.erro = "";
    if (!pauta.sel || (pauta.sel !== "avulsas" && !copia.temas.some(function (t) { return t.id === pauta.sel; }))) pauta.sel = copia.temas.length ? copia.temas[0].id : "avulsas";
    try { localStorage.setItem(PAUTA_CACHE_KEY, JSON.stringify({ arquivo: arquivo, json: json })); } catch (e) { /* cache é só conveniência */ }
    var s = state();
    if (!REVIEWER && (!s.pauta || s.pauta.arquivo !== arquivo)) salvarPautaEstado(function () {});
  }
  async function carregarPauta(arquivo) {
    pauta.msg = "Carregando " + arquivo + "…";
    renderPauta();
    try {
      aplicarPauta(await lerArquivoRepo("pautas/" + arquivo), arquivo);
      pauta.msg = "";
    } catch (e) {
      pauta.erro = "Não foi possível abrir a pauta (" + (e.message || "erro") + ").";
    }
    renderPauta();
  }
  async function carregarIndicePauta() {
    pauta.msg = "Procurando pautas…";
    pauta.erro = "";
    renderPauta();
    try {
      pauta.indice = await lerArquivoRepo("pautas/index.json");
    } catch (e) {
      pauta.indice = null;
      // Sem acesso (offline, Windows, claude.ai): usa a última pauta aberta neste aparelho.
      var cache = null;
      try { cache = JSON.parse(localStorage.getItem(PAUTA_CACHE_KEY) || "null"); } catch (er) { cache = null; }
      if (cache && cache.json) {
        try { aplicarPauta(cache.json, cache.arquivo); pauta.msg = "Sem acesso às pautas agora: mostrando a última aberta neste aparelho."; renderPauta(); return; } catch (er) { /* segue */ }
      }
      pauta.msg = "";
      pauta.erro = "Não foi possível ler as pautas do GitHub agora. Use \"Importar\" com um arquivo de pauta (.json).";
      renderPauta();
      return;
    }
    var lista = (pauta.indice && pauta.indice.pautas) || [];
    var s = state(), v = s.meta.vars || {};
    var escolhido = (s.pauta && lista.filter(function (p) { return p.arquivo === s.pauta.arquivo; })[0]) ||
      lista.filter(function (p) { return p.tipo === "semana" && p.inicio === v.coberturaInicio; })[0] ||
      lista.filter(function (p) { return p.tipo === "semana"; })[0] || lista[0];
    pauta.msg = "";
    if (escolhido) await carregarPauta(escolhido.arquivo);
    else { pauta.erro = "Ainda não há pautas. A coleta roda todo sábado às 08h; use \"Buscar agora\" para gerar uma."; renderPauta(); }
  }

  // ---- Filtros ----
  function passaMateria(m, f) {
    if (f.grupo && m.grupo !== f.grupo) return false;
    if (f.veiculo && m.veiculo !== f.veiculo) return false;
    if (f.editoria && m.editoria && m.editoria !== f.editoria) return false;
    if (f.q) {
      var txt = semAcento((m.titulo || "") + " " + (m.trecho || "") + " " + (m.veiculo || ""));
      if (!semAcento(f.q).split(/\s+/).filter(Boolean).every(function (t) { return txt.indexOf(t) !== -1; })) return false;
    }
    return true;
  }
  // Tema passa se: é da editoria escolhida; tem matéria do grupo/veículo
  // escolhido; e a palavra aparece no tema ou em alguma das suas matérias.
  function passaTema(t, f) {
    if (f.editoria && t.editoria !== f.editoria) return false;
    var mats = t.materias || [];
    if ((f.grupo || f.veiculo) && !mats.some(function (m) { return (!f.grupo || m.grupo === f.grupo) && (!f.veiculo || m.veiculo === f.veiculo); })) return false;
    if (!f.q) return true;
    var txt = semAcento([t.titulo, t.resumo].concat(mats.map(function (m) { return (m.titulo || "") + " " + (m.trecho || "") + " " + (m.veiculo || ""); })).join(" "));
    return semAcento(f.q).split(/\s+/).filter(Boolean).every(function (x) { return txt.indexOf(x) !== -1; });
  }

  // ---- Desenho ----
  function renderPauta() {
    if (modoAtual !== "pauta") return;
    renderPautaPesquisa();
    renderPautaTemas();
    renderPautaDetalhe();
  }
  function renderPautaPesquisa() {
    var box = document.getElementById("pautaPesquisa");
    if (!box) return;
    var s = state(), v = s.meta.vars || {};
    var lista = (pauta.indice && pauta.indice.pautas) || [];
    if (pauta.arquivo && !lista.some(function (p) { return p.arquivo === pauta.arquivo; })) lista = [{ arquivo: pauta.arquivo, tipo: "importada" }].concat(lista);
    var a = pauta.atual;
    var editorias = {}, veiculos = {};
    todasMaterias().forEach(function (m) { if (m.editoria) editorias[m.editoria] = 1; if (m.veiculo) veiculos[m.veiculo] = 1; });
    (a && a.temas || []).forEach(function (t) { if (t.editoria) editorias[t.editoria] = 1; });
    var f = pauta.filtros;
    var info = "";
    if (a) {
      var desc = a.coleta && a.coleta.descartadas ? Object.keys(a.coleta.descartadas).reduce(function (t, k) { return t + (a.coleta.descartadas[k] || 0); }, 0) : 0;
      info = todasMaterias().length + " matérias em " + a.temas.length + " temas" + (desc ? " · " + desc + " descartadas pelos filtros da coleta" : "") +
        (pauta.ocultas ? " · " + pauta.ocultas + " ocultas (canal fora da sua lista)" : "");
    }
    var semChave = !ghToken();
    box.innerHTML =
      '<div class="pauta-bloco"><div class="pauta-titulo">Pauta</div>' +
        '<p class="pauta-cob">Edição ' + esc(v.edicao || "") + " · cobertura <strong>" + esc(dataCurta(v.coberturaInicio) || "?") + " a " + esc(dataCurta(v.coberturaFim) || "?") + "</strong></p>" +
        (lista.length ? '<label class="pauta-campo"><span>Arquivo</span><select data-pauta-campo="arquivo">' + lista.map(function (p) {
          return '<option value="' + esc(p.arquivo) + '"' + (p.arquivo === pauta.arquivo ? " selected" : "") + ">" + esc(p.tipo === "importada" ? "Importada: " + p.arquivo : rotuloPauta(p)) + "</option>";
        }).join("") + "</select></label>" : "") +
        '<div class="pauta-acoes"><button type="button" class="check-btn" data-pauta-act="atualizar">' + icon("reset") + "Atualizar</button>" +
        '<button type="button" class="check-btn" data-pauta-act="importar">' + icon("upload") + "Importar</button></div>" +
        (pauta.msg ? '<p class="pauta-msg">' + esc(pauta.msg) + "</p>" : "") +
        (pauta.erro ? '<p class="pauta-msg is-error">' + esc(pauta.erro) + "</p>" : "") +
        (info ? '<p class="pauta-msg">' + esc(info) + "</p>" : "") +
      "</div>" +
      '<div class="pauta-bloco"><div class="pauta-titulo">Buscar agora</div>' +
        '<input type="search" data-pauta-campo="termo" placeholder="Palavra-chave (opcional), ex.: Petrobras" aria-label="Palavra-chave da busca">' +
        '<div class="pauta-periodo"><input type="date" data-pauta-campo="inicio" value="' + esc(v.coberturaInicio || "") + '" aria-label="Início"><span>a</span><input type="date" data-pauta-campo="fim" value="' + esc(v.coberturaFim || "") + '" aria-label="Fim"></div>' +
        '<button type="button" class="check-btn primary pauta-buscar" data-pauta-act="buscar"' + (pauta.buscando ? " disabled" : "") + ">" + icon("search") + (pauta.buscando ? "Buscando…" : "Buscar agora") + "</button>" +
        (pauta.buscando ? '<p class="pauta-msg">A busca roda no GitHub e costuma levar de 3 a 7 minutos. Pode continuar trabalhando: a pauta abre sozinha quando ficar pronta.</p>'
          : '<p class="prop-note">Busca nos seus canais, no período escolhido. Sem palavra-chave, refaz a pauta da semana.' +
            (semChave ? ' Para buscar daqui, configure a chave do GitHub uma vez neste aparelho: <button type="button" class="check-link" data-pauta-act="config">configurar</button>.' : "") + "</p>") +
      "</div>" +
      '<div class="pauta-bloco"><div class="pauta-titulo">Filtrar</div>' +
        '<input type="search" data-pauta-campo="q" value="' + esc(f.q) + '" placeholder="Palavra no título ou no trecho" aria-label="Filtrar por palavra">' +
        '<select data-pauta-campo="editoria" aria-label="Editoria"><option value="">Todas as editorias</option>' + Object.keys(editorias).sort().map(function (e) {
          return '<option value="' + esc(e) + '"' + (f.editoria === e ? " selected" : "") + ">" + esc(e) + "</option>";
        }).join("") + "</select>" +
        '<div class="pauta-chips">' + PAUTA_GRUPOS.map(function (g) {
          return '<button type="button" class="v-chip' + (f.grupo === g[0] ? " is-on" : "") + '" data-pauta-act="grupo" data-valor="' + g[0] + '">' + esc(g[1]) + "</button>";
        }).join("") + "</div>" +
        '<select data-pauta-campo="veiculo" aria-label="Veículo"><option value="">Todos os veículos</option>' + Object.keys(veiculos).sort().map(function (n) {
          return '<option value="' + esc(n) + '"' + (f.veiculo === n ? " selected" : "") + ">" + esc(n) + "</option>";
        }).join("") + "</select>" +
      "</div>";
  }
  function barras(n) { var h = ""; for (var i = 1; i <= 5; i++) h += "<i" + (i <= n ? ' class="f"' : "") + "></i>"; return '<span class="pt-bar" title="Relevância ' + n + ' de 5">' + h + "</span>"; }
  function renderPautaTemas() {
    var box = document.getElementById("pautaTemas");
    if (!box) return;
    var a = pauta.atual;
    var cnt = document.getElementById("pautaTemasCount");
    var cntTopo = document.getElementById("pautaCount");
    if (!a) { box.innerHTML = ""; if (cnt) cnt.textContent = ""; return; }
    var est = pautaEstado(), f = pauta.filtros;
    var lista = a.temas.filter(function (t) { return passaTema(t, f); });
    lista.sort(function (x, y) { return (est.temas[x.id] === "descartado") - (est.temas[y.id] === "descartado"); });
    if (cnt) cnt.textContent = String(lista.length);
    if (cntTopo) cntTopo.textContent = String(a.temas.length);
    var avulsas = (a.avulsas || []).filter(function (m) { return passaMateria(m, f); });
    box.innerHTML = (lista.length ? "" : '<p class="sources-empty">Nenhum tema com esses filtros.</p>') + lista.map(function (t, i) {
      var st = est.temas[t.id], criada = est.criadas[t.id];
      return '<div class="pauta-tema' + (pauta.sel === t.id ? " is-sel" : "") + (st === "descartado" ? " is-off" : "") + '" data-pauta-act="sel-tema" data-id="' + esc(t.id) + '" tabindex="0">' +
        '<div class="pt-th"><span class="pt-rank">' + (i + 1) + '</span><div><div class="pt-tag">' + esc(t.editoria || "") + '</div><div class="pt-tit">' + esc(t.titulo) + "</div></div>" + barras(t.relevancia || 1) + "</div>" +
        (st !== "descartado" && t.resumo ? '<div class="pt-res">' + esc(t.resumo) + "</div>" : "") +
        '<div class="pt-foot">' +
          (criada ? '<span class="chip chip-aprovado">Notícia criada</span>' : st === "confirmado" ? '<span class="chip chip-aprovado">' + icon("check") + "Confirmado</span>"
            : st === "descartado" ? '<span class="chip">Descartado</span>' + (REVIEWER ? "" : '<button type="button" class="check-link" data-pauta-act="desfazer" data-id="' + esc(t.id) + '">desfazer</button>')
            : (REVIEWER ? "" : '<button type="button" class="check-btn pt-btn" data-pauta-act="confirmar" data-id="' + esc(t.id) + '">' + icon("check") + 'Confirmar</button><button type="button" class="check-link" data-pauta-act="descartar" data-id="' + esc(t.id) + '">descartar</button>')) +
          '<span class="pt-n">' + t.materias.length + (t.materias.length === 1 ? " matéria" : " matérias") + " · " + (t.veiculos || 1) + (t.veiculos === 1 ? " veículo" : " veículos") + "</span>" +
        "</div></div>";
    }).join("") +
      (avulsas.length ? '<div class="pauta-tema pauta-avulsas' + (pauta.sel === "avulsas" ? " is-sel" : "") + '" data-pauta-act="sel-tema" data-id="avulsas" tabindex="0">' +
        '<div class="pt-tit">Matérias avulsas</div><div class="pt-res">' + avulsas.length + " matérias sem outra parecida na semana — úteis para a busca e para notas curtas.</div></div>" : "");
  }
  function materiaCard(m, comCriar) {
    var n = fonteDaMateria(m);
    var host = hostOf(m.url) || m.dominio || "";
    return '<div class="pauta-materia' + (n ? " is-used" : "") + '">' +
      '<div class="pm-main"><div class="pm-meta"><strong>' + esc(m.veiculo || host) + "</strong>" +
        '<span class="chip">' + esc(GRUPO_NOME[m.grupo] || m.grupo || "") + "</span>" +
        "<span>" + esc(dataCurta(m.publicadoEm)) + "</span>" +
        (comCriar && m.editoria ? '<span class="pt-tag">' + esc(m.editoria) + "</span>" : "") +
        (m.linkConfirmado === false ? '<span class="chip chip-incompleta" title="Veio do Google Notícias sem o endereço original">link a confirmar</span>' : "") + "</div>" +
        '<div class="pm-tit">' + esc(m.titulo) + "</div>" +
        (m.trecho ? '<div class="pm-tre">' + esc(m.trecho) + "</div>" : "") +
        (safeHref(m.url) ? '<a class="pm-url" href="' + esc(safeHref(m.url)) + '" target="_blank" rel="noopener">' + esc(host) + " ↗</a>" : "") +
      "</div>" +
      '<div class="pm-acoes">' +
        (n ? '<span class="chip chip-aprovado">' + icon("check") + "Fonte [" + n + "] da edição</span>"
          : REVIEWER ? "" : '<button type="button" class="check-btn" data-pauta-act="usar" data-id="' + esc(m.id) + '">' + icon("plus") + "Usar como fonte</button>") +
        (comCriar && !REVIEWER ? '<button type="button" class="check-btn" data-pauta-act="criar-materia" data-id="' + esc(m.id) + '">' + icon("news") + "Criar notícia</button>" : "") +
      "</div></div>";
  }
  function renderPautaDetalhe() {
    var box = document.getElementById("pautaDetalhe");
    if (!box) return;
    var a = pauta.atual;
    if (!a) {
      box.innerHTML = '<div class="pauta-vazia"><h3>Pauta da semana</h3><p>As matérias dos seus canais são coletadas e agrupadas por tema <strong>todo sábado às 08h</strong>, no GitHub, sem precisar abrir nada.</p>' +
        "<p>Aqui você confirma os temas que entram no boletim, transforma um tema em notícia e usa as matérias como fontes numeradas.</p>" +
        '<p class="prop-note">Também dá para gerar na hora com "Buscar agora", ou importar um arquivo de pauta.</p></div>';
      return;
    }
    var f = pauta.filtros, est = pautaEstado();
    var grupoChips = function (lista) {
      var cont = { "": lista.length };
      lista.forEach(function (m) { cont[m.grupo] = (cont[m.grupo] || 0) + 1; });
      return '<div class="pauta-chips">' + PAUTA_GRUPOS.filter(function (g) { return !g[0] || cont[g[0]]; }).map(function (g) {
        return '<button type="button" class="v-chip' + (pauta.detGrupo === g[0] ? " is-on" : "") + '" data-pauta-act="det-grupo" data-valor="' + g[0] + '">' + esc(g[1]) + " " + (cont[g[0]] || 0) + "</button>";
      }).join("") + "</div>";
    };
    if (pauta.sel === "avulsas") {
      var av = (a.avulsas || []).filter(function (m) { return passaMateria(m, f); });
      var avG = av.filter(function (m) { return !pauta.detGrupo || m.grupo === pauta.detGrupo; });
      box.innerHTML = '<div class="pd-head"><div class="pt-tag">Avulsas</div><h3>Matérias sem tema</h3><p class="pd-res">Matérias que não tiveram outra parecida na semana. Use como fonte ou crie uma notícia a partir de uma delas.</p></div>' +
        grupoChips(av) + avG.map(function (m) { return materiaCard(m, true); }).join("");
      return;
    }
    var t = a.temas.filter(function (x) { return x.id === pauta.sel; })[0];
    if (!t) { box.innerHTML = ""; return; }
    var nomesDe = (t.resumoDe || []).map(function (id) { var m = materiaPorId(id); return m ? m.veiculo : ""; }).filter(Boolean);
    var st = est.temas[t.id], criada = est.criadas[t.id];
    var mats = t.materias.filter(function (m) { return !pauta.detGrupo || m.grupo === pauta.detGrupo; });
    box.innerHTML = '<div class="pd-head"><div class="pt-tag">' + esc(t.editoria || "") + "</div><h3>" + esc(t.titulo) + "</h3>" +
      (t.resumo ? '<p class="pd-res">' + esc(t.resumo) + "</p>" : "") +
      (nomesDe.length ? '<p class="prop-note">Resumo com frases de: ' + esc(nomesDe.filter(function (n, i, arr) { return arr.indexOf(n) === i; }).join(", ")) + '. É texto dos veículos: reescreva antes de aprovar.</p>' : "") +
      (REVIEWER ? "" : '<div class="pd-acoes"><button type="button" class="check-btn primary" data-pauta-act="criar" data-id="' + esc(t.id) + '">' + icon("news") + (criada ? "Criar outra notícia com este tema" : "Criar notícia com este tema") + "</button>" +
        (st === "confirmado" ? '<span class="chip chip-aprovado">' + icon("check") + "Confirmado</span>" : '<button type="button" class="check-btn" data-pauta-act="confirmar" data-id="' + esc(t.id) + '">Confirmar</button>') +
        (st === "descartado" ? '<button type="button" class="check-link" data-pauta-act="desfazer" data-id="' + esc(t.id) + '">desfazer descarte</button>' : '<button type="button" class="check-link" data-pauta-act="descartar" data-id="' + esc(t.id) + '">descartar</button>') +
        "</div>") +
      "</div>" + grupoChips(t.materias) + mats.map(function (m) { return materiaCard(m, false); }).join("");
  }

  // ---- Ações ----
  function hojeIso() { return isoOf(new Date()); }
  // Matéria → fonte numerada. Link não confirmado: pede o endereço original.
  async function usarComoFonte(m, silencioso) {
    var n = fonteDaMateria(m);
    var s = state();
    if (n) return s.sources[n - 1];
    var url = m.url;
    if (m.linkConfirmado === false) {
      var colado = await uiPrompt("Este link veio do Google Notícias e não foi confirmado. Abra a matéria (" + (m.veiculo || "") + "), copie o endereço da barra do navegador e cole aqui:", "");
      if (!colado) return null;
      var host = hostOf(colado.trim());
      var dom = String(m.dominio || "");
      if (!host || !(host === dom || host.slice(-(dom.length + 1)) === "." + dom)) { uiAlert("O endereço precisa ser do próprio " + (m.veiculo || dom) + " (" + dom + ")."); return null; }
      url = safeHref(colado.trim()) || colado.trim();
    }
    pushHistory();
    var src = { id: newSourceId(), veiculo: m.veiculo || inferVeiculo(hostOf(url)), titulo: m.titulo || "", url: url, publicadoEm: m.publicadoEm || "", acessoEm: hojeIso() };
    s.sources = s.sources || [];
    s.sources.push(src);
    scheduleSave();
    if (!silencioso) { renderSourcesTab(); renderPauta(); uiToast("Fonte [" + s.sources.length + "] adicionada: " + src.veiculo + "."); }
    return src;
  }
  function linkInline(src) {
    return '<a class="inline-link" href="' + esc(safeHref(src.url) || "") + '">' + esc(src.veiculo) + "</a>";
  }
  // Tema → notícia em rascunho: cada frase do resumo leva o link da matéria
  // de onde saiu; o selo [n] aponta para a matéria principal.
  async function criarNoticiaDoTema(t) {
    var principal = t.materias.filter(function (m) { return m.linkConfirmado !== false; })[0] || t.materias[0];
    var fontes = {};
    var srcPrincipal = await usarComoFonte(principal, true);
    if (!srcPrincipal) return;
    fontes[principal.id] = srcPrincipal;
    var partes = [];
    var frasesRes = (t.resumoFrases && t.resumoFrases.length) ? t.resumoFrases : (t.resumo ? [{ texto: t.resumo, de: principal.id }] : []);
    for (var i = 0; i < frasesRes.length; i++) {
      var fr = frasesRes[i], mm = materiaPorId(fr.de);
      var src = mm ? (fontes[mm.id] || (mm.linkConfirmado === false ? null : await usarComoFonte(mm, true))) : null;
      if (mm && src) fontes[mm.id] = src;
      partes.push(esc(fr.texto) + (src ? " (" + linkInline(src) + ")" : ""));
    }
    var s = state();
    pushHistory();
    s.columns.push({ tag: t.editoria || "", title: t.titulo, body: partes.join(" ") || esc(t.titulo), linkText: "", sourceId: srcPrincipal.id, status: "rascunho", image: null });
    var idx = s.columns.length - 1;
    salvarPautaEstado(function (e) { e.temas[t.id] = "confirmado"; e.criadas[t.id] = true; });
    scheduleSave();
    setModo("pagina");
    render();
    showLeftTab("estrutura");
    selectAndReveal(layerElement("block", "news-" + idx));
    uiToast("Notícia " + (idx + 1) + " criada como rascunho, com " + Object.keys(fontes).length + " fonte(s). Reescreva o texto antes de aprovar.");
  }
  async function criarNoticiaDaMateria(m) {
    var src = await usarComoFonte(m, true);
    if (!src) return;
    var s = state();
    pushHistory();
    s.columns.push({ tag: m.editoria || "", title: m.titulo, body: (m.trecho ? esc(m.trecho) + " (" + linkInline(src) + ")" : ""), linkText: "", sourceId: src.id, status: "rascunho", image: null });
    var idx = s.columns.length - 1;
    scheduleSave();
    setModo("pagina");
    render();
    showLeftTab("estrutura");
    selectAndReveal(layerElement("block", "news-" + idx));
    uiToast("Notícia " + (idx + 1) + " criada como rascunho a partir de " + (m.veiculo || "uma matéria") + ".");
  }
  function actionsUrl() { return "https://github.com/" + ghRepo() + "/actions/workflows/pauta.yml"; }
  async function buscarAgora() {
    var campo = function (n) { var el = document.querySelector('#pautaPesquisa [data-pauta-campo="' + n + '"]'); return el ? el.value.trim() : ""; };
    var termo = campo("termo"), inicio = campo("inicio"), fim = campo("fim");
    if (inicio && fim && inicio > fim) { uiAlert("O início do período precisa ser antes do fim."); return; }
    if (!ghToken()) {
      var yes = await uiConfirm("Para buscar sem sair do Boletim, este aparelho precisa de uma chave do GitHub (configurada uma vez). Configurar agora?\n\nSem a chave, dá para buscar pelo site: GitHub → Actions → Pauta → Run workflow.", "Configurar chave");
      if (yes) openSettings("integracoes");
      else window.open(actionsUrl(), "_blank", "noopener");
      return;
    }
    pauta.buscando = { desde: new Date(Date.now() - 120000).toISOString(), termo: termo };
    renderPautaPesquisa();
    try {
      await ghApi("POST", "/repos/" + ghRepo() + "/actions/workflows/pauta.yml/dispatches", { ref: "main", inputs: { inicio: inicio, fim: fim, termo: termo } });
    } catch (e) {
      pauta.buscando = null;
      renderPautaPesquisa();
      uiAlert("O GitHub recusou o pedido" + (e.detalhe ? " (" + e.detalhe + ")" : " (" + e.message + ")") + ". Confira a chave em Configurações → Integrações: ela precisa da permissão \"Actions: Read and write\".");
      return;
    }
    uiToast("Busca iniciada no GitHub. Costuma levar de 3 a 7 minutos.");
    esperarBusca(0);
  }
  function esperarBusca(tentativa) {
    if (!pauta.buscando) return;
    setTimeout(async function () {
      if (!pauta.buscando) return;
      try {
        var idx = await lerArquivoRepo("pautas/index.json");
        var novo = ((idx && idx.pautas) || []).filter(function (p) { return p.geradoEm > pauta.buscando.desde; })[0];
        if (novo) {
          pauta.indice = idx;
          pauta.buscando = null;
          await carregarPauta(novo.arquivo);
          uiToast("Pauta pronta: " + rotuloPauta(novo) + ".");
          return;
        }
      } catch (e) { /* tenta de novo */ }
      if (tentativa >= 30) {
        pauta.buscando = null;
        renderPautaPesquisa();
        uiAlert("A busca está demorando mais que o normal. Veja o andamento em GitHub → Actions → Pauta.");
        return;
      }
      esperarBusca(tentativa + 1);
    }, tentativa ? 20000 : 45000);
  }

  function setModo(modo) {
    modoAtual = modo === "pauta" ? "pauta" : "pagina";
    var aberta = modoAtual === "pauta";
    document.body.classList.toggle("modo-pauta", aberta);
    var view = document.getElementById("pautaView");
    if (view) view.hidden = !aberta;
    document.querySelectorAll("[data-modo]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.modo === modoAtual);
      b.setAttribute("aria-pressed", b.dataset.modo === modoAtual ? "true" : "false");
    });
    if (aberta) {
      if (!pauta.atual && !pauta.msg) carregarIndicePauta();
      else renderPauta();
    } else {
      updateBlockToolbar();
    }
  }

  function initPauta() {
    var view = document.getElementById("pautaView");
    if (!view) return;
    document.querySelectorAll("[data-modo]").forEach(function (b) {
      b.addEventListener("click", function () { setModo(b.dataset.modo); });
    });
    view.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pauta-act]");
      if (!b || b.disabled) return;
      var act = b.dataset.pautaAct, id = b.dataset.id;
      if (act === "atualizar") { carregarIndicePauta(); return; }
      if (act === "importar") { document.getElementById("pautaImport").click(); return; }
      if (act === "buscar") { buscarAgora(); return; }
      if (act === "config") { openSettings("integracoes"); return; }
      if (act === "grupo") { pauta.filtros.grupo = b.dataset.valor; renderPauta(); return; }
      if (act === "det-grupo") { pauta.detGrupo = b.dataset.valor; renderPautaDetalhe(); return; }
      if (act === "sel-tema") { pauta.sel = id; pauta.detGrupo = ""; renderPautaTemas(); renderPautaDetalhe(); return; }
      if (act === "confirmar" || act === "descartar" || act === "desfazer") {
        e.stopPropagation();
        salvarPautaEstado(function (est) { if (act === "desfazer") delete est.temas[id]; else est.temas[id] = act === "confirmar" ? "confirmado" : "descartado"; });
        renderPautaTemas();
        renderPautaDetalhe();
        return;
      }
      var t = pauta.atual && pauta.atual.temas.filter(function (x) { return x.id === id; })[0];
      if (act === "criar" && t) { criarNoticiaDoTema(t); return; }
      var m = materiaPorId(id);
      if (act === "usar" && m) { usarComoFonte(m, false); return; }
      if (act === "criar-materia" && m) { criarNoticiaDaMateria(m); return; }
    });
    view.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".pauta-tema")) { e.preventDefault(); e.target.click(); }
    });
    var timer = null;
    view.addEventListener("input", function (e) {
      if (e.target.dataset.pautaCampo !== "q") return;
      pauta.filtros.q = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(function () { renderPautaTemas(); renderPautaDetalhe(); }, 150);
    });
    view.addEventListener("change", function (e) {
      var c = e.target.dataset.pautaCampo;
      if (c === "arquivo") { pauta.sel = null; carregarPauta(e.target.value); return; }
      if (c === "editoria" || c === "veiculo") { pauta.filtros[c] = e.target.value; renderPauta(); }
    });
    document.getElementById("pautaImport").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          pauta.sel = null;
          aplicarPauta(JSON.parse(r.result), file.name);
          pauta.msg = "Pauta importada de " + file.name + ".";
          renderPauta();
        } catch (err) {
          uiAlert("Este arquivo não é uma pauta do Boletim Maker (" + (err.message || "formato") + ").");
        }
      };
      r.readAsText(file);
    });
  }

  /* ---------------------------------------------------------------------
     Revisão — observações do professor (ou de quem revisa), visíveis só no
     editor: nunca entram na página impressa nem no PDF.
     Cada observação é um registro próprio, fora da edição (store.notas[id];
     online, o documento notas/<id>): o revisor comenta enquanto o autor
     escreve, sem um sobrescrever o outro.
       { id, edicaoId, alvo: data-path | "block:<id>" | "edicao", trecho,
         texto, autorId, papel: "autor"|"revisor", criadoEm,
         status: "aberta"|"resolvida", respostas: [{ autorId, papel, texto, em }] }
     Online, quem não é o dono do boletim entra no modo revisão: vê tudo e só
     comenta. As regras do banco (editions e app só o dono grava) garantem
     isso também no servidor. Nomes vêm do recurso "user" (guardamos só ids).
     --------------------------------------------------------------------- */
  var REVIEWER = false;
  var viewer = { id: "local", papel: "autor" };
  var userCap = null;
  var nomes = {};
  var notaFiltro = "abertas";
  var notaDraft = null;      // { alvo, trecho, texto } da observação sendo escrita
  var notaFoco = null;       // alvo destacado ao clicar num marcador
  var NOTA_MAX = 2000;

  function notasDaEdicao(edId) {
    var all = store.notas || {}, id = edId || store.currentId;
    return Object.keys(all).map(function (k) { return all[k]; })
      .filter(function (n) { return n && n.edicaoId === id; })
      .sort(function (a, b) { return (a.criadoEm || 0) - (b.criadoEm || 0); });
  }
  function notasAbertas() { return notasDaEdicao().filter(function (n) { return n.status !== "resolvida"; }); }

  function alvoLabel(alvo) {
    if (!alvo || alvo === "edicao") return "Edição inteira";
    if (/^block:/.test(alvo)) return blockLabel(alvo.slice(6));
    return fieldLabel(alvo);
  }
  function notaTargetEl(alvo) {
    if (!alvo || alvo === "edicao") return null;
    if (/^block:/.test(alvo)) return layerElement("block", alvo.slice(6));
    return document.querySelector('#workspace [data-path="' + alvo + '"]');
  }
  function autorNome(id, papel) {
    if (id === viewer.id) return "Você";
    return nomes[id] || (papel === "revisor" ? "Revisor" : "Autor");
  }
  function quando(ms) { var d = new Date(ms || 0); return ddmmaaaa(d) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
  function newNotaId() { return "nota_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6); }

  // Grava local e, online, no documento notas/<id>. remover=true apaga.
  function saveNota(n, remover) {
    store.notas = store.notas || {};
    if (cloud.mode !== "online" && !remover) n._pendente = true;
    if (remover) delete store.notas[n.id]; else store.notas[n.id] = n;
    saveLocal();
    invalidateChecks();
    if (cloud.mode === "online" && cloud.db) {
      var ref = cloud.db.doc("notas/" + n.id);
      (remover ? ref.delete() : ref.set(n)).catch(function (e) {
        uiAlert("A observação não foi salva online" + (e && e.code === "invalid_argument" ? ": seu acesso a este boletim não permite comentar. Peça ao autor acesso de Editor." : ". Tente de novo."));
      });
    }
    renderNotas();
    updateCheckBadge();
  }

  function resolveNomes() {
    if (IN_FIREBASE) {
      Object.keys(store.notas || {}).forEach(function (k) {
        var n = store.notas[k];
        if (n.autorNome) nomes[n.autorId] = n.autorNome;
        (n.respostas || []).forEach(function (r) { if (r.autorNome) nomes[r.autorId] = r.autorNome; });
      });
      return;
    }
    if (!userCap || !userCap.profiles) return;
    var ids = {};
    Object.keys(store.notas || {}).forEach(function (k) {
      var n = store.notas[k];
      if (n.autorId) ids[n.autorId] = 1;
      (n.respostas || []).forEach(function (r) { if (r.autorId) ids[r.autorId] = 1; });
    });
    delete ids[viewer.id];
    var lista = Object.keys(ids).filter(function (id) { return !(id in nomes); });
    if (!lista.length) return;
    userCap.profiles(lista).then(function (ps) {
      lista.forEach(function (id) { nomes[id] = (ps && ps[id] && ps[id].name) || ""; });
      renderNotas();
    }).catch(function () {});
  }

  function startNota(alvo, trecho) {
    notaDraft = { alvo: alvo || "edicao", trecho: String(trecho || "").replace(/\s+/g, " ").trim().slice(0, 300), texto: "" };
    notaFiltro = "abertas";
    showLeftTab("revisao");
    renderNotas(true);
    var ta = document.getElementById("notaTexto");
    if (ta) ta.focus();
  }

  function notaCard(n) {
    var podeExcluir = !REVIEWER || n.autorId === viewer.id;
    var aberta = n.status !== "resolvida";
    return '<div class="nota-card' + (aberta ? "" : " is-resolved") + (notaFoco && n.alvo === notaFoco ? " is-focus" : "") + '" data-nota-id="' + esc(n.id) + '">' +
      '<div class="nota-head"><button type="button" class="nota-alvo-link" data-nota-action="ir" title="Mostrar na página">' + esc(alvoLabel(n.alvo)) + "</button>" +
      (aberta ? '<span class="chip chip-incompleta">Aberta</span>' : '<span class="chip chip-aprovado">Resolvida</span>') + "</div>" +
      (n.trecho ? '<blockquote class="nota-trecho">' + esc(n.trecho) + "</blockquote>" : "") +
      '<div class="nota-texto">' + esc(n.texto) + "</div>" +
      '<div class="nota-meta">' + esc(autorNome(n.autorId, n.papel)) + (n.papel === "revisor" && nomes[n.autorId] && n.autorId !== viewer.id ? " · revisor" : "") + " · " + esc(quando(n.criadoEm)) + "</div>" +
      (n.respostas || []).map(function (r) {
        return '<div class="nota-resposta"><div class="nota-texto">' + esc(r.texto) + '</div><div class="nota-meta">' + esc(autorNome(r.autorId, r.papel)) + (r.papel === "revisor" && nomes[r.autorId] && r.autorId !== viewer.id ? " · revisor" : "") + " · " + esc(quando(r.em)) + "</div></div>";
      }).join("") +
      '<div class="nota-reply" hidden><textarea rows="2" maxlength="' + NOTA_MAX + '" placeholder="Responder…"></textarea>' +
      '<div class="nota-reply-actions"><button type="button" class="prop-btn" data-nota-action="cancelar-resposta">Cancelar</button><button type="button" class="prop-btn primary-btn" data-nota-action="enviar-resposta">Responder</button></div></div>' +
      '<div class="nota-actions">' +
      '<button type="button" data-nota-action="responder">Responder</button>' +
      '<button type="button" data-nota-action="status">' + (aberta ? "Marcar como resolvida" : "Reabrir") + "</button>" +
      (podeExcluir ? '<button type="button" class="danger" data-nota-action="excluir">Excluir</button>' : "") +
      "</div></div>";
  }

  // force=true: redesenha a lista mesmo com alguém digitando nela.
  function renderNotas(force) {
    var abertas = notasAbertas();
    var cnt = document.getElementById("notasCount");
    if (cnt) cnt.textContent = abertas.length ? String(abertas.length) : "";
    renderNotaPins(abertas);
    var box = document.getElementById("notasList");
    if (!box || !current()) return;
    var a = document.activeElement;
    if (!force && a && a.tagName === "TEXTAREA" && box.contains(a)) return;
    var todas = notasDaEdicao();
    var lista = notaFiltro === "resolvidas" ? todas.filter(function (n) { return n.status === "resolvida"; })
      : notaFiltro === "todas" ? todas : abertas;
    var html = segButtons([["abertas", "Abertas"], ["resolvidas", "Resolvidas"], ["todas", "Todas"]],
      function (it) { return 'data-nota-action="filtro" data-value="' + it[0] + '"'; },
      function (it) { return it[0] === notaFiltro; });
    if (notaDraft) {
      html += '<div class="nota-composer"><div class="nota-alvo">Sobre: <strong>' + esc(alvoLabel(notaDraft.alvo)) + "</strong></div>" +
        (notaDraft.trecho ? '<blockquote class="nota-trecho">' + esc(notaDraft.trecho) + "</blockquote>" : "") +
        '<textarea id="notaTexto" rows="4" maxlength="' + NOTA_MAX + '" placeholder="Escreva a observação: o que corrigir, detalhar ou conferir.">' + esc(notaDraft.texto || "") + "</textarea>" +
        '<div class="nota-reply-actions"><button type="button" class="prop-btn" data-nota-action="cancelar">Cancelar</button>' +
        '<button type="button" class="prop-btn primary-btn" data-nota-action="salvar">Salvar observação</button></div></div>';
    }
    html += lista.length ? lista.map(notaCard).join("")
      : '<p class="sources-empty">' + (notaFiltro === "resolvidas" ? "Nenhuma observação resolvida." : "Nenhuma observação em aberto nesta edição.") + "</p>";
    box.innerHTML = html;
    if (notaFoco) {
      var f = box.querySelector(".nota-card.is-focus");
      if (f) f.scrollIntoView({ block: "nearest" });
    }
  }

  // Marcador numerado (só na tela) na margem direita da folha, na altura do
  // campo ou bloco comentado (na margem não cobre texto).
  function renderNotaPins(abertas) {
    document.querySelectorAll("#workspace .nota-pin").forEach(function (p) { p.remove(); });
    if (!current()) return;
    var grupos = {};
    (abertas || notasAbertas()).forEach(function (n) { if (n.alvo && n.alvo !== "edicao") (grupos[n.alvo] = grupos[n.alvo] || []).push(n); });
    var ocupados = [];
    Object.keys(grupos).forEach(function (alvo) {
      var el = notaTargetEl(alvo);
      var page = el && el.closest(".page");
      if (!page) return;
      var pr = page.getBoundingClientRect(), er = el.getBoundingClientRect();
      if (!er.width && !er.height) return;
      var z = pr.width / page.offsetWidth || 1;
      var top = Math.max(0, (er.top - pr.top) / z);
      while (ocupados.some(function (o) { return o.page === page && Math.abs(o.top - top) < 24; })) top += 24;
      ocupados.push({ page: page, top: top });
      var pin = document.createElement("button");
      pin.type = "button";
      pin.className = "nota-pin no-print";
      pin.dataset.notaAlvo = alvo;
      pin.textContent = String(grupos[alvo].length);
      pin.title = grupos[alvo].map(function (n) { return "• " + n.texto.slice(0, 80); }).join("\n");
      pin.style.left = (page.offsetWidth - 34) + "px";
      pin.style.top = top + "px";
      page.appendChild(pin);
    });
  }

  function handleNotaAction(btn) {
    var act = btn.dataset.notaAction;
    var card = btn.closest(".nota-card");
    var n = card ? (store.notas || {})[card.dataset.notaId] : null;
    if (act === "filtro") { notaFiltro = btn.dataset.value; notaFoco = null; renderNotas(true); return; }
    if (act === "cancelar") { notaDraft = null; renderNotas(true); return; }
    if (act === "salvar") {
      var texto = (document.getElementById("notaTexto").value || "").trim();
      if (!texto) { document.getElementById("notaTexto").focus(); return; }
      var nova = { id: newNotaId(), edicaoId: store.currentId, alvo: notaDraft.alvo, trecho: notaDraft.trecho || "", texto: texto.slice(0, NOTA_MAX),
        autorId: viewer.id, papel: viewer.papel, criadoEm: Date.now(), status: "aberta", respostas: [] };
      if (IN_FIREBASE && viewer.nome) nova.autorNome = viewer.nome; // banco próprio: guarda o nome (no Artifact, só o id)
      notaDraft = null;
      saveNota(nova);
      uiToast("Observação salva" + (cloud.mode === "online" ? " — o autor vê no editor." : "."));
      return;
    }
    if (!n) return;
    if (act === "ir") {
      notaFoco = n.alvo;
      var el = notaTargetEl(n.alvo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("check-flash");
        setTimeout(function () { el.classList.remove("check-flash"); }, 1700);
      }
      renderNotas(true);
      return;
    }
    if (act === "responder") {
      var rep = card.querySelector(".nota-reply");
      rep.hidden = false;
      rep.querySelector("textarea").focus();
      return;
    }
    if (act === "cancelar-resposta") { card.querySelector(".nota-reply").hidden = true; return; }
    if (act === "enviar-resposta") {
      var t = card.querySelector(".nota-reply textarea").value.trim();
      if (!t) return;
      var c1 = JSON.parse(JSON.stringify(n));
      c1.respostas = (c1.respostas || []).concat([{ autorId: viewer.id, papel: viewer.papel, texto: t.slice(0, NOTA_MAX), em: Date.now() }]);
      if (IN_FIREBASE && viewer.nome) c1.respostas[c1.respostas.length - 1].autorNome = viewer.nome;
      saveNota(c1);
      return;
    }
    if (act === "status") {
      var c2 = JSON.parse(JSON.stringify(n));
      c2.status = c2.status === "resolvida" ? "aberta" : "resolvida";
      c2.resolvidaEm = c2.status === "resolvida" ? Date.now() : null;
      saveNota(c2);
      uiToast(c2.status === "resolvida" ? "Observação resolvida." : "Observação reaberta.");
      return;
    }
    if (act === "excluir") {
      uiConfirm("Excluir esta observação e as respostas? Não dá para desfazer.", "Excluir").then(function (yes) { if (yes) saveNota(n, true); });
    }
  }

  function initNotas() {
    var pane = document.getElementById("tabRevisao");
    if (pane) {
      pane.addEventListener("click", function (e) {
        var b = e.target.closest("[data-nota-action]");
        if (b) handleNotaAction(b);
      });
      pane.addEventListener("input", function (e) { if (e.target.id === "notaTexto" && notaDraft) notaDraft.texto = e.target.value; });
    }
    var geral = document.getElementById("btnNotaGeral");
    if (geral) geral.addEventListener("click", function () { startNota("edicao", ""); });
    var ws = document.getElementById("workspace");
    if (ws) ws.addEventListener("click", function (e) {
      var pin = e.target.closest(".nota-pin");
      if (!pin) return;
      e.stopPropagation();
      notaFoco = pin.dataset.notaAlvo;
      notaFiltro = "abertas";
      showLeftTab("revisao");
      renderNotas(true);
    }, true);
    window.addEventListener("resize", function () { renderNotaPins(); });
  }

  // Modo revisão: a página fica só para leitura (o texto não é salvo de
  // qualquer forma: as regras do banco recusam), e sobra comentar.
  function lockForReview() {
    if (!REVIEWER) return;
    document.querySelectorAll("#workspace [contenteditable]").forEach(function (el) { el.setAttribute("contenteditable", "false"); });
    document.querySelectorAll("#varsBar input, #varsBar select, #varsBar button").forEach(function (el) { el.disabled = true; });
  }

  function renderReviewerInspector() {
    var alvo = selection && selection.kind === "block" ? (selection.fieldPath || "block:" + selection.blockId) : "edicao";
    var nAqui = notasAbertas().filter(function (n) { return n.alvo === alvo || (selection && selection.kind === "block" && n.alvo === "block:" + selection.blockId); }).length;
    return propHead("Modo revisão", selection && selection.kind === "block" ? alvoLabel(alvo) : "Edição inteira") +
      '<div class="prop-section"><p class="prop-note" style="margin-top:0">Você está revisando: pode ler tudo e deixar observações. Elas aparecem só no editor do autor, nunca no PDF.</p>' +
      '<button type="button" class="prop-btn primary-btn" style="width:100% !important;justify-content:center" data-action="add-nota" data-alvo="' + esc(alvo) + '">' + icon("note") + "Nova observação aqui</button>" +
      (nAqui ? '<p class="prop-note">' + nAqui + " observação(ões) em aberto neste item.</p>" : "") +
      '<p class="prop-note">Dica: selecione um trecho do texto e use ' + icon("note") + " na barrinha para comentar exatamente aquele trecho.</p></div>";
  }

  /* ---------------------------------------------------------------------
     Calculadora do termômetro — a mesma conta da planilha
     Controle-de-cotacoes.xlsx: para cada ativo, o fechamento e três bases
     (abertura do dia, da semana e do ano). Preço: variação % =
     fechamento ÷ base − 1. Taxa (% a.a.): diferença em bps =
     (fechamento − base) × 100, como o boletim mostra DI, Selic e T-Bond.
     As entradas ficam em row.calc = { tipo, fech, abDia, abSem, abAno }
     (texto como digitado) e "Aplicar" preenche o termômetro e os cards de
     cotação da página 1 que forem do mesmo ativo.
     --------------------------------------------------------------------- */
  var CALC_CAMPOS = ["fech", "abDia", "abSem", "abAno"];

  // Número no formato brasileiro ou do Excel: "205.430,33", "205430.33",
  // "R$ 4,98", "4.741" (milhar), "13,75%". Vazio ou "---" -> null.
  function parseNumBR(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    var t = String(v == null ? "" : v).replace(/[^\d,.\-−]/g, "").replace("−", "-");
    if (!/\d/.test(t)) return null;
    var lastC = t.lastIndexOf(","), lastP = t.lastIndexOf(".");
    if (lastC !== -1 && lastP !== -1) {
      t = lastC > lastP ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
    } else if (lastC !== -1) {
      t = t.replace(/\./g, "").replace(",", ".");
    } else if (lastP !== -1 && (t.split(".").length > 2 || /^-?\d{1,3}\.\d{3}$/.test(t))) {
      t = t.replace(/\./g, "");
    }
    var n = parseFloat(t);
    return isNaN(n) ? null : n;
  }
  function fmtNumBR(n, dec) {
    var s = Math.abs(n).toFixed(dec).split(".");
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (n < 0 ? "-" : "") + s.join(",");
  }
  function fmtVarPct(r) {
    var v = Math.round(r * 10000) / 100;
    return (v > 0 ? "+" : "") + fmtNumBR(v, 2) + "%";
  }
  function fmtBps(d) {
    var b = Math.round(d * 100);
    return (b > 0 ? "+" : "") + b + " bps";
  }
  // Casas decimais do texto atual ("4,9802" -> 4; "190.745" -> 0).
  function decimaisDe(text, padrao) {
    var t = plainText(text).replace(/[^\d,.]/g, "");
    if (!/\d/.test(t)) return padrao;
    var m = /,(\d+)$/.exec(t);
    return m ? m[1].length : 0;
  }
  function tipoPadrao(ativo) { return /\(%\)|selic|\bdi\b|t-?bond|juros|taxa/i.test(plainText(ativo)) ? "taxa" : "preco"; }
  function calcVar(tipo, fech, base) {
    if (fech == null || base == null || (tipo !== "taxa" && !base)) return null;
    return tipo === "taxa" ? fmtBps(fech - base) : fmtVarPct(fech / base - 1);
  }

  // "Ibovespa (pts)" -> {base:"ibovespa", dentro:"pts"}; "DÓLAR (USD/BRL)" -> {base:"dolar", dentro:"usd/brl"}
  function chaveAtivo(label) {
    var t = semAcento(plainText(label)).replace(/\s+/g, " ").trim();
    var m = /^(.*?)\s*\((.*)\)\s*$/.exec(t);
    return { base: (m ? m[1] : t).trim(), dentro: m ? m[2].trim() : "" };
  }
  function mesmoAtivo(a, b) {
    var x = chaveAtivo(a), y = chaveAtivo(b);
    if (!x.base || !y.base) return false;
    return x.base === y.base || (!!x.dentro && x.dentro === y.base) || (!!y.dentro && y.dentro === x.base);
  }

  var calcRows = []; // cópia de trabalho enquanto a janela está aberta

  function openThermoCalc() {
    var s = state();
    calcRows = [];
    (s.thermometer.groups || []).forEach(function (g, gi) {
      (g.rows || []).forEach(function (r, ri) {
        var c = r.calc || {};
        calcRows.push({
          gi: gi, ri: ri, grupo: plainText(g.name), ativo: plainText(r.ativo),
          tipo: c.tipo || tipoPadrao(r.ativo),
          // Sem cálculo anterior, parte do fechamento já digitado no termômetro.
          fech: r.calc ? (c.fech || "") : plainText(r.fechamento).replace(/[^\d,.\-]/g, ""),
          abDia: c.abDia || "", abSem: c.abSem || "", abAno: c.abAno || "",
          fonte: plainText(r.fonte)
        });
      });
    });
    var dt = document.getElementById("calcDate");
    dt.value = s.thermometer.calcData || (s.meta.vars && s.meta.vars.coberturaFim) || "";
    document.getElementById("calcMsg").textContent = "";
    document.getElementById("calcPaste").hidden = true;
    renderCalcTable();
    document.getElementById("calcDialog").hidden = false;
  }

  function calcResultados(r) {
    var f = parseNumBR(r.fech);
    return {
      dia: calcVar(r.tipo, f, parseNumBR(r.abDia)),
      sem: calcVar(r.tipo, f, parseNumBR(r.abSem)),
      ano: calcVar(r.tipo, f, parseNumBR(r.abAno))
    };
  }
  function calcCell(v) {
    return '<td class="calc-out ' + (v ? signClass(v) : "") + '">' + esc(v || "—") + "</td>";
  }

  function renderCalcTable() {
    var tb = document.getElementById("calcTable");
    var html = "<thead><tr><th>Ativo</th><th>Tipo</th><th>Fechamento</th><th>Abertura dia</th><th>Abertura semana</th><th>Base do ano</th>" +
      "<th>Var. dia</th><th>Var. semana</th><th>Var. ano</th></tr></thead><tbody>";
    var grupo = null;
    calcRows.forEach(function (r, k) {
      if (r.grupo !== grupo) { grupo = r.grupo; html += '<tr class="calc-group"><td colspan="9">' + esc(grupo || "Grupo") + "</td></tr>"; }
      var res = calcResultados(r);
      html += '<tr data-calc-row="' + k + '"><td class="calc-ativo">' + esc(r.ativo || "Ativo") + "</td>" +
        '<td><select data-calc-field="tipo" data-calc-k="' + k + '" aria-label="Tipo"><option value="preco"' + (r.tipo !== "taxa" ? " selected" : "") + '>Preço (%)</option><option value="taxa"' + (r.tipo === "taxa" ? " selected" : "") + ">Taxa (bps)</option></select></td>" +
        CALC_CAMPOS.map(function (f) {
          return '<td><input type="text" inputmode="decimal" data-calc-field="' + f + '" data-calc-k="' + k + '" value="' + esc(r[f] || "") + '" aria-label="' + f + '"></td>';
        }).join("") + calcCell(res.dia) + calcCell(res.sem) + calcCell(res.ano) + "</tr>";
    });
    tb.innerHTML = html + "</tbody>";
  }

  function updateCalcRowOut(k) {
    var tr = document.querySelector('#calcTable tr[data-calc-row="' + k + '"]');
    if (!tr) return;
    var res = calcResultados(calcRows[k]);
    var outs = tr.querySelectorAll(".calc-out");
    [res.dia, res.sem, res.ano].forEach(function (v, i) {
      outs[i].textContent = v || "—";
      outs[i].className = "calc-out " + (v ? signClass(v) : "");
    });
  }

  // Linhas da planilha -> calculadora, pelo nome do ativo. Colunas como em
  // Controle-de-cotacoes.xlsx: A ativo, B fechamento, C abertura dia,
  // E abertura semana, G base do ano, I fonte (D/F/H são as variações).
  function fillCalcFromSheet(linhas) {
    var ok = 0, sobra = [];
    linhas.forEach(function (l) {
      var nome = String(l[0] || "").trim();
      if (!nome || parseNumBR(l[1]) == null && parseNumBR(l[6]) == null) return;
      var alvo = calcRows.filter(function (r) { return mesmoAtivo(r.ativo, nome); })[0];
      if (!alvo) { sobra.push(nome); return; }
      var num = function (v) { var n = parseNumBR(v); return n == null ? "" : fmtNumBR(n, Math.min(6, (String(n).split(".")[1] || "").length)); };
      alvo.fech = num(l[1]); alvo.abDia = num(l[2]); alvo.abSem = num(l[4]); alvo.abAno = num(l[6]);
      var cod = String(l[8] || "").match(/F\d+/g);
      if (cod) alvo.fonteNova = cod.join("; ");
      ok++;
    });
    renderCalcTable();
    document.getElementById("calcMsg").textContent = ok + " ativo(s) preenchido(s) pela planilha." +
      (sobra.length ? " Sem correspondência no termômetro: " + sobra.join(", ") + "." : "");
  }

  // Leitor mínimo de .xlsx (ZIP + XML), sem biblioteca: lê a primeira aba.
  async function readXlsxRows(file) {
    var buf = new Uint8Array(await file.arrayBuffer());
    var dv = new DataView(buf.buffer);
    var eocd = -1;
    for (var i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error("não é um arquivo .xlsx");
    var n = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true), entries = {};
    for (var e = 0; e < n; e++) {
      var nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), comLen = dv.getUint16(p + 32, true);
      var name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
      entries[name] = { method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true) };
      p += 46 + nameLen + extraLen + comLen;
    }
    async function text(name) {
      var en = entries[name];
      if (!en) return null;
      var start = en.off + 30 + dv.getUint16(en.off + 26, true) + dv.getUint16(en.off + 28, true);
      var data = buf.subarray(start, start + en.size);
      if (en.method === 0) return new TextDecoder().decode(data);
      var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    }
    var xml = function (t) { return new DOMParser().parseFromString(t, "application/xml"); };
    var wb = xml(await text("xl/workbook.xml"));
    var rels = xml(await text("xl/_rels/workbook.xml.rels"));
    var rid = wb.getElementsByTagName("sheet")[0].getAttribute("r:id");
    var target = Array.prototype.filter.call(rels.getElementsByTagName("Relationship"), function (r) { return r.getAttribute("Id") === rid; })[0].getAttribute("Target");
    var sheetPath = target.charAt(0) === "/" ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
    var ssText = await text("xl/sharedStrings.xml");
    var shared = ssText ? Array.prototype.map.call(xml(ssText).getElementsByTagName("si"), function (si) {
      return Array.prototype.map.call(si.getElementsByTagName("t"), function (t) { return t.textContent; }).join("");
    }) : [];
    var sheet = xml(await text(sheetPath));
    return Array.prototype.map.call(sheet.getElementsByTagName("row"), function (row) {
      var out = [];
      Array.prototype.forEach.call(row.getElementsByTagName("c"), function (c) {
        var col = (c.getAttribute("r") || "A").replace(/\d+/g, "");
        var idx = 0;
        for (var j = 0; j < col.length; j++) idx = idx * 26 + (col.charCodeAt(j) - 64);
        var v = c.getElementsByTagName("v")[0], t = c.getAttribute("t");
        var val = t === "inlineStr" ? c.textContent : v ? v.textContent : "";
        if (t === "s") val = shared[parseInt(val, 10)] || "";
        else if (t !== "str" && t !== "inlineStr" && val !== "" && !isNaN(+val)) val = +val;
        out[idx - 1] = val;
      });
      return out;
    });
  }

  function applyThermoCalc() {
    var s = state();
    pushHistory();
    var data = document.getElementById("calcDate").value;
    var atualizarCards = document.getElementById("calcTicker").checked;
    var feitos = 0, cards = 0;
    calcRows.forEach(function (c) {
      var row = s.thermometer.groups[c.gi] && s.thermometer.groups[c.gi].rows[c.ri];
      if (!row) return;
      row.calc = { tipo: c.tipo, fech: c.fech || "", abDia: c.abDia || "", abSem: c.abSem || "", abAno: c.abAno || "" };
      var f = parseNumBR(c.fech);
      if (f == null) return;
      var res = calcResultados(c);
      row.fechamento = fmtNumBR(f, decimaisDe(row.fechamento, 2));
      row.varDia = res.dia || "—";
      row.varSemana = res.sem || "—";
      row.var2026 = res.ano || "—";
      if (c.fonteNova && !plainText(row.fonte)) row.fonte = c.fonteNova;
      feitos++;
      if (!atualizarCards) return;
      (s.ticker || []).forEach(function (t) {
        if (!mesmoAtivo(t.label, c.ativo)) return;
        var cur = plainText(t.value);
        var pref = (/^\s*(R\$|US\$|€)\s*/.exec(cur) || [""])[0];
        t.value = pref + fmtNumBR(f, decimaisDe(t.value, 2));
        var per = t.periodo || "semana";
        var v = per === "dia" ? res.dia : per === "ano" ? res.ano : per === "semana" ? res.sem : null;
        if (v) t.change = v;
        if (data) t.refData = data;
        cards++;
      });
    });
    if (data) s.thermometer.calcData = data;
    document.getElementById("calcDialog").hidden = true;
    scheduleSave();
    render();
    uiToast("Termômetro atualizado: " + feitos + " ativo(s)" + (cards ? " e " + cards + " card(s) da página 1." : "."));
  }

  function initThermoCalc() {
    var dlg = document.getElementById("calcDialog");
    if (!dlg) return;
    dlg.addEventListener("input", function (e) {
      var t = e.target;
      if (!t.dataset || !t.dataset.calcField) return;
      var k = +t.dataset.calcK;
      calcRows[k][t.dataset.calcField] = t.value;
      updateCalcRowOut(k);
    });
    dlg.addEventListener("change", function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.calcField === "tipo") { calcRows[+t.dataset.calcK].tipo = t.value; updateCalcRowOut(+t.dataset.calcK); }
    });
    dlg.addEventListener("keydown", function (e) { if (e.key === "Escape") dlg.hidden = true; });
    document.getElementById("calcClose").addEventListener("click", function () { dlg.hidden = true; });
    document.getElementById("calcApply").addEventListener("click", applyThermoCalc);
    document.getElementById("calcPasteBtn").addEventListener("click", function () {
      var box = document.getElementById("calcPaste");
      box.hidden = !box.hidden;
      if (!box.hidden) document.getElementById("calcPasteText").focus();
    });
    document.getElementById("calcPasteApply").addEventListener("click", function () {
      var txt = document.getElementById("calcPasteText").value;
      fillCalcFromSheet(txt.split(/\r?\n/).map(function (l) { return l.split("\t"); }));
      document.getElementById("calcPaste").hidden = true;
      document.getElementById("calcPasteText").value = "";
    });
    document.getElementById("calcXlsx").addEventListener("change", async function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try { fillCalcFromSheet(await readXlsxRows(file)); }
      catch (err) { document.getElementById("calcMsg").textContent = "Não foi possível ler a planilha (" + (err && err.message || "formato") + "). Tente \"Colar do Excel\"."; }
    });
  }

  /* ---------------------------------------------------------------------
     Fontes da edição (Fase 5) — aba no painel esquerdo + edição à direita
     --------------------------------------------------------------------- */
  function newsUsingSource(s, id) {
    var out = [];
    s.columns.forEach(function (c, i) { if (c.sourceId === id) out.push(i); });
    return out;
  }

  function renderSourceInspector(id) {
    var s = state();
    var src = sourceById(s, id);
    if (!src) return "";
    var n = sourceNumber(s, id);
    var a = 'data-source-id="' + esc(id) + '"';
    var falta = sourceMissing(src);
    var html = propHead("Fontes da edição", "[" + n + "] " + (plainText(src.veiculo) || "Nova fonte"));
    html += '<div class="prop-section"><div class="prop-label">Referência</div>' +
      '<div class="prop-field"><label>Veículo</label><input type="text" ' + a + ' data-source-field="veiculo" value="' + esc(src.veiculo || "") + '" placeholder="Ex.: InfoMoney"></div>' +
      '<div class="prop-field"><label>Título da matéria</label><input type="text" ' + a + ' data-source-field="titulo" value="' + esc(src.titulo || "") + '" placeholder="Ex.: IPCA fica em 0,82% em setembro"></div>' +
      '<div class="prop-field"><label>Link</label><input type="url" ' + a + ' data-source-field="url" value="' + esc(src.url || "") + '" placeholder="https://…"></div>' +
      '<div class="prop-grid"><div class="prop-field"><label>Publicada em</label><input type="date" ' + a + ' data-source-field="publicadoEm" value="' + esc(src.publicadoEm || "") + '"></div>' +
      '<div class="prop-field"><label>Acesso em</label><input type="date" ' + a + ' data-source-field="acessoEm" value="' + esc(src.acessoEm || "") + '"></div></div>' +
      '<button type="button" class="prop-btn" style="margin-top:10px" data-action="source-access-today" ' + a + ">" + icon("calendar") + "Acesso em: hoje</button>" +
      '<div style="margin-top:12px">' + (falta.length ? '<span class="chip chip-incompleta">Incompleta: falta ' + esc(falta.join(", ")) + "</span>" : '<span class="chip chip-aprovado">Completa · link ok</span>') + "</div></div>";
    var usos = newsUsingSource(s, id);
    html += '<div class="prop-section"><div class="prop-label">Usada em</div>' +
      (usos.length ? usos.map(function (i) {
        return '<button type="button" class="prop-btn left" data-action="goto-news" data-index="' + i + '">' + icon("news") + "Notícia " + (i + 1) + (plainText(s.columns[i].title) ? " · " + esc(plainText(s.columns[i].title).slice(0, 34)) : "") + "</button>";
      }).join("") : '<p class="prop-note">Nenhuma notícia usa esta fonte. Vincule pelo painel da notícia ("Fonte vinculada").</p>') + "</div>";
    html += '<div class="prop-section">' +
      (safeHref(src.url) ? '<a class="prop-btn" href="' + esc(safeHref(src.url)) + '" target="_blank" rel="noopener">' + icon("link") + "Abrir o link</a>" : "") +
      '<button type="button" class="prop-btn danger" data-action="remove-source" ' + a + ">" + icon("trash") + "Remover fonte</button></div>";
    return html;
  }

  var LEFT_TABS = { estrutura: "Estrutura", fontes: "Fontes", revisao: "Revisao" };
  function showLeftTab(tab) {
    Object.keys(LEFT_TABS).forEach(function (t) {
      var btn = document.getElementById("tabBtn" + LEFT_TABS[t]);
      var pane = document.getElementById("tab" + LEFT_TABS[t]);
      if (!btn || !pane) return;
      btn.classList.toggle("is-active", t === tab);
      btn.setAttribute("aria-selected", t === tab ? "true" : "false");
      pane.hidden = t !== tab;
    });
  }

  function renderSourcesTab() {
    renderCanaisSection();
    var list = document.getElementById("sourcesList");
    if (!list || !current()) return;
    var s = state();
    var sources = s.sources || [];
    var count = document.getElementById("sourcesCount");
    if (count) count.textContent = sources.length ? String(sources.length) : "";
    var title = document.getElementById("sourcesTitle");
    if (title) title.textContent = "Fontes da edição" + (s.meta.vars && s.meta.vars.edicao ? " " + s.meta.vars.edicao : "");
    var fmt = document.getElementById("refFormat");
    if (fmt && document.activeElement !== fmt) fmt.value = s.meta.refFormat === "abnt" ? "abnt" : "simples";
    if (!sources.length) {
      list.innerHTML = '<p class="sources-empty">Nenhuma fonte ainda. Adicione as matérias citadas: cada notícia mostra o selo "[n] Veículo · data" e o rodapé do verso lista todas.</p>';
      return;
    }
    list.innerHTML = sources.map(function (src, i) {
      var falta = sourceMissing(src);
      var usos = newsUsingSource(s, src.id).map(function (k) { return "Notícia " + (k + 1); });
      var pub = parseIsoDate(src.publicadoEm), ac = parseIsoDate(src.acessoEm);
      var meta = [hostOf(src.url), pub ? "publicada em " + ddmmaaaa(pub) : "", ac ? "acesso em " + ddmmaaaa(ac) : ""].filter(Boolean).join(" · ");
      var active = selection && selection.kind === "source" && selection.sourceId === src.id;
      return '<button type="button" class="source-item' + (falta.length ? " is-incomplete" : "") + (active ? " is-active" : "") + '" data-action="select-source" data-source-id="' + esc(src.id) + '">' +
        '<span class="source-num">' + (i + 1) + "</span>" +
        '<span class="source-main"><span class="source-name">' + esc(plainText(src.veiculo) || "[Veículo]") + " · " + esc(plainText(src.titulo) || "[Título da matéria]") + "</span><br>" +
        '<span class="source-meta">' + esc(meta || "sem link nem datas") + "</span><br>" +
        '<span class="source-meta">' + (usos.length ? "Usada em: " + usos.join(", ") : "Ainda não usada") + "</span><br>" +
        (falta.length ? '<span class="chip chip-incompleta">Incompleta</span>' : '<span class="chip chip-aprovado">Link ok</span>') +
        "</span></button>";
    }).join("");
  }

  function createSource(s, fromNewsIndex) {
    var src = { id: newSourceId(), veiculo: "", titulo: "", url: "", publicadoEm: "", acessoEm: "" };
    if (fromNewsIndex != null && s.columns[fromNewsIndex]) {
      var c = s.columns[fromNewsIndex];
      var tmp = document.createElement("div");
      tmp.innerHTML = richHtml(c.linkText);
      var a = tmp.querySelector("a[href]");
      if (a) { src.url = a.getAttribute("href"); src.veiculo = inferVeiculo(hostOf(src.url)); }
      src.titulo = plainText(c.title);
      c.sourceId = src.id;
    }
    s.sources = s.sources || [];
    s.sources.push(src);
    return src;
  }

  /* ---------------------------------------------------------------------
     Canais de referência — veículos que o boletim costuma citar. Lista do
     usuário (não da edição): fica em store.canais, sincroniza em
     app/settings e vale para todas as edições. Usada para reconhecer o
     veículo pelo link e conferir rótulos; será a base de busca da Pauta.
     Canal: { id, nome, dominio, grupo: "oficial"|"br"|"intl", validado }
     --------------------------------------------------------------------- */
  var CANAL_GRUPOS = [["oficial", "Fontes oficiais"], ["br", "Imprensa econômica BR"], ["intl", "Internacional"]];

  function defaultCanais() {
    return [
      ["bcb", "Banco Central do Brasil", "bcb.gov.br", "oficial"],
      ["ibge", "IBGE", "ibge.gov.br", "oficial"],
      ["b3", "B3", "b3.com.br", "oficial"],
      ["ifi", "IFI/Senado", "senado.leg.br", "oficial"],
      ["infomoney", "InfoMoney", "infomoney.com.br", "br"],
      ["opovo", "O Povo", "opovo.com.br", "br"],
      ["reuters", "Reuters", "reuters.com", "intl"],
      ["investing", "Investing.com", "investing.com", "intl"],
      ["yahoo", "Yahoo Finance", "finance.yahoo.com", "intl"],
      ["advisorperspectives", "Advisor Perspectives", "advisorperspectives.com", "intl"]
    ].map(function (c) {
      var p = COLETA_PADRAO["canal_" + c[0]] || {};
      return { id: "canal_" + c[0], nome: c[1], dominio: c[2], grupo: c[3], validado: false, prioridade: p.prioridade || 99, coleta: JSON.parse(JSON.stringify(p.coleta || null)) };
    });
  }

  // Como o coletor da Pauta busca as matérias de cada canal padrão (testado em
  // 25/10/2026; igual a coleta/canais.json). prioridade: 1 = mais alta.
  var COLETA_PADRAO = {
    canal_bcb: { prioridade: 1, coleta: { metodo: "atom", idioma: "pt", editoria: "BRASIL · POLÍTICA MONETÁRIA", enderecos: ["https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/notasImprensa", "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias"] } },
    canal_ibge: { prioridade: 2, coleta: { metodo: "api", idioma: "pt", editoria: "BRASIL · ATIVIDADE", endereco: "https://servicodados.ibge.gov.br/api/v3/noticias/?de={MM}-{DD}-{AAAA}&ate={MM2}-{DD2}-{AAAA2}&qtd=100" } },
    canal_ifi: { prioridade: 3, coleta: { metodo: "busca_site", idioma: "pt", editoria: "BRASIL · FISCAL", busca: "site:senado.leg.br/ifi" } },
    canal_b3: { prioridade: 4, coleta: { metodo: "busca_site", idioma: "pt", editoria: "BRASIL · BOLSA", busca: "site:b3.com.br/pt_br/noticias" } },
    canal_reuters: { prioridade: 5, coleta: { metodo: "busca_site", idioma: "en", busca: "site:reuters.com (markets OR business OR world/americas)" } },
    canal_infomoney: { prioridade: 6, coleta: { metodo: "rss", idioma: "pt", porDia: "https://www.infomoney.com.br/{AAAA}/{MM}/{DD}/feed/", maxPaginas: 12 } },
    canal_advisorperspectives: { prioridade: 7, coleta: { metodo: "rss", idioma: "en", endereco: "https://www.advisorperspectives.com/dshort.rss" } },
    canal_opovo: { prioridade: 8, coleta: { metodo: "busca_site", idioma: "pt", busca: "site:opovo.com.br/noticias/economia" } },
    canal_investing: { prioridade: 9, coleta: { metodo: "busca_site", idioma: "pt", busca: "site:br.investing.com/news" } },
    canal_yahoo: { prioridade: 10, coleta: { metodo: "busca_site", idioma: "en", busca: "site:finance.yahoo.com" } }
  };
  var COLETA_METODOS = [["busca_site", "Busca por site (Google Notícias)"], ["rss", "Feed RSS"], ["atom", "Feed Atom"], ["api", "API do órgão"]];

  // Arquivo para o coletor (coleta/canais.json): só canais validados.
  async function exportarCanaisColeta() {
    var validos = canais().filter(function (c) { return c.validado && c.dominio; });
    if (!validos.length) {
      uiAlert("Nenhum canal validado ainda. Abra cada canal (Fontes → Canais de referência), confira nome, domínio e grupo e marque \"Conferi\". Só os validados vão para a coleta.");
      return;
    }
    var fora = canais().length - validos.length;
    if (fora && !(await uiConfirm(fora + (fora === 1 ? " canal ainda não validado fica" : " canais ainda não validados ficam") + " fora da coleta. Exportar os " + validos.length + " validados?", "Exportar"))) return;
    var arq = {
      formato: "boletimMaker.canais", versao: 1, exportadoEm: new Date().toISOString(), origem: "app (Exportar canais para a coleta)",
      canais: validos.slice().sort(function (a, b) { return (a.prioridade || 99) - (b.prioridade || 99); }).map(function (c) {
        return { id: c.id, nome: plainText(c.nome), dominio: c.dominio, grupo: c.grupo || "br", prioridade: c.prioridade || 99,
          coleta: c.coleta || { metodo: "busca_site", idioma: "pt", busca: "site:" + c.dominio } };
      })
    };
    var texto = JSON.stringify(arq, null, 2) + "\n";
    if (ghToken()) {
      try {
        await ghPutFile("coleta/canais.json", texto, "Canais da coleta atualizados pelo app (" + validos.length + " canais)");
        uiToast("Canais enviados para a coleta: a próxima execução já usa esta lista.");
        return;
      } catch (e) {
        uiAlert("Não foi possível enviar ao GitHub (" + (e.detalhe || e.message) + "). O arquivo será baixado para envio manual.");
      }
    }
    await offerFile("canais.json", texto);
    if (!ghToken()) uiToast("Arquivo baixado. Para a coleta usar, ele precisa ir para coleta/canais.json no GitHub — ou configure a chave em Configurações → Integrações e envie direto.");
  }

  function canais() { return Array.isArray(store.canais) ? store.canais : []; }
  function canalById(id) { return canais().filter(function (c) { return c.id === id; })[0] || null; }

  // [nome, domínio] dos canais do usuário seguidos da lista interna.
  function veiculosConhecidos() {
    return canais()
      .filter(function (c) { return plainText(c.nome) && c.dominio; })
      .map(function (c) { return [plainText(c.nome), c.dominio]; })
      .concat(VEICULOS);
  }

  // "https://www.InfoMoney.com.br/mercados" -> "infomoney.com.br"
  function normalizeDominio(v) {
    v = String(v || "").trim().toLowerCase();
    if (!v) return "";
    var host = hostOf(/^[a-z]+:\/\//.test(v) ? v : "https://" + v);
    return host || v.replace(/^www\d?\./, "").split("/")[0];
  }

  function saveCanais() {
    store.canaisAt = Date.now();
    invalidateChecks();
    persist();
  }

  function renderCanaisSection() {
    var box = document.getElementById("canaisList");
    if (!box) return;
    var list = canais();
    var ok = list.filter(function (c) { return c.validado; }).length;
    var cnt = document.getElementById("canaisCount");
    if (cnt) cnt.textContent = list.length ? ok + " de " + list.length + " validados" : "";
    if (!list.length) {
      box.innerHTML = '<p class="sources-empty">Nenhum canal. Adicione os veículos que o boletim costuma citar.</p>';
      return;
    }
    box.innerHTML = CANAL_GRUPOS.map(function (g) {
      var itens = list.filter(function (c) { return (c.grupo || "br") === g[0]; })
        .sort(function (x, y) { return (x.prioridade || 99) - (y.prioridade || 99); });
      if (!itens.length) return "";
      return '<div class="canal-group">' + esc(g[1]) + "</div>" + itens.map(function (c) {
        var active = selection && selection.kind === "canal" && selection.canalId === c.id;
        return '<button type="button" class="canal-item' + (active ? " is-active" : "") + '" data-action="select-canal" data-canal-id="' + esc(c.id) + '">' +
          '<span class="canal-prio" title="Prioridade na Pauta">' + (c.prioridade || "–") + "</span>" +
          '<span class="canal-main"><span class="canal-name">' + esc(plainText(c.nome) || "[Nome do canal]") + "</span>" +
          '<span class="canal-host">' + esc(c.dominio || "sem domínio") + "</span></span>" +
          (c.validado ? '<span class="chip chip-aprovado">' + icon("check") + "Validado</span>" : '<span class="chip chip-incompleta">A validar</span>') +
          "</button>";
      }).join("");
    }).join("");
  }

  function renderCanalInspector(id) {
    var c = canalById(id);
    if (!c) return "";
    var a = 'data-canal-id="' + esc(id) + '"';
    var usos = 0;
    store.order.forEach(function (eid) {
      var ed = store.editions[eid];
      ((ed && ed.data && ed.data.sources) || []).forEach(function (src) {
        if (c.dominio && hostOf(src.url).indexOf(c.dominio) !== -1) usos++;
      });
    });
    var html = propHead("Canais de referência", plainText(c.nome) || "Novo canal");
    html += '<div class="prop-section"><div class="prop-label">Canal</div>' +
      '<div class="prop-field"><label>Nome</label><input type="text" ' + a + ' data-canal-field="nome" value="' + esc(c.nome || "") + '" placeholder="Ex.: Valor Econômico"></div>' +
      '<div class="prop-field"><label>Domínio</label><input type="text" ' + a + ' data-canal-field="dominio" value="' + esc(c.dominio || "") + '" placeholder="Ex.: valor.globo.com"></div>' +
      '<div class="prop-field"><label>Grupo</label><select ' + a + ' data-canal-field="grupo">' +
      CANAL_GRUPOS.map(function (g) { return '<option value="' + g[0] + '"' + ((c.grupo || "br") === g[0] ? " selected" : "") + ">" + esc(g[1]) + "</option>"; }).join("") +
      "</select></div>" +
      '<p class="prop-note">Links deste domínio (e subdomínios) são reconhecidos como "' + esc(plainText(c.nome) || "este canal") + '" ao criar fontes.' +
      (usos ? " Aparece em " + usos + " fonte" + (usos > 1 ? "s" : "") + " das suas edições." : "") + "</p></div>";
    var co = c.coleta || {};
    var metodo = co.metodo || "busca_site";
    html += '<div class="prop-section"><div class="prop-label">Coleta da Pauta</div>' +
      '<div class="prop-grid"><div class="prop-field"><label>Prioridade</label><input type="number" min="1" max="99" ' + a + ' data-canal-field="prioridade" value="' + esc(String(c.prioridade || 99)) + '" title="1 = mais alta. Ordena as matérias e escolhe o título de cada tema."></div>' +
      '<div class="prop-field"><label>Idioma</label><select ' + a + ' data-canal-field="coleta.idioma"><option value="pt"' + (co.idioma !== "en" ? " selected" : "") + '>Português</option><option value="en"' + (co.idioma === "en" ? " selected" : "") + ">Inglês</option></select></div></div>" +
      '<div class="prop-field"><label>Como coletar</label><select ' + a + ' data-canal-field="coleta.metodo">' +
      COLETA_METODOS.map(function (m) { return '<option value="' + m[0] + '"' + (metodo === m[0] ? " selected" : "") + ">" + esc(m[1]) + "</option>"; }).join("") + "</select></div>" +
      (metodo === "busca_site"
        ? '<div class="prop-field"><label>Busca</label><input type="text" ' + a + ' data-canal-field="coleta.busca" value="' + esc(co.busca || "site:" + (c.dominio || "")) + '" placeholder="site:exemplo.com.br/economia"></div>'
        : metodo === "api"
          ? '<div class="prop-field"><label>Endereço da API</label><input type="text" ' + a + ' data-canal-field="coleta.endereco" value="' + esc(co.endereco || "") + '"></div>'
          : '<div class="prop-field"><label>Endereço(s) do feed</label><textarea rows="2" ' + a + ' data-canal-field="coleta.enderecos" placeholder="Um por linha">' + esc((co.enderecos || (co.endereco ? [co.endereco] : [])).join("\n")) + "</textarea></div>" +
            (co.porDia ? '<p class="prop-note">Este canal usa o feed de cada dia: ' + esc(co.porDia) + "</p>" : "")) +
      (c.grupo === "oficial" ? '<div class="prop-field"><label>Editoria padrão</label><input type="text" ' + a + ' data-canal-field="coleta.editoria" value="' + esc(co.editoria || "") + '" placeholder="Ex.: BRASIL · FISCAL"></div>' : "") +
      '<p class="prop-note">Mudou algo aqui? Use "Exportar para a coleta" em Canais de referência para a próxima execução usar.</p></div>';
    html += '<div class="prop-section"><div class="prop-label">Validação</div>' +
      '<label class="prop-check"><input type="checkbox" ' + a + ' data-canal-field="validado"' + (c.validado ? " checked" : "") + '> Conferi nome, domínio e grupo</label>' +
      '<div style="margin-top:10px">' + (c.validado ? '<span class="chip chip-aprovado">Validado</span>' : '<span class="chip chip-incompleta">A validar</span>') + "</div></div>";
    html += '<div class="prop-section">' +
      (c.dominio ? '<a class="prop-btn" href="https://' + esc(c.dominio) + '" target="_blank" rel="noopener">' + icon("link") + "Abrir o site</a>" : "") +
      '<button type="button" class="prop-btn danger" data-action="remove-canal" ' + a + ">" + icon("trash") + "Remover canal</button></div>";
    return html;
  }

  function handleCanalChange(t) {
    var c = canalById(t.dataset.canalId);
    if (!c) return;
    var f = t.dataset.canalField;
    if (f === "validado") c.validado = !!t.checked;
    else if (f === "dominio") c.dominio = normalizeDominio(t.value);
    else if (f === "grupo") c.grupo = CANAL_GRUPOS.some(function (g) { return g[0] === t.value; }) ? t.value : "br";
    else if (f === "prioridade") c.prioridade = Math.min(99, Math.max(1, parseInt(t.value, 10) || 99));
    else if (/^coleta\./.test(f)) {
      var k = f.slice(7), v = t.value.trim();
      c.coleta = c.coleta || { metodo: "busca_site", idioma: "pt" };
      if (k === "enderecos") {
        c.coleta.enderecos = v.split(/\s*\n\s*/).filter(function (x) { return /^https?:\/\//.test(x); });
        delete c.coleta.endereco;
      } else if (v) c.coleta[k] = v;
      else delete c.coleta[k];
      if (k === "metodo" && v === "busca_site" && !c.coleta.busca) c.coleta.busca = "site:" + (c.dominio || "");
    }
    else c[f] = t.value.trim();
    // Mudou nome/domínio depois de validado: volta a pedir conferência.
    if (f === "nome" || f === "dominio") c.validado = false;
    saveCanais();
    renderSourcesTab();
    renderInspector();
  }

  function initSourcesTab() {
    var panel = document.getElementById("structurePanel");
    if (!panel) return;
    panel.querySelectorAll(".panel-tab").forEach(function (btn) {
      btn.addEventListener("click", function () { showLeftTab(btn.dataset.tab); });
    });
    var fmt = document.getElementById("refFormat");
    if (fmt) fmt.addEventListener("change", function () {
      pushHistory();
      state().meta.refFormat = fmt.value;
      scheduleSave();
      render();
    });
  }

  function renderInspector() {
    var container = document.getElementById("inspectorSelection");
    if (!container) return;
    var html = "";
    if (REVIEWER) html = renderReviewerInspector();
    else     if (selection && selection.kind === "source") html = renderSourceInspector(selection.sourceId);
    else if (selection && selection.kind === "canal") html = renderCanalInspector(selection.canalId);
    else if (selection && selection.kind === "logo") html = renderLogoInspector("logo");
    else if (selection && selection.kind === "publisher-logo") html = renderLogoInspector("publisher-logo");
    else if (selection && selection.kind === "block") html = renderBlockInspector(selection.blockId);
    else if (selection && selection.kind === "element") html = renderElementInspector(selection.elId);
    container.innerHTML = html || renderDocumentInspector();
  }

  /* ---------------------------------------------------------------------
     Camadas (painel esquerdo) — lista dos blocos de cada página. Clicar
     seleciona e rola até o bloco; o cadeado trava; notícias mudam de ordem
     arrastando ou pelas setas (muda a ordem real, sem deixar buraco).
     --------------------------------------------------------------------- */
  function pathToLayer(path) {
    var m;
    if (!path) return null;
    if ((m = /^columns\.(\d+)/.exec(path))) return "block:news-" + m[1];
    if (/^headline\.paragraphs/.test(path)) return "block:headline-body";
    if (/^headline\./.test(path)) return "block:headline-title";
    if (/^ticker\./.test(path)) return "block:ticker";
    if (/^weekTable\./.test(path)) return "block:week-table";
    if (/^(masthead\.|meta\.title|meta\.subtitle)/.test(path)) return "block:masthead";
    if (/^page2Header\./.test(path)) return "block:page2-top";
    if (/^thermometer\./.test(path)) return "block:thermo";
    if (/^calendar\./.test(path)) return "block:calendar";
    if (/^superQuarta\./.test(path)) return "block:sq";
    if (/^glossary\./.test(path)) return "block:glossary";
    if (/^footerFront\./.test(path)) return "block:footer-front";
    if (/^footerBack\./.test(path)) return "block:footer-back";
    return null;
  }

  function layerDefs() {
    var s = state();
    var L = [], removed = [];
    function block(id, name, extra) { var o = { kind: "block", id: id, name: name }; for (var k in extra || {}) o[k] = extra[k]; var rbl = (s.blockLayout || {})[id]; if (rbl && rbl.removed) { removed.push(o); return; } L.push(o); }
    function freeEls(page) {
      (s.elements || []).forEach(function (el) {
        if (el.page !== page) return;
        var name = el.type === "line" ? "Linha" : el.type === "band" ? "Faixa" : "Caixa de texto" + (plainText(el.text) ? " · " + plainText(el.text) : "");
        L.push({ kind: "element", id: el.id, name: name, locked: !!el.locked });
      });
    }
    L.push({ group: "Página 1" });
    block("masthead", "Cabeçalho");
    if (s.meta.logo) L.push({ kind: "logo", id: "logo", name: "Logo", locked: !!s.meta.logoLocked });
    if (s.meta.publisherLogo) L.push({ kind: "publisher-logo", id: "publisher-logo", name: "Logo do parceiro", locked: !!s.meta.publisherLogoLocked });
    block("headline-title", "Manchete");
    if (s.headline.image) block("headline-image", "Imagem da manchete");
    block("headline-body", "Texto da manchete");
    block("ticker", "Cotações (" + s.ticker.length + ")");
    s.columns.forEach(function (c, i) {
      block("news-" + i, "Notícia " + (i + 1) + (plainText(c.title) ? " · " + plainText(c.title) : ""), { news: i, status: c.status || "rascunho" });
    });
    block("week-table", "A semana, dia a dia");
    block("note", "Nota");
    block("footer-front", "Rodapé");
    freeEls(1);
    L.push({ group: "Página 2" });
    block("page2-top", "Cabeçalho do verso");
    block("thermo", "Termômetro da semana");
    block("calendar", "Agenda");
    block("sq", "Destaque");
    block("glossary", "Glossário");
    block("footer-back", "Rodapé do verso");
    freeEls(2);
    L.forEach(function (it) {
      if (it.kind !== "block") return;
      var bl = (s.blockLayout || {})[it.id] || {};
      it.locked = !!bl.locked;
      it.hidden = !!bl.hidden;
    });
    if (removed.length) {
      L.push({ group: "Excluídos" });
      removed.forEach(function (o) { o.removed = true; L.push(o); });
    }
    return L;
  }

  function isLayerActive(it) {
    if (!selection) return false;
    if (it.kind === "block") return selection.kind === "block" && selection.blockId === it.id;
    if (it.kind === "element") return selection.kind === "element" && selection.elId === it.id;
    return selection.kind === it.kind;
  }

  function renderLayers() {
    var box = document.getElementById("layersList");
    if (!box || !current()) return;
    var warns = {};
    pendingOf(runChecks(false)).forEach(function (it) {
      var k = pathToLayer(it.target);
      if (k) warns[k] = (warns[k] || []).concat(it.title);
    });
    var nCols = state().columns.length;
    box.innerHTML = layerDefs().map(function (it) {
      if (it.group) return '<div class="layer-group">' + esc(it.group) + "</div>";
      if (it.removed) {
        return '<div class="layer is-hidden-layer" data-layer-kind="block" data-layer-id="' + esc(it.id) + '"><span class="grip"></span>' +
          '<span class="layer-name" title="' + esc(it.name) + '">' + esc(it.name) + "</span>" +
          '<span class="layer-tail"><button type="button" class="chip chip-oculto layer-restore" data-layer-restore title="Trazer o bloco de volta para a página">Restaurar</button></span></div>';
      }
      var key = it.kind + ":" + it.id;
      var isNews = it.news != null;
      var w = warns[key];
      var tail = "";
      if (w) tail += '<span class="layer-warn" title="' + esc(w.join(" · ")) + '">' + icon("alert") + "</span>";
      if (isNews && it.status !== "rascunho") tail += '<span class="chip chip-' + it.status + '">' + (it.status === "aprovado" ? "Aprov." : "Rev.") + "</span>";
      if (isNews) {
        tail += '<button type="button" class="layer-btn" data-layer-move="-1" title="Subir" aria-label="Subir"' + (it.news === 0 ? " disabled" : "") + ">" + icon("up") + "</button>";
        tail += '<button type="button" class="layer-btn" data-layer-move="1" title="Descer" aria-label="Descer"' + (it.news === nCols - 1 ? " disabled" : "") + ">" + icon("down") + "</button>";
      }
      if (it.hidden) tail += '<span class="chip chip-oculto">oculto</span>';
      if (it.kind === "block" && it.id !== "masthead") {
        tail += '<button type="button" class="layer-btn' + (it.hidden ? " is-on" : "") + '" data-layer-hide title="' + (it.hidden ? "Mostrar na página" : "Ocultar (sai da página e do PDF)") + '" aria-label="' + (it.hidden ? "Mostrar na página" : "Ocultar") + '" aria-pressed="' + (it.hidden ? "true" : "false") + '">' + icon(it.hidden ? "eye-off" : "eye") + "</button>";
      }
      tail += '<button type="button" class="layer-btn' + (it.locked ? " is-on" : "") + '" data-layer-lock title="' + (it.locked ? "Destravar" : "Travar") + '" aria-label="' + (it.locked ? "Destravar" : "Travar") + '" aria-pressed="' + (it.locked ? "true" : "false") + '">' + icon(it.locked ? "lock" : "unlock") + "</button>";
      return '<div class="layer' + (isLayerActive(it) ? " is-active" : "") + (it.hidden ? " is-hidden-layer" : "") + '" role="button" tabindex="0" data-layer-kind="' + it.kind + '" data-layer-id="' + esc(it.id) + '"' +
        (isNews ? ' draggable="true" data-news-index="' + it.news + '"' : "") + ">" +
        '<span class="grip">' + (isNews ? icon("grip") : "") + "</span>" +
        '<span class="layer-name" title="' + esc(it.name) + '">' + esc(it.name) + "</span>" +
        '<span class="layer-tail">' + tail + "</span></div>";
    }).join("");
  }

  function layerElement(kind, id) {
    if (kind === "block") return document.querySelector('#workspace [data-block-id="' + id + '"]');
    if (kind === "element") return document.querySelector('#workspace [data-el-id="' + id + '"]');
    if (kind === "logo") return document.querySelector("#workspace .logo-draggable");
    if (kind === "publisher-logo") return document.querySelector("#workspace .publisher-logo-draggable");
    return null;
  }

  function selectAndReveal(el) {
    if (!el) return;
    selectItem(el);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("check-flash");
    setTimeout(function () { el.classList.remove("check-flash"); }, 1700);
  }

  function toggleLayerLock(kind, id) {
    var s = state();
    pushHistory();
    if (kind === "block") { var bl = getBlockLayout(id); bl.locked = !bl.locked; }
    else if (kind === "element") { var e = getElementById(id); if (e) e.locked = !e.locked; }
    else if (kind === "logo") s.meta.logoLocked = !s.meta.logoLocked;
    else if (kind === "publisher-logo") s.meta.publisherLogoLocked = !s.meta.publisherLogoLocked;
    scheduleSave();
    render();
  }

  function initLayers() {
    var box = document.getElementById("layersList");
    var panel = document.getElementById("structurePanel");
    if (!box || !panel) return;

    // Botões "Adicionar bloco" com data-action: adiciona e leva até o bloco.
    panel.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-action]");
      if (!btn || !panel.contains(btn) || box.contains(btn)) return;
      handleAction(btn.dataset.action, btn);
      var s = state();
      var target = {
        "add-column": "news-" + (s.columns.length - 1), "add-ticker": "ticker", "add-calendar-row": "calendar",
        "add-glossary-item": "glossary", "add-paragraph": "headline-body"
      }[btn.dataset.action];
      if (target) selectAndReveal(layerElement("block", target));
    });

    box.addEventListener("click", function (e) {
      var row = e.target.closest(".layer");
      if (!row) return;
      var kind = row.dataset.layerKind, id = row.dataset.layerId;
      if (e.target.closest("[data-layer-lock]")) { toggleLayerLock(kind, id); return; }
      if (e.target.closest("[data-layer-restore]")) {
        var rb = document.createElement("button");
        rb.dataset.blockId = id;
        handleAction("restore-block", rb);
        return;
      }
      if (row.querySelector("[data-layer-restore]")) return; // bloco excluído: só restaura
      if (e.target.closest("[data-layer-hide]")) {
        var fb = document.createElement("button");
        fb.dataset.blockId = id;
        handleAction("toggle-block-hidden", fb);
        return;
      }
      var mv = e.target.closest("[data-layer-move]");
      if (mv) {
        var from = +row.dataset.newsIndex, to = from + (+mv.dataset.layerMove);
        moveColumn(from, to);
        return;
      }
      selectAndReveal(layerElement(kind, id));
    });
    box.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("layer")) {
        e.preventDefault();
        selectAndReveal(layerElement(e.target.dataset.layerKind, e.target.dataset.layerId));
      }
    });

    // Arrastar notícias na lista para reordenar
    var dragFrom = null;
    function clearMarks() { Array.prototype.forEach.call(box.querySelectorAll(".drop-before,.drop-after,.is-dragging"), function (r) { r.classList.remove("drop-before", "drop-after", "is-dragging"); }); }
    box.addEventListener("dragstart", function (e) {
      var row = e.target.closest('.layer[draggable="true"]');
      if (!row) return;
      dragFrom = +row.dataset.newsIndex;
      row.classList.add("is-dragging");
      try { e.dataTransfer.setData("text/plain", String(dragFrom)); e.dataTransfer.effectAllowed = "move"; } catch (err) { /* ok */ }
    });
    box.addEventListener("dragover", function (e) {
      var row = e.target.closest('.layer[draggable="true"]');
      if (dragFrom == null || !row) return;
      e.preventDefault();
      clearMarks();
      var r = row.getBoundingClientRect();
      row.classList.add(e.clientY < r.top + r.height / 2 ? "drop-before" : "drop-after");
    });
    box.addEventListener("dragleave", function (e) { if (!box.contains(e.relatedTarget)) clearMarks(); });
    box.addEventListener("drop", function (e) {
      var row = e.target.closest('.layer[draggable="true"]');
      if (dragFrom == null || !row) return;
      e.preventDefault();
      var over = +row.dataset.newsIndex;
      var after = row.classList.contains("drop-after");
      var to = over + (after ? 1 : 0);
      if (to > dragFrom) to--;
      clearMarks();
      var from = dragFrom;
      dragFrom = null;
      moveColumn(from, to);
    });
    box.addEventListener("dragend", function () { dragFrom = null; clearMarks(); });
  }

  /* ---------------------------------------------------------------------
     Reordenar / duplicar / remover itens de lista (notícias e cotações)
     levando junto o que é guardado pela posição: deslocamento e estilo do
     bloco da notícia e o tamanho próprio de cada caixa de texto.
     perm[posição antiga] = posição nova (ou -1 se o item saiu).
     --------------------------------------------------------------------- */
  function reindexKeys(s, prefixPath, blockPrefix, perm) {
    if (blockPrefix && s.blockLayout) {
      var nb = {};
      Object.keys(s.blockLayout).forEach(function (k) {
        var m = new RegExp("^" + blockPrefix + "(\\d+)$").exec(k);
        if (!m) { nb[k] = s.blockLayout[k]; return; }
        var ni = perm[+m[1]];
        if (ni != null && ni >= 0) nb[blockPrefix + ni] = s.blockLayout[k];
      });
      s.blockLayout = nb;
    }
    if (s.fieldFontScale) {
      var nf = {};
      Object.keys(s.fieldFontScale).forEach(function (k) {
        var m = new RegExp("^" + prefixPath.replace(".", "\\.") + "\\.(\\d+)\\.(.*)$").exec(k);
        if (!m) { nf[k] = s.fieldFontScale[k]; return; }
        var ni = perm[+m[1]];
        if (ni != null && ni >= 0) nf[prefixPath + "." + ni + "." + m[2]] = s.fieldFontScale[k];
      });
      s.fieldFontScale = nf;
    }
  }

  function permForMove(n, from, to) {
    var order = [];
    for (var i = 0; i < n; i++) order.push(i);
    order.splice(to, 0, order.splice(from, 1)[0]);
    var perm = [];
    order.forEach(function (oldIdx, newIdx) { perm[oldIdx] = newIdx; });
    return perm;
  }

  function moveColumn(from, to) {
    var s = state();
    if (to < 0 || to >= s.columns.length || from === to) return;
    pushHistory();
    var perm = permForMove(s.columns.length, from, to);
    s.columns.splice(to, 0, s.columns.splice(from, 1)[0]);
    reindexKeys(s, "columns", "news-", perm);
    if (selection && selection.kind === "block" && /^news-\d+$/.test(selection.blockId)) {
      selection.blockId = "news-" + perm[+selection.blockId.slice(5)];
      selection.fieldPath = null;
    }
    scheduleSave();
    render();
  }

  /* ---------------------------------------------------------------------
     Mini barra flutuante do item selecionado
     --------------------------------------------------------------------- */
  function selectedElement() {
    if (!selection) return null;
    if (selection.kind === "block") return layerElement("block", selection.blockId);
    if (selection.kind === "element") return layerElement("element", selection.elId);
    return layerElement(selection.kind, selection.kind);
  }

  function updateBlockToolbar() {
    var bar = document.getElementById("blockToolbar");
    if (!bar) return;
    var el = selectedElement();
    var ws = document.getElementById("workspace");
    if (!el || !ws || !current() || document.body.classList.contains("pdf-capture")) { bar.hidden = true; return; }
    var s = state();
    var name, btns = "";
    var b = function (action, ic, title, attrs, extraClass) {
      return '<button type="button" data-action="' + action + '"' + (attrs || "") + ' title="' + title + '" aria-label="' + title + '"' + (extraClass ? ' class="' + extraClass + '"' : "") + ">" + icon(ic) + "</button>";
    };
    if (REVIEWER) {
      name = selection.kind === "block" ? blockLabel(selection.blockId) : "Item";
      btns = b("add-nota", "note", "Nova observação sobre este item", "", "is-note");
    } else if (selection.kind === "block") {
      var bl = readBlockLayout(selection.blockId);
      name = blockLabel(selection.blockId);
      btns += b("add-nota", "note", "Observação de revisão (só no editor)", "");
      var m = /^news-(\d+)$/.exec(selection.blockId);
      if (m) {
        var i = +m[1];
        btns += b("move-column", "up", "Subir", ' data-index="' + i + '" data-dir="-1"' + (i === 0 ? " disabled" : ""));
        btns += b("move-column", "down", "Descer", ' data-index="' + i + '" data-dir="1"' + (i === s.columns.length - 1 ? " disabled" : ""));
      }
      btns += b("toggle-block-lock", bl.locked ? "lock" : "unlock", bl.locked ? "Destravar" : "Travar", ' data-block-id="' + selection.blockId + '"', bl.locked ? "is-on" : "");
      if (selection.blockId !== "masthead") btns += b("toggle-block-hidden", "eye-off", "Ocultar bloco (sai da página e do PDF)", ' data-block-id="' + selection.blockId + '"');
      if (m) {
        btns += b("duplicate-column", "copy", "Duplicar (Ctrl+D)", ' data-index="' + m[1] + '"');
        btns += b("remove-column", "trash", "Remover (Delete)", ' data-index="' + m[1] + '"', "danger");
      }
    } else if (selection.kind === "element") {
      var fe = getElementById(selection.elId);
      if (!fe) { bar.hidden = true; return; }
      name = fe.type === "line" ? "Linha" : fe.type === "band" ? "Faixa" : "Caixa de texto";
      btns += b("toggle-element-lock", fe.locked ? "lock" : "unlock", fe.locked ? "Destravar" : "Travar", ' data-el-id="' + fe.id + '"', fe.locked ? "is-on" : "");
      btns += b("duplicate-element", "copy", "Duplicar (Ctrl+D)", ' data-el-id="' + fe.id + '"');
      btns += b("remove-element", "trash", "Remover (Delete)", ' data-el-id="' + fe.id + '"', "danger");
    } else {
      var isPub = selection.kind === "publisher-logo";
      var lk = isPub ? s.meta.publisherLogoLocked : s.meta.logoLocked;
      name = isPub ? "Logo do parceiro" : "Logo";
      btns += b(isPub ? "toggle-publisher-logo-lock" : "toggle-logo-lock", lk ? "lock" : "unlock", lk ? "Destravar" : "Travar", "", lk ? "is-on" : "");
      btns += b("remove-image", "trash", "Remover logo", ' data-path="meta.' + (isPub ? "publisherLogo" : "logo") + '"', "danger");
    }
    bar.innerHTML = '<span class="bt-name">' + esc(name) + "</span>" + btns;
    bar.hidden = false;
    var r = el.getBoundingClientRect();
    var tbH = document.getElementById("toolbar").offsetHeight;
    var bw = bar.offsetWidth, bh = bar.offsetHeight;
    var top = r.top - bh - 8;
    if (top < tbH + 6) top = Math.min(r.bottom + 8, window.innerHeight - bh - 40);
    if (r.bottom < tbH || r.top > window.innerHeight) { bar.hidden = true; return; }
    var left = Math.max(8, Math.min(r.left + r.width / 2 - bw / 2, window.innerWidth - bw - 8));
    bar.style.top = Math.max(tbH + 6, top) + "px";
    bar.style.left = left + "px";
  }

  function initBlockToolbar() {
    var bar = document.getElementById("blockToolbar");
    if (!bar) return;
    bar.addEventListener("mousedown", function (e) { e.preventDefault(); });
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-action]");
      if (!btn || btn.disabled) return;
      handleAction(btn.dataset.action, btn);
    });
    var raf = null;
    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = null; updateBlockToolbar(); });
    }
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
  }

  /* ---------------------------------------------------------------------
     Aviso temporário (substitui os alertas de sucesso)
     --------------------------------------------------------------------- */
  var toastTimer = null;
  function uiToast(message) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = message;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2800);
  }

  /* ---------------------------------------------------------------------
     Ações estruturais (adicionar/remover itens, imagens, tendências)
     --------------------------------------------------------------------- */
  function handleAction(action, el) {
    var s = state();
    var idx = el.dataset.index !== undefined ? parseInt(el.dataset.index, 10) : null;
    var grp = el.dataset.group !== undefined ? parseInt(el.dataset.group, 10) : null;

    // Observação de revisão (não mexe na edição; vale também para o revisor)
    if (action === "add-nota") {
      startNota(el.dataset.alvo || (selection && selection.kind === "block" ? (selection.fieldPath || "block:" + selection.blockId) : "edicao"), "");
      return;
    }
    // Revisor: só navegação; nada que altere a edição.
    if (REVIEWER && ["select-source", "select-canal", "goto-news"].indexOf(action) === -1) return;
    // Tem histórico próprio (ver moveColumn)
    if (action === "move-column") { moveColumn(idx, idx + parseInt(el.dataset.dir, 10)); return; }
    // Só navegação (sem passo de desfazer)
    if (action === "select-source") {
      selection = { kind: "source", sourceId: el.dataset.sourceId };
      showLeftTab("fontes");
      render();
      return;
    }
    // Canais são do usuário, não da edição: ficam fora do desfazer.
    if (action === "select-canal") {
      selection = { kind: "canal", canalId: el.dataset.canalId };
      showLeftTab("fontes");
      render();
      return;
    }
    if (action === "add-canal") {
      var nc = { id: "canal_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nome: "", dominio: "", grupo: "br", validado: false };
      store.canais = canais().concat([nc]);
      selection = { kind: "canal", canalId: nc.id };
      saveCanais();
      showLeftTab("fontes");
      render();
      return;
    }
    if (action === "remove-canal") {
      var rc = canalById(el.dataset.canalId);
      if (!rc) return;
      uiConfirm('Remover o canal "' + (plainText(rc.nome) || rc.dominio || "sem nome") + '"? As fontes já criadas não mudam.', "Remover").then(function (ok) {
        if (!ok) return;
        store.canais = canais().filter(function (c) { return c.id !== rc.id; });
        if (selection && selection.kind === "canal") selection = null;
        saveCanais();
        render();
        uiToast("Canal removido.");
      });
      return;
    }
    if (action === "open-thermo-calc") { openThermoCalc(); return; }
    if (action === "goto-news") {
      showLeftTab("estrutura");
      selectAndReveal(layerElement("block", "news-" + idx));
      return;
    }

    pushHistory();

    function permRemove(n, at) {
      var p = [];
      for (var i = 0; i < n; i++) p[i] = i < at ? i : i > at ? i - 1 : -1;
      return p;
    }

    switch (action) {
      case "add-ticker":
        s.ticker.push({ label: "ATIVO", value: "0,00", change: "+0,00%", trend: "flat", tipo: "fechamento", periodo: "semana", refData: (s.ticker[0] && s.ticker[0].refData) || (s.meta.vars && s.meta.vars.coberturaFim) || "", modoCor: "sinal" });
        break;
      case "remove-ticker": {
        var permT = permRemove(s.ticker.length, idx);
        s.ticker.splice(idx, 1);
        reindexKeys(s, "ticker", null, permT);
        break;
      }
      case "move-ticker": {
        var toT = idx + parseInt(el.dataset.dir, 10);
        if (toT < 0 || toT >= s.ticker.length) return;
        var permM = permForMove(s.ticker.length, idx, toT);
        s.ticker.splice(toT, 0, s.ticker.splice(idx, 1)[0]);
        reindexKeys(s, "ticker", null, permM);
        break;
      }
      case "duplicate-column": {
        var copy = JSON.parse(JSON.stringify(s.columns[idx]));
        var permD = [];
        for (var j = 0; j < s.columns.length; j++) permD[j] = j <= idx ? j : j + 1;
        s.columns.splice(idx + 1, 0, copy);
        reindexKeys(s, "columns", "news-", permD);
        if (s.blockLayout && s.blockLayout["news-" + idx]) s.blockLayout["news-" + (idx + 1)] = JSON.parse(JSON.stringify(s.blockLayout["news-" + idx]));
        Object.keys(s.fieldFontScale || {}).forEach(function (k) {
          var mm = new RegExp("^columns\\." + idx + "\\.(.*)$").exec(k);
          if (mm) s.fieldFontScale["columns." + (idx + 1) + "." + mm[1]] = s.fieldFontScale[k];
        });
        selection = { kind: "block", blockId: "news-" + (idx + 1) };
        uiToast("Notícia duplicada.");
        break;
      }
      case "add-source": {
        var ns = createSource(s, null);
        selection = { kind: "source", sourceId: ns.id };
        showLeftTab("fontes");
        break;
      }
      case "remove-source": {
        var rid = el.dataset.sourceId;
        s.sources = (s.sources || []).filter(function (x) { return x.id !== rid; });
        s.columns.forEach(function (c) { if (c.sourceId === rid) delete c.sourceId; });
        if (selection && selection.kind === "source" && selection.sourceId === rid) selection = null;
        uiToast("Fonte removida. As notícias que a usavam voltam a mostrar o texto do link.");
        break;
      }
      case "source-access-today": {
        var sa = sourceById(s, el.dataset.sourceId);
        var hoje = new Date();
        if (sa) sa.acessoEm = hoje.getFullYear() + "-" + pad2(hoje.getMonth() + 1) + "-" + pad2(hoje.getDate());
        break;
      }
      case "set-news-status":
        if (s.columns[idx]) s.columns[idx].status = el.dataset.value || "rascunho";
        break;
      case "set-block-style":
        getBlockLayout(el.dataset.blockId)[el.dataset.field] = el.dataset.value || null;
        break;
      case "set-element-style": {
        var se = getElementById(el.dataset.elId);
        if (se) se[el.dataset.field] = el.dataset.value;
        break;
      }
      case "remove-block": {
        // Excluir de verdade (só blocos de texto opcionais): apaga o texto e
        // tira o bloco da página e das Camadas; "Restaurar" o traz vazio.
        var rbId = el.dataset.blockId;
        var rbl = getBlockLayout(rbId);
        rbl.removed = true;
        rbl.hidden = false;
        if (rbId === "headline-body") s.headline.paragraphs = [];
        else if (rbId === "note") s.note = "";
        else if (rbId === "headline-deck") s.headline.deck = "";
        else if (rbId === "tag") s.headline.tag = "";
        else if (rbId === "headline-image") s.headline.image = null;
        else if (rbId === "sq") { s.superQuarta.title = ""; s.superQuarta.body = ""; }
        if (selection && selection.kind === "block" && selection.blockId === rbId) selection = null;
        uiToast("\"" + blockLabel(rbId) + "\" excluído. Para trazer de volta, use \"Restaurar\" em Excluídos, no fim das Camadas.");
        break;
      }
      case "restore-block": {
        getBlockLayout(el.dataset.blockId).removed = false;
        if (el.dataset.blockId === "headline-body" && !s.headline.paragraphs.length) s.headline.paragraphs.push("");
        uiToast("\"" + blockLabel(el.dataset.blockId) + "\" voltou para a página.");
        break;
      }
      case "toggle-block-hidden": {
        // Ocultar: o bloco sai da página e do PDF (não ocupa espaço); volta
        // pelo olho nas Camadas ou pelo painel do bloco.
        var hb = getBlockLayout(el.dataset.blockId);
        hb.hidden = !hb.hidden;
        uiToast(hb.hidden ? "\"" + blockLabel(el.dataset.blockId) + "\" oculto: não aparece na página nem no PDF. Para voltar, use o olho nas Camadas." : "\"" + blockLabel(el.dataset.blockId) + "\" voltou para a página.");
        break;
      }
      case "reset-block-pos": {
        var rb = getBlockLayout(el.dataset.blockId);
        rb.x = 0; rb.y = 0;
        break;
      }
      case "duplicate-element": {
        var src = getElementById(el.dataset.elId);
        if (!src) return;
        var dup = JSON.parse(JSON.stringify(src));
        dup.id = newElementId();
        dup.x = (dup.x || 0) + 16; dup.y = (dup.y || 0) + 16; dup.locked = false;
        s.elements.push(dup);
        selection = { kind: "element", elId: dup.id };
        break;
      }
      case "add-paragraph":
        // "Parágrafo" em Adicionar bloco também traz de volta o texto da manchete excluído
        getBlockLayout("headline-body").removed = false;
        getBlockLayout("headline-body").hidden = false;
        s.headline.paragraphs.push("");
        break;
      case "remove-paragraph":
        // Pode ficar sem nenhum parágrafo (poupa espaço); "+ Parágrafo" nos
        // controles do bloco traz de volta.
        s.headline.paragraphs.splice(idx, 1);
        break;
      case "add-column":
        s.columns.push({ tag: "SEÇÃO", title: "Título da notícia", body: "", linkText: "Leia mais →", image: null });
        break;
      case "remove-column": {
        var permC = permRemove(s.columns.length, idx);
        s.columns.splice(idx, 1);
        reindexKeys(s, "columns", "news-", permC);
        if (selection && selection.kind === "block" && /^news-\d+$/.test(selection.blockId)) selection = null;
        break;
      }
      case "add-week-row":
        s.weekTable.rows.push({ day: "DIA", text: "", change: "+0,00%", trend: "flat" });
        break;
      case "remove-week-row":
        s.weekTable.rows.splice(idx, 1);
        break;
      case "add-thermo-group":
        s.thermometer.groups.push({ name: "GRUPO", rows: [{ ativo: "", fechamento: "", varDia: "", varSemana: "", var2026: "", trend: "flat", fonte: "" }] });
        break;
      case "remove-thermo-group":
        s.thermometer.groups.splice(grp, 1);
        break;
      case "add-thermo-row":
        s.thermometer.groups[grp].rows.push({ ativo: "", fechamento: "", varDia: "", varSemana: "", var2026: "", trend: "flat", fonte: "" });
        break;
      case "remove-thermo-row":
        s.thermometer.groups[grp].rows.splice(idx, 1);
        break;
      case "add-calendar-row":
        s.calendar.rows.push({ data: "", evento: "", pais: "", relevancia: "MÉDIA", bold: false });
        break;
      case "remove-calendar-row":
        s.calendar.rows.splice(idx, 1);
        break;
      case "toggle-cal-bold":
        s.calendar.rows[idx].bold = !s.calendar.rows[idx].bold;
        break;
      case "add-glossary-item":
        s.glossary.items.push({ term: "", def: "" });
        break;
      case "remove-glossary-item":
        s.glossary.items.splice(idx, 1);
        break;
      case "cycle-trend":
        setPath(s, el.dataset.path, nextTrend(getPath(s, el.dataset.path)));
        break;
      case "remove-image":
        setPath(s, el.dataset.path, null);
        if (selection && (selection.kind === "logo" && el.dataset.path === "meta.logo" || selection.kind === "publisher-logo" && el.dataset.path === "meta.publisherLogo")) selection = null;
        break;
      case "toggle-logo-lock":
        s.meta.logoLocked = !s.meta.logoLocked;
        break;
      case "toggle-publisher-logo-lock":
        s.meta.publisherLogoLocked = !s.meta.publisherLogoLocked;
        break;
      case "remove-element":
        s.elements = (s.elements || []).filter(function (x) { return x.id !== el.dataset.elId; });
        if (selection && selection.kind === "element" && selection.elId === el.dataset.elId) selection = null;
        break;
      case "toggle-element-lock": {
        var targetEl = getElementById(el.dataset.elId);
        if (targetEl) targetEl.locked = !targetEl.locked;
        break;
      }
      case "var-auto":
        s.meta.overrides = s.meta.overrides || {};
        delete s.meta.overrides[el.dataset.varPath];
        break;
      case "var-manual":
        s.meta.overrides = s.meta.overrides || {};
        s.meta.overrides[el.dataset.varPath] = true;
        break;
      case "toggle-block-lock": {
        var bl = getBlockLayout(el.dataset.blockId);
        bl.locked = !bl.locked;
        break;
      }
      default:
        return;
    }
    scheduleSave();
    render();
  }

  function handleImageUpload(inputEl) {
    var file = inputEl.files && inputEl.files[0];
    if (!file) return;
    var path = inputEl.dataset.path;
    function setImage(src) {
      pushHistory();
      setPath(state(), path, src);
      scheduleSave();
      render();
    }
    if (!/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(file.type)) {
      uiAlert("Formato de imagem não aceito. Use PNG, JPG, GIF, WEBP ou SVG.");
      return;
    }
    // Otimiza e guarda como data:; ao salvar, vira referência do banco de
    // imagens local (uma cópia só) e, online, arquivo do Artifact (sem
    // reenviar o que já foi enviado). Ver internalizeImages/externalizeImages.
    optimizeImage(file).then(function (blob) {
      var reader = new FileReader();
      reader.onload = function (ev) { setImage(ev.target.result); };
      reader.readAsDataURL(blob);
    });
  }

  // Reduz imagens maiores que o necessário para impressão em A4 (lado maior
  // até 2000 px ≈ 240 dpi na largura da página) e regrava em JPEG quando não
  // há transparência. Só fica com a versão nova se ela for menor. SVG e GIF
  // passam como estão.
  var IMAGE_MAX_SIDE = 2000;
  function optimizeImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { resolve(file); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(w, h));
        if (scale === 1 && file.size <= 400 * 1024) { resolve(file); return; }
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        var g = c.getContext("2d");
        g.drawImage(img, 0, 0, c.width, c.height);
        var alpha = false;
        if (file.type !== "image/jpeg") {
          var px = g.getImageData(0, 0, c.width, c.height).data;
          for (var i = 3; i < px.length; i += 4 * 5) { if (px[i] < 255) { alpha = true; break; } }
        }
        c.toBlob(function (b) { resolve(b && b.size < file.size ? b : file); }, alpha ? "image/png" : "image/jpeg", 0.88);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------------------
     PDF na versão online — o Artifact não abre a janela de impressão, então
     cada página vira uma imagem A4 (html2canvas) num PDF (pdf-lib), com os
     links do texto continuando clicáveis por cima da imagem.
     pdf-lib (e não jsPDF): o jsPDF grava os links embutidos direto na
     página, fora do padrão — o Chrome aceita, mas leitores mais rígidos
     ignoram e o link "some". Aqui cada link é um objeto próprio do PDF.
     --------------------------------------------------------------------- */
  var PDF_LIBS = [
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"
  ];
  var pdfCapturing = false;
  var pdfLibsPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Não foi possível carregar " + src)); };
      document.head.appendChild(s);
    });
  }

  function loadPdfLibs() {
    if (!pdfLibsPromise) {
      pdfLibsPromise = loadScript(PDF_LIBS[0]).then(function () { return loadScript(PDF_LIBS[1]); });
      pdfLibsPromise.catch(function () { pdfLibsPromise = null; });
    }
    return pdfLibsPromise;
  }

  // Janela com as páginas do PDF já gerado. Resolve true (Baixar) ou false
  // (Cancelar / fechar / Esc). A confirmação do claude.ai vem depois, só no Baixar.
  function showPdfPreview(images, fileName, sizeBytes, linkCount) {
    return new Promise(function (resolve) {
      var box = document.getElementById("pdfPreview");
      var pages = document.getElementById("pdfPreviewPages");
      var info = document.getElementById("pdfPreviewInfo");
      var btnOk = document.getElementById("pdfPreviewDownload");
      var btnCancel = document.getElementById("pdfPreviewCancel");
      var btnX = document.getElementById("pdfPreviewClose");
      var kb = Math.max(1, Math.round(sizeBytes / 1024));
      info.textContent = fileName + " · " + images.length + (images.length === 1 ? " página" : " páginas") + " A4 · " +
        (kb > 1024 ? (kb / 1024).toFixed(1).replace(".", ",") + " MB" : kb + " KB") +
        " · " + linkCount + (linkCount === 1 ? " link clicável" : " links clicáveis");
      pages.innerHTML = images.map(function (src, i) {
        return '<figure class="pdf-preview-page" style="margin:0"><img src="' + src + '" alt="Página ' + (i + 1) + ' do PDF"><span>Página ' + (i + 1) + "</span></figure>";
      }).join("");
      pages.scrollTop = 0;
      box.hidden = false;
      btnOk.focus();

      function close(result) {
        box.hidden = true;
        pages.innerHTML = "";
        btnOk.removeEventListener("click", onOk);
        btnCancel.removeEventListener("click", onCancel);
        btnX.removeEventListener("click", onCancel);
        box.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onOk() { close(true); }
      function onCancel() { close(false); }
      function onKey(e) { if (e.key === "Escape") { e.preventDefault(); close(false); } }
      btnOk.addEventListener("click", onOk);
      btnCancel.addEventListener("click", onCancel);
      btnX.addEventListener("click", onCancel);
      box.addEventListener("keydown", onKey);
    });
  }

  async function exportPdf() {
    var btn = document.getElementById("btnPrint");
    var labelEl = document.getElementById("btnPrintLabel") || btn;
    var label = labelEl.textContent;
    var root = document.documentElement;
    var prevZoom = root.style.getPropertyValue("--ws-zoom");
    var prevScrollX = window.scrollX, prevScrollY = window.scrollY;
    var A4_W = 595.28, A4_H = 841.89; // pontos do PDF
    btn.disabled = true;
    labelEl.textContent = "Gerando PDF…";
    try {
      await loadPdfLibs();
      var PDFLib = window.PDFLib;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      var sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      pdfCapturing = true; // o zoom da página não pode voltar no meio da captura
      document.body.classList.add("pdf-capture");
      root.style.setProperty("--ws-zoom", "1");
      window.scrollTo(0, 0);
      var doc = await PDFLib.PDFDocument.create();
      var previews = [], linkCount = 0; // pré-visualização antes de baixar
      for (var n = 1; n <= 2; n++) {
        var page = document.getElementById("page" + n);
        var widthPx = page.offsetWidth;
        var heightPx = Math.min(page.offsetHeight, Math.round(PAGE_HEIGHT_PX));
        var canvas = await window.html2canvas(page, {
          scale: 2.5, useCORS: true, backgroundColor: "#ffffff", logging: false,
          width: widthPx, height: heightPx
        });
        var jpgUrl = canvas.toDataURL("image/jpeg", 0.92);
        previews.push(jpgUrl);
        var jpg = await doc.embedJpg(jpgUrl);
        var pdfPage = doc.addPage([A4_W, A4_H]);
        var imgH = A4_W * canvas.height / canvas.width;
        pdfPage.drawImage(jpg, { x: 0, y: A4_H - imgH, width: A4_W, height: imgH });

        // Posição de cada link medida na tela e convertida para a folha.
        // "scale" desconta qualquer zoom que ainda esteja aplicado na página
        // (offsetWidth ignora o zoom; getBoundingClientRect não).
        var pr = page.getBoundingClientRect();
        var scale = pr.width / widthPx || 1;
        var k = A4_W / widthPx; // px CSS -> pontos do PDF
        var annots = [];
        Array.prototype.forEach.call(page.querySelectorAll("a[href]"), function (a) {
          var href = a.getAttribute("href");
          if (!/^(https?:|mailto:)/i.test(href)) return;
          Array.prototype.forEach.call(a.getClientRects(), function (r) {
            var left = (r.left - pr.left) / scale, top = (r.top - pr.top) / scale;
            var w = r.width / scale, h = r.height / scale;
            if (w < 1 || h < 1 || top > heightPx) return;
            var x1 = left * k, x2 = (left + w) * k;
            var yTop = A4_H - top * k, yBottom = A4_H - (top + h) * k;
            annots.push(doc.context.register(doc.context.obj({
              Type: "Annot",
              Subtype: "Link",
              Rect: [x1, yBottom, x2, yTop],
              Border: [0, 0, 0],
              F: 4,
              A: { Type: "Action", S: "URI", URI: PDFLib.PDFString.of(href) }
            })));
          });
        });
        linkCount += annots.length;
        if (annots.length) pdfPage.node.set(PDFLib.PDFName.of("Annots"), doc.context.obj(annots));
      }
      pdfCapturing = false;
      document.body.classList.remove("pdf-capture");
      if (prevZoom) root.style.setProperty("--ws-zoom", prevZoom); else root.style.removeProperty("--ws-zoom");
      window.scrollTo(prevScrollX, prevScrollY);
      var bytes = await doc.save();
      btn.disabled = false;
      labelEl.textContent = label;
      // Mostra as páginas antes de baixar; o download só segue se a pessoa confirmar.
      var fileName = pdfBaseName() + ".pdf";
      var pdfBlob = new Blob([bytes], { type: "application/pdf" });
      if (await showPdfPreview(previews, fileName, pdfBlob.size, linkCount)) await offerFile(fileName, pdfBlob);
    } catch (e) {
      uiAlert("Não foi possível gerar o PDF. Verifique a conexão e tente de novo." + (e && e.message ? "\n\n(" + e.message + ")" : ""));
    } finally {
      pdfCapturing = false;
      document.body.classList.remove("pdf-capture");
      if (prevZoom) root.style.setProperty("--ws-zoom", prevZoom); else root.style.removeProperty("--ws-zoom");
      btn.disabled = false;
      labelEl.textContent = label;
    }
  }

  function handleStyleFieldChange(inputEl) {
    var field = inputEl.dataset.field;
    var value = inputEl.type === "number" ? (parseInt(inputEl.value, 10) || 1) : inputEl.value;
    if (inputEl.dataset.blockId) {
      pushHistory();
      getBlockLayout(inputEl.dataset.blockId)[field] = value;
      scheduleSave();
      render();
      return;
    }
    var elData = getElementById(inputEl.dataset.elId);
    if (!elData) return;
    pushHistory();
    elData[field] = value;
    scheduleSave();
    render();
  }

  // Campos da Fase 5 no painel: dados de uma fonte, fonte vinculada à
  // notícia, dado/variação/data de todos os cards e cor de cada card.
  function handlePhase5Change(t) {
    var s = state();
    pushHistory();
    if (t.dataset.sourceField) {
      var src = sourceById(s, t.dataset.sourceId);
      if (!src) return;
      var v = t.value.trim();
      if (t.dataset.sourceField === "url" && v) v = safeHref(v) || v;
      src[t.dataset.sourceField] = v;
      // Link colado com o veículo em branco: preenche pelo canal do domínio.
      if (t.dataset.sourceField === "url" && v && !plainText(src.veiculo) && hostOf(v)) src.veiculo = inferVeiculo(hostOf(v));
    } else if (t.dataset.newsSource != null) {
      var i = parseInt(t.dataset.newsSource, 10);
      var col = s.columns[i];
      if (!col) return;
      if (t.value === "__new") {
        var ns = createSource(s, i);
        selection = { kind: "source", sourceId: ns.id };
        showLeftTab("fontes");
        uiToast("Fonte criada a partir da notícia " + (i + 1) + ". Complete veículo, título e datas.");
      } else if (t.value) {
        col.sourceId = t.value;
      } else {
        delete col.sourceId;
      }
    } else if (t.dataset.tickerAll) {
      if (t.value === "" && t.dataset.tickerAll !== "refData") return;
      s.ticker.forEach(function (tk) { tk[t.dataset.tickerAll] = t.value; });
    } else if (t.dataset.tickerCor != null) {
      var tk = s.ticker[parseInt(t.dataset.tickerCor, 10)];
      if (tk) tk.modoCor = t.value;
    }
    scheduleSave();
    render();
  }

  // Tamanho de uma única caixa de texto (state.fieldFontScale[data-path], em %).
  function handleFieldFontChange(inputEl) {
    var path = inputEl.dataset.fieldFontPath;
    var value = parseInt(inputEl.value, 10);
    if (!path || isNaN(value)) return;
    value = Math.min(300, Math.max(50, value));
    pushHistory();
    var s = state();
    s.fieldFontScale = s.fieldFontScale || {};
    if (value === 100) delete s.fieldFontScale[path];
    else s.fieldFontScale[path] = value;
    scheduleSave();
    render();
  }

  // Campos soltos em meta (zoom/posição de recorte das logos) — não têm
  // dono block/elemento, então ficam fora do mecanismo genérico acima.
  function handleMetaFieldChange(inputEl) {
    var field = inputEl.dataset.metaField;
    var value = parseInt(inputEl.value, 10);
    if (isNaN(value)) return;
    pushHistory();
    state().meta[field] = value;
    scheduleSave();
    render();
  }

  /* ---------------------------------------------------------------------
     Delegação de eventos no workspace
     --------------------------------------------------------------------- */
  function initWorkspaceEvents() {
    var ws = document.getElementById("workspace");

    // Rastreia o campo com foco para empurrar o snapshot de desfazer só na
    // primeira edição de fato depois de focar nele (não a cada focusin, que
    // enchia a pilha com passos vazios de quem só clicou e saiu sem digitar).
    var historyArmedField = null;
    var historyPushedForFocus = false;

    ws.addEventListener("click", function (e) {
      // Links no texto viram <a href> de verdade para funcionar clicáveis
      // no PDF, mas dentro do editor um clique simples só posiciona o
      // cursor para editar; Ctrl+clique abre o link.
      var inlineLink = e.target.closest("a.inline-link");
      if (inlineLink) {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) window.open(inlineLink.href, "_blank", "noopener");
        return;
      }
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.preventDefault();
      handleAction(btn.dataset.action, btn);
    });

    // Só arma o campo — o snapshot em si só é empurrado no primeiro "input"
    // de fato (ver abaixo), não aqui, senão clicar e sair sem editar já
    // consumia um passo do histórico.
    ws.addEventListener("focusin", function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute("contenteditable")) {
        historyArmedField = e.target;
        historyPushedForFocus = false;
        // Clicar diretamente no texto (título, subtítulo, qualquer campo)
        // também seleciona o bloco/elemento dono dele, para abrir cor/fonte
        // no painel — sem isso, só cliques "ao lado" do texto selecionavam.
        var item = e.target.closest(".draggable-item");
        if (item) selectItem(item);
      }
    });

    // Edição de texto: grava no estado sem re-renderizar (preserva o cursor
    // e a seleção). Guarda o HTML sanitizado (não texto puro) para preservar
    // formatação por trecho aplicada via a barrinha de seleção (cor/fonte
    // por caractere, como no Word) — ver initTextFormatBubble().
    ws.addEventListener("input", function (e) {
      var el = e.target;
      if (!el.hasAttribute || !el.hasAttribute("contenteditable")) return;
      var path = el.dataset.path;
      if (!path) return;
      // Primeira edição de fato depois do foco: empurra o snapshot AGORA
      // (estado ainda não tem essa edição aplicada), antes de setPath.
      if (el === historyArmedField && !historyPushedForFocus) {
        pushHistory();
        historyPushedForFocus = true;
      }
      var value = sanitizeRichHtml(el.innerHTML);
      setPath(state(), path, value);
      // Campo automático editado à mão: passa a "manual" e para de
      // acompanhar as Variáveis da edição (dá para voltar no painel lateral).
      var s = state();
      if (s.meta.vars && isDerived(path) && !isOverridden(s, path)) {
        s.meta.overrides = s.meta.overrides || {};
        s.meta.overrides[path] = true;
        el.dataset.var = "manual";
        renderVarsBar();
        renderInspector();
      }
      // Termômetro: cor da variação e seta do Sinal acompanham a digitação
      var thm = /^thermometer\.groups\.(\d+)\.rows\.(\d+)\.(varDia|varSemana|var2026)$/.exec(path);
      if (thm) {
        var row = state().thermometer.groups[+thm[1]].rows[+thm[2]];
        el.classList.remove("v-up", "v-down");
        var sc = signClass(row[thm[3]]);
        if (sc) el.classList.add(sc);
        if (thm[3] === "varSemana") {
          var sinal = el.parentElement && el.parentElement.querySelector("td.sinal");
          if (sinal) { var trd = thermoTrend(row); sinal.className = "sinal trend-" + trd; sinal.textContent = trendArrow(trd); }
        }
      }
      // Variação de um card: cor e seta acompanham o sinal enquanto se digita
      var tm = /^ticker\.(\d+)\.change$/.exec(path);
      if (tm) {
        var tk = state().ticker[+tm[1]];
        var box = el.closest(".ticker-change");
        if (tk && box && tk.modoCor && tk.modoCor !== "seta") {
          box.className = "ticker-change trend-" + tickerColor(tk);
          var arrow = box.querySelector(".trend-arrow");
          if (arrow) arrow.textContent = trendArrow(tickerTrend(tk));
        }
      }
      if (path.indexOf(".relevancia") !== -1) {
        var row = el.closest("tr");
        var dot = row && row.querySelector(".relevance-dot");
        if (dot) dot.className = "relevance-dot " + relClass(el.innerText);
      }
      scheduleSave();
      // Não depende só do ResizeObserver (que nem sempre dispara a tempo):
      // digitar também reavalia o estouro de página, com o mesmo debounce.
      scheduleOverflowCheck();
    });

    // Colar sempre como texto puro: evita que formatação, imagens ou HTML
    // de outra origem entrem no boletim por fora do sistema de cor/fonte
    // próprio (mantém a tipografia consistente e fora de risco de XSS).
    ws.addEventListener("paste", function (e) {
      var el = e.target;
      if (!el.hasAttribute || !el.hasAttribute("contenteditable")) return;
      e.preventDefault();
      var clip = e.clipboardData || window.clipboardData;
      var text = clip ? clip.getData("text/plain") : "";
      document.execCommand("insertText", false, text);
    });

    // Evita que Enter dentro de campos de uma linha só quebre o layout
    ws.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var el = e.target;
      if (!el.hasAttribute || !el.hasAttribute("contenteditable")) return;
      var multiline = el.classList.contains("news-body") ||
        el.classList.contains("sq-body") || el.classList.contains("gloss-def") ||
        el.classList.contains("thermo-fontes-legenda") ||
        el.tagName === "P" || (el.dataset.path && el.dataset.path.indexOf("paragraphs.") !== -1);
      if (!multiline) e.preventDefault();
    });
  }

  /* ---------------------------------------------------------------------
     Arrastar/redimensionar genérico — usado pela logo, pelos blocos do
     template e por qualquer elemento livre (linha, faixa, caixa de texto).
     --------------------------------------------------------------------- */
  function isItemLocked(item) {
    if (state().locked) return true;
    if (item.dataset.kind === "logo") return !!state().meta.logoLocked;
    if (item.dataset.kind === "publisher-logo") return !!state().meta.publisherLogoLocked;
    if (item.dataset.kind === "block") {
      var bl = (state().blockLayout || {})[item.dataset.blockId];
      return !!(bl && bl.locked);
    }
    var elData = getElementById(item.dataset.elId);
    return !!(elData && elData.locked);
  }

  function getResizeTarget(item) {
    if (item.dataset.kind === "logo") return item.querySelector(".brand-logo-img");
    if (item.dataset.kind === "publisher-logo") return item.querySelector(".publisher-logo-img");
    return item;
  }

  var nextDragZ = 100;

  // Zoom atual do .workspace (atualizado por initWorkspaceZoom) — o
  // arrastar/redimensionar precisa descontar isso dos deltas de mouse,
  // já que eles chegam em pixels de tela (visuais), e posição/tamanho são
  // guardados em pixels lógicos (de antes do transform:scale()).
  var workspaceZoom = 1;

  function applyItemPosition(item, x, y) {
    if (item.dataset.kind === "logo") {
      state().meta.logoX = x;
      state().meta.logoY = y;
    } else if (item.dataset.kind === "publisher-logo") {
      state().meta.publisherLogoX = x;
      state().meta.publisherLogoY = y;
    } else if (item.dataset.kind === "block") {
      var bl = getBlockLayout(item.dataset.blockId);
      bl.x = x; bl.y = y;
    } else {
      var elData = getElementById(item.dataset.elId);
      if (elData) { elData.x = x; elData.y = y; }
    }
    item.dataset.x = x;
    item.dataset.y = y;
    scheduleSave();
  }

  function applyItemSize(item, w, h) {
    if (item.dataset.kind === "logo") {
      state().meta.logoWidth = w;
      if (h != null) state().meta.logoHeight = h;
    } else if (item.dataset.kind === "publisher-logo") {
      state().meta.publisherLogoWidth = w;
      if (h != null) state().meta.publisherLogoHeight = h;
    } else {
      var elData = getElementById(item.dataset.elId);
      if (elData) { elData.width = w; if (h != null) elData.height = h; }
    }
    scheduleSave();
  }

  function initDragResize() {
    var ws = document.getElementById("workspace");
    var drag = null;
    var MIN = 16;

    ws.addEventListener("pointerdown", function (e) {
      var item = e.target.closest(".draggable-item");
      if (!item) {
        if (!e.target.closest("[contenteditable], input, select, button, label")) {
          drag = { mode: "deselect" };
        }
        return;
      }
      var locked = isItemLocked(item);
      var handle = e.target.closest(".resize-handle");
      if (handle && !locked) {
        var target = getResizeTarget(item);
        // Lê o tamanho lógico (o que está salvo) direto do style, em vez
        // de getBoundingClientRect() — que devolve pixels já multiplicados
        // pelo zoom da tela, o que inflaria o valor salvo a cada arrasto.
        var logicalW = parseFloat(target.style.width) || target.getBoundingClientRect().width / workspaceZoom;
        var logicalH = parseFloat(target.style.height) || target.getBoundingClientRect().height / workspaceZoom;
        drag = {
          mode: "resize", item: item, target: target, resizeMode: item.dataset.resizeMode,
          startX: e.clientX, startY: e.clientY, startW: logicalW, startH: logicalH, lastW: null, lastH: null
        };
        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      var blocked = e.target.closest("[contenteditable], input, select, button, label, .resize-handle");
      if (blocked) return;
      // Blocos do modelo: clicar só seleciona (a ordem muda pelas camadas).
      if (!locked && item.dataset.kind !== "block") {
        item.style.zIndex = String(nextDragZ++);
        drag = {
          mode: "move", item: item, startX: e.clientX, startY: e.clientY,
          origX: parseFloat(item.dataset.x || 0), origY: parseFloat(item.dataset.y || 0),
          lastX: null, lastY: null
        };
        item.setPointerCapture(e.pointerId);
      } else {
        drag = { mode: "select-only", item: item };
      }
      e.preventDefault();
    });

    ws.addEventListener("pointermove", function (e) {
      if (!drag) return;
      // e.clientX/Y vêm em pixels de tela (visuais); posição e tamanho são
      // guardados em pixels lógicos (de antes do transform:scale() do
      // zoom) — sem dividir pelo zoom aqui, arrastar/redimensionar com
      // zoom != 100% move/cresce o elemento mais rápido que o mouse.
      if (drag.mode === "move") {
        var nx = drag.origX + (e.clientX - drag.startX) / workspaceZoom;
        var ny = drag.origY + (e.clientY - drag.startY) / workspaceZoom;
        drag.item.style.transform = "translate(" + nx + "px," + ny + "px)";
        drag.lastX = nx; drag.lastY = ny;
      } else if (drag.mode === "resize") {
        if (drag.resizeMode === "box") {
          var isLineOrBand = drag.item.dataset.elType === "line" || drag.item.dataset.elType === "band";
          var minSide = isLineOrBand ? 1 : MIN;
          var nw = Math.max(minSide, drag.startW + (e.clientX - drag.startX) / workspaceZoom);
          var nh = Math.max(minSide, drag.startH + (e.clientY - drag.startY) / workspaceZoom);
          drag.target.style.width = nw + "px";
          drag.target.style.height = nh + "px";
          drag.lastW = nw; drag.lastH = nh;
        } else if (drag.resizeMode === "square") {
          var dx = (e.clientX - drag.startX) / workspaceZoom, dy = (e.clientY - drag.startY) / workspaceZoom;
          var d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
          var nSq = Math.max(MIN, drag.startW + d);
          drag.target.style.width = nSq + "px";
          drag.target.style.height = nSq + "px";
          drag.lastW = nSq; drag.lastH = nSq;
        }
      }
    });

    function endDrag() {
      if (!drag) return;
      if (drag.mode === "deselect") {
        clearSelection();
      } else if (drag.mode === "select-only") {
        selectItem(drag.item);
      } else if (drag.mode === "move") {
        var moved = drag.lastX != null && (Math.abs(drag.lastX - drag.origX) > 3 || Math.abs(drag.lastY - drag.origY) > 3);
        if (moved) {
          pushHistory();
          applyItemPosition(drag.item, drag.lastX, drag.lastY);
        } else {
          selectItem(drag.item);
        }
      } else if (drag.mode === "resize" && drag.lastW != null) {
        pushHistory();
        applyItemSize(drag.item, drag.lastW, drag.lastH);
      }
      drag = null;
    }
    ws.addEventListener("pointerup", endDrag);
    ws.addEventListener("pointercancel", endDrag);
  }

  /* ---------------------------------------------------------------------
     Toolbar
     --------------------------------------------------------------------- */
  function initToolbar() {
    // Menu "⋯": abre/fecha; fecha ao escolher um item, ao clicar fora ou com Esc.
    var menuBtn = document.getElementById("btnMenu");
    var menu = document.getElementById("mainMenu");
    function setMenu(open) {
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenu(menu.hidden);
      if (!menu.hidden) { var first = menu.querySelector("button"); if (first) first.focus(); }
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("button")) setMenu(false);
    });
    document.addEventListener("mousedown", function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });

    // Status da edição (Rascunho/Revisado/Aprovado) — não sai no PDF
    document.getElementById("editionStatus").addEventListener("change", function (e) {
      state().meta.status = e.target.value;
      e.target.dataset.status = e.target.value;
      scheduleSave();
    });

    document.getElementById("editionSelect").addEventListener("change", function (e) {
      store.currentId = e.target.value;
      clearSelection(true);
      resetHistory();
      persist();
      render();
    });

    document.getElementById("btnNewEdition").addEventListener("click", function () {
      var id = uid();
      var data = store.customDefaultTemplate ? JSON.parse(JSON.stringify(store.customDefaultTemplate)) : blankTemplate();
      store.editions[id] = { id: id, name: "Nova edição", updatedAt: Date.now(), data: data };
      store.order.push(id);
      store.currentId = id;
      clearSelection(true);
      resetHistory();
      persist();
      render();
    });

    document.getElementById("btnSetDefault").addEventListener("click", function () {
      uiConfirm('Usar a edição atual ("' + current().name + '") como ponto de partida de toda "Nova edição"? Isso substitui o padrão personalizado anterior, se houver.', "Definir como padrão").then(function (yes) {
        if (!yes) return;
        store.customDefaultTemplate = JSON.parse(JSON.stringify(state()));
        persist();
        uiToast("Padrão definido: toda nova edição vai partir desta.");
      });
    });

    document.getElementById("btnClearDefault").addEventListener("click", function () {
      if (!store.customDefaultTemplate) {
        uiToast('Nenhum padrão personalizado: "Nova edição" já cria em branco.');
        return;
      }
      uiConfirm('Remover o padrão personalizado? "Nova edição" volta a criar uma edição em branco.', "Remover padrão").then(function (yes) {
        if (!yes) return;
        delete store.customDefaultTemplate;
        persist();
        uiToast("Padrão original restaurado.");
      });
    });

    document.getElementById("btnDuplicate").addEventListener("click", function () {
      var src = current();
      var id = uid();
      store.editions[id] = { id: id, name: src.name + " (cópia)", updatedAt: Date.now(), data: JSON.parse(JSON.stringify(src.data)) };
      var pos = store.order.indexOf(src.id);
      store.order.splice(pos + 1, 0, id);
      store.currentId = id;
      clearSelection(true);
      resetHistory();
      persist();
      render();
      uiToast("Edição duplicada. Atualize as variáveis da edição para a nova semana.");
    });

    document.getElementById("btnNextEdition").addEventListener("click", function () {
      var src = current();
      var data = nextEditionData(src.data);
      var v = data.meta.vars;
      var cob = parseIsoDate(v.coberturaInicio) && parseIsoDate(v.coberturaFim)
        ? " (cobertura " + ddmm(parseIsoDate(v.coberturaInicio)) + " a " + ddmm(parseIsoDate(v.coberturaFim)) + ")" : "";
      uiConfirm("Criar a Edição " + (v.edicao || "seguinte") + cob + " a partir desta? Layout e textos são copiados para você sobrescrever; " +
        "datas avançam 7 dias; fontes e status recomeçam. A edição atual não muda.", "Criar próxima edição").then(function (yes) {
        if (!yes) return;
        var id = uid();
        store.editions[id] = { id: id, name: v.edicao ? "Edição " + v.edicao : src.name + " (próxima)", updatedAt: Date.now(), data: data };
        store.order.splice(store.order.indexOf(src.id) + 1, 0, id);
        store.currentId = id;
        clearSelection(true);
        resetHistory();
        persist();
        render();
        uiToast("Edição " + (v.edicao || "seguinte") + " criada. Atualize notícias, cotações e fontes da semana.");
      });
    });

    document.getElementById("btnRename").addEventListener("click", function () {
      uiPrompt("Nome da edição:", current().name).then(function (name) {
        if (name && name.trim()) {
          current().name = name.trim();
          touchEdition(current());
          persist();
          render();
        }
      });
    });

    document.getElementById("btnDelete").addEventListener("click", function () {
      if (store.order.length <= 1) {
        uiAlert("Não é possível excluir a única edição existente.");
        return;
      }
      uiConfirm('Excluir a edição "' + current().name + '"? Esta ação não pode ser desfeita' +
        (cloud.mode === "online" ? " e vale para todos os seus aparelhos." : "."), "Excluir").then(function (yes) {
        if (!yes) return;
        var id = store.currentId;
        var pos = store.order.indexOf(id);
        delete store.editions[id];
        store.order.splice(pos, 1);
        notasDaEdicao(id).forEach(function (n) { saveNota(n, true); });
        store.currentId = store.order[Math.max(0, pos - 1)];
        cloudDeleteEdition(id);
        clearSelection(true);
        resetHistory();
        persist();
        render();
        uiToast("Edição excluída.");
      });
    });

    document.getElementById("btnExportJson").addEventListener("click", function () {
      var ed = current();
      // Arquivo portátil: imagens por extenso (sem depender do banco local)
      var exp = withInlineImages(ed.data);
      compactLayout(exp);
      offerFile("boletim_" + safeFileName(ed.name) + ".json", JSON.stringify(exp, null, 1));
    });

    document.getElementById("btnBackupAll").addEventListener("click", async function () {
      uiToast("Montando o backup…");
      try {
        var b = await buildBackup();
        var d = new Date();
        offerFile("boletim_backup_" + d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + ".json", JSON.stringify(b));
      } catch (e) {
        uiAlert("Não foi possível montar o backup. Tente exportar as edições uma a uma.");
      }
    });

    document.getElementById("btnImportJson").addEventListener("click", function () {
      document.getElementById("importFileInput").click();
    });

    document.getElementById("importFileInput").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("não é uma edição");
          if (data.formato === BACKUP_FORMATO) {
            var qtd = (data.edicoes || []).length;
            uiConfirm("Restaurar o backup de " + (String(data.exportadoEm || "").slice(0, 10).split("-").reverse().join("/") || "data desconhecida") +
              " com " + qtd + " edição(ões)? Elas entram como edições novas; as atuais não mudam.", "Restaurar").then(function (yes) {
              if (!yes) return;
              var n = restoreBackup(data);
              clearSelection(true);
              resetHistory();
              persist();
              render();
              uiToast(n + " edição(ões) restaurada(s) do backup.");
            });
            return;
          }
          ensureVars(data); // antes de fillDefaults (ver render)
          ensurePhase5(data);
          fillDefaults(data, blankTemplate());
          moveNewsLinksInline(data);
          var id = uid();
          store.editions[id] = { id: id, name: file.name.replace(/\.json$/i, ""), updatedAt: Date.now(), data: data };
          store.order.push(id);
          store.currentId = id;
          clearSelection(true);
          resetHistory();
          persist();
          render();
          uiToast("Edição \"" + store.editions[id].name + "\" importada.");
        } catch (err) {
          uiAlert("Não foi possível ler este arquivo como JSON válido.");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    // Exportar passa sempre pela Verificação (Fase 3), que substitui o
    // antigo aviso de estouro. O botão "Exportar" da janela chama isto.
    checkExportHandler = function () {
      // No Artifact a janela de impressão não abre: o PDF é montado aqui
      // mesmo (imagem de cada página + links clicáveis) e baixado.
      if (IN_ARTIFACT) { exportPdf(); return; }
      // Desktop: o aplicativo imprime direto em PDF (A4, sem margens, com
      // fundos e links), sem a janela de impressão.
      if (DESKTOP) {
        desktopCall({ tipo: "pdf", nome: pdfBaseName() + ".pdf" }).then(function (r) { desktopResult(r, "PDF"); });
        return;
      }
      // Testado nesta máquina (Chrome/Edge, headless via CDP Page.printToPDF):
      // sem forçar explicitamente, o PDF sai em tamanho Carta (612×792pt),
      // não A4 — ou seja, o @page{size:A4;margin:0}/print-color-adjust:exact
      // do CSS sozinho NÃO garante papel/margem corretos; a caixa de diálogo
      // do navegador ainda precisa das escolhas corretas de margem e fundo —
      // por isso a nota no rodapé da Verificação.
      // O navegador usa o título da página como nome sugerido do PDF.
      var prevTitle = document.title;
      document.title = pdfBaseName();
      window.print();
      document.title = prevTitle;
    };
    document.getElementById("btnPrint").addEventListener("click", openCheckDialog);

    // Variáveis da edição
    var varsBar = document.getElementById("varsBar");
    varsBar.addEventListener("change", function (e) {
      var field = e.target.dataset && e.target.dataset.varField;
      if (!field) return;
      var s = state();
      s.meta.vars = s.meta.vars || emptyVars();
      var value = e.target.value.trim();
      if (s.meta.vars[field] === value) return;
      pushHistory();
      s.meta.vars[field] = value;
      scheduleSave();
      render();
    });
    varsBar.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.matches("input")) e.target.blur();
    });

    document.getElementById("btnVarsAutoAll").addEventListener("click", function () {
      var s = state();
      var paths = Object.keys(DERIVED_FIELDS).filter(function (p) { return isOverridden(s, p); });
      if (!paths.length) return;
      var v = varsOf(s);
      var lista = paths.map(function (p) {
        var vai = DERIVED_FIELDS[p].gen(v, s);
        return "• " + DERIVED_FIELDS[p].label + (vai == null ? " (falta preencher alguma variável — o texto atual fica)" : "");
      }).join("\n");
      uiConfirm("Estes campos voltam a ser gerados pelas variáveis da edição. O texto que você escreveu neles será substituído:\n\n" + lista, "Usar automático").then(function (yes) {
        if (!yes) return;
        pushHistory();
        paths.forEach(function (p) { delete s.meta.overrides[p]; });
        scheduleSave();
        render();
      });
    });

    function targetPage() {
      return parseInt(document.getElementById("freeElPageSelect").value, 10) || 1;
    }

    document.getElementById("btnAddLine").addEventListener("click", function () {
      pushHistory();
      var s = state();
      s.elements = s.elements || [];
      var id = newElementId();
      s.elements.push({ id: id, page: targetPage(), type: "line", x: 30, y: 30, width: 200, height: 4, bgColor: "#0e1b3b", locked: false });
      selection = { kind: "element", elId: id };
      scheduleSave();
      render();
    });

    document.getElementById("btnAddBand").addEventListener("click", function () {
      pushHistory();
      var s = state();
      s.elements = s.elements || [];
      var id = newElementId();
      s.elements.push({ id: id, page: targetPage(), type: "band", x: 30, y: 30, width: 220, height: 120, bgColor: "#0e1b3b", locked: false });
      selection = { kind: "element", elId: id };
      scheduleSave();
      render();
    });

    document.getElementById("btnAddText").addEventListener("click", function () {
      pushHistory();
      var s = state();
      s.elements = s.elements || [];
      var id = newElementId();
      s.elements.push({
        id: id, page: targetPage(), type: "text", x: 30, y: 30, width: 220, height: 50,
        textColor: "#111111", bgColor: "transparent", fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 14, fontWeight: 400, text: "Texto", locked: false
      });
      selection = { kind: "element", elId: id };
      scheduleSave();
      render();
    });

    document.getElementById("chkLockAll").addEventListener("change", function (e) {
      pushHistory();
      state().locked = e.target.checked;
      scheduleSave();
      render();
    });

    document.getElementById("btnUndo").addEventListener("click", undo);
    document.getElementById("btnRedo").addEventListener("click", redo);
  }

  /* ---------------------------------------------------------------------
     Painel de edição — delegação de eventos
     --------------------------------------------------------------------- */
  function initInspectorEvents() {
    var insp = document.getElementById("inspector");

    insp.addEventListener("click", function (e) {
      var rmb = e.target.closest("[data-confirm-remove-block]");
      if (rmb) { e.preventDefault(); confirmRemoveBlock(rmb.dataset.confirmRemoveBlock); return; }
      var btn = e.target.closest("button[data-action]");
      if (!btn) return;
      e.preventDefault();
      handleAction(btn.dataset.action, btn);
    });

    insp.addEventListener("change", function (e) {
      var t = e.target;
      if (t.matches && t.matches('input[type="checkbox"][data-action]')) {
        handleAction(t.dataset.action, t);
        return;
      }
      if (t.classList.contains("img-input")) { handleImageUpload(t); return; }
      if (t.dataset && t.dataset.metaField) { handleMetaFieldChange(t); return; }
      if (t.dataset && t.dataset.fieldFontPath) { handleFieldFontChange(t); return; }
      if (t.dataset && t.dataset.canalField) { handleCanalChange(t); return; }
      if (t.dataset && (t.dataset.sourceField || t.dataset.newsSource != null || t.dataset.tickerAll || t.dataset.tickerCor != null)) {
        handlePhase5Change(t);
        return;
      }
      if (t.dataset && t.dataset.field) { handleStyleFieldChange(t); return; }
    });
  }

  /* ---------------------------------------------------------------------
     Formatação por seleção de texto — como no Word: selecionar um trecho
     de texto dentro de qualquer campo editável mostra uma barrinha
     flutuante para aplicar cor/fonte só naquele trecho, independente do
     resto do bloco (que continua controlado pelo painel esquerdo).
     --------------------------------------------------------------------- */
  function initTextFormatBubble() {
    var bubble = document.getElementById("textFormatBubble");
    var colorInput = document.getElementById("bubbleColor");
    var fontSelect = document.getElementById("bubbleFont");
    if (!bubble || !colorInput || !fontSelect) return;

    try { document.execCommand("styleWithCSS", false, true); } catch (e) { /* ignora se indisponível */ }

    var savedRange = null;

    function hideBubble() {
      bubble.hidden = true;
      savedRange = null;
    }

    function editableAncestorOf(node) {
      var el = node && (node.nodeType === 1 ? node : node.parentElement);
      return el && el.closest ? el.closest("[contenteditable]") : null;
    }

    // Observação de revisão sobre o trecho selecionado (autor ou revisor)
    var noteBtn = document.getElementById("bubbleNote");
    if (noteBtn) {
      noteBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
      noteBtn.addEventListener("click", function () {
        if (!savedRange) return;
        var ed = editableAncestorOf(savedRange.commonAncestorContainer);
        var holder = ed && ed.closest("[data-path]");
        var trecho = savedRange.toString();
        hideBubble();
        window.getSelection().removeAllRanges();
        startNota(holder ? holder.dataset.path : "edicao", trecho);
      });
    }
    var linkBtn = document.getElementById("bubbleLink");
    var linkRow = document.getElementById("bubbleLinkRow");
    var linkUrl = document.getElementById("bubbleLinkUrl");
    var linkApply = document.getElementById("bubbleLinkApply");
    var unlinkBtn = document.getElementById("bubbleUnlink");
    var currentAnchor = null;

    function anchorOf(node) {
      var el = node && (node.nodeType === 1 ? node : node.parentElement);
      return el && el.closest ? el.closest("a.inline-link") : null;
    }

    document.addEventListener("selectionchange", function () {
      // Digitando a URL no campo da barrinha: a seleção "sai" do texto,
      // mas a barrinha tem que continuar aberta com o trecho salvo.
      if (bubble.contains(document.activeElement)) return;
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { hideBubble(); return; }
      var range = sel.getRangeAt(0);
      var editable = editableAncestorOf(range.commonAncestorContainer);
      if (!editable || !editable.closest("#workspace")) { hideBubble(); return; }
      var rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) { hideBubble(); return; }
      savedRange = range.cloneRange();
      currentAnchor = anchorOf(range.startContainer) || anchorOf(range.endContainer);
      if (linkRow) {
        linkRow.hidden = !currentAnchor;
        linkUrl.value = currentAnchor ? currentAnchor.getAttribute("href") : "";
        unlinkBtn.hidden = !currentAnchor;
      }
      bubble.hidden = false;
      var top = rect.top - bubble.offsetHeight - 8;
      if (top < 4) top = rect.bottom + 8;
      var left = Math.max(4, Math.min(rect.left, window.innerWidth - bubble.offsetWidth - 4));
      bubble.style.top = top + "px";
      bubble.style.left = left + "px";
    });

    // Aplica no trecho salvo (não na seleção atual — que já pode ter sido
    // perdida ao focar o <input type="color"> ou o <select>).
    function applyToSavedSelection(fn) {
      if (!savedRange) return;
      var editable = editableAncestorOf(savedRange.commonAncestorContainer);
      if (editable) editable.focus();
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      fn();
      if (editable) editable.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Negrito/itálico/sublinhado no trecho selecionado — botões, não
    // inputs, então perderiam o foco do campo de texto ao clicar; o
    // mousedown com preventDefault evita isso (mesma seleção continua
    // ativa quando o "click" chega em applyToSavedSelection).
    [
      ["bubbleBold", "bold"],
      ["bubbleItalic", "italic"],
      ["bubbleUnderline", "underline"]
    ].forEach(function (pair) {
      var btn = document.getElementById(pair[0]);
      if (!btn) return;
      var command = pair[1];
      btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
      btn.addEventListener("click", function () {
        applyToSavedSelection(function () { document.execCommand(command); });
      });
    });

    colorInput.addEventListener("input", function () {
      applyToSavedSelection(function () {
        document.execCommand("foreColor", false, colorInput.value);
      });
    });

    fontSelect.addEventListener("change", function () {
      applyToSavedSelection(function () {
        if (fontSelect.value) {
          document.execCommand("fontName", false, fontSelect.value);
        } else {
          document.execCommand("removeFormat");
        }
      });
      fontSelect.value = "";
    });

    // Links: vários por campo — cada trecho selecionado recebe o seu.
    if (linkBtn && linkRow && linkUrl && linkApply && unlinkBtn) {
      linkBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
      linkBtn.addEventListener("click", function () {
        linkRow.hidden = false;
        linkUrl.focus();
        linkUrl.select();
      });

      var applyLink = function () {
        var href = safeHref(linkUrl.value);
        if (!href || !savedRange) return;
        var range = savedRange;
        applyToSavedSelection(function () {
          // Seleção dentro de um link que já existe: só troca o endereço dele,
          // em vez de criar um link dentro de outro.
          if (currentAnchor && currentAnchor.contains(range.commonAncestorContainer)) {
            currentAnchor.setAttribute("href", href);
          } else {
            document.execCommand("createLink", false, href);
          }
          var editable = editableAncestorOf(range.commonAncestorContainer);
          if (editable) {
            Array.prototype.forEach.call(editable.querySelectorAll("a[href]"), function (a) {
              a.className = "inline-link";
              a.target = "_blank";
              a.rel = "noopener";
              a.title = a.getAttribute("href") + " (Ctrl+clique para abrir)";
            });
          }
        });
        hideBubble();
      };

      linkApply.addEventListener("mousedown", function (e) { e.preventDefault(); });
      linkApply.addEventListener("click", applyLink);
      linkUrl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); applyLink(); }
        if (e.key === "Escape") { e.preventDefault(); hideBubble(); }
      });

      unlinkBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
      unlinkBtn.addEventListener("click", function () {
        if (!currentAnchor || !savedRange) return;
        // Remove o link inteiro (não só a parte selecionada dele).
        savedRange.selectNodeContents(currentAnchor);
        applyToSavedSelection(function () { document.execCommand("unlink"); });
        hideBubble();
      });
    }

    document.addEventListener("mousedown", function (e) {
      if (!bubble.hidden && !bubble.contains(e.target)) hideBubble();
    });
  }

  /* ---------------------------------------------------------------------
     Atalhos de teclado — Ctrl+Z desfaz, Ctrl+Shift+Z / Ctrl+Y refaz
     --------------------------------------------------------------------- */
  function initKeyboardShortcuts() {
    document.addEventListener("keydown", function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      var k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      // Dentro de um campo de texto, deixa o desfazer/refazer nativo do
      // navegador agir no próprio campo (o handler de "input" já regrava o
      // estado a partir do HTML resultante) — o atalho global, que desfaz a
      // edição inteira de uma vez, fica só para fora de campos de texto.
      var active = document.activeElement;
      if (active && active.hasAttribute && active.hasAttribute("contenteditable")) return;
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    });
  }

  /* ---------------------------------------------------------------------
     Altura real da barra de cima — o painel lateral (position:sticky)
     usa isso como "top" para nunca nascer por baixo dela, mesmo quando
     ela quebra linha (nome de edição comprido, janela estreita etc.).
     --------------------------------------------------------------------- */
  function initToolbarHeightVar() {
    var toolbar = document.getElementById("toolbar");
    if (!toolbar) return;
    function update() {
      document.documentElement.style.setProperty("--toolbar-h", toolbar.offsetHeight + "px");
    }
    update();
    if (window.ResizeObserver) {
      new ResizeObserver(update).observe(toolbar);
    } else {
      window.addEventListener("resize", update);
    }
  }

  /* ---------------------------------------------------------------------
     Zoom da página — só do .workspace (as páginas), nunca da barra de
     cima nem do painel lateral, que ficam fora dele no HTML.
     --------------------------------------------------------------------- */
  function initWorkspaceZoom() {
    var ws = document.getElementById("workspace");
    var wrap = document.getElementById("workspaceScaleWrap");
    var display = document.getElementById("zoomLevel");
    var btnOut = document.getElementById("btnZoomOut");
    var btnIn = document.getElementById("btnZoomIn");
    var btnReset = document.getElementById("btnZoomReset");
    if (!ws || !wrap) return;
    var MIN = 0.3, MAX = 2, STEP = 0.1;
    var zoom = 1;

    // transform:scale() não muda o espaço que o .workspace reserva no
    // documento (diferente de "zoom") — por isso ajustamos a altura do
    // wrap manualmente, senão a barra de rolagem fica errada e o fim da
    // página (com zoom >100%) fica inacessível.
    function apply() {
      // Durante a geração do PDF o zoom fica travado em 100% (ver exportPdf):
      // esconder os botões do editor muda a altura da página e dispararia
      // este ajuste no meio da captura, deslocando os links.
      if (pdfCapturing) return;
      document.documentElement.style.setProperty("--ws-zoom", zoom);
      workspaceZoom = zoom;
      if (display) display.textContent = Math.round(zoom * 100) + "%";
      var naturalHeight = ws.offsetHeight;
      wrap.style.height = (naturalHeight * zoom) + "px";
      updateBlockToolbar();
    }
    function setZoom(z) {
      zoom = Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));
      apply();
    }

    if (btnOut) btnOut.addEventListener("click", function () { setZoom(zoom - STEP); });
    if (btnIn) btnIn.addEventListener("click", function () { setZoom(zoom + STEP); });
    if (btnReset) btnReset.addEventListener("click", function () { setZoom(1); });
    var btnFit = document.getElementById("btnZoomFit");
    if (btnFit) btnFit.addEventListener("click", function () {
      var avail = wrap.clientWidth - 32;
      setZoom(Math.min(MAX, Math.floor(avail / (210 * 96 / 25.4 + 48) * 100) / 100));
    });

    // Ctrl+scroll sobre a página também ajusta o zoom (sem mexer no zoom
    // do navegador inteiro, só no workspace).
    ws.addEventListener("wheel", function (e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? STEP : -STEP));
    }, { passive: false });

    // A altura natural do .workspace muda com a edição/conteúdo (não só
    // com o zoom) — reaplica sempre que ela mudar, pra barra de rolagem
    // nunca ficar desatualizada.
    if (window.ResizeObserver) {
      // No quadro seguinte: ajustar a altura aqui mesmo pode fazer a barra de
      // rolagem aparecer/sumir e redisparar o observador no mesmo quadro.
      var roPending = false;
      new ResizeObserver(function () {
        if (roPending) return;
        roPending = true;
        requestAnimationFrame(function () { roPending = false; apply(); });
      }).observe(ws);
    }

    // Celular: abre com a folha A4 inteira cabendo na largura da tela.
    var pageWidthPx = 210 * 96 / 25.4 + 48;
    if (window.innerWidth < pageWidthPx) {
      setZoom(Math.floor((window.innerWidth - 16) / pageWidthPx * 100) / 100);
    } else {
      apply();
    }
  }

  /* ---------------------------------------------------------------------
     Ocultar/mostrar o painel lateral — a página centraliza no espaço
     cheio que sobra quando ele some.
     --------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------
     Tema do editor (claro / escuro / automático) — só a interface; a folha
     A4 continua papel branco. A escolha fica neste aparelho (localStorage,
     chave própria); "automático" segue o tema do claude.ai ou do sistema.
     --------------------------------------------------------------------- */
  var THEME_KEY = "boletimMaker.uiTheme";
  var THEME_CYCLE = ["auto", "dark", "light"];
  var THEME_INFO = {
    auto: ["auto", "Tema do editor: automático (segue o sistema). Clique para escuro."],
    dark: ["moon", "Tema do editor: escuro. Clique para claro."],
    light: ["sun", "Tema do editor: claro. Clique para automático."]
  };
  var THEME_NAMES = { auto: "automático", dark: "escuro", light: "claro" };

  function readTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return THEME_CYCLE.indexOf(t) !== -1 ? t : "auto";
    } catch (e) {
      return "auto";
    }
  }

  function applyTheme(t) {
    if (t === "auto") document.documentElement.removeAttribute("data-ui-theme");
    else document.documentElement.setAttribute("data-ui-theme", t);
    var btn = document.getElementById("btnTheme");
    if (btn) {
      btn.innerHTML = icon(THEME_INFO[t][0]);
      btn.title = THEME_INFO[t][1];
      btn.setAttribute("aria-label", THEME_INFO[t][1]);
    }
  }

  function initTheme() {
    var t = readTheme();
    applyTheme(t);
    var btn = document.getElementById("btnTheme");
    if (!btn) return;
    btn.addEventListener("click", function () {
      t = THEME_CYCLE[(THEME_CYCLE.indexOf(readTheme()) + 1) % THEME_CYCLE.length];
      setThemePref(t);
      uiToast("Tema do editor: " + THEME_NAMES[t] + ". A folha do boletim não muda.");
    });
  }
  function setThemePref(t) {
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* só não lembra da escolha */ }
    applyTheme(t);
    if (prefs.tema !== t) { prefs.tema = t; savePrefs(); }
  }

  /* ---------------------------------------------------------------------
     Configurações pessoais e atalhos ajustáveis
     Cada pessoa tem as suas: neste aparelho em localStorage
     ("boletimMaker.prefs"); online, também em data/users/<id>/prefs —
     subárvore privada do banco, que acompanha a conta em todos os
     aparelhos e que ninguém mais lê (nem o dono do boletim).
     Atalho = "Ctrl+Alt+Shift+Tecla" (ordem fixa). Só valem combinações com
     Ctrl/Alt ou teclas F1–F12, para nunca atrapalhar a digitação.
     --------------------------------------------------------------------- */
  var PREFS_KEY = "boletimMaker.prefs";
  var PREFS_PADRAO = { tema: "auto", zoom: "padrao", paineis: "visiveis", dicas: true, atalhos: {} };
  var prefs = JSON.parse(JSON.stringify(PREFS_PADRAO));
  var capturandoAtalho = null; // id do comando esperando a nova tecla

  function clickId(id) { var b = document.getElementById(id); if (b && !b.disabled) b.click(); }
  var COMANDOS = [
    { id: "ajuda", grupo: "Geral", nome: "Atalhos e configurações (esta janela)", padrao: "F1", run: function () { openSettings("atalhos"); } },
    { id: "salvar", grupo: "Geral", nome: "Salvar agora", padrao: "Ctrl+S", run: salvarAgora },
    { id: "verificar", grupo: "Geral", nome: "Verificar pendências", padrao: "F2", run: function () { clickId("btnCheck"); } },
    { id: "pdf", grupo: "Geral", nome: "Exportar PDF", padrao: "Ctrl+P", run: function () { clickId("btnPrint"); } },
    { id: "acervo", grupo: "Geral", nome: "Acervo de matérias (busca nas edições)", padrao: "F6", run: function () { openAcervo(); } },
    { id: "pauta", grupo: "Geral", nome: "Abrir ou fechar a Pauta da semana", padrao: "Ctrl+Alt+P", run: function () { setModo(modoAtual === "pauta" ? "pagina" : "pauta"); } },
    { id: "configuracoes", grupo: "Geral", nome: "Configurações", padrao: "Ctrl+,", run: function () { openSettings("interface"); } },
    { id: "calculadora", grupo: "Edição", nome: "Calculadora do termômetro", padrao: "F3", autor: true, run: function () { openThermoCalc(); } },
    { id: "observacao", grupo: "Edição", nome: "Nova observação (trecho selecionado, bloco ou geral)", padrao: "F4", run: notaRapida },
    { id: "noticia", grupo: "Edição", nome: "Adicionar notícia", padrao: "Ctrl+Alt+M", autor: true, run: function () { handleAction("add-column", document.createElement("button")); } },
    { id: "proxima", grupo: "Edição", nome: "Próxima edição", padrao: "Ctrl+Alt+N", autor: true, run: function () { clickId("btnNextEdition"); } },
    { id: "backup", grupo: "Edição", nome: "Backup completo", padrao: "Ctrl+Alt+B", run: function () { clickId("btnBackupAll"); } },
    { id: "edAnterior", grupo: "Navegação", nome: "Edição anterior da lista", padrao: "Alt+PageUp", run: function () { trocarEdicao(-1); } },
    { id: "edSeguinte", grupo: "Navegação", nome: "Edição seguinte da lista", padrao: "Alt+PageDown", run: function () { trocarEdicao(1); } },
    { id: "abaEstrutura", grupo: "Navegação", nome: "Painel: aba Estrutura", padrao: "Alt+1", run: function () { showLeftTab("estrutura"); } },
    { id: "abaFontes", grupo: "Navegação", nome: "Painel: aba Fontes", padrao: "Alt+2", run: function () { showLeftTab("fontes"); } },
    { id: "abaRevisao", grupo: "Navegação", nome: "Painel: aba Revisão", padrao: "Alt+3", run: function () { showLeftTab("revisao"); } },
    { id: "paineis", grupo: "Visual", nome: "Mostrar/ocultar painéis laterais", padrao: "Ctrl+\\", run: function () { clickId("btnToggleSidebar"); } },
    { id: "zoomAjustar", grupo: "Visual", nome: "Ajustar a página à largura", padrao: "Ctrl+Alt+0", run: function () { clickId("btnZoomFit"); } },
    { id: "zoomMais", grupo: "Visual", nome: "Aumentar zoom da página", padrao: "Ctrl+Alt+=", run: function () { clickId("btnZoomIn"); } },
    { id: "zoomMenos", grupo: "Visual", nome: "Diminuir zoom da página", padrao: "Ctrl+Alt+-", run: function () { clickId("btnZoomOut"); } },
    { id: "tema", grupo: "Visual", nome: "Alternar tema do editor", padrao: "Ctrl+Alt+T", run: function () { clickId("btnTheme"); } }
  ];
  // Fixos (do navegador ou do editor), listados para referência.
  var ATALHOS_FIXOS = [
    ["Ctrl+Z / Ctrl+Y", "Desfazer / refazer"], ["Ctrl+B / Ctrl+I / Ctrl+U", "Negrito, itálico e sublinhado no texto"],
    ["Delete", "Remover a notícia ou o elemento selecionado"], ["Ctrl+D", "Duplicar a notícia ou o elemento selecionado"],
    ["Setas (Shift = passo maior)", "Mover logos e elementos livres"], ["Esc", "Fechar janelas e menus"], ["Ctrl+roda do mouse", "Zoom da página"]
  ];
  // Combinações que o navegador não deixa a página usar (ou que fazem falta).
  var ATALHOS_RESERVADOS = ["Ctrl+T", "Ctrl+W", "Ctrl+N", "Ctrl+Shift+N", "Ctrl+Shift+T", "Ctrl+Tab", "Ctrl+L", "Ctrl+R", "F5", "F11", "F12",
    "Ctrl+Shift+I", "Ctrl+Shift+J", "Ctrl+F", "Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+A", "Ctrl+Z", "Ctrl+Y", "Ctrl+B", "Ctrl+I", "Ctrl+U", "Ctrl+D", "Alt+F4"];

  var CODIGO_TECLA = { Comma: ",", Period: ".", Slash: "/", Backslash: "\\", Equal: "=", Minus: "-", BracketLeft: "[", BracketRight: "]",
    Semicolon: ";", Quote: "'", Backquote: "`", Enter: "Enter", Space: "Espaço", PageUp: "PageUp", PageDown: "PageDown", Home: "Home", End: "End",
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Insert: "Insert", NumpadAdd: "=", NumpadSubtract: "-" };
  function comboDe(e) {
    // AltGr (teclado ABNT2) chega como Ctrl+Alt: é digitação (§, ¹, ², °), não atalho.
    if (e.getModifierState && e.getModifierState("AltGraph")) return null;
    var c = e.code || "", tecla = null;
    if (/^Key[A-Z]$/.test(c)) tecla = c.slice(3);
    else if (/^Digit\d$/.test(c)) tecla = c.slice(5);
    else if (/^Numpad\d$/.test(c)) tecla = c.slice(6);
    else if (/^F\d{1,2}$/.test(c)) tecla = c;
    else if (CODIGO_TECLA[c]) tecla = CODIGO_TECLA[c];
    if (!tecla) return null;
    return (e.ctrlKey || e.metaKey ? "Ctrl+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "") + tecla;
  }
  function comboValido(combo) { return !!combo && (/^(Ctrl|Alt)\+/.test(combo) || /(^|\+)F\d{1,2}$/.test(combo)); }
  function atalhoDe(id) {
    var c = COMANDOS.filter(function (x) { return x.id === id; })[0];
    return Object.prototype.hasOwnProperty.call(prefs.atalhos, id) ? prefs.atalhos[id] : (c ? c.padrao : "");
  }
  function kbd(combo) {
    return combo ? combo.split("+").map(function (p) { return "<kbd>" + esc(p) + "</kbd>"; }).join("<span class=\"kbd-plus\">+</span>") : '<span class="kbd-none">sem atalho</span>';
  }

  function loadPrefs() {
    var p = null;
    try { p = JSON.parse(localStorage.getItem(PREFS_KEY) || "null"); } catch (e) { /* padrões */ }
    if (p) mergePrefs(p);
    // Sem tema salvo nas configurações: vale o que já estava escolhido no botão de tema.
    if (!p || !p.tema || THEME_CYCLE.indexOf(prefs.tema) === -1) prefs.tema = readTheme();
  }
  function mergePrefs(p) {
    if (!p || typeof p !== "object") return;
    Object.keys(PREFS_PADRAO).forEach(function (k) { if (k in p) prefs[k] = p[k]; });
    prefs.atalhos = Object.assign({}, p.atalhos || {});
    prefs.salvoEm = p.salvoEm || 0;
  }
  function savePrefs() {
    prefs.salvoEm = Date.now();
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* só neste acesso */ }
    if (cloud.mode === "online" && cloud.db && viewer.id && viewer.id !== "local" && !/^anon_/.test(viewer.id)) {
      cloud.db.doc("data/users/" + viewer.id + "/prefs").set({ json: JSON.stringify(prefs), salvoEm: prefs.salvoEm }).catch(function () {});
    }
  }
  // Online: as configurações da conta (outro aparelho) valem se forem mais novas.
  function loadCloudPrefs() {
    if (!cloud.db || !viewer.id || viewer.id === "local" || /^anon_/.test(viewer.id)) return;
    cloud.db.doc("data/users/" + viewer.id + "/prefs").get().then(function (snap) {
      if (!snap || !snap.exists) { if (prefs.salvoEm) savePrefs(); return; }
      var body = snap.data();
      if ((body.salvoEm || 0) <= (prefs.salvoEm || 0)) return;
      mergePrefs(JSON.parse(body.json));
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ok */ }
      applyPrefs(false);
    }).catch(function () {});
  }

  // abrindo=true: também aplica zoom e painéis do jeito escolhido para abrir.
  function applyPrefs(abrindo) {
    if (readTheme() !== prefs.tema) { try { localStorage.setItem(THEME_KEY, prefs.tema); } catch (e) { /* ok */ } applyTheme(prefs.tema); }
    document.body.classList.toggle("hide-hints", prefs.dicas === false);
    if (abrindo) {
      if (prefs.zoom === "ajustar") clickId("btnZoomFit");
      else if (prefs.zoom === "100") clickId("btnZoomReset");
      if (prefs.paineis === "ocultos" && !document.body.classList.contains("panels-hidden")) clickId("btnToggleSidebar");
    }
  }

  function salvarAgora() {
    if (REVIEWER) { uiToast("Modo revisão: suas observações já são salvas na hora."); return; }
    clearTimeout(saveDebounce);
    var ok = persist();
    if (cloud.mode === "online") { clearTimeout(cloud.flushTimer); flushCloud(); }
    uiToast(ok ? "Salvo." : "Não foi possível salvar neste navegador — exporte o JSON.");
  }
  function trocarEdicao(dir) {
    var i = store.order.indexOf(store.currentId) + dir;
    if (i < 0 || i >= store.order.length) return;
    var sel = document.getElementById("editionSelect");
    sel.value = store.order[i];
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    uiToast(store.editions[store.order[i]].name);
  }
  function notaRapida() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      var node = sel.getRangeAt(0).commonAncestorContainer;
      var el = node.nodeType === 1 ? node : node.parentElement;
      var holder = el && el.closest && el.closest("#workspace [data-path]");
      if (holder) { var tr = sel.toString(); sel.removeAllRanges(); startNota(holder.dataset.path, tr); return; }
    }
    if (selection && selection.kind === "block") { startNota(selection.fieldPath || "block:" + selection.blockId, ""); return; }
    startNota("edicao", "");
  }

  function initAtalhos() {
    document.addEventListener("keydown", function (e) {
      if (capturandoAtalho) { capturarAtalho(e); return; }
      var combo = comboDe(e);
      if (!comboValido(combo)) return;
      // Com outra janela do app aberta, só vale o que é dela (Esc etc.).
      var aberta = ["appDialog", "checkDialog", "calcDialog", "pdfPreview", "acervoDialog"].some(function (id) { var d = document.getElementById(id); return d && !d.hidden; });
      var cmd = COMANDOS.filter(function (c) { return atalhoDe(c.id) === combo; })[0];
      if (!cmd || (aberta && cmd.id !== "ajuda")) return;
      if (cmd.autor && REVIEWER) return;
      e.preventDefault();
      e.stopPropagation();
      cmd.run();
    }, true);
  }

  function capturarAtalho(e) {
    if (["Control", "Alt", "Shift", "Meta"].indexOf(e.key) !== -1) return;
    e.preventDefault();
    e.stopPropagation();
    var id = capturandoAtalho;
    var msg = document.getElementById("settingsMsg");
    if (e.key === "Escape") { capturandoAtalho = null; renderSettings(); return; }
    if ((e.key === "Backspace" || e.key === "Delete") && !e.ctrlKey && !e.altKey) {
      prefs.atalhos[id] = "";
      capturandoAtalho = null; savePrefs(); renderSettings();
      return;
    }
    var combo = comboDe(e);
    if (!comboValido(combo)) { msg.textContent = "Use Ctrl ou Alt com outra tecla, ou uma tecla de F1 a F12 (assim o atalho não atrapalha a digitação)."; return; }
    if (ATALHOS_RESERVADOS.indexOf(combo) !== -1) { msg.textContent = combo + " é do navegador ou de edição de texto. Escolha outra combinação."; return; }
    var dono = COMANDOS.filter(function (c) { return c.id !== id && atalhoDe(c.id) === combo; })[0];
    if (dono) prefs.atalhos[dono.id] = "";
    prefs.atalhos[id] = combo;
    capturandoAtalho = null;
    savePrefs();
    renderSettings();
    document.getElementById("settingsMsg").textContent = dono ? combo + " saiu de \"" + dono.nome + "\" (ficou sem atalho)." : "";
  }

  var settingsAba = "atalhos";
  function openSettings(aba) {
    settingsAba = aba || settingsAba;
    capturandoAtalho = null;
    renderSettings();
    document.getElementById("settingsDialog").hidden = false;
    document.getElementById("settingsClose").focus();
  }
  function renderSettings() {
    var body = document.getElementById("settingsBody");
    if (!body) return;
    // Conta e Acesso só existem na plataforma própria; Acesso, só para o dono.
    var logado = IN_FIREBASE && viewer.id !== "local";
    if ((settingsAba === "conta" && !logado) || (settingsAba === "acesso" && !(logado && IS_OWNER))) settingsAba = "interface";
    document.querySelectorAll("#settingsDialog [data-settings-aba]").forEach(function (b) {
      if (b.dataset.settingsAba === "conta") b.hidden = !logado;
      if (b.dataset.settingsAba === "acesso") b.hidden = !(logado && IS_OWNER);
      b.classList.toggle("is-active", b.dataset.settingsAba === settingsAba);
      b.setAttribute("aria-selected", b.dataset.settingsAba === settingsAba ? "true" : "false");
    });
    var reset = document.getElementById("settingsReset");
    if (reset) reset.hidden = settingsAba === "conta" || settingsAba === "acesso" || settingsAba === "integracoes";
    var html = "";
    if (settingsAba === "conta") {
      html += '<div class="settings-row"><span>Conectado como</span><strong>' + esc(viewer.email || viewer.nome || "") + "</strong></div>" +
        '<div class="settings-row"><span>Papel</span><strong>' + (IS_OWNER ? "Autor (dono do boletim)" : REVIEWER ? "Revisor — lê e comenta" : "Editor — edita e comenta") + "</strong></div>" +
        '<div class="settings-row"><span>Endereço do boletim</span><code class="settings-url">' + esc(location.origin + location.pathname) + "</code></div>" +
        '<p class="prop-note">Em computador de outra pessoa, saia ao terminar: a cópia guardada neste navegador é apagada.</p>' +
        '<button type="button" class="check-btn" data-settings-act="sair">Sair desta conta</button>';
    } else if (settingsAba === "acesso") {
      var lista = function (titulo, chave, dica) {
        return '<div class="acesso-bloco"><div class="acesso-titulo">' + titulo + '</div><p class="prop-note">' + dica + "</p>" +
          (acessoAtual[chave].length ? '<ul class="acesso-lista">' + acessoAtual[chave].map(function (e) {
            return '<li><span>' + esc(e) + '</span><button type="button" class="check-link" data-settings-act="acesso-remover" data-lista="' + chave + '" data-email="' + esc(e) + '">remover</button></li>';
          }).join("") + "</ul>" : '<p class="kbd-none">Ninguém ainda.</p>') +
          '<form class="acesso-add" data-lista="' + chave + '"><input type="email" required placeholder="email@exemplo.com" aria-label="E-mail"><button type="submit" class="check-btn">Adicionar</button></form></div>';
      };
      if (pedidosAcesso.length) {
        html += '<div class="pedidos-bloco"><div class="acesso-titulo">Pedidos de acesso (' + pedidosAcesso.length + ")</div>" +
          pedidosAcesso.map(function (p) {
            var u = ' data-uid="' + esc(p.uid) + '"';
            return '<div class="pedido-item"><div class="pedido-quem">' + esc(p.nome || p.email) + '</div><div class="pedido-email">' + esc(p.email) + (p.criadoEm ? " · " + esc(quando(p.criadoEm)) : "") + "</div>" +
              (p.mensagem ? '<div class="pedido-msg">' + esc(p.mensagem) + "</div>" : "") +
              '<div class="pedido-acoes"><button type="button" class="check-btn primary" data-settings-act="pedido-aprovar" data-papel="editor"' + u + ">Aprovar: edita e comenta</button>" +
              '<button type="button" class="check-btn" data-settings-act="pedido-aprovar" data-papel="revisor"' + u + ">Aprovar: só comenta</button>" +
              '<button type="button" class="check-link" data-settings-act="pedido-recusar"' + u + ">recusar</button></div></div>";
          }).join("") + "</div>";
      }
      html += lista("Podem editar e comentar", "editores","Ex.: o professor. Editam o boletim junto com você, ao mesmo tempo, e deixam observações.") +
        lista("Só comentam", "revisores", "Leem tudo e deixam observações; não alteram o texto.") +
        '<p class="prop-note">Depois de adicionar, envie o endereço <strong>' + esc(location.origin + location.pathname) + "</strong>. A pessoa entra com o mesmo e-mail, pelo link de acesso ou pelo Google — sem senha e sem conta no Claude.</p>";
    } else if (settingsAba === "integracoes") {
      var tk = ghToken();
      html += '<div class="settings-row"><span>Repositório da coleta</span><code class="settings-url">' + esc(ghRepo()) + "</code></div>" +
        '<div class="settings-row"><span>Chave do GitHub neste aparelho</span><strong>' + (tk ? "Configurada (…" + esc(tk.slice(-4)) + ")" : "Não configurada") + "</strong></div>" +
        '<div class="integ-form"><input type="password" data-integ="token" autocomplete="off" placeholder="Cole a chave (github_pat_…)" aria-label="Chave do GitHub">' +
        '<button type="button" class="check-btn primary" data-settings-act="integ-salvar">Salvar e testar</button>' +
        (tk ? '<button type="button" class="check-btn" data-settings-act="integ-remover">Remover</button>' : "") + "</div>" +
        '<p class="prop-note">Para que serve: <strong>Buscar agora</strong> na aba Pauta e <strong>Exportar canais para a coleta</strong> direto, sem abrir o GitHub. Sem a chave, tudo funciona, mas essas duas ações abrem o GitHub ou baixam um arquivo.</p>' +
        '<p class="prop-note">Como criar (uma vez, ~2 min): abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → Fine-grained token</a>; em <em>Repository access</em> escolha <strong>Only select repositories → ' + esc(ghRepo().split("/")[1] || "") + "</strong>; em <em>Permissions → Repository</em> marque <strong>Actions: Read and write</strong> e <strong>Contents: Read and write</strong>; validade de até 1 ano; gere e cole aqui.</p>" +
        '<p class="prop-note">A chave fica <strong>só neste navegador</strong>: não vai para o servidor, para o backup nem para outras pessoas. Em computador de outra pessoa, remova ao terminar.</p>';
    } else if (settingsAba === "atalhos") {
      var grupo = null;
      html += '<table class="settings-keys">';
      COMANDOS.forEach(function (c) {
        if (c.grupo !== grupo) { grupo = c.grupo; html += '<tr class="settings-group"><td colspan="3">' + esc(grupo) + "</td></tr>"; }
        var combo = atalhoDe(c.id), capt = capturandoAtalho === c.id, mudou = combo !== c.padrao;
        html += "<tr" + (capt ? ' class="is-capturing"' : "") + "><td>" + esc(c.nome) + (c.autor && REVIEWER ? ' <span class="kbd-none">(só o autor)</span>' : "") + "</td>" +
          '<td class="settings-combo">' + (capt ? '<span class="settings-wait">Pressione a nova combinação… <small>(Esc cancela, Backspace remove)</small></span>' : kbd(combo)) + "</td>" +
          '<td class="settings-actions"><button type="button" class="check-btn" data-settings-act="alterar" data-cmd="' + c.id + '">' + (capt ? "Cancelar" : "Alterar") + "</button>" +
          (mudou ? '<button type="button" class="check-link" data-settings-act="padrao" data-cmd="' + c.id + '" title="Voltar para ' + esc(c.padrao) + '">padrão</button>' : "") + "</td></tr>";
      });
      html += '<tr class="settings-group"><td colspan="3">Fixos</td></tr>' + ATALHOS_FIXOS.map(function (f) {
        return '<tr class="is-fixed"><td>' + esc(f[1]) + '</td><td class="settings-combo">' + esc(f[0]) + "</td><td></td></tr>";
      }).join("") + "</table>";
    } else {
      var opt = function (nome, campo, lista) {
        return '<label class="settings-row"><span>' + nome + '</span><select data-pref="' + campo + '">' + lista.map(function (o) {
          return '<option value="' + o[0] + '"' + (String(prefs[campo]) === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
        }).join("") + "</select></label>";
      };
      html += opt("Tema do editor", "tema", [["auto", "Automático (segue o sistema)"], ["light", "Claro"], ["dark", "Escuro"]]) +
        opt("Zoom da página ao abrir", "zoom", [["padrao", "Automático (cabe na tela do celular)"], ["ajustar", "Ajustar à largura"], ["100", "100%"]]) +
        opt("Painéis laterais ao abrir", "paineis", [["visiveis", "Visíveis"], ["ocultos", "Ocultos (só a página)"]]) +
        opt("Textos de ajuda nos painéis", "dicas", [["true", "Mostrar"], ["false", "Ocultar (interface mais limpa)"]]) +
        '<p class="prop-note">' + (cloud.mode === "online" && viewer.id !== "local"
          ? "Estas configurações são só suas: acompanham a sua conta em todos os aparelhos e ninguém mais as vê."
          : "Estas configurações valem para este navegador. Na versão online, acompanham a sua conta em todos os aparelhos.") + "</p>";
    }
    body.innerHTML = html;
  }

  function initSettings() {
    var dlg = document.getElementById("settingsDialog");
    if (!dlg) return;
    loadPrefs();
    applyPrefs(true);
    initAtalhos();
    document.getElementById("btnSettings").addEventListener("click", function () { openSettings(IS_OWNER && IN_FIREBASE && pedidosAcesso.length ? "acesso" : "interface"); });
    document.getElementById("settingsClose").addEventListener("click", function () { capturandoAtalho = null; dlg.hidden = true; });
    document.getElementById("settingsReset").addEventListener("click", function () {
      uiConfirm(settingsAba === "atalhos" ? "Voltar todos os atalhos ao padrão?" : "Voltar as configurações de interface ao padrão?", "Restaurar").then(function (yes) {
        if (!yes) return;
        if (settingsAba === "atalhos") prefs.atalhos = {};
        else { ["zoom", "paineis", "dicas"].forEach(function (k) { prefs[k] = PREFS_PADRAO[k]; }); setThemePref("auto"); applyPrefs(false); }
        savePrefs();
        renderSettings();
      });
    });
    dlg.addEventListener("keydown", function (e) { if (e.key === "Escape" && !capturandoAtalho) dlg.hidden = true; });
    dlg.addEventListener("click", function (e) {
      var aba = e.target.closest("[data-settings-aba]");
      if (aba) { settingsAba = aba.dataset.settingsAba; capturandoAtalho = null; document.getElementById("settingsMsg").textContent = ""; renderSettings(); return; }
      var b = e.target.closest("[data-settings-act]");
      if (!b) return;
      if (b.dataset.settingsAct === "integ-salvar") {
        var campo = dlg.querySelector('[data-integ="token"]');
        var novo = (campo && campo.value || "").trim();
        if (!novo) { if (campo) campo.focus(); return; }
        var anterior = ghToken();
        ghSetToken(novo);
        var msgEl = document.getElementById("settingsMsg");
        msgEl.textContent = "Testando a chave…";
        ghApi("GET", "/repos/" + ghRepo() + "/actions/workflows/pauta.yml").then(function () {
          msgEl.textContent = "Chave salva e funcionando: a coleta pode ser acionada daqui.";
          renderSettings();
          renderPauta();
        }).catch(function (err) {
          ghSetToken(anterior);
          msgEl.textContent = "A chave não funcionou (" + (err.detalhe || err.message) + "). Confira se escolheu o repositório " + ghRepo() + " e a permissão Actions: Read and write.";
          renderSettings();
        });
        return;
      }
      if (b.dataset.settingsAct === "integ-remover") {
        ghSetToken("");
        document.getElementById("settingsMsg").textContent = "Chave removida deste navegador.";
        renderSettings();
        renderPauta();
        return;
      }
      if (b.dataset.settingsAct === "sair") {
        uiConfirm("Sair desta conta? O boletim continua salvo no servidor.", "Sair").then(function (yes) { if (yes) sairDaConta(); });
        return;
      }
      if (b.dataset.settingsAct === "pedido-aprovar" || b.dataset.settingsAct === "pedido-recusar") {
        responderPedido(b.dataset.uid, b.dataset.settingsAct === "pedido-aprovar" ? b.dataset.papel : null);
        pedidosAcesso = pedidosAcesso.filter(function (p) { return p.uid !== b.dataset.uid; });
        renderSettings();
        return;
      }
      if (b.dataset.settingsAct === "acesso-remover") {
        var l = b.dataset.lista;
        acessoAtual[l] = acessoAtual[l].filter(function (x) { return x !== b.dataset.email; });
        salvarAcesso();
        renderSettings();
        return;
      }
      if (b.dataset.settingsAct === "alterar") {
        capturandoAtalho = capturandoAtalho === b.dataset.cmd ? null : b.dataset.cmd;
        document.getElementById("settingsMsg").textContent = "";
        renderSettings();
      } else if (b.dataset.settingsAct === "padrao") {
        var cmd = b.dataset.cmd, combo = COMANDOS.filter(function (c) { return c.id === cmd; })[0].padrao;
        COMANDOS.forEach(function (c) { if (c.id !== cmd && atalhoDe(c.id) === combo) prefs.atalhos[c.id] = ""; });
        delete prefs.atalhos[cmd];
        savePrefs();
        renderSettings();
      }
    });
    dlg.addEventListener("submit", function (e) {
      var f = e.target.closest(".acesso-add");
      if (!f) return;
      e.preventDefault();
      var email = normEmail(f.querySelector("input").value), l = f.dataset.lista, outra = l === "editores" ? "revisores" : "editores";
      if (!email || email === normEmail(FB && FB.owner)) return;
      if (acessoAtual[l].indexOf(email) === -1) acessoAtual[l].push(email);
      acessoAtual[outra] = acessoAtual[outra].filter(function (x) { return x !== email; }); // um papel por pessoa
      salvarAcesso();
      renderSettings();
    });
    dlg.addEventListener("change", function (e) {
      var campo = e.target.dataset && e.target.dataset.pref;
      if (!campo) return;
      var v = e.target.value;
      if (campo === "tema") { setThemePref(v); return; }
      prefs[campo] = campo === "dicas" ? v === "true" : v;
      savePrefs();
      applyPrefs(false);
    });
  }

  function initSidebarToggle() {
    var btn = document.getElementById("btnToggleSidebar");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var hidden = document.body.classList.toggle("panels-hidden");
      btn.innerHTML = icon("panels") + (hidden ? "Mostrar painéis" : "Ocultar painéis");
      btn.title = hidden ? "Mostrar os painéis laterais de novo" : "Esconde os painéis laterais para ver só a página";
      updateBlockToolbar();
    });
  }

  /* ---------------------------------------------------------------------
     Atalhos com um item selecionado (fora de campos de texto):
     Delete remove, Ctrl+D duplica, setas movem logos e elementos livres
     (Shift = 10 px).
     --------------------------------------------------------------------- */
  function initSelectionShortcuts() {
    document.addEventListener("keydown", function (e) {
      if (!selection || REVIEWER) return;
      var a = document.activeElement;
      if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
      if (!document.getElementById("appDialog").hidden || !document.getElementById("checkDialog").hidden) return;
      var news = selection.kind === "block" && /^news-(\d+)$/.exec(selection.blockId);
      var fake = function (data) { var o = document.createElement("button"); Object.keys(data).forEach(function (k) { o.dataset[k] = data[k]; }); return o; };

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selection.kind === "element") { e.preventDefault(); handleAction("remove-element", fake({ elId: selection.elId })); }
        else if (news) { e.preventDefault(); handleAction("remove-column", fake({ index: news[1] })); uiToast("Notícia removida (Ctrl+Z desfaz)."); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selection.kind === "element") { e.preventDefault(); handleAction("duplicate-element", fake({ elId: selection.elId })); }
        else if (news) { e.preventDefault(); handleAction("duplicate-column", fake({ index: news[1] })); }
        return;
      }
      var dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (dirs[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var step = e.shiftKey ? 10 : 1, dx = dirs[e.key][0] * step, dy = dirs[e.key][1] * step;
        var s = state();
        if (s.locked) return;
        if (selection.kind === "element") {
          var fe = getElementById(selection.elId);
          if (!fe || fe.locked) return;
          e.preventDefault(); pushHistory(); fe.x = (fe.x || 0) + dx; fe.y = (fe.y || 0) + dy;
        } else if (selection.kind === "logo" && s.meta.logo && !s.meta.logoLocked) {
          e.preventDefault(); pushHistory(); s.meta.logoX = (s.meta.logoX || 0) + dx; s.meta.logoY = (s.meta.logoY || 0) + dy;
        } else if (selection.kind === "publisher-logo" && s.meta.publisherLogo && !s.meta.publisherLogoLocked) {
          e.preventDefault(); pushHistory(); s.meta.publisherLogoX = (s.meta.publisherLogoX || 0) + dx; s.meta.publisherLogoY = (s.meta.publisherLogoY || 0) + dy;
        } else {
          return;
        }
        scheduleSave();
        render();
      }
    });
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme(); // primeiro, para a tela já abrir no tema certo
    loadStore();
    initToolbar();
    initWorkspaceEvents();
    initInspectorEvents();
    initDragResize();
    initKeyboardShortcuts();
    initTextFormatBubble();
    initToolbarHeightVar();
    initWorkspaceZoom();
    initSidebarToggle();
    initCheckDialog();
    initLayers();
    initBlockToolbar();
    initSelectionShortcuts();
    initSourcesTab();
    initThermoCalc();
    initNotas();
    initSettings();
    initAcervo();
    initPauta();
    document.getElementById("btnThermoCalc").addEventListener("click", openThermoCalc);
    if (IN_ARTIFACT) {
      var btnPrint = document.getElementById("btnPrint");
      document.getElementById("btnPrintLabel").textContent = "Baixar PDF";
      var cleanBtn = document.getElementById("btnCleanAssets");
      cleanBtn.hidden = false;
      cleanBtn.addEventListener("click", cleanOrphanAssets);
      btnPrint.title = "Gera o PDF das duas páginas (A4), com os links clicáveis";
    }
    var vchip = document.getElementById("versionChip");
    if (vchip) vchip.title = "Versão " + APP_VERSION + (DESKTOP ? " · aplicativo para Windows (offline)" : IN_FIREBASE ? " · servidor próprio (Firebase)" : IN_ARTIFACT ? " · online" : " · navegador (local)");
    if (DESKTOP) {
      document.getElementById("btnPrintLabel").textContent = "Salvar PDF";
      document.getElementById("btnPrint").title = "Gera o PDF das duas páginas (A4), com os links clicáveis";
    }
    // Fechar a aba/janela logo depois de digitar: grava o que ainda estava
    // no intervalo do salvamento adiado.
    window.addEventListener("pagehide", function () { saveLocal(); });
    render();
    initPageOverflowWatch();
    connectCloud();
  });
})();
