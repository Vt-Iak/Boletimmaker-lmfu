var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message + " linha " + e.lineno); });
function ok(name, cond, extra) { R.push((cond ? "OK   " : "FALHA") + " " + name + (extra != null && !cond ? " — " + extra : "")); }
function $(s) { return document.querySelector(s); }
function W(p) { return document.querySelector('#workspace [data-path="' + p + '"]'); }
function st() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = st(); return s.editions[s.currentId]; }
function type(el, html) { el.focus(); el.innerHTML = html; el.dispatchEvent(new Event("input", { bubbles: true })); el.blur(); }
function items() { return Array.prototype.map.call(document.querySelectorAll("#checkList .check-item"), function (li) { return { lvl: li.querySelector(".check-icon").className.replace("check-icon lvl-", ""), title: li.querySelector(".check-item-title").textContent, desc: li.querySelector(".check-item-desc").textContent, li: li }; }); }
function find(re) { return items().filter(function (it) { return re.test(it.title); })[0]; }
var printed = 0, printTitle = null; window.print = function () { printed++; printTitle = document.title; };
var steps = [], i = 0;
function step(fn, wait) { steps.push([fn, wait == null ? 300 : wait]); }
function run() {
  if (i >= steps.length) { var p = document.createElement("pre"); p.id = "f3out"; p.textContent = R.join("\n"); document.body.appendChild(p); return; }
  var s = steps[i++];
  try { s[0](); } catch (e) { R.push("FALHA [exceção no passo " + i + "] " + e.message); }
  setTimeout(run, s[1]);
}

