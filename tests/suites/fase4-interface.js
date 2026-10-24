var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message + " linha " + e.lineno); });
function ok(name, cond, extra) { R.push((cond ? "OK   " : "FALHA") + " " + name + (extra != null && !cond ? " — " + extra : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
function W(p) { return document.querySelector('#workspace [data-path="' + p + '"]'); }
function st() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = st(); return s.editions[s.currentId]; }
function click(el) { el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true })); el.click(); }
function layer(id) { return $('#layersList .layer[data-layer-id="' + id + '"]'); }
function insp(sel) { return document.querySelector("#inspectorSelection " + sel); }
function key(k, opts) { var e = new KeyboardEvent("keydown", Object.assign({ key: k, bubbles: true, cancelable: true }, opts || {})); document.dispatchEvent(e); return e; }
function ptr(el, dx, dy) {
  var r = el.getBoundingClientRect(), o = function (x, y) { return { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 }; };
  el.dispatchEvent(new PointerEvent("pointerdown", o(r.left + 4, r.top + 4)));
  $("#workspace").dispatchEvent(new PointerEvent("pointermove", o(r.left + 4 + dx, r.top + 4 + dy)));
  $("#workspace").dispatchEvent(new PointerEvent("pointerup", o(r.left + 4 + dx, r.top + 4 + dy)));
}
var steps = [], i = 0;
function step(fn, wait) { steps.push([fn, wait == null ? 250 : wait]); }
function run() {
  if (i >= steps.length) { var p = document.createElement("pre"); p.id = "f4out"; p.textContent = R.join("\n"); document.body.appendChild(p); return; }
  var s = steps[i++];
  try { s[0](); } catch (e) { R.push("FALHA [exceção no passo " + i + "] " + e.message); }
  setTimeout(run, s[1]);
}

/* Estrutura da tela */
step(function () {
  ok("painel de estrutura, propriedades, status e zoom presentes", !!$("#structurePanel") && !!$("#inspector") && !!$("#statusBar") && !!$("#zoomBar"));
  ok("sem seleção, painel mostra o documento (tamanho de todo o texto)", !!$("#fontScaleAll") && /Documento/.test($("#inspectorSelection").textContent));
  ok("camadas listam páginas e notícias", /Página 1/.test($("#layersList").textContent) && /Página 2/.test($("#layersList").textContent) && $$('#layersList .layer[data-news-index]').length === 3);
  ok("camada mostra alerta de pendência (notícia sem link)", !!layer("news-0").querySelector(".layer-warn"));
  ok("barra de status mostra uso das páginas", /Pág\. 1.*% · cabe/.test($("#statusPage1").textContent), $("#statusPage1").textContent);
  ok("ícones SVG na barra (sem emoji)", $$("#toolbar svg.ic").length >= 5 && !/[💾🗑📤🔄✥↶↷◀▶]/u.test($("#toolbar").textContent));
});

/* Menu ⋯ */
step(function () {
  click($("#btnMenu"));
  ok("menu ⋯ abre", !$("#mainMenu").hidden && $("#btnMenu").getAttribute("aria-expanded") === "true");
  ok("menu tem as ações de edição", ["btnNewEdition", "btnDuplicate", "btnRename", "btnDelete", "btnImportJson", "btnExportJson", "btnSetDefault", "btnClearDefault", "chkLockAll", "btnToggleSidebar"].every(function (id) { return $("#mainMenu #" + id); }));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  ok("Esc fecha o menu", $("#mainMenu").hidden);
  click($("#btnMenu"));
  click($("#btnDuplicate"));
});
step(function () {
  ok("item do menu executa e fecha o menu", $("#mainMenu").hidden && /\(cópia\)/.test(cur().name));
  ok("aviso rápido aparece (Duplicar)", !$("#toast").hidden && /duplicada/.test($("#toast").textContent));
  click($("#btnMenu")); click($("#btnDelete"));
}, 200);
step(function () { click($("#appDialogOk")); }, 200);

