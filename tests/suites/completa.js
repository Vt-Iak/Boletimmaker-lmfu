// Bateria completa de funções do editor (modo local). Resultado em <pre id="fullout">.
var R = [];
function ok(name, cond, extra) { R.push((cond ? "OK   " : "FALHA") + " " + name + (extra != null && !cond ? " — " + extra : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
function W(p) { return document.querySelector('#workspace [data-path="' + p + '"]'); }
function st() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = st(); return s.editions[s.currentId]; }
function type(el, text) { el.focus(); el.textContent = text; el.dispatchEvent(new Event("input", { bubbles: true })); el.blur(); }
function click(el) { el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true })); el.click(); }
function change(el, v) { el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); }
function selectBlock(blockId) {
  var b = document.querySelector('#workspace [data-block-id="' + blockId + '"]');
  var r = b.getBoundingClientRect();
  var o = { bubbles: true, cancelable: true, clientX: r.left + 2, clientY: r.top + 2, pointerId: 1 };
  b.dispatchEvent(new PointerEvent("pointerdown", o)); b.dispatchEvent(new PointerEvent("pointerup", o));
}
function insp(sel) { return document.querySelector("#inspectorSelection " + sel); }
function inspBtn(action, extra) { return document.querySelector('#inspectorSelection button[data-action="' + action + '"]' + (extra || "")); }
var downloads = [];
HTMLAnchorElement.prototype.click = function () { if (this.download) downloads.push(this.download); };
var printed = 0; window.print = function () { printed++; };
var opened = []; window.open = function (u) { opened.push(u); return null; };

var steps = [], i = 0;
function step(fn, wait) { steps.push([fn, wait == null ? 250 : wait]); }
function run() {
  if (i >= steps.length) { var p = document.createElement("pre"); p.id = "fullout"; p.textContent = R.join("\n"); document.body.appendChild(p); return; }
  var s = steps[i++];
  try { s[0](); } catch (e) { R.push("FALHA [exceção no passo " + i + "] " + e.message); }
  setTimeout(run, s[1]);
}

/* ---------- Barra superior: edições ---------- */
step(function () {
  ok("app carregou o modelo", W("meta.title").textContent === "PANORAMA ECONÔMICO");
  click($("#btnNewEdition"));
});
step(function () {
  ok("+ Nova cria edição em branco", W("meta.title").textContent === "SEU BOLETIM" && $("#editionSelect").options.length === 2);
  change($("#editionSelect"), st().order[0]);
});
step(function () {
  ok("trocar de edição pelo seletor", W("meta.title").textContent === "PANORAMA ECONÔMICO");
  click($("#btnDuplicate"));
});
step(function () {
  ok("Duplicar cria cópia", $("#editionSelect").options.length === 3 && cur().name.indexOf("(cópia)") !== -1);
  click($("#btnRename"));
}, 150);
step(function () {
  ok("Renomear abre caixa com o nome", !$("#appDialog").hidden && !$("#appDialogInput").hidden && $("#appDialogInput").value.indexOf("(cópia)") !== -1);
  $("#appDialogInput").value = "Edição 06/2026";
  click($("#appDialogOk"));
});
step(function () {
  ok("Renomear aplica", cur().name === "Edição 06/2026" && $("#editionSelect").selectedOptions[0].textContent === "Edição 06/2026");
  click($("#btnRename"));
}, 150);
step(function () {
  click($("#appDialogCancel"));
});
step(function () {
  ok("Cancelar não renomeia", cur().name === "Edição 06/2026" && $("#appDialog").hidden);
  click($("#btnDelete"));
}, 150);
step(function () {
  ok("Excluir pede confirmação", !$("#appDialog").hidden && $("#appDialogMsg").textContent.indexOf("Edição 06/2026") !== -1);
  click($("#appDialogOk"));
});
step(function () {
  ok("Excluir remove", $("#editionSelect").options.length === 2 && !st().editions[Object.keys(st().editions).filter(function (k) { return st().editions[k].name === "Edição 06/2026"; })[0]]);
  // vai para a edição em branco, apaga ela e tenta apagar a última (o modelo)
  change($("#editionSelect"), st().order[1]);
  click($("#btnDelete"));
}, 150);
step(function () { click($("#appDialogOk")); });
step(function () {
  click($("#btnDelete"));
}, 150);
step(function () {
  ok("não deixa excluir a única edição", !$("#appDialog").hidden && $("#appDialogMsg").textContent.indexOf("única") !== -1 && $("#appDialogCancel").hidden);
  click($("#appDialogOk"));
});

