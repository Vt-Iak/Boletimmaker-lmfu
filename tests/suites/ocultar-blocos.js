var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function cur() { var s = JSON.parse(localStorage.getItem("boletimMaker.v1")); return s.editions[s.currentId]; }
function layer(id) { return $('#layersList .layer[data-layer-id="' + id + '"]'); }
var h0, steps = [], i = 0; function step(f, w) { steps.push([f, w || 450]); }
function run() { if (i >= steps.length) { var p = document.createElement("pre"); p.id = "hd"; p.textContent = R.join("\n"); document.body.appendChild(p); return; } var s = steps[i++]; try { s[0](); } catch (e) { R.push("FALHA [exceção passo " + i + "] " + e.message); } setTimeout(run, s[1]); }
step(function () {
  var note = $('#workspace [data-block-id="note"]');
  h0 = note.getBoundingClientRect().height;
  ok("nota visível no começo", h0 > 0 && getComputedStyle(note).display !== "none");
  window.__used0 = $("#statusPage1").textContent;
  layer("note").querySelector("[data-layer-hide]").click();
});
step(function () {
  var note = $('#workspace [data-block-id="note"]');
  ok("olho da camada oculta a nota", getComputedStyle(note).display === "none" && (cur().data.blockLayout.note || {}).hidden === true);
  ok("camada marcada como oculta", layer("note").classList.contains("is-hidden-layer") && /oculto/.test(layer("note").textContent));
  ok("aviso explica como voltar", /olho nas Camadas/.test($("#toast").textContent));
  ok("página 1 usa menos espaço", $("#statusPage1").textContent !== window.__used0, window.__used0 + " → " + $("#statusPage1").textContent);
  layer("note").querySelector("[data-layer-hide]").click();
});
step(function () {
  ok("olho de novo mostra a nota", getComputedStyle($('#workspace [data-block-id="note"]')).display !== "none" && !(cur().data.blockLayout.note || {}).hidden);
  layer("note").click();
});
step(function () {
  var b = $('#inspectorSelection [data-action="toggle-block-hidden"]');
  ok("painel tem 'Ocultar este bloco'", !!b && /Ocultar este bloco/.test(b.textContent));
  b.click();
});
step(function () {
  ok("ocultar pelo painel", (cur().data.blockLayout.note || {}).hidden === true);
  ok("painel oferece 'Mostrar'", /Mostrar este bloco/.test($("#inspectorSelection").textContent));
  ok("mini barra some com o bloco oculto", $("#blockToolbar").hidden);
  $("#btnUndo").click();
});
step(function () {
  ok("desfazer devolve a nota", !(cur().data.blockLayout.note || {}).hidden && getComputedStyle($('#workspace [data-block-id="note"]')).display !== "none");
  // campo vazio de bloco oculto não é cobrado na verificação
  var d = $('#workspace [data-path="headline.deck"]'); d.focus(); d.textContent = ""; d.dispatchEvent(new Event("input", { bubbles: true })); d.blur();
  layer("headline-title").click();
});
step(function () {
  // oculta o resumo pela mini barra do bloco do resumo
  var deck = $('#workspace [data-block-id="headline-deck"]'); var r = deck.getBoundingClientRect(); var o = { bubbles: true, cancelable: true, clientX: r.left + 2, clientY: r.top + 2, pointerId: 1 };
  deck.dispatchEvent(new PointerEvent("pointerdown", o)); deck.dispatchEvent(new PointerEvent("pointerup", o));
  $('#blockToolbar [data-action="toggle-block-hidden"]').click();
});
step(function () {
  $("#btnCheck").click();
  ok("verificação não cobra campo de bloco oculto", !/Resumo da manchete/.test($("#checkList").textContent));
  $("#checkClose").click();
});
setTimeout(run, 900);