/* Status da edição */
step(function () {
  var sel = $("#editionStatus");
  ok("status da edição começa em Rascunho", sel.value === "rascunho" && sel.dataset.status === "rascunho");
  sel.value = "revisado"; sel.dispatchEvent(new Event("change", { bubbles: true }));
}, 200);
step(function () {
  ok("status da edição salvo", cur().data.meta.status === "revisado" && $("#editionStatus").dataset.status === "revisado");
});

/* Camadas: selecionar, travar, reordenar */
step(function () {
  click(layer("news-1"));
  ok("clicar na camada seleciona o bloco", $('#workspace [data-block-id="news-1"]').classList.contains("is-selected") && layer("news-1").classList.contains("is-active"));
  ok("painel mostra a notícia com seções", /Notícia 2/.test(insp(".prop-title").textContent) && /Conteúdo/.test($("#inspectorSelection").textContent) && /Tipografia/.test($("#inspectorSelection").textContent) && /Layout/.test($("#inspectorSelection").textContent) && /Cor do texto/.test($("#inspectorSelection").textContent));
  ok("mini barra do bloco aparece", !$("#blockToolbar").hidden && /Notícia 2/.test($("#blockToolbar").textContent));
  click(layer("thermo").querySelector("[data-layer-lock]"));
});
step(function () {
  ok("cadeado da camada trava o bloco", cur().data.blockLayout.thermo && cur().data.blockLayout.thermo.locked === true && layer("thermo").querySelector("[data-layer-lock]").classList.contains("is-on"));
  var t0 = cur().data.columns[0].title, t1 = cur().data.columns[1].title;
  window.__t = [t0, t1];
  click(layer("news-1").querySelector('[data-layer-move="-1"]'));
});
step(function () {
  var c = cur().data.columns;
  ok("seta da camada sobe a notícia (ordem real)", c[0].title === window.__t[1] && c[1].title === window.__t[0]);
  ok("seleção acompanha a notícia movida", $('#workspace [data-block-id="news-0"]').classList.contains("is-selected"));
  $("#btnUndo").click();
});
step(function () {
  ok("desfazer volta a ordem", cur().data.columns[0].title === window.__t[0]);
  // arrastar Notícia 3 para antes da Notícia 1 na lista
  window.__t3 = cur().data.columns[2].title;
  var from = layer("news-2"), to = layer("news-0");
  var dt = new DataTransfer();
  from.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
  var r = to.getBoundingClientRect();
  to.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, clientY: r.top + 2, dataTransfer: dt }));
  to.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, clientY: r.top + 2, dataTransfer: dt }));
});
step(function () {
  ok("arrastar camada reordena notícias", cur().data.columns[0].title === window.__t3, cur().data.columns.map(function (c) { return c.title.slice(0, 15); }).join(" | "));
  $("#btnUndo").click();
});

/* Mini barra: duplicar, remover, subir */
step(function () {
  click(layer("news-0"));
  var n = cur().data.columns.length;
  click($('#blockToolbar [data-action="duplicate-column"]'));
  ok("mini barra duplica notícia", cur().data.columns.length === n + 1 && $('#workspace [data-block-id="news-1"]').classList.contains("is-selected"));
  click($('#blockToolbar [data-action="remove-column"]'));
  ok("mini barra remove notícia", cur().data.columns.length === n);
});