/* ---------- Padrão personalizado ---------- */
step(function () {
  type(W("meta.subtitle"), "SUBTÍTULO PADRÃO");
  click($("#btnSetDefault"));
}, 150);
step(function () { click($("#appDialogOk")); }, 150);
step(function () {
  ok("Definir como padrão avisa (aviso rápido)", !$("#toast").hidden && /Padrão definido/.test($("#toast").textContent));
  click($("#appDialogOk"));
  click($("#btnNewEdition"));
});
step(function () {
  ok("+ Nova parte do padrão definido", W("meta.subtitle").textContent === "SUBTÍTULO PADRÃO");
  click($("#btnClearDefault"));
}, 150);
step(function () { click($("#appDialogOk")); });
step(function () {
  ok("Padrão original remove o padrão", !st().customDefaultTemplate);
  click($("#btnNewEdition"));
});
step(function () {
  ok("+ Nova volta a criar em branco", W("meta.subtitle").textContent === "SUBTÍTULO — EDITE AQUI");
  change($("#editionSelect"), st().order[0]);
});

/* ---------- Desfazer / refazer / Ctrl+Z / Ctrl+Y ---------- */
step(function () {
  type(W("headline.tag"), "TAG NOVA");
  ok("editar texto grava no estado", cur().data.headline.tag === "TAG NOVA");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
}, 600);
step(function () {
  ok("Ctrl+Z fora do texto desfaz", W("headline.tag").textContent !== "TAG NOVA");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true, cancelable: true }));
}, 600);
step(function () {
  ok("Ctrl+Y refaz", W("headline.tag").textContent === "TAG NOVA");
  ok("status de salvamento", /^Salvo às \d\d:\d\d$/.test($("#saveStatus").textContent), $("#saveStatus").textContent);
});

/* ---------- Exportar / importar JSON ---------- */
step(function () {
  click($("#btnExportJson"));
  ok("Exportar JSON baixa arquivo", downloads.length === 1 && /\.json$/.test(downloads[0]), downloads.join(","));
  var data = cur().data; data.meta.title = "REIMPORTADO";
  var dt = new DataTransfer(); dt.items.add(new File([JSON.stringify(data)], "reimport.json", { type: "application/json" }));
  var inp = $("#importFileInput"); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
}, 2000);
step(function () {
  ok("Importar JSON cria edição", W("meta.title").textContent === "REIMPORTADO" && cur().name === "reimport");
  var dt = new DataTransfer(); dt.items.add(new File(["{isso não é json"], "ruim.json", { type: "application/json" }));
  var inp = $("#importFileInput"); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
}, 2000);
step(function () {
  ok("JSON inválido mostra erro", !$("#appDialog").hidden && $("#appDialogMsg").textContent.indexOf("JSON válido") !== -1, "hidden=" + $("#appDialog").hidden + " msg=" + $("#appDialogMsg").textContent);
  click($("#appDialogOk"));
  change($("#editionSelect"), st().order[0]);
});

/* ---------- Imprimir ---------- */
step(function () { click($("#btnPrint")); }, 150);
step(function () {
  ok("Imprimir mostra a verificação com instruções", !$("#checkDialog").hidden && $("#checkNote").textContent.indexOf("Margens") !== -1);
  click($("#checkExport"));
});
step(function () { ok("Imprimir chama a impressão", printed === 1); });

/* ---------- Zoom e painel ---------- */
step(function () {
  click($("#btnZoomIn"));
  ok("zoom +", $("#zoomLevel").textContent === "110%", $("#zoomLevel").textContent);
  click($("#btnZoomOut")); click($("#btnZoomOut"));
  ok("zoom −", $("#zoomLevel").textContent === "90%", $("#zoomLevel").textContent);
  var ws = $("#workspace"); var r = ws.getBoundingClientRect();
  ws.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true, clientX: r.left + 50, clientY: r.top + 50 }));
  ok("Ctrl+roda do mouse dá zoom", $("#zoomLevel").textContent === "100%", $("#zoomLevel").textContent);
  click($("#btnZoomIn")); click($("#btnZoomReset"));
  ok("Redefinir zoom", $("#zoomLevel").textContent === "100%");
  click($("#btnToggleSidebar"));
  ok("Ocultar painéis", document.body.classList.contains("panels-hidden") && $("#btnToggleSidebar").textContent.indexOf("Mostrar") !== -1);
  click($("#btnToggleSidebar"));
  ok("Mostrar painéis", !document.body.classList.contains("panels-hidden"));
});

