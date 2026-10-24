// Próxima edição e backup completo. Resultado em <pre id="prout">.
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function loja() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = loja(); return s.editions[s.currentId]; }
var baixados = [];
// Guarda o texto de cada arquivo gerado (ler o Blob depois não avança no modo headless).
var BlobOrig = window.Blob;
window.Blob = function (partes, opts) { if (partes && typeof partes[0] === "string") baixados.push(partes[0]); return new BlobOrig(partes, opts); };
URL.createObjectURL = function () { return "blob:teste"; };
HTMLAnchorElement.prototype.click = function () {};
var passos = [], i = 0;
function passo(fn, w) { passos.push([fn, w || 250]); }
var tentativas = 0;
function rodar() { var p = passos[i++]; if (!p) return; var r; try { r = p[0](); } catch (e) { R.push("ERRO " + e.message); } if (r === "esperar" && tentativas++ < 40) i--; setTimeout(rodar, p[1]); }

var antes;
passo(function () {
  antes = cur();
  ok("modelo é a 05/2026", antes.data.meta.vars.edicao === "05/2026", antes.data.meta.vars.edicao);
  $("#btnNextEdition").click();
});
passo(function () {
  ok("pede confirmação mostrando a nova edição", !$("#appDialog").hidden && /06\/2026/.test($("#appDialogMsg").textContent));
  $("#appDialogOk").click();
});
passo(function () {
  var st = loja(), e = cur(), v = e.data.meta.vars, va = antes.data.meta.vars;
  ok("nova edição criada e aberta", st.order.length === 2 && e.id !== antes.id);
  ok("nome Edição 06/2026", e.name === "Edição 06/2026", e.name);
  ok("logo após a atual na lista", st.order[1] === e.id);
  ok("número +1", v.edicao === "06/2026", v.edicao);
  ok("data +7 dias", v.data === "2026-05-02", v.data);
  ok("cobertura +7 dias", v.coberturaInicio === "2026-04-26" && v.coberturaFim === "2026-05-01", v.coberturaInicio + " a " + v.coberturaFim);
  ok("próxima +7 dias", v.proxima === "2026-05-09", v.proxima);
  ok("fontes recomeçam", (e.data.sources || []).length === 0 && e.data.columns.every(function (c) { return !c.sourceId; }));
  ok("status volta a rascunho", e.data.meta.status === "rascunho" && e.data.columns.every(function (c) { return c.status === "rascunho"; }));
  ok("textos copiados", e.data.headline.title === antes.data.headline.title);
  ok("edição anterior intacta", st.editions[antes.id].data.meta.vars.edicao === "05/2026");
  ok("cabeçalho gerado com a nova edição", /06\/2026/.test(document.querySelector('#workspace [data-path="masthead.line2"]').textContent));
});
passo(function () {
  $("#btnBackupAll").click();
}, 900);
passo(function () {
  var t = baixados[baixados.length - 1];
  ok("backup baixado", !!t);
  if (!t) return;
  (function () {
    var j = JSON.parse(t);
    window.__bk = j;
    ok("formato identificado", j.formato === "boletimMaker.backup" && j.versao === 1);
    ok("todas as edições no backup", j.edicoes.length === 2);
    ok("canais no backup", Array.isArray(j.canais) && j.canais.length === 10);
    var refs = (t.match(/imgref:[0-9a-z]+/g) || []);
    ok("imagens referenciadas existem na tabela", refs.every(function (r) { return j.images[r.slice(7)]; }), refs.length + " refs");
  })();
}, 400);
passo(function () {
  // Restaurar: apaga tudo e importa o backup
  var j = window.__bk;
  if (!j) return "esperar"; // leitura do arquivo baixado ainda em andamento
  var dt = new DataTransfer();
  dt.items.add(new File([JSON.stringify(j)], "boletim_backup.json", { type: "application/json" }));
  var inp = $("#importFileInput"); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
}, 400);
passo(function () {
  if ($("#appDialog").hidden) return "esperar"; // leitura do arquivo importado
  ok("restaurar pede confirmação", !$("#appDialog").hidden && /2 edição/.test($("#appDialogMsg").textContent), $("#appDialogMsg").textContent);
  $("#appDialogOk").click();
});
passo(function () {
  var st = loja();
  ok("edições restauradas como novas", st.order.length === 4, st.order.length);
  var nomes = st.order.map(function (id) { return st.editions[id].name; });
  ok("nomes preservados", nomes.filter(function (n) { return n === "Edição 06/2026"; }).length === 2, nomes.join(" | "));
  ok("canais não duplicados", st.canais.length === 10);
  var p = document.createElement("pre"); p.id = "prout"; p.textContent = R.join("\n"); document.body.appendChild(p);
});
setTimeout(rodar, 900);
