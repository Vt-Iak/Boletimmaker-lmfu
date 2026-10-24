var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); }); window.addEventListener("unhandledrejection", function (e) { R.push("REJEIÇÃO: " + (e.reason && (e.reason.stack || e.reason.message || e.reason))); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function cur() { var s = JSON.parse(localStorage.getItem("boletimMaker.v1")); return s.editions[s.currentId]; }
function layer(id) { return $('#layersList .layer[data-layer-id="' + id + '"]'); }
var steps = [], i = 0; function step(f, w) { steps.push([f, w || 450]); }
function run() { if (i >= steps.length) { var p = document.createElement("pre"); p.id = "rm"; p.textContent = R.join("\n"); document.body.appendChild(p); return; } var s = steps[i++]; try { s[0](); } catch (e) { R.push("FALHA [exceção passo " + i + "] " + e.message); } setTimeout(run, s[1]); }
step(function () { ok("modelo tem texto da manchete", cur().data.headline.paragraphs.length === 3); layer("headline-body").click(); });
step(function () { $('#inspectorSelection [data-confirm-remove-block="headline-body"]').click(); });
step(function () { ok("pede confirmação", !$("#appDialog").hidden && /Excluir/.test($("#appDialogMsg").textContent)); $("#appDialogOk").click(); });
step(function () {
  var d = cur().data;
  ok("texto da manchete apagado e bloco excluído", d.headline.paragraphs.length === 0 && (d.blockLayout["headline-body"] || {}).removed === true);
  ok("some da página", getComputedStyle($('#workspace [data-block-id="headline-body"]')).display === "none");
  ok("sai da lista e vai para Excluídos", /Excluídos/.test($("#layersList").textContent) && !!layer("headline-body").querySelector("[data-layer-restore]"));
  layer("note").click();
});
step(function () { $('#inspectorSelection [data-confirm-remove-block="note"]').click(); });
step(function () { $("#appDialogOk").click(); });
step(function () {
  ok("nota excluída", cur().data.note === "" && (cur().data.blockLayout.note || {}).removed === true);
  layer("note").querySelector("[data-layer-restore]").click();
});
step(function () {
  ok("restaurar traz a nota de volta (vazia)", !(cur().data.blockLayout.note || {}).removed && getComputedStyle($('#workspace [data-block-id="note"]')).display !== "none");
  $("#btnUndo").click();
});
step(function () {
  ok("desfazer volta a excluída", (cur().data.blockLayout.note || {}).removed === true);
  $('#structurePanel .add-grid [data-action="add-paragraph"]').click();
});
step(function () {
  ok("+ Parágrafo restaura o texto da manchete", !(cur().data.blockLayout["headline-body"] || {}).removed && cur().data.headline.paragraphs.length === 1);
  $("#btnMenu").click(); $("#btnNewEdition").click();
});
step(function () {
  var d = cur().data;
  ok("edição nova já sem texto da manchete e sem nota", (d.blockLayout["headline-body"] || {}).removed && (d.blockLayout.note || {}).removed && /Excluídos/.test($("#layersList").textContent));
});
setTimeout(run, 900);
