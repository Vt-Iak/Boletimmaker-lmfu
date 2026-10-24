// Verificação da Fase 1 (modo local, sem window.claude). Resultado em <pre id="f1out">.
var R = [];
function ok(name, cond, extra) { R.push((cond ? "OK   " : "FALHA") + " " + name + (extra ? " — " + extra : "")); }
function $(s) { return document.querySelector(s); }
var downloads = [];
HTMLAnchorElement.prototype.click = function () { if (this.download) downloads.push(this.download); };

setTimeout(function () {
  // 1. Modelo carregado
  ok("modelo carregado", ($('[data-path="meta.title"]') || {}).textContent === "PANORAMA ECONÔMICO");
  ok("desfazer começa desabilitado", $("#btnUndo").disabled);

  // 2. Histórico: focar e sair sem digitar não cria passo
  var t = $('[data-path="headline.title"]');
  t.focus(); t.blur();
  ok("foco sem digitar não enche o histórico", $("#btnUndo").disabled);

  // Editar, desfazer, refazer
  var original = t.textContent;
  t.focus(); t.textContent = "TÍTULO EDITADO"; t.dispatchEvent(new Event("input", { bubbles: true })); t.blur();
  ok("edição habilita desfazer", !$("#btnUndo").disabled);
  $("#btnUndo").click();
  ok("desfazer volta o texto", $('[data-path="headline.title"]').textContent === original);
  $("#btnRedo").click();
  ok("refazer reaplica", $('[data-path="headline.title"]').textContent === "TÍTULO EDITADO");

  // Ctrl+Z dentro de campo não aciona o desfazer global
  var t2 = $('[data-path="headline.title"]'); t2.focus();
  var ev = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true });
  t2.dispatchEvent(ev);
  ok("Ctrl+Z dentro do texto fica com o navegador", !ev.defaultPrevented && $('[data-path="headline.title"]').textContent === "TÍTULO EDITADO");
  t2.blur();
}, 800);

setTimeout(function () {
  // 3. Salvamento honesto
  var real = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { throw new Error("QuotaExceeded"); };
  var t = $('[data-path="headline.deck"]');
  t.focus(); t.textContent = "x"; t.dispatchEvent(new Event("input", { bubbles: true })); t.blur();
  setTimeout(function () {
    var st = $("#saveStatus");
    ok("falha ao salvar aparece em vermelho", st.classList.contains("save-status-error"), st.textContent);
    Storage.prototype.setItem = real;
  }, 700);
}, 1200);

setTimeout(function () {
  // 4. Nome do arquivo exportado mantém acentos sem virar "_"
  $("#btnExportJson").click();
  ok("nome do arquivo sem perder letras acentuadas", downloads[0] === "boletim_Edicao_05_2026_modelo_.json", downloads[0]);
}, 2200);

setTimeout(function () {
  // 6. Importar JSON antigo (com linkUrl e logo embutida) + 5. URL maliciosa na logo
  var old = {
    meta: { title: "IMPORTADO ANTIGO", subtitle: "s", logo: "https://exemplo.com/logo.png');color:red;background:url('x", logoWidth: 155, logoHeight: 154 },
    masthead: { line1: "l1", line2: "l2" },
    headline: { tag: "T", title: "Manchete antiga", deck: "d", image: null, paragraphs: ["p1"] },
    ticker: [{ label: "A", value: "1", change: "+1%", trend: "up" }],
    columns: [{ tag: "X", title: "Notícia", body: "b", linkText: "Leia mais →", linkUrl: "https://www.reuters.com/antigo", image: null }],
    note: "", weekTable: { title: "", rows: [] },
    footerFront: { fontes: "", autoria: "", verso: "", disclaimer: "" },
    page2Header: { editionLabel: "", note: "" },
    thermometer: { title: "", subtitle: "", groups: [] },
    calendar: { title: "", subtitle: "", rows: [] },
    superQuarta: { title: "", body: "" },
    glossary: { title: "", items: [] },
    footerBack: { editionInfo: "", fontes: "", disclaimer: "" }
  };
  var dt = new DataTransfer();
  dt.items.add(new File([JSON.stringify(old)], "edicao_antiga.json", { type: "application/json" }));
  var inp = $("#importFileInput"); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
}, 2600);

setTimeout(function () {
  ok("JSON antigo importado", ($('[data-path="meta.title"]') || {}).textContent === "IMPORTADO ANTIGO");
  var a = document.querySelector('[data-path="columns.0.linkText"] a.inline-link');
  ok("link antigo (linkUrl) virou link no texto", !!a && a.getAttribute("href") === "https://www.reuters.com/antigo");
  var layer = document.querySelector(".brand-logo-img .logo-crop-layer");
  var style = layer ? layer.getAttribute("style") : "";
  ok("URL maliciosa da logo não injeta CSS", !!layer && layer.style.color === "" && style.indexOf("%27") !== -1, style.slice(0, 90));

  // 1. Estouro de página: muitos parágrafos -> selo aparece
  for (var i = 0; i < 12; i++) $('#inspector') && document.querySelector('[data-action="add-paragraph"]') ;
  var body = $('[data-path="headline.paragraphs.0"]');
  body.focus(); body.textContent = new Array(400).join("texto longo para estourar a página "); body.dispatchEvent(new Event("input", { bubbles: true })); body.blur();
}, 3300);

setTimeout(function () {
  var b1 = $("#page1Overflow");
  ok("selo de estouro aparece", b1 && !b1.hidden, b1 && b1.textContent);
  ok("selo é só de tela (no-print)", b1 && b1.classList.contains("no-print"));
  // 1. Aviso antes de imprimir quando estoura
  var printed = false; window.print = function () { printed = true; };
  $("#btnPrint").click();
  var msg = $("#checkList").textContent;
  ok("aviso de estouro antes de imprimir", !$("#checkDialog").hidden && msg.indexOf("Página 1 estoura") !== -1);
  $("#checkExport").click();
  setTimeout(function () {
    ok("imprimir assim mesmo chama window.print", printed);
    var p = document.createElement("pre"); p.id = "f1out"; p.textContent = R.join("\n"); document.body.appendChild(p);
  }, 100);
}, 4200);
