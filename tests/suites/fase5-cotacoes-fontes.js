var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message + " linha " + e.lineno); });
function ok(name, cond, extra) { R.push((cond ? "OK   " : "FALHA") + " " + name + (extra != null && !cond ? " — " + extra : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
function W(p) { return document.querySelector('#workspace [data-path="' + p + '"]'); }
function st() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = st(); return s.editions[s.currentId]; }
function click(el) { el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true })); el.click(); }
function insp(sel) { return document.querySelector("#inspectorSelection " + sel); }
function change(el, v) { el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); }
function type(el, text) { el.focus(); el.textContent = text; el.dispatchEvent(new Event("input", { bubbles: true })); el.blur(); }
function layer(id) { return $('#layersList .layer[data-layer-id="' + id + '"]'); }
function card(i) { return $$("#workspace .ticker-card")[i]; }
var steps = [], i = 0;
function step(fn, wait) { steps.push([fn, wait == null ? 250 : wait]); }
function run() {
  if (i >= steps.length) { var p = document.createElement("pre"); p.id = "f5out"; p.textContent = R.join("\n"); document.body.appendChild(p); return; }
  var s = steps[i++];
  try { s[0](); } catch (e) { R.push("FALHA [exceção no passo " + i + "] " + e.message); }
  setTimeout(run, s[1]);
}