/* ---------- Painel: travar tudo, tamanho geral ---------- */
step(function () {
  var c = $("#chkLockAll"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true }));
  ok("Travar tudo some com as alças", $$("#workspace .drag-handle-mini").length === 0 && cur().data.locked === true);
  c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true }));
  ok("Destravar tudo volta as alças", $$("#workspace .drag-handle-mini").length > 0);
  var before = parseFloat(getComputedStyle(W("headline.title")).fontSize);
  change($("#fontScaleAll"), "120");
  var after = parseFloat(getComputedStyle(W("headline.title")).fontSize);
  ok("Tamanho de todo o texto", Math.abs(after / before - 1.2) < 0.02, before + "→" + after);
  change($("#fontScaleAll"), "100");
});

/* ---------- Elementos livres ---------- */
step(function () {
  var n0 = $$("#page1 .free-el").length;
  click($("#btnAddLine")); click($("#btnAddBand")); click($("#btnAddText"));
  ok("+ Linha, + Faixa, + Caixa de texto", $$("#page1 .free-el").length === n0 + 3, n0 + "→" + $$("#page1 .free-el").length);
  ok("elemento novo fica selecionado com painel", !!insp('input[data-field="fontSize"]'));
  var fs = insp('input[data-field="fontSize"]'); change(fs, "20");
  var txt = $$("#page1 .free-el-text").pop();
  ok("tamanho da caixa de texto", txt && txt.style.fontSize === "20px");
  change(insp('input[data-field="textColor"]'), "#c0202b");
  txt = $$("#page1 .free-el-text").pop();
  ok("cor da caixa de texto", txt && /192, 32, 43|c0202b/i.test(txt.style.color), txt && txt.style.color);
  type(txt, "Caixa livre");
  ok("digitar na caixa livre grava", cur().data.elements.some(function (e) { return e.text === "Caixa livre"; }));
  click(inspBtn("toggle-element-lock") || insp('input[data-action="toggle-element-lock"]'));
});
step(function () {
  ok("travar elemento", cur().data.elements.some(function (e) { return e.type === "text" && e.locked; }));
  click(inspBtn("remove-element"));
});
step(function () {
  ok("remover elemento", !cur().data.elements.some(function (e) { return e.text === "Caixa livre"; }));
});

/* ---------- Mover e redimensionar ---------- */
step(function () {
  var el = $$("#page1 .free-el").pop(); // a faixa
  var r = el.getBoundingClientRect();
  var o = function (x, y) { return { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 }; };
  el.dispatchEvent(new PointerEvent("pointerdown", o(r.left + 10, r.top + 10)));
  $("#workspace").dispatchEvent(new PointerEvent("pointermove", o(r.left + 60, r.top + 40)));
  $("#workspace").dispatchEvent(new PointerEvent("pointerup", o(r.left + 60, r.top + 40)));
  var band = cur().data.elements.filter(function (e) { return e.type === "band"; }).pop();
  ok("arrastar elemento livre move", band && band.x === 80 && band.y === 60, band && band.x + "," + band.y);
  var el2 = $$("#page1 .free-el").pop(); var h = el2.querySelector(".resize-handle"); var hr = h.getBoundingClientRect();
  h.dispatchEvent(new PointerEvent("pointerdown", o(hr.left + 3, hr.top + 3)));
  $("#workspace").dispatchEvent(new PointerEvent("pointermove", o(hr.left + 43, hr.top + 23)));
  $("#workspace").dispatchEvent(new PointerEvent("pointerup", o(hr.left + 43, hr.top + 23)));
  band = cur().data.elements.filter(function (e) { return e.type === "band"; }).pop();
  ok("redimensionar elemento livre", band && band.width === 260 && band.height === 140, band && band.width + "x" + band.height);
  // mover um bloco do template
  var blk = $('#workspace [data-block-id="tag"]'); var br = blk.getBoundingClientRect();
  blk.dispatchEvent(new PointerEvent("pointerdown", o(br.left + 2, br.top + 2)));
  $("#workspace").dispatchEvent(new PointerEvent("pointermove", o(br.left + 32, br.top + 2)));
  $("#workspace").dispatchEvent(new PointerEvent("pointerup", o(br.left + 32, br.top + 2)));
  ok("bloco do modelo não arrasta (ordem pelas camadas)", !cur().data.blockLayout.tag || (!cur().data.blockLayout.tag.x && !cur().data.blockLayout.tag.y), JSON.stringify(cur().data.blockLayout.tag));
});

