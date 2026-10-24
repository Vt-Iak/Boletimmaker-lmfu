// Acervo de matérias (busca em todas as edições). Resultado em <pre id="acout">.
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }
function loja() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = loja(); return s.editions[s.currentId]; }
function busca(t) { var b = $("#acervoBusca"); b.value = t; b.dispatchEvent(new Event("input", { bubbles: true })); }
function tipo(v) { var t = $("#acervoTipo"); t.value = v; t.dispatchEvent(new Event("change", { bubbles: true })); }
var baixados = [];
var BlobOrig = window.Blob;
window.Blob = function (partes, opts) { if (partes && typeof partes[0] === "string") baixados.push(partes[0]); return new BlobOrig(partes, opts); };
URL.createObjectURL = function () { return "blob:teste"; };
HTMLAnchorElement.prototype.click = function () {};
var passos = [], i = 0;
function passo(fn, w) { passos.push([fn, w || 250]); }
function rodar() { var p = passos[i++]; if (!p) return; try { p[0](); } catch (e) { R.push("ERRO " + e.message); } setTimeout(rodar, p[1]); }

passo(function () { $("#btnNextEdition").click(); });
passo(function () { $("#appDialogOk").click(); });
passo(function () {
  // Na edição nova, muda o título da notícia 1 para diferenciar
  var t = document.querySelector('#workspace [data-path="columns.0.title"]');
  t.focus(); t.textContent = "Selic segue em 14,75% e Copom sinaliza pausa"; t.dispatchEvent(new Event("input", { bubbles: true })); t.blur();
  $("#btnAcervo").click();
});
passo(function () {
  ok("acervo abre com todas as edições", !$("#acervoDialog").hidden && /em 2 edições/.test($("#acervoTotal").textContent), $("#acervoTotal").textContent);
  busca("selic");
}, 300);
passo(function () {
  var itens = $$("#acervoLista .acervo-item");
  ok("busca sem acento/maiúsculas acha nas duas edições", itens.length >= 2 && /2 edições/.test($("#acervoResumo").textContent), $("#acervoResumo").textContent);
  ok("termo destacado", !!$("#acervoLista mark") && /selic/i.test($("#acervoLista mark").textContent));
  ok("mais recente primeiro", /06\/2026/.test(itens[0].querySelector(".acervo-meta").textContent), itens[0].querySelector(".acervo-meta").textContent);
  tipo("glossario");
  busca("");
}, 300);
passo(function () {
  var itens = $$("#acervoLista .acervo-item");
  ok("filtro por tipo (glossário)", itens.length > 0 && Array.prototype.every.call(itens, function (li) { return /Glossário/.test(li.querySelector(".chip").textContent); }));
  tipo("noticia");
  busca("Pacote eleitoral");
}, 300);
passo(function () {
  var li = Array.prototype.filter.call($$("#acervoLista .acervo-item"), function (x) { return /Edição 05\/2026 \(modelo\)/.test(x.textContent); })[0];
  window.__n0 = cur().data.columns.length;
  li.querySelector('[data-acervo-act="copiar"]').click();
}, 300);
passo(function () {
  var cols = cur().data.columns;
  ok("copiar para a edição aberta", cols.length === window.__n0 + 1 && /Pacote eleitoral/.test(cols[cols.length - 1].title) && cols[cols.length - 1].status === "rascunho", cols.length);
  $("#acervoCsv").click();
}, 300);
passo(function () {
  var csv = baixados[baixados.length - 1] || "";
  ok("planilha .csv com cabeçalho e acentos (BOM)", csv.charCodeAt(0) === 0xfeff && csv.slice(1, 60).indexOf("Edição;Data;Tipo;Editoria;Título;Texto;Status;Links") === 0, csv.slice(0, 60));
  busca("Ormuz");
  tipo("manchete");
}, 300);
passo(function () {
  var li = Array.prototype.filter.call($$("#acervoLista .acervo-item"), function (x) { return /05\/2026 \(modelo\)/.test(x.textContent); })[0];
  ok("manchete de outra edição tem 'Abrir a edição'", !!li && /Abrir a edição/.test(li.textContent));
  li.querySelector('[data-acervo-act="abrir"]').click();
}, 300);
passo(function () {
  ok("abrir troca para a edição da matéria", cur().name === "Edição 05/2026 (modelo)" && $("#acervoDialog").hidden, cur().name);
  var p = document.createElement("pre"); p.id = "acout"; p.textContent = R.join("\n"); document.body.appendChild(p);
});
setTimeout(rodar, 900);
