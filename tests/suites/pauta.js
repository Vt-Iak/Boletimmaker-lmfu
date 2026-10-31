// Aba Pauta: leitura do arquivo da coleta, filtros, temas, fontes, notícia,
// filtro de canais, Buscar agora (com e sem chave) e exportação dos canais.
// O GitHub é simulado (fetch); a amostra vem de tests/fixtures/pauta-exemplo.json. Resultado em <pre id="ptout">.
var PAUTA = /*FIXTURE:pauta-exemplo.json*/null;
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }
function loja() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = loja(); return s.editions[s.currentId]; }
function act(a, id) { var b = document.querySelector('#pautaView [data-pauta-act="' + a + '"]' + (id ? '[data-id="' + id + '"]' : "")); if (b) b.click(); return !!b; }
function campo(n, v, evento) { var el = document.querySelector('#pautaView [data-pauta-campo="' + n + '"]'); el.value = v; el.dispatchEvent(new Event(evento || "input", { bubbles: true })); }
var INDICE = { formato: "boletimMaker.pautas", versao: 1, pautas: [{ arquivo: "2026-10-19.json", tipo: "semana", termo: null, inicio: "2026-10-19", fim: "2026-10-23", geradoEm: PAUTA.geradoEm, temas: PAUTA.temas.length, materias: 34 }] };
var log = [], disparos = [], abertos = [];
var fetchOrig = window.fetch;
window.fetch = function (url, opts) {
  url = String(url);
  var metodo = (opts && opts.method) || "GET";
  log.push(metodo + " " + url.replace(/\?.*$/, ""));
  var json = function (o, st) { return Promise.resolve(new Response(JSON.stringify(o), { status: st || 200, headers: { "content-type": "application/json" } })); };
  if (/dispatches$/.test(url)) { disparos.push(JSON.parse(opts.body)); return Promise.resolve(new Response(null, { status: 204 })); }
  if (/actions\/workflows\/pauta\.yml$/.test(url)) return json({ id: 1, name: "Pauta" });
  // API de conteúdo (apagar pautas): GET com sha/base64, DELETE e PUT do índice
  var accept = (opts && opts.headers && opts.headers.Accept) || "";
  if (/api\.github\.com\/repos\/.+\/contents\/pautas\//.test(url) && !/raw/.test(accept)) {
    if (metodo === "DELETE") { window.__apagados = (window.__apagados || []).concat([url.replace(/^.*\/contents\//, "")]); return json({ commit: {} }); }
    if (metodo === "PUT") { window.__indicePut = JSON.parse(decodeURIComponent(escape(atob(JSON.parse(opts.body).content)))); window.__INDICE = window.__indicePut; return json({ content: {} }); }
    if (/index\.json/.test(url)) return json({ sha: "idx1", content: btoa(unescape(encodeURIComponent(JSON.stringify(window.__INDICE || INDICE)))) });
    return json({ sha: "arq1" });
  }
  if (/pautas\/index\.json/.test(url)) return json(window.__INDICE || INDICE);
  if (/pautas\/busca-/.test(url)) return json(window.__BUSCA);
  if (/pautas\/2026-10-19\.json/.test(url)) return json(PAUTA);
  if (/contents\/coleta\/canais\.json/.test(url)) {
    if (metodo === "PUT") { window.__canaisPut = JSON.parse(opts.body); return json({ content: { path: "coleta/canais.json" } }); }
    return json({ sha: "abc123" });
  }
  return fetchOrig.apply(this, arguments);
};
window.open = function (u) { abertos.push(String(u)); return null; };
var passos = [], i = 0, tentativas = 0;
function passo(fn, w) { passos.push([fn, w || 300]); }
function rodar() { var p = passos[i++]; if (!p) return; var r; try { r = p[0](); } catch (e) { R.push("ERRO " + e.message); } if (r === "esperar" && tentativas++ < 80) i--; setTimeout(rodar, p[1]); }
var n0 = PAUTA.temas.length;

passo(function () { $('[data-modo="pauta"]').click(); });
passo(function () {
  if (!$("#pautaTemas .pauta-tema")) return "esperar";
  ok("abre a aba Pauta pelo seletor Página | Pauta", !$("#pautaView").hidden && document.body.classList.contains("modo-pauta"));
  ok("lê a pauta da semana do GitHub", log.some(function (l) { return /raw\.githubusercontent\.com\/Vt-Iak\/Boletimmaker-lmfu\/main\/pautas\/2026-10-19\.json/.test(l); }), log.join(" | "));
  ok("lista os temas", $$("#pautaTemas .pauta-tema:not(.pauta-avulsas)").length === n0, $$("#pautaTemas .pauta-tema").length);
  ok("item de matérias avulsas", !!$("#pautaTemas .pauta-avulsas"));
  ok("detalhe do primeiro tema", $("#pautaDetalhe h3").textContent === PAUTA.temas[0].titulo);
  ok("selo de contagem no seletor", $("#pautaCount").textContent === String(n0));
  campo("q", "IPCA");
}, 450);
passo(function () {
  var n = $$("#pautaTemas .pauta-tema:not(.pauta-avulsas)").length;
  ok("filtro por palavra (sem acento/maiúsculas)", n >= 1 && n < n0, n);
  campo("q", "");
  act("grupo") ; // "Todos"
  var chip = document.querySelector('#pautaView [data-pauta-act="grupo"][data-valor="oficial"]'); chip.click();
}, 450);
passo(function () {
  var temas = $$("#pautaTemas .pauta-tema:not(.pauta-avulsas)");
  var esperado = PAUTA.temas.filter(function (t) { return t.materias.some(function (m) { return m.grupo === "oficial"; }); }).length;
  ok("filtro por grupo (Oficiais)", temas.length === esperado, temas.length + " de " + esperado);
  document.querySelector('#pautaView [data-pauta-act="grupo"][data-valor=""]').click();
  act("confirmar", PAUTA.temas[0].id);
}, 450);
passo(function () {
  var est = cur().data.pauta;
  ok("confirmar tema grava na edição", est && est.arquivo === "2026-10-19.json" && est.estado["2026-10-19.json"].temas[PAUTA.temas[0].id] === "confirmado", JSON.stringify(est));
  act("descartar", PAUTA.temas[1].id);
}, 450);
passo(function () {
  var card = document.querySelector('#pautaTemas .pauta-tema[data-id="' + PAUTA.temas[1].id + '"]');
  ok("descartar esmaece e manda para o fim", card.classList.contains("is-off") && card === $$("#pautaTemas .pauta-tema:not(.pauta-avulsas)")[n0 - 1]);
  act("desfazer", PAUTA.temas[1].id);
}, 450);
passo(function () {
  ok("desfazer descarte", !document.querySelector('#pautaTemas .pauta-tema[data-id="' + PAUTA.temas[1].id + '"]').classList.contains("is-off"));
  // Usar como fonte: primeira matéria do primeiro tema
  window.__m0 = PAUTA.temas[0].materias[0];
  window.__s0 = (cur().data.sources || []).length;
  act("usar", window.__m0.id);
}, 450);
passo(function () {
  var s = cur().data.sources || [];
  var nova = s[s.length - 1];
  ok("usar como fonte cria a fonte numerada", s.length === window.__s0 + 1 && nova.url === window.__m0.url && nova.veiculo === window.__m0.veiculo && /^\d{4}-\d{2}-\d{2}$/.test(nova.acessoEm), JSON.stringify(nova));
  ok("matéria marcada como fonte da edição", /Fonte \[\d+\] da edição/.test(document.querySelector("#pautaDetalhe .pauta-materia").textContent));
  // Link não confirmado (avulsa)
  act("sel-tema", "avulsas");
}, 450);
passo(function () {
  var semLink = PAUTA.avulsas.filter(function (m) { return m.linkConfirmado === false; })[0];
  window.__semLink = semLink;
  ok("avulsa sem link confirmado é sinalizada", /link a confirmar/.test($("#pautaDetalhe").textContent));
  act("usar", semLink.id);
});
passo(function () {
  ok("pede o endereço original", !$("#appDialog").hidden && !$("#appDialogInput").hidden && /Google Notícias/.test($("#appDialogMsg").textContent));
  $("#appDialogInput").value = "https://www.exemplo.com/outra-coisa";
  $("#appDialogOk").click();
});
passo(function () {
  ok("recusa endereço de outro site", !$("#appDialog").hidden && /precisa ser do próprio/.test($("#appDialogMsg").textContent), $("#appDialogMsg").textContent);
  $("#appDialogOk").click();
  act("usar", window.__semLink.id);
});
passo(function () {
  $("#appDialogInput").value = "https://www.reuters.com/markets/teste-endereco-original/";
  $("#appDialogOk").click();
}, 450);
passo(function () {
  var s = cur().data.sources;
  ok("aceita o endereço do próprio veículo", s[s.length - 1].url === "https://www.reuters.com/markets/teste-endereco-original/");
  // Criar notícia com um tema de 2+ frases
  var t = PAUTA.temas.filter(function (x) { return (x.resumoFrases || []).length >= 2; })[0];
  window.__t = t;
  window.__c0 = cur().data.columns.length;
  act("sel-tema", t.id);
  act("criar", t.id);
}, 450);
passo(function () {
  var cols = cur().data.columns, c = cols[cols.length - 1], t = window.__t;
  ok("criar notícia: volta para a página", !document.body.classList.contains("modo-pauta") && $("#pautaView").hidden);
  ok("notícia nova em rascunho com editoria e título", cols.length === window.__c0 + 1 && c.status === "rascunho" && c.tag === t.editoria && c.title === t.titulo, JSON.stringify({ tag: c.tag, status: c.status }));
  var links = (c.body.match(/class="inline-link"/g) || []).length;
  ok("cada frase do resumo leva o link da matéria de onde saiu", links === t.resumoFrases.length, links + " links para " + t.resumoFrases.length + " frases");
  var src = (cur().data.sources || []).filter(function (x) { return x.id === c.sourceId; })[0];
  ok("selo [n] aponta para a matéria principal", !!src && src.url === t.materias.filter(function (m) { return m.linkConfirmado !== false; })[0].url);
  ok("tema marcado como notícia criada", cur().data.pauta.estado["2026-10-19.json"].criadas[t.id] === true);
  // Filtro de canais: tira a Reuters da lista e reabre
  $("#tabBtnFontes").click();
  document.querySelector('#canaisList [data-canal-id="canal_reuters"]').click();
}, 500);
passo(function () { $('#inspectorSelection [data-action="remove-canal"]').click(); });
passo(function () { $("#appDialogOk").click(); });
passo(function () { $('[data-modo="pauta"]').click(); act("atualizar"); }, 600);
passo(function () {
  if (/Procurando|Carregando/.test($("#pautaPesquisa").textContent)) return "esperar";
  var texto = $("#pautaView").textContent;
  ok("matérias de canal fora da lista ficam ocultas", /ocultas \(canal fora da sua lista\)/.test(texto) && !/reuters\.com/.test($("#pautaDetalhe").textContent));
  // Gerenciar pautas sem chave: lista, mas não apaga; explica como fazer
  act("gerenciar");
});
passo(function () {
  if (!$("#pautasLista .pautas-item")) return "esperar";
  ok("gerenciar lista as pautas do repositório", !$("#pautasDialog").hidden && $$("#pautasLista .pautas-item").length === 1);
  ok("sem chave: não apaga e explica como fazer", $("#pautasApagar").disabled && $("#pautasLista input").disabled && /Integrações/.test($("#pautasNota").textContent));
  $("#pautasFechar").click();
  // Buscar agora sem chave: oferece configurar; recusando, abre o GitHub
  act("buscar");
});
passo(function () {
  ok("sem chave: oferece configurar", !$("#appDialog").hidden && /chave do GitHub/.test($("#appDialogMsg").textContent));
  $("#appDialogCancel").click();
});
passo(function () {
  ok("sem chave: abre o GitHub Actions", abertos.some(function (u) { return /github\.com\/Vt-Iak\/Boletimmaker-lmfu\/actions\/workflows\/pauta\.yml/.test(u); }), abertos.join(" | "));
  // Configurar a chave (Configurações → Integrações)
  $("#btnSettings").click();
  document.querySelector('#settingsDialog [data-settings-aba="integracoes"]').click();
  document.querySelector('#settingsBody [data-integ="token"]').value = "github_pat_TESTE1234";
  document.querySelector('#settingsBody [data-settings-act="integ-salvar"]').click();
}, 500);
passo(function () {
  if (/Testando/.test($("#settingsMsg").textContent)) return "esperar";
  ok("chave testada e salva só neste navegador", /funcionando/.test($("#settingsMsg").textContent) && JSON.parse(localStorage.getItem("boletimMaker.github")).token === "github_pat_TESTE1234", $("#settingsMsg").textContent);
  ok("chave não vai para as edições, configurações ou backup", localStorage.getItem("boletimMaker.v1").indexOf("github_pat_") === -1 && (localStorage.getItem("boletimMaker.prefs") || "").indexOf("github_pat_") === -1);
  $("#settingsClose").click();
  // Buscar agora com chave e palavra-chave
  var agora = new Date().toISOString();
  window.__INDICE = { formato: "boletimMaker.pautas", versao: 1, pautas: [{ arquivo: "busca-2026-10-25-petrobras.json", tipo: "busca", termo: "Petrobras", inicio: "2026-10-19", fim: "2026-10-23", geradoEm: agora, temas: 1, materias: 2 }].concat(INDICE.pautas) };
  window.__BUSCA = JSON.parse(JSON.stringify(PAUTA));
  window.__BUSCA.coleta.termo = "Petrobras";
  window.__BUSCA.temas = window.__BUSCA.temas.slice(0, 1);
  campo("termo", "Petrobras");
  act("buscar");
}, 500);
passo(function () {
  ok("dispara a coleta no GitHub com o termo", disparos.length === 1 && disparos[0].ref === "main" && disparos[0].inputs.termo === "Petrobras", JSON.stringify(disparos));
  ok("mostra que está buscando", /Buscando/.test($("#pautaPesquisa").textContent));
}, 1000);
passo(function () {
  if (!/Busca "Petrobras"/.test(($('#pautaView [data-pauta-campo="arquivo"]') || {}).textContent || "")) return "esperar";
  ok("abre sozinha a pauta da busca quando fica pronta", $('#pautaView [data-pauta-campo="arquivo"]').value === "busca-2026-10-25-petrobras.json" && $$("#pautaTemas .pauta-tema:not(.pauta-avulsas)").length === 1);
  // Apagar a busca (com chave): marca, apaga, confirma
  act("gerenciar");
}, 3000);
passo(function () {
  if ($$("#pautasLista .pautas-item").length !== 2) return "esperar";
  ok("busca marcada como aberta e como busca", /aberta/.test($$("#pautasLista .pautas-item")[0].textContent) && /busca/.test($$("#pautasLista .pautas-item")[0].textContent));
  var cb = document.querySelector('#pautasLista input[data-pautas-arq="busca-2026-10-25-petrobras.json"]');
  cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true }));
  ok("botão mostra quantas vão ser apagadas", !$("#pautasApagar").disabled && /Apagar 1 pauta/.test($("#pautasApagar").textContent));
  $("#pautasApagar").click();
});
passo(function () {
  ok("pede confirmação antes de apagar (por cima da janela)", !$("#appDialog").hidden && /Apagar a pauta busca-2026-10-25-petrobras\.json/.test($("#appDialogMsg").textContent) && /aberta agora/.test($("#appDialogMsg").textContent));
  $("#appDialogOk").click();
});
passo(function () {
  if (!window.__indicePut) return "esperar";
  ok("apaga o arquivo no GitHub", (window.__apagados || []).join(",") === "pautas/busca-2026-10-25-petrobras.json", JSON.stringify(window.__apagados));
  ok("tira a pauta do índice e mantém as outras", window.__indicePut.pautas.length === 1 && window.__indicePut.pautas[0].arquivo === "2026-10-19.json");
}, 600);
passo(function () {
  if ($('#pautaView [data-pauta-campo="arquivo"]').value !== "2026-10-19.json") return "esperar";
  ok("a pauta aberta apagada dá lugar à da semana", $$("#pautasLista .pautas-item").length === 1);
  $("#pautasFechar").click();
  // Exportar canais para a coleta: nenhum validado
  $('[data-modo="pagina"]').click();
  $("#btnExportCanais").click();
}, 3000);
passo(function () {
  ok("exportar exige canal validado", !$("#appDialog").hidden && /Nenhum canal validado/.test($("#appDialogMsg").textContent));
  $("#appDialogOk").click();
  document.querySelector('#canaisList [data-canal-id="canal_bcb"]').click();
});
passo(function () {
  var cb = document.querySelector('#inspectorSelection [data-canal-field="validado"]'); cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true }));
  ok("canal padrão tem prioridade e coleta (migração)", /Coleta da Pauta/.test($("#inspectorSelection").textContent) && document.querySelector('#inspectorSelection [data-canal-field="prioridade"]').value === "1");
  $("#btnExportCanais").click();
});
passo(function () {
  ok("avisa quantos ficam de fora", !$("#appDialog").hidden && /ficam fora da coleta/.test($("#appDialogMsg").textContent), $("#appDialogMsg").textContent);
  $("#appDialogOk").click();
}, 300);
passo(function () {
  if (!window.__canaisPut) return "esperar";
  var arq = JSON.parse(decodeURIComponent(escape(atob(window.__canaisPut.content))));
  ok("com chave: envia coleta/canais.json direto ao GitHub", window.__canaisPut.sha === "abc123" && window.__canaisPut.branch === "main");
  ok("arquivo só com canais validados, com prioridade e coleta", arq.formato === "boletimMaker.canais" && arq.canais.length === 1 && arq.canais[0].id === "canal_bcb" && arq.canais[0].prioridade === 1 && arq.canais[0].coleta.metodo === "atom", JSON.stringify(arq.canais));
  // Importar arquivo inválido
  $('[data-modo="pauta"]').click();
  var dt = new DataTransfer(); dt.items.add(new File(['{"x":1}'], "qualquer.json", { type: "application/json" }));
  var inp = $("#pautaImport"); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
});
passo(function () {
  if ($("#appDialog").hidden) return "esperar";
  ok("importar recusa arquivo que não é pauta", /não é uma pauta/.test($("#appDialogMsg").textContent));
  $("#appDialogOk").click();
  var p = document.createElement("pre"); p.id = "ptout"; p.textContent = R.join("\n"); document.body.appendChild(p);
});
setTimeout(rodar, 900);