/* Tipografia / cor / layout do bloco */
step(function () {
  click(layer("headline-body"));
  var sel = insp('select[data-field="lineHeight"]'); sel.value = "1.5"; sel.dispatchEvent(new Event("change", { bubbles: true }));
}, 200);
step(function () {
  var p = W("headline.paragraphs.0"), fs = parseFloat(getComputedStyle(p).fontSize), lh = parseFloat(getComputedStyle(p).lineHeight);
  ok("entrelinha aplicada ao texto do bloco", Math.abs(lh / fs - 1.5) < 0.03, (lh / fs).toFixed(2));
  click(insp('[data-action="set-block-style"][data-field="textAlign"][data-value="left"]'));
}, 200);
step(function () {
  ok("alinhamento à esquerda aplicado", getComputedStyle(W("headline.paragraphs.0")).textAlign === "left");
  click(insp('.swatch[data-value="#c0202b"]'));
}, 200);
step(function () {
  ok("cor por amostra aplicada", /192, 32, 43/.test(getComputedStyle(W("headline.paragraphs.0")).color) && insp('.swatch[data-value="#c0202b"]').classList.contains("is-active"));
  click(insp(".swatch-default"));
}, 200);
step(function () {
  ok("cor padrão volta", !/192, 32, 43/.test(getComputedStyle(W("headline.paragraphs.0")).color));
  var sel = insp('select[data-field="fontFamily"]'); sel.value = "Georgia, 'Times New Roman', serif"; sel.dispatchEvent(new Event("change", { bubbles: true }));
}, 200);
step(function () {
  ok("fonte do bloco", /Georgia/.test(getComputedStyle(W("headline.paragraphs.0")).fontFamily));
  // bloco do modelo não arrasta mais
  ptr($('#workspace [data-block-id="tag"]'), 40, 20);
  var bl = cur().data.blockLayout.tag;
  ok("bloco do modelo não arrasta (só seleciona)", !bl || (!bl.x && !bl.y));
}, 200);

/* Status da notícia */
step(function () {
  click(layer("news-2"));
  click(insp('[data-action="set-news-status"][data-value="aprovado"]'));
}, 200);
step(function () {
  ok("status da notícia salvo e na camada", cur().data.columns[2].status === "aprovado" && /Aprov\./.test(layer("news-2").textContent));
});

/* Elemento livre: atalhos */
step(function () {
  click($("#btnAddText"));
  var n = cur().data.elements.length, el = cur().data.elements[n - 1];
  window.__el = { id: el.id, x: el.x, y: el.y, n: n };
  ok("caixa de texto nova aparece nas camadas", !!layer(el.id));
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  key("ArrowRight"); key("ArrowDown", { shiftKey: true });
}, 200);
step(function () {
  var el = cur().data.elements.filter(function (e) { return e.id === window.__el.id; })[0];
  ok("setas movem elemento (Shift = 10)", el.x === window.__el.x + 1 && el.y === window.__el.y + 10, el.x + "," + el.y);
  var e = key("d", { ctrlKey: true });
  ok("Ctrl+D duplica elemento", e.defaultPrevented && cur().data.elements.length === window.__el.n + 1);
  key("Delete");
  ok("Delete remove elemento", cur().data.elements.length === window.__el.n);
}, 200);
step(function () {
  ptr($$("#page1 .free-el").pop(), 30, 10);
  var el = cur().data.elements.filter(function (e) { return e.id === window.__el.id; })[0];
  ok("elemento livre ainda arrasta", el && el.x === window.__el.x + 1 + 30, el && el.x);
}, 200);

/* Painéis e zoom */
step(function () {
  click($("#btnMenu")); click($("#btnToggleSidebar"));
  ok("Ocultar painéis", document.body.classList.contains("panels-hidden") && getComputedStyle($("#structurePanel")).display === "none");
  click($("#btnMenu")); click($("#btnToggleSidebar"));
  ok("Mostrar painéis", !document.body.classList.contains("panels-hidden"));
  click($("#btnZoomFit"));
  ok("Ajustar à largura muda o zoom", $("#zoomLevel").textContent !== "", $("#zoomLevel").textContent);
  click($("#btnZoomReset"));
  ok("100% volta o zoom", $("#zoomLevel").textContent === "100%");
});

/* Travar tudo no menu */
step(function () {
  var c = $("#chkLockAll"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true }));
  ok("Travar tudo pelo menu", cur().data.locked === true && $$("#workspace .drag-handle-mini").length === 0);
  c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true }));
});

/* Estouro na barra de status */
step(function () {
  var p = W("headline.paragraphs.0"); p.focus(); p.textContent = new Array(300).join("texto longo que estoura a página "); p.dispatchEvent(new Event("input", { bubbles: true })); p.blur();
}, 1500);
step(function () {
  ok("barra de status mostra estouro", /estoura .* mm/.test($("#statusPage1").textContent) && !!$("#statusPage1 .meter.is-over"), $("#statusPage1").textContent);
});
setTimeout(run, 900);
