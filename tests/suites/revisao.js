// Observações de revisão (modo local). Resultado em <pre id="rvout">.
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }
function loja() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function notas() { var n = loja().notas || {}; return Object.keys(n).map(function (k) { return n[k]; }); }
function W(p) { return document.querySelector('#workspace [data-path="' + p + '"]'); }
var baixados = [];
var BlobOrig = window.Blob;
window.Blob = function (partes, opts) { if (partes && typeof partes[0] === "string") baixados.push(partes[0]); return new BlobOrig(partes, opts); };
URL.createObjectURL = function () { return "blob:teste"; };
HTMLAnchorElement.prototype.click = function () {};
var passos = [], i = 0;
function passo(fn, w) { passos.push([fn, w || 250]); }
function rodar() { var p = passos[i++]; if (!p) return; try { p[0](); } catch (e) { R.push("ERRO " + e.message); } setTimeout(rodar, p[1]); }

passo(function () {
  ok("aba Revisão existe e começa sem observações", !!$("#tabBtnRevisao") && $("#notasCount").textContent === "");
  // Seleciona um trecho do título da manchete -> barrinha -> observação
  var t = W("headline.title");
  var range = document.createRange();
  range.setStart(t.firstChild, 0); range.setEnd(t.firstChild, 5);
  var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
});
passo(function () {
  ok("barrinha mostra o botão de observação", !$("#textFormatBubble").hidden && !!$("#bubbleNote"));
  $("#bubbleNote").click();
});
passo(function () {
  ok("abre a aba Revisão com a caixa de nova observação", !$("#tabRevisao").hidden && !!$("#notaTexto"));
  ok("caixa mostra o alvo e o trecho", /Título da manchete/.test($(".nota-composer").textContent) && $(".nota-composer .nota-trecho").textContent === "Ormuz", $(".nota-composer").textContent.slice(0, 80));
  $("#notaTexto").value = "Título longo: tente reduzir para uma linha.";
  $("#notaTexto").dispatchEvent(new Event("input", { bubbles: true }));
  $('[data-nota-action="salvar"]').click();
});
passo(function () {
  var n = notas();
  ok("observação salva fora da edição", n.length === 1 && n[0].alvo === "headline.title" && n[0].trecho === "Ormuz" && n[0].status === "aberta", JSON.stringify(n[0] || {}).slice(0, 120));
  ok("não altera o conteúdo da edição", loja().editions[loja().currentId].data.headline.title.indexOf("Ormuz") === 0);
  ok("contador da aba", $("#notasCount").textContent === "1");
  var pin = $("#workspace .nota-pin");
  ok("marcador na página, só na tela", !!pin && pin.classList.contains("no-print"));
  // Verificar mostra a pendência
  $("#btnCheck").click();
});
passo(function () {
  ok("Verificar lista a observação em aberto", /observação de revisão em aberto/.test($("#checkList").textContent), $("#checkList").textContent.slice(0, 100));
  $("#checkClose").click();
  // Observação de bloco pela barra do bloco
  var bl = document.querySelector('#workspace [data-block-id="thermo"]');
  var r = bl.getBoundingClientRect();
  var o = { bubbles: true, cancelable: true, clientX: r.left + 30, clientY: r.top + 6, pointerId: 1 };
  bl.dispatchEvent(new PointerEvent("pointerdown", o)); bl.dispatchEvent(new PointerEvent("pointerup", o)); bl.dispatchEvent(new MouseEvent("click", o));
});
passo(function () {
  var b = $('#blockToolbar [data-action="add-nota"]');
  ok("barra do bloco tem o botão de observação", !!b);
  if (b) b.click();
});
passo(function () {
  ok("observação de bloco aponta o termômetro", /Termômetro/i.test(($(".nota-composer") || {}).textContent || ""), ($(".nota-composer") || {}).textContent);
  $("#notaTexto").value = "Conferir a fonte do Brent.";
  $('[data-nota-action="salvar"]').click();
});
passo(function () {
  ok("duas observações em aberto", $("#notasCount").textContent === "2");
  var card = $$("#notasList .nota-card")[0];
  card.querySelector('[data-nota-action="responder"]').click();
  card.querySelector(".nota-reply textarea").value = "Reduzi, veja agora.";
  card.querySelector('[data-nota-action="enviar-resposta"]').click();
});
passo(function () {
  var n = notas().filter(function (x) { return x.alvo === "headline.title"; })[0];
  ok("resposta registrada", n.respostas.length === 1 && n.respostas[0].texto === "Reduzi, veja agora.");
  $$("#notasList .nota-card")[0].querySelector('[data-nota-action="status"]').click();
});
passo(function () {
  ok("resolver tira da contagem", $("#notasCount").textContent === "1" && notas().filter(function (x) { return x.status === "resolvida"; }).length === 1);
  $('[data-nota-action="filtro"][data-value="resolvidas"]').click();
});
passo(function () {
  ok("filtro de resolvidas", $$("#notasList .nota-card.is-resolved").length === 1 && $$("#notasList .nota-card").length === 1);
  $("#btnBackupAll").click();
}, 900);
passo(function () {
  var t = baixados[baixados.length - 1], j = t ? JSON.parse(t) : {};
  ok("backup leva as observações", (j.notas || []).length === 2);
  // Próxima edição não herda observações
  $("#btnNextEdition").click();
});
passo(function () { $("#appDialogOk").click(); });
passo(function () {
  ok("edição nova começa sem observações", $("#notasCount").textContent === "" && $$("#workspace .nota-pin").length === 0);
  $("#editionSelect").value = loja().order[0];
  $("#editionSelect").dispatchEvent(new Event("change", { bubbles: true }));
});
passo(function () {
  $('[data-nota-action="filtro"][data-value="todas"]').click();
  var card = Array.prototype.filter.call($$("#notasList .nota-card"), function (c) { return /Brent/.test(c.textContent); })[0];
  card.querySelector('[data-nota-action="excluir"]').click();
});
passo(function () { $("#appDialogOk").click(); });
passo(function () {
  ok("excluir com confirmação", notas().length === 1 && $("#notasCount").textContent === "");
  var p = document.createElement("pre"); p.id = "rvout"; p.textContent = R.join("\n"); document.body.appendChild(p);
});
setTimeout(rodar, 900);