step(function () {
  var tl = document.querySelector('#layersList .layer[data-layer-id="ticker"]'); tl.click();
  var inp = document.querySelector('#inspectorSelection input[data-ticker-all="refData"]'); inp.value = "2026-04-24"; inp.dispatchEvent(new Event("change", { bubbles: true }));
}, 1200);
step(function () {
  ok("selo do Verificar mostra 3 (links)", !$("#checkBadge").hidden && $("#checkBadge").textContent === "3", $("#checkBadge").textContent);
  // Monta problemas: link com rótulo errado, número divergente, campo vazio, estouro, variável divergente
  type(W("columns.0.linkText"), '<a href="https://www.infomoney.com.br/x">Leia na Money Times →</a>');
  type(W("columns.1.linkText"), '<a href="https://www.bcb.gov.br/focus">Ver série do Focus →</a>');
  type(W("columns.2.linkText"), '<a href="https://www12.senado.leg.br/ifi">Relatório da IFI →</a>');
  type(W("ticker.2.value"), "US$ 100,58");          // Brent: texto cita US$ 90 e US$ 106,12
  type(W("headline.deck"), "");                       // resumo vazio
  type(W("masthead.line2"), "EDIÇÃO N° 04/2026 · COBERTURA 19 A 24 DE ABRIL"); // manual divergente
  type(W("headline.paragraphs.0"), new Array(300).join("texto longo que estoura a página "));
}, 1500);
step(function () {
  ok("selo atualiza ao editar (com erro em vermelho)", $("#checkBadge").classList.contains("has-error") && +$("#checkBadge").textContent === 5, $("#checkBadge").textContent);
  $("#btnCheck").click();
});
step(function () {
  var all = items();
  ok("janela abre pelo Verificar", !$("#checkDialog").hidden);
  ok("erro de estouro vem primeiro", all[0].lvl === "error" && /Página 1 estoura em/.test(all[0].title), all[0] && all[0].title);
  var lm = find(/rótulo da fonte não bate/);
  ok("rótulo x link detectado", lm && /Money Times/.test(lm.desc) && /infomoney\.com\.br/.test(lm.desc), lm && lm.desc);
  ok("links certos não acusam (BCB, IFI)", !find(/Notícia 2/) && !find(/Notícia 3/));
  var nm = find(/BRENT: card e texto divergem/);
  ok("número divergente detectado como revisar", nm && nm.lvl === "warn" && /US\$ 100,58/.test(nm.desc) && /US\$ 106,12/.test(nm.desc), nm && nm.desc);
  var em = find(/Resumo da manchete está vazio/);
  ok("campo vazio detectado", !!em);
  var vd = find(/diferente das variáveis/);
  ok("variável divergente detectada", vd && /Edição e cobertura/.test(vd.desc), vd && vd.desc);
  ok("resumo diz 5 pontos", /^5 pontos/.test($("#checkSummary").textContent), $("#checkSummary").textContent);
  ok("botões Exportar mesmo assim + Corrigir", $("#checkExport").textContent === "Exportar mesmo assim" && !$("#checkFix").hidden);
  // Ignorar o número divergente
  nm.li.querySelector("[data-check-ignore]").click();
}, 300);
step(function () {
  var nm = find(/BRENT/);
  ok("ignorar marca o item e reduz a contagem", nm && /ignorado/.test(nm.title) && /^4 pontos/.test($("#checkSummary").textContent) && $("#checkBadge").textContent === "4", $("#checkSummary").textContent);
  ok("ignorado fica salvo na edição", (cur().data.meta.ignoredChecks || []).some(function (k) { return /^num:/.test(k); }));
  // Ir ao campo
  find(/Resumo da manchete/).li.querySelector("[data-check-go]").click();
}, 600);
step(function () {
  ok("Preencher fecha a janela e foca o campo", $("#checkDialog").hidden && document.activeElement === W("headline.deck"));
  type(W("headline.deck"), "Resumo preenchido.");
  $("#btnCheck").click();
});
step(function () {
  ok("item some depois de corrigido", !find(/Resumo da manchete/) && /^3 pontos/.test($("#checkSummary").textContent), $("#checkSummary").textContent);
  $("#checkFix").click();
}, 300);
step(function () {
  ok("Corrigir pendências leva à primeira (estouro)", $("#checkDialog").hidden);
  // número mudou -> ignorado volta
  type(W("ticker.2.value"), "US$ 101,00");
  $("#btnCheck").click();
}, 600);
step(function () {
  var nm = find(/BRENT/);
  ok("ignorado volta se o conteúdo muda", nm && !/ignorado/.test(nm.title));
  var e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  $("#checkDialog").dispatchEvent(e);
  ok("Esc fecha", $("#checkDialog").hidden);
  // Imprimir abre a verificação; exportar mesmo assim chama a impressão com o nome certo
  $("#btnPrint").click();
  ok("Imprimir abre a verificação", !$("#checkDialog").hidden);
  $("#checkExport").click();
  ok("Exportar mesmo assim imprime com o nome do PDF", printed === 1 && printTitle === "boletim_2026-05_edicao" && $("#checkDialog").hidden, printed + " " + printTitle);
}, 300);
step(function () {
  // resolve tudo -> tudo verde
  type(W("headline.paragraphs.0"), "Curto.");
  type(W("columns.0.linkText"), '<a href="https://www.infomoney.com.br/x">Leia no InfoMoney →</a>');
  type(W("ticker.2.value"), "US$ 106,12");
  var l2 = W("masthead.line2"); l2.focus();
}, 300);
step(function () {
  $('#inspectorSelection [data-action="var-auto"]').click();
}, 300);
step(function () {
  ok("selo some sem pendências", $("#checkBadge").hidden, $("#checkBadge").textContent);
  $("#btnCheck").click();
  ok("tudo certo: só itens verdes", items().every(function (it) { return it.lvl === "ok" || it.lvl === "ignored"; }) && $("#checkSummary").textContent === "Tudo certo para exportar.", $("#checkSummary").textContent);
  ok("sem pendências o botão vira exportar", $("#checkFix").hidden && /Imprimir \/ Exportar PDF/.test($("#checkExport").textContent));
  $("#checkClose").click();
  ok("Fechar fecha", $("#checkDialog").hidden);
}, 600);
setTimeout(run, 1000);