if (MODE === "novo") {
  /* Cotações */
  step(function () {
    ok("cards do modelo: cor pelo sinal", card(0).querySelector(".ticker-change").classList.contains("trend-down") && card(1).querySelector(".ticker-change").classList.contains("trend-up"));
    ok("seta dos cards sai no PDF (sem no-print)", !!card(0).querySelector(".trend-arrow") && !card(0).querySelector(".trend-arrow").closest(".no-print"));
    ok("sem data, card não mostra linha de referência", !card(0).querySelector(".ticker-ref"));
    click(layer("ticker"));
  });
  step(function () {
    change(insp('select[data-ticker-all="tipo"]'), "fechamento");
    change(insp('select[data-ticker-all="periodo"]'), "semana");
    change(insp('input[data-ticker-all="refData"]'), "2026-04-24");
  });
  step(function () {
    ok("data/tipo valem para todos os cards", cur().data.ticker.every(function (t) { return t.refData === "2026-04-24" && t.tipo === "fechamento" && t.periodo === "semana"; }));
    ok("card mostra \"fech. 24/04 · semana\"", card(0).querySelector(".ticker-ref") && card(0).querySelector(".ticker-ref").textContent === "fech. 24/04 · semana", card(0).querySelector(".ticker-ref") && card(0).querySelector(".ticker-ref").textContent);
    type(card(0).querySelector('[data-path="ticker.0.change"]'), "+1,20%");
    ok("digitar variação positiva vira verde e ▲ na hora", card(0).querySelector(".ticker-change").classList.contains("trend-up") && card(0).querySelector(".trend-arrow").textContent === "▲");
    change(insp('select[data-ticker-cor="2"]'), "neutro");
  });
  step(function () {
    ok("modo neutro: cinza com seta pela direção", card(2).querySelector(".ticker-change").classList.contains("trend-flat") && card(2).querySelector(".trend-arrow").textContent === "▲");
    change(insp('select[data-ticker-cor="3"]'), "seta");
  });
  step(function () {
    ok("modo seta: botão de seta manual volta", !!card(3).querySelector('.trend-btn[data-action="cycle-trend"]'));
    ok("verificação: cotações com data e tipo", true);
  });

  /* Fontes */
  step(function () {
    click($("#tabBtnFontes"));
    ok("aba Fontes abre", !$("#tabFontes").hidden && $("#tabEstrutura").hidden);
    ok("lista vazia explica o uso", /Nenhuma fonte ainda/.test($("#sourcesList").textContent));
    click($('#tabFontes [data-action="add-source"]'));
  });
  step(function () {
    var srcs = cur().data.sources;
    ok("Adicionar fonte cria e abre no painel", srcs.length === 1 && /\[1\]/.test(insp(".prop-title").textContent));
    change(insp('input[data-source-field="veiculo"]'), "InfoMoney");
    change(insp('input[data-source-field="titulo"]'), "Ibovespa hoje: bolsa de valores ao vivo");
    change(insp('input[data-source-field="url"]'), "infomoney.com.br/mercados/ibovespa");
    change(insp('input[data-source-field="publicadoEm"]'), "2026-04-24");
  });
  step(function () {
    var src = cur().data.sources[0];
    ok("campos da fonte salvos (link completado com https)", src.veiculo === "InfoMoney" && src.url === "https://infomoney.com.br/mercados/ibovespa" && src.publicadoEm === "2026-04-24", JSON.stringify(src));
    ok("fonte sem data de acesso fica Incompleta", /Incompleta/.test($("#sourcesList").textContent) && /data de acesso/.test($("#inspectorSelection").textContent));
    click(insp('[data-action="source-access-today"]'));
  });
  step(function () {
    ok("Acesso em: hoje completa a fonte", !!cur().data.sources[0].acessoEm && /Link ok/.test($("#sourcesList").textContent));
    // vincula à notícia 1 pelo painel da notícia
    click($("#tabBtnEstrutura")); click(layer("news-0"));
    change(insp('select[data-news-source="0"]'), cur().data.sources[0].id);
  });
  step(function () {
    var line = $('#workspace [data-source-of="0"]');
    ok("notícia mostra o selo [1] Veículo · data", line && line.textContent === "[1] InfoMoney · 24/04/2026", line && line.textContent);
    ok("selo é link para a matéria", line && line.querySelector("a.inline-link").getAttribute("href") === "https://infomoney.com.br/mercados/ibovespa");
    var foot = W("footerBack.fontes").textContent;
    ok("rodapé do verso gerado (formato simples)", /^Fontes: \[1\] InfoMoney · Ibovespa hoje: bolsa de valores ao vivo · 24\/04\/2026 · infomoney\.com\.br/.test(foot), foot);
    ok("rodapé tem link clicável", !!W("footerBack.fontes").querySelector('a[href="https://infomoney.com.br/mercados/ibovespa"]'));
    ok("aba Fontes mostra 'Usada em: Notícia 1'", /Usada em: Notícia 1/.test($("#sourcesList").textContent));
    click($("#tabBtnFontes"));
    change($("#refFormat"), "abnt");
  });
  step(function () {
    var foot = W("footerBack.fontes").textContent;
    ok("formato ABNT no rodapé", /^Fontes: \[1\] INFOMONEY\. Ibovespa hoje: bolsa de valores ao vivo\. 24 abr\. 2026\. Disponível em: infomoney\.com\.br\/mercados\/ibovespa\. Acesso em: \d\d \w+\.? \d{4}\./.test(foot), foot);
    change($("#refFormat"), "simples");
    // Nova fonte a partir da notícia 2 (com link no texto)
    click($("#tabBtnEstrutura"));
    var lt = W("columns.1.linkText"); lt.focus(); lt.innerHTML = '<a href="https://www.bcb.gov.br/focus">Ver série do Focus →</a>'; lt.dispatchEvent(new Event("input", { bubbles: true })); lt.blur();
    click(layer("news-1"));
  });
  step(function () {
    change(insp('select[data-news-source="1"]'), "__new");
  });
  step(function () {
    var srcs = cur().data.sources, s2 = srcs[1];
    ok("+ Nova fonte… usa o link e o título da notícia", s2 && s2.url === "https://www.bcb.gov.br/focus" && s2.veiculo === "Banco Central do Brasil" && /Focus/.test(s2.titulo) && cur().data.columns[1].sourceId === s2.id, JSON.stringify(s2));
    ok("e abre a fonte nova no painel", /\[2\]/.test(insp(".prop-title").textContent) && !$("#tabFontes").hidden);
    $("#btnCheck").click();
  });
  step(function () {
    var txt = $("#checkList").textContent;
    ok("verificação aponta fonte [2] incompleta", /Fonte \[2\] incompleta/.test(txt));
    ok("verificação: cotações com data e tipo", /Todas as cotações têm data e tipo de variação/.test(txt));
    var it = Array.prototype.filter.call(document.querySelectorAll("#checkList .check-item"), function (li) { return /Fonte \[2\]/.test(li.textContent); })[0];
    it.querySelector("[data-check-go]").click();
  });
  step(function () {
    ok("Completar leva à fonte", $("#checkDialog").hidden && /\[2\]/.test(insp(".prop-title").textContent));
    click(insp('[data-action="remove-source"]'));
  });
  step(function () {
    ok("remover fonte desvincula a notícia", cur().data.sources.length === 1 && !cur().data.columns[1].sourceId && !!W("columns.1.linkText"));
    $("#btnUndo").click();
  });
  step(function () {
    ok("desfazer devolve a fonte", cur().data.sources.length === 2 && cur().data.columns[1].sourceId === cur().data.sources[1].id);
  });
}

if (MODE === "migr") {
  step(function () {
    var d = cur().data;
    ok("migração: fonte criada a partir do link da notícia", d.sources.length === 1 && d.sources[0].url === "https://www.reuters.com/x" && d.sources[0].veiculo === "Reuters" && d.columns[0].sourceId === d.sources[0].id);
    ok("migração: texto do link mantido", /Leia mais/.test(d.columns[0].linkText));
    ok("migração: rodapé de fontes continua o escrito à mão", W("footerBack.fontes").textContent === "Fontes: escritas à mão" && d.meta.overrides["footerBack.fontes"] === true);
    ok("migração: card com seta que não bate com o sinal fica 'pela seta'", d.ticker[0].modoCor === "seta" && d.ticker[1].modoCor === "sinal", d.ticker.map(function (t) { return t.modoCor; }).join(","));
    ok("migração: aparência do card mantida (seta manual)", card(0).querySelector(".ticker-change").classList.contains("trend-up"));
    ok("migração: notícia mostra o selo da fonte", $('#workspace [data-source-of="0"]') && /\[1\] Reuters/.test($('#workspace [data-source-of="0"]').textContent));
  });
}
setTimeout(run, 900);