/* ---------- Painel de bloco ---------- */
step(function () {
  selectBlock("headline-deck");
  ok("clicar no bloco abre o painel", insp(".prop-title") && insp(".prop-title").textContent === "Resumo da manchete");
  change(insp('input[data-field="textColor"][data-block-id="headline-deck"]'), "#0b7a3b");
  ok("cor do bloco", /11, 122, 59/.test(getComputedStyle(W("headline.deck")).color), getComputedStyle(W("headline.deck")).color);
  change(insp('select[data-field="fontFamily"][data-block-id="headline-deck"]'), "Georgia, 'Times New Roman', serif");
  ok("fonte do bloco", /Georgia/.test(getComputedStyle(W("headline.deck")).fontFamily));
  var chk = insp('input[data-action="toggle-block-lock"]'); chk.checked = true; chk.dispatchEvent(new Event("change", { bubbles: true }));
  ok("travar bloco", cur().data.blockLayout["headline-deck"].locked === true);
});
step(function () {
  var f = W("headline.title"); f.focus();
  var inp = insp("input[data-field-font-path]");
  ok("tamanho de uma caixa: campo aparece", !!inp);
  var before = parseFloat(getComputedStyle(f).fontSize);
  change(inp, "150");
  var after = parseFloat(getComputedStyle(W("headline.title")).fontSize);
  ok("tamanho de uma caixa só", Math.abs(after / before - 1.5) < 0.02 && Math.abs(parseFloat(getComputedStyle(W("headline.deck")).fontSize) - 9.2 * 96 / 72) < 0.6, before + "→" + after);
});

/* ---------- Ações de adicionar/remover ---------- */
step(function () {
  var d = cur().data, n = {};
  n.ticker = d.ticker.length; n.cols = d.columns.length; n.week = d.weekTable.rows.length; n.par = d.headline.paragraphs.length;
  selectBlock("ticker"); click(inspBtn("add-ticker"));
  selectBlock("news-list"); click(inspBtn("add-column"));
  selectBlock("week-table"); click(inspBtn("add-week-row"));
  selectBlock("headline-body"); click(inspBtn("add-paragraph"));
  d = cur().data;
  ok("+ Ativo", d.ticker.length === n.ticker + 1);
  ok("+ Bloco de notícia", d.columns.length === n.cols + 1);
  ok("+ Dia", d.weekTable.rows.length === n.week + 1);
  ok("+ Parágrafo", d.headline.paragraphs.length === n.par + 1);
  click($$('#workspace button[data-action="remove-ticker"]').pop());
  click($$('#workspace button[data-action="remove-column"]').pop());
  click($$('#workspace button[data-action="remove-week-row"]').pop());
  click($$('#workspace button[data-action="remove-paragraph"]').pop());
  d = cur().data;
  ok("remover ativo/notícia/dia/parágrafo", d.ticker.length === n.ticker && d.columns.length === n.cols && d.weekTable.rows.length === n.week && d.headline.paragraphs.length === n.par);
});
step(function () {
  var d = cur().data;
  var g = d.thermometer.groups.length, r0 = d.thermometer.groups[0].rows.length, cal = d.calendar.rows.length, gl = d.glossary.items.length;
  selectBlock("thermo"); click(inspBtn("add-thermo-row", '[data-group="0"]')); click(inspBtn("add-thermo-group"));
  selectBlock("calendar"); click(inspBtn("add-calendar-row"));
  selectBlock("glossary"); click(inspBtn("add-glossary-item"));
  d = cur().data;
  ok("+ Ativo no termômetro", d.thermometer.groups[0].rows.length === r0 + 1);
  ok("+ Grupo no termômetro", d.thermometer.groups.length === g + 1);
  ok("+ Evento na agenda", d.calendar.rows.length === cal + 1);
  ok("+ Termo no glossário", d.glossary.items.length === gl + 1);
  click($$('#workspace button[data-action="remove-thermo-group"]').pop());
  click($$('#workspace button[data-action="remove-thermo-row"][data-group="0"]').pop());
  click($$('#workspace button[data-action="remove-calendar-row"]').pop());
  click($$('#workspace button[data-action="remove-glossary-item"]').pop());
  d = cur().data;
  ok("remover grupo/linha/evento/termo", d.thermometer.groups.length === g && d.thermometer.groups[0].rows.length === r0 && d.calendar.rows.length === cal && d.glossary.items.length === gl);
});
step(function () {
  var b = $('#workspace button[data-action="cycle-trend"][data-path="weekTable.rows.0.trend"]');
  var t0 = cur().data.weekTable.rows[0].trend; click(b);
  ok("alternar seta (tabela da semana)", cur().data.weekTable.rows[0].trend !== t0);
  var bold0 = cur().data.calendar.rows[0].bold; click($('#workspace button[data-action="toggle-cal-bold"][data-index="0"]'));
  ok("negrito da linha da agenda", cur().data.calendar.rows[0].bold === !bold0 && $('#workspace [data-path="calendar.rows.0.data"]').classList.contains("cal-bold") === !bold0);
  type(W("calendar.rows.0.relevancia"), "ALTA");
  ok("bolinha de relevância segue o texto", W("calendar.rows.0.relevancia").parentElement.querySelector(".relevance-dot").classList.contains("rel-alta"));
  type(W("thermometer.groups.0.rows.0.fonte"), "F1; F2");
  ok("coluna Fonte do termômetro", cur().data.thermometer.groups[0].rows[0].fonte === "F1; F2");
});

