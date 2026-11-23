/* Layout de celular (forçado pelo setup "celular.js", como na opção
   Configurações → Interface → Layout da tela → Celular): navegação de baixo,
   menu "Mais", variáveis e painéis como folhas que sobem, janela de texto
   (folha e carrossel), botão voltar, e a volta ao layout de computador. */
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message + " linha " + e.lineno); });
function ok(name, cond, extra) { R.push((cond ? "OK   " : "FALHA") + " " + name + (extra != null && !cond ? " — " + extra : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
function st() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = st(); return s.editions[s.currentId]; }
function html() { return document.documentElement.classList; }
function disp(el) { return el ? getComputedStyle(el).display : "ausente"; }
function nav(k) { $('#mobNav [data-mob-nav="' + k + '"]').click(); }
function tocar(el) {
  var md = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
  el.dispatchEvent(md);
  el.click();
  return md.defaultPrevented;
}
function campo() { return $("#mobEditor .mob-editor-campo"); }
function tecla(el, k) { var e = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; }
var steps = [], i = 0;
function step(fn, wait) { steps.push([fn, wait == null ? 300 : wait]); }
function run() {
  if (i >= steps.length) { var p = document.createElement("pre"); p.id = "mbout"; p.textContent = R.join("\n"); document.body.appendChild(p); return; }
  var s = steps[i++];
  try { s[0](); } catch (e) { R.push("FALHA [exceção no passo " + i + "] " + e.message); }
  setTimeout(run, s[1]);
}

step(function () {
  ok("layout de celular ligado", html().contains("layout-celular"));
  ok("navegação de baixo aparece", disp($("#mobNav")) === "flex" && $$("#mobNav [data-mob-nav]").length === 5);
  ok("barra de cima enxuta (sem modos, Verificar e PDF)", disp($(".modo-seg")) === "none" && disp($("#btnCheck")) === "none" && disp($("#btnPrint")) === "none");
  ok("variáveis e barra de status escondidas", disp($("#varsBar")) === "none" && disp($("#statusBar")) === "none");
  var wrap = $("#workspaceScaleWrap").getBoundingClientRect(), p = $("#page1").getBoundingClientRect();
  ok("folha cabe na largura", p.left >= wrap.left - 1 && p.right <= wrap.right + 1, Math.round(p.left) + "–" + Math.round(p.right) + " em " + Math.round(wrap.left) + "–" + Math.round(wrap.right));
  ok("Página ativa na navegação", $('#mobNav [data-mob-nav="pagina"]').classList.contains("is-active"));
  nav("pauta");
}, 500);

step(function () {
  ok("navegação abre a Pauta", document.body.classList.contains("modo-pauta") && $('#mobNav [data-mob-nav="pauta"]').classList.contains("is-active"));
  ok("na Pauta, o botão do painel vira Filtros", /Filtros/.test($('#mobNav [data-mob-nav="painel"]').textContent));
  nav("painel");
}, 400);

step(function () {
  ok("Filtros mostra a busca da Pauta", html().contains("mob-filtros") && disp($("#pautaPesquisa")) !== "none");
  nav("pagina");
}, 400);

step(function () {
  ok("volta para a Página (e fecha os filtros)", !document.body.classList.contains("modo-pauta") && !html().contains("mob-filtros"));
  nav("mais");
}, 400);

step(function () {
  var txt = $("#mobMais").textContent;
  ok("menu Mais aberto", html().contains("camada-mais") && getComputedStyle($("#mobMais")).visibility === "visible");
  ok("menu Mais com Verificar, PDF e ações da edição", /Verificar pendências/.test(txt) && /Exportar PDF/.test(txt) && /Próxima edição/.test(txt) && /Configurações/.test(txt));
  $('[data-mob-acao="#vars"]').click();
}, 400);

step(function () {
  ok("Variáveis da edição sobem de baixo", html().contains("camada-vars") && !html().contains("camada-mais") && disp($("#varsBar")) === "flex");
  ok("fundo escuro atrás", html().contains("mob-com-fundo"));
  window.dispatchEvent(new PopStateEvent("popstate"));
}, 400);

step(function () {
  ok("botão voltar do celular fecha a folha", !html().contains("camada-vars") && !html().contains("mob-com-fundo"));
  var t = $('#workspace [data-path="headline.title"]');
  window.__orig = t.textContent;
  ok("tocar no texto não abre o teclado na folha", tocar(t) === true);
}, 600);

step(function () {
  ok("janela de texto abre", html().contains("camada-editor") && !$("#mobEditor").hidden);
  ok("traz o texto do campo", campo().textContent === window.__orig, campo().textContent);
  ok("nome do campo no topo", /Manchete · título/.test($("#mobEditorTitulo").textContent), $("#mobEditorTitulo").textContent);
  campo().innerHTML = "Título escrito no celular";
  campo().dispatchEvent(new Event("input", { bubbles: true }));
}, 400);

step(function () {
  ok("texto vai para a edição", cur().data.headline.title === "Título escrito no celular", cur().data.headline.title);
  ok("e para a folha", $('#workspace [data-path="headline.title"]').textContent === "Título escrito no celular");
  ok("Enter em campo de uma linha conclui (não quebra linha)", tecla(campo(), "Enter") === true);
}, 400);

step(function () {
  ok("janela fecha", $("#mobEditor").hidden && !html().contains("camada-editor"));
  ok("etiqueta do bloco selecionado aparece", !$("#mobChip").hidden && /Ajustar/.test($("#mobChip").textContent));
  $("#btnUndo").click();
}, 600);

step(function () {
  ok("desfazer volta o texto", cur().data.headline.title !== "Título escrito no celular" && $('#workspace [data-path="headline.title"]').textContent === window.__orig);
  tocar($('#workspace [data-path="columns.0.body"]'));
}, 400);

step(function () {
  ok("texto da notícia é de várias linhas (Enter não conclui)", tecla(campo(), "Enter") === false && !$("#mobEditor").hidden);
  $("#mobEditor .mob-ok").click();
}, 400);

step(function () {
  $("#mobChip").click();
}, 500);

step(function () {
  ok("etiqueta abre o painel do bloco", html().contains("camada-painel") && getComputedStyle($("#inspector")).visibility === "visible");
  $('#inspector [data-mob-aba="estrutura"]').click();
}, 400);

step(function () {
  ok("painel troca para Estrutura e fontes", html().contains("mob-painel-estrutura") && getComputedStyle($("#structurePanel")).visibility === "visible");
  $("#mobFundo").click();
}, 400);

step(function () {
  ok("tocar no fundo fecha o painel", !html().contains("camada-painel"));
  nav("carrossel");
}, 700);

step(function () {
  ok("Carrossel aberto pela navegação", !$("#carrosselView").hidden);
  var t = $('#csPalco [data-cpath="slides.0.titulo"]');
  window.__cs = t.textContent;
  tocar(t);
}, 500);

step(function () {
  ok("janela de texto também no slide", !$("#mobEditor").hidden && campo().textContent === window.__cs);
  campo().innerHTML = "Capa feita no celular";
  campo().dispatchEvent(new Event("input", { bubbles: true }));
  $("#mobEditor .mob-ok").click();
}, 400);

step(function () {
  ok("texto vai para o slide", cur().data.carrossel.slides[0].titulo === "Capa feita no celular" && /Capa feita no celular/.test($("#csPalco").textContent));
  nav("pagina");
  $("#btnSettings").click();
}, 600);

step(function () {
  var s = $('#settingsDialog select[data-pref="layout"]');
  ok("Configurações tem a escolha de layout (Celular marcado)", !!s && s.value === "celular");
  s.value = "computador";
  s.dispatchEvent(new Event("change", { bubbles: true }));
}, 400);

step(function () {
  ok("layout de computador volta na hora", !html().contains("layout-celular") && disp($("#mobNav")) === "none" && disp($(".modo-seg")) !== "none");
  ok("escolha guardada só neste aparelho", localStorage.getItem("boletimMaker.layout") === "computador" && !/layout/.test(localStorage.getItem("boletimMaker.prefs") || ""));
  var s = $('#settingsDialog select[data-pref="layout"]');
  s.value = "auto";
  s.dispatchEvent(new Event("change", { bubbles: true }));
}, 400);

step(function () {
  ok("automático num navegador de computador = layout de computador", !html().contains("layout-celular") && localStorage.getItem("boletimMaker.layout") === null);
  $("#settingsClose").click();
});

setTimeout(run, 1200);
