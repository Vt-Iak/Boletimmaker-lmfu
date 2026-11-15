// Canais de referência (aba Fontes). Resultado em <pre id="cnout">.
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }
function loja() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function mudar(el, v) { if (el.type === "checkbox") el.checked = v; else el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); }
var passos = [], i = 0;
function passo(fn, w) { passos.push([fn, w || 250]); }
function rodar() { var p = passos[i++]; if (!p) return; try { p[0](); } catch (e) { R.push("ERRO " + e.message); } setTimeout(rodar, p[1]); }

passo(function () {
  var st = loja();
  var nomes = (st.canais || []).map(function (c) { return c.nome; });
  ok("16 canais semeados", nomes.length === 16, nomes.join(", "));
  ["Banco Central do Brasil", "IBGE", "B3", "Reuters", "InfoMoney", "Investing.com", "IFI/Senado", "Yahoo Finance", "Advisor Perspectives", "O Povo", "Agência Brasil", "Valor Econômico", "Estadão", "Folha de S.Paulo", "g1", "CNN Brasil"].forEach(function (n) {
    ok("canal presente: " + n, nomes.indexOf(n) !== -1);
  });
  ok("todos nascem a validar", st.canais.every(function (c) { return c.validado === false; }));
  ok("migração marcada", st.migrations.canais === true);
  $("#tabBtnFontes").click();
  ok("lista aparece na aba Fontes", $$("#canaisList .canal-item").length === 16);
  ok("agrupada em 3 grupos", $$("#canaisList .canal-group").length === 3);
  ok("contador 0 de 16", /0 de 16/.test($("#canaisCount").textContent), $("#canaisCount").textContent);
});
passo(function () {
  $('#canaisList [data-canal-id="canal_reuters"]').click();
});
passo(function () {
  var cb = $('#inspectorSelection input[data-canal-field="validado"]');
  ok("inspetor do canal abre", !!cb && /Reuters/.test($("#inspectorSelection").textContent));
  mudar(cb, true);
});
passo(function () {
  ok("validar grava", loja().canais.filter(function (c) { return c.id === "canal_reuters"; })[0].validado === true);
  ok("contador 1 de 16", /1 de 16/.test($("#canaisCount").textContent));
  mudar($('#inspectorSelection input[data-canal-field="dominio"]'), "https://www.Reuters.com/markets/");
});
passo(function () {
  var c = loja().canais.filter(function (c) { return c.id === "canal_reuters"; })[0];
  ok("domínio normalizado", c.dominio === "reuters.com", c.dominio);
  ok("mudar domínio volta a pedir validação", c.validado === false);
  $('[data-action="add-canal"]').click();
});
passo(function () {
  mudar($('#inspectorSelection input[data-canal-field="nome"]'), "Bloomberg Línea");
});
passo(function () {
  mudar($('#inspectorSelection input[data-canal-field="dominio"]'), "bloomberglinea.com.br");
});
passo(function () {
  ok("canal novo adicionado", loja().canais.length === 17 && loja().canais[16].nome === "Bloomberg Línea");
  // Fonte nova: colar link preenche o veículo pelo canal
  $('[data-action="add-source"]').click();
});
passo(function () {
  mudar($('#inspectorSelection input[data-source-field="url"]'), "https://www.bloomberglinea.com.br/mercados/2026/10/22/x/");
});
passo(function () {
  var ed = loja(); var d = ed.editions[ed.currentId].data;
  var src = d.sources[d.sources.length - 1];
  ok("link colado preenche o veículo pelo canal", src.veiculo === "Bloomberg Línea", src.veiculo);
  $('#canaisList [data-canal-id="canal_opovo"]').click();
});
passo(function () {
  $('#inspectorSelection [data-action="remove-canal"]').click();
});
passo(function () {
  $("#appDialogOk").click();
});
passo(function () {
  ok("remover canal (com confirmação)", loja().canais.length === 16 && !loja().canais.some(function (c) { return c.id === "canal_opovo"; }));
  ok("canaisAt registrado para sincronizar", loja().canaisAt > 0);
  var p = document.createElement("pre"); p.id = "cnout"; p.textContent = R.join("\n"); document.body.appendChild(p);
});
setTimeout(rodar, 900);