/* ---------- Teclado e colar ---------- */
step(function () {
  var f = W("headline.tag"); f.focus();
  var e1 = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }); f.dispatchEvent(e1);
  ok("Enter bloqueado em campo de uma linha", e1.defaultPrevented);
  var g = W("thermometer.fontesLegenda"); g.focus();
  var e2 = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }); g.dispatchEvent(e2);
  ok("Enter liberado na legenda das fontes", !e2.defaultPrevented);
  var nb = W("columns.0.body"); nb.focus();
  var dtp = new DataTransfer(); dtp.setData("text/html", "<b>negrito</b><img src=x>"); dtp.setData("text/plain", "colado puro");
  var pe = new ClipboardEvent("paste", { clipboardData: dtp, bubbles: true, cancelable: true }); nb.dispatchEvent(pe);
  ok("colar vira texto puro", pe.defaultPrevented && nb.querySelector("img") === null);
  nb.blur();
});

/* ---------- Barrinha de formatação ---------- */
function selectAll(el) { el.focus(); var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
step(function () { selectAll(W("columns.1.title")); }, 200);
step(function () {
  ok("barrinha aparece ao selecionar", !$("#textFormatBubble").hidden);
  click($("#bubbleBold"));
  ok("N tira o negrito do título e fica salvo", /font-weight: normal/.test(cur().data.columns[1].title), cur().data.columns[1].title.slice(0, 80));
}, 200);
step(function () { selectAll(W("columns.1.body")); }, 200);
step(function () {
  click($("#bubbleItalic"));
  ok("itálico no trecho", /italic/.test(cur().data.columns[1].body));
  click($("#bubbleUnderline"));
  ok("sublinhado no trecho", /underline/.test(cur().data.columns[1].body));
}, 200);
step(function () { selectAll(W("columns.2.body")); }, 200);
step(function () {
  var c = $("#bubbleColor"); c.value = "#c0202b"; c.dispatchEvent(new Event("input", { bubbles: true }));
  ok("cor no trecho", /color/.test(cur().data.columns[2].body), cur().data.columns[2].body.slice(0, 80));
}, 200);
step(function () { selectAll(W("columns.2.title")); }, 200);
step(function () {
  change($("#bubbleFont"), "'Courier New', monospace");
  ok("fonte no trecho", /Courier/.test(cur().data.columns[2].title));
}, 200);
step(function () { selectAll(W("columns.0.linkText")); }, 200);
step(function () {
  click($("#bubbleLink"));
  $("#bubbleLinkUrl").value = "reuters.com/teste";
  click($("#bubbleLinkApply"));
  ok("link criado (completa https://)", /href="https:\/\/reuters\.com\/teste"/.test(cur().data.columns[0].linkText), cur().data.columns[0].linkText);
}, 300);
step(function () {
  var a = W("columns.0.linkText").querySelector("a");
  a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  ok("clique simples no link não abre", opened.length === 0);
  a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
  ok("Ctrl+clique abre o link", opened[0] === "https://reuters.com/teste");
  selectAll(a);
}, 200);
step(function () {
  ok("selecionar link mostra endereço e Remover", !$("#bubbleLinkRow").hidden && $("#bubbleLinkUrl").value === "https://reuters.com/teste" && !$("#bubbleUnlink").hidden);
  $("#bubbleLinkUrl").focus(); $("#bubbleLinkUrl").value = "https://g1.globo.com";
  click($("#bubbleLinkApply"));
  ok("trocar endereço do link", /g1\.globo\.com/.test(cur().data.columns[0].linkText) && !/reuters/.test(cur().data.columns[0].linkText));
}, 300);
step(function () { selectAll(W("columns.0.linkText").querySelector("a") || W("columns.0.linkText")); }, 200);
step(function () {
  click($("#bubbleUnlink"));
  ok("remover link", !/href/.test(cur().data.columns[0].linkText));
  selectAll(W("columns.1.linkText"));
}, 300);
step(function () {
  click($("#bubbleLink")); $("#bubbleLinkUrl").value = "javascript:alert(1)"; click($("#bubbleLinkApply"));
  ok("link perigoso recusado", !/javascript/.test(cur().data.columns[1].linkText));
}, 300);

/* ---------- Imagens ---------- */
var PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
function pngFile() { var b = atob(PNG), u = new Uint8Array(b.length); for (var k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return new File([u], "img.png", { type: "image/png" }); }
function upload(input) { var dt = new DataTransfer(); dt.items.add(pngFile()); input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true })); }
step(function () {
  selectBlock("headline-image");
  upload(insp('input.img-input[data-path="headline.image"]'));
}, 2000);
step(function () {
  ok("enviar imagem da manchete", /^data:image\/png/.test(cur().data.headline.image || "") && !!$("#workspace img.headline-image"), "insp=" + (($("#inspectorSelection .inspector-title")||{}).textContent) + " img=" + String(cur().data.headline.image).slice(0,30) + " dialog=" + $("#appDialog").hidden + " ed=" + cur().name);
  click(inspBtn("remove-image", '[data-path="headline.image"]'));
  ok("remover imagem da manchete", !cur().data.headline.image);
  selectBlock("masthead");
  upload(insp('input.img-input[data-path="meta.logo"]'));
}, 2000);
step(function () {
  ok("enviar logo", /^data:image\/png/.test(cur().data.meta.logo || "") && !!$("#workspace .logo-draggable"));
  var logo = $("#workspace .logo-draggable"); var r = logo.getBoundingClientRect();
  var o = { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + 20, pointerId: 1 };
  logo.dispatchEvent(new PointerEvent("pointerdown", o)); $("#workspace").dispatchEvent(new PointerEvent("pointerup", o));
  ok("clicar na logo abre ajustes", !!insp('input[data-meta-field="logoZoom"]'));
  change(insp('input[data-meta-field="logoZoom"]'), "150");
  ok("zoom da logo", cur().data.meta.logoZoom === 150 && /scale\(1\.5\)/.test($("#workspace .brand-logo-img .logo-crop-layer").getAttribute("style")));
  var chk = insp('input[data-action="toggle-logo-lock"]'); chk.checked = true; chk.dispatchEvent(new Event("change", { bubbles: true }));
  ok("travar logo", cur().data.meta.logoLocked === true);
  var col = $('#workspace [data-block-id="news-0"]'); var cr = col.getBoundingClientRect();
  var o2 = { bubbles: true, cancelable: true, clientX: cr.left + 1, clientY: cr.top + 1, pointerId: 1 };
  col.dispatchEvent(new PointerEvent("pointerdown", o2)); $("#workspace").dispatchEvent(new PointerEvent("pointerup", o2));
  upload(insp('input.img-input[data-path="columns.0.image"]'));
}, 2000);
step(function () {
  ok("imagem na notícia", /^data:image\/png/.test(cur().data.columns[0].image || "") && !!$("#workspace img.news-image"));
});

/* ---------- Clicar fora tira a seleção ---------- */
step(function () {
  var ws = $("#workspace"); var r = ws.getBoundingClientRect();
  var o = { bubbles: true, cancelable: true, clientX: r.left + 5, clientY: r.top + 5, pointerId: 1 };
  ws.dispatchEvent(new PointerEvent("pointerdown", o)); ws.dispatchEvent(new PointerEvent("pointerup", o));
  ok("clicar fora tira a seleção", $$("#workspace .is-selected").length === 0 && /Documento/.test($("#inspectorSelection").textContent));
});

/* ---------- Persistência ao recarregar ---------- */
step(function () {
  ok("tudo salvo no navegador", cur().data.thermometer.groups[0].rows[0].fonte === "F1; F2" && cur().data.meta.logoZoom === 150);
}, 600);

setTimeout(run, 900);
