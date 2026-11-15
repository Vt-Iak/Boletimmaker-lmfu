/* Carrossel do Instagram: montagem a partir da edição, edição no slide,
   painel (ocultar, adicionar, excluir, relevância), estouro e exportação
   real (html2canvas de js/vendor) em PNG 2160×2700 e .zip. */
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message + " linha " + e.lineno); });
function ok(name, cond, extra) { R.push((cond ? "OK   " : "FALHA") + " " + name + (extra != null && !cond ? " — " + extra : "")); }
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
function st() { return JSON.parse(localStorage.getItem("boletimMaker.v1")); }
function cur() { var s = st(); return s.editions[s.currentId]; }
function car() { return cur().data.carrossel; }
function act(a) { var b = $('#carrosselView [data-cs-act="' + a + '"]'); if (!b) throw new Error("botão " + a + " ausente"); b.click(); }
function palco() { return $("#csPalco .cs-slide"); }
function campo(p) { return $('#csPalco [data-cpath="' + p + '"]'); }
function digitar(el, html) { el.focus(); el.innerHTML = html; el.dispatchEvent(new Event("input", { bubbles: true })); }
var steps = [], i = 0;
function step(fn, wait) { steps.push([fn, wait == null ? 300 : wait]); }
function run() {
  if (i >= steps.length) { var p = document.createElement("pre"); p.id = "csout"; p.textContent = R.join("\n"); document.body.appendChild(p); return; }
  var s = steps[i++];
  var r;
  try { r = s[0](); } catch (e) { R.push("FALHA [exceção no passo " + i + "] " + e.message); }
  if (r !== "esperar") setTimeout(run, s[1]); // "esperar": o próprio passo chama run() ao terminar
}
// Captura o arquivo que o app "baixa" (sem abrir janela de download)
var baixados = [], criarUrl = URL.createObjectURL;
URL.createObjectURL = function (b) { baixados.push(b); return criarUrl.call(URL, b); };
HTMLAnchorElement.prototype.click = function () {};
function esperarArquivo(n, depois, t0) {
  t0 = t0 || Date.now();
  if (baixados.length >= n) { depois(baixados[n - 1]); return; }
  if (Date.now() - t0 > 300000) { ok("arquivo gerado em até 5 min", false, (($("#csMsg") || {}).textContent || "")); run(); return; }
  setTimeout(function () { esperarArquivo(n, depois, t0); }, 300);
}

step(function () {
  ok("botão Carrossel na barra", !!$('[data-modo="carrossel"]'));
  ok("edição começa sem carrossel", !cur().data.carrossel);
  $('[data-modo="carrossel"]').click();
}, 600);

step(function () {
  ok("tela do carrossel aberta", !$("#carrosselView").hidden && document.body.classList.contains("modo-carrossel"));
  var c = car(), d = cur().data;
  ok("carrossel montado e gravado na edição", !!c && Array.isArray(c.slides));
  var tipos = c.slides.map(function (s) { return s.tipo; });
  ok("sequência capa, termômetro, notícias, agenda, glossário", tipos[0] === "capa" && tipos[1] === "termometro" && tipos[tipos.length - 1] === "glossario" && tipos[tipos.length - 2] === "agenda", tipos.join(","));
  ok("um slide por notícia da edição", tipos.filter(function (t) { return t === "noticia"; }).length === d.columns.length);
  ok("capa traz número e período da edição", /EDIÇÃO/.test(c.slides[0].edicao) && c.slides[0].edicao.indexOf(d.meta.vars.edicao) !== -1);
  ok("termômetro com os cards da página 1", c.slides[1].cards.length === Math.min(6, d.ticker.length) && c.slides[1].cards[0].valor.length > 0);
  ok("miniaturas, uma por slide", $$("#csLista .cs-mini-item").length === c.slides.length);
  ok("slide aberto é editável", !!palco() && palco().classList.contains("cs-ed") && $$("#csPalco [contenteditable]").length > 3);
  ok("miniatura sem campos editáveis", $$("#csLista [contenteditable]").length === 0);
  $$("#csLista .cs-mini-item")[1].click();
});

step(function () {
  var c = car();
  ok("numeração na faixa do topo", new RegExp("2/" + c.slides.length).test($("#csPalco .cs-pag").textContent), $("#csPalco .cs-pag").textContent);
  digitar(campo("slides.1.titulo"), "Semana em <b>seis</b> números");
}, 500);

step(function () {
  ok("título editado no slide vai para a edição", /seis/.test(car().slides[1].titulo) && /font-weight/.test(car().slides[1].titulo), car().slides[1].titulo);
  ok("miniatura acompanha o texto", /seis/.test($$("#csLista .cs-mini-item")[1].textContent));
  document.activeElement.blur();
  $("#btnUndo").click();
}, 400);

step(function () {
  ok("desfazer volta o título", !/seis/.test(car().slides[1].titulo), car().slides[1].titulo);
  var p = $("#csPerfil");
  p.value = "@liga_teste"; p.dispatchEvent(new Event("input", { bubbles: true })); p.dispatchEvent(new Event("change", { bubbles: true }));
}, 600);

step(function () {
  ok("perfil gravado", car().perfil === "@liga_teste");
  ok("perfil no rodapé do slide", /@liga_teste/.test(($("#csPalco .cs-perfil") || {}).textContent || ""));
  act("ocultar");
}, 400);

step(function () {
  var c = car();
  ok("ocultar slide", c.slides[1].oculto === true && $$("#csLista .cs-mini-item")[1].classList.contains("is-oculto"));
  ok("slide oculto sai da numeração", /oculto/.test($("#csPalco .cs-pag").textContent) && new RegExp("/" + (c.slides.length - 1) + "$").test($$("#csLista .cs-mini-item")[2].querySelector(".cs-pag").textContent.trim()));
  act("ocultar");
  $("#csNovoTipo").value = "noticia";
  act("adicionar");
}, 400);

step(function () {
  var c = car();
  ok("slide novo entra depois do aberto", c.slides[2].tipo === "noticia" && !c.slides[1].oculto && $$("#csLista .cs-mini-item")[2].classList.contains("is-active"));
  ok("notícia nova com card e itens para preencher", c.slides[2].cards.length === 1 && c.slides[2].itens.length === 3);
  ok("card vazio aparece tracejado no editor", !!$("#csPalco .cs-card.cs-vazio-box"));
  ok("card vazio não sai na imagem (miniatura)", !$$("#csLista .cs-mini-item")[2].querySelector(".cs-card"));
  digitar(campo("slides.2.cards.0.valor"), "-6,08%");
}, 400);

step(function () {
  var v = campo("slides.2.cards.0.valor");
  ok("número negativo fica salmão (pelo sinal)", v.classList.contains("cs-v-salmao"), v.className);
  digitar(campo("slides.2.itens.0"), new Array(60).join("Texto longo demais para caber no slide. "));
}, 900);

step(function () {
  ok("estouro avisado no painel", !$("#csAlerta").hidden);
  ok("estouro marcado na miniatura", $$("#csLista .cs-mini-item")[2].classList.contains("has-estouro"));
  document.activeElement.blur();
  act("excluir");
}, 500);

step(function () {
  var c = car(), k = c.slides.map(function (s) { return s.tipo; }).indexOf("agenda");
  ok("excluir slide", c.slides.every(function (s) { return !/Texto longo demais/.test(JSON.stringify(s)); }));
  $$("#csLista .cs-mini-item")[k].click();
  window.__k = k;
}, 400);

step(function () {
  var antes = car().slides[window.__k].linhas[0].relevancia;
  window.__rel = antes;
  $('#csPalco [data-cs-act="rel"][data-k="0"]').click();
}, 400);

step(function () {
  var depois = car().slides[window.__k].linhas[0].relevancia;
  ok("clicar na etiqueta troca a relevância", depois !== window.__rel && ["ALTA", "MÉDIA", "BAIXA"].indexOf(depois) !== -1, window.__rel + " → " + depois);
  ok("agenda sem a classe da tabela no próprio slide", !palco().classList.contains("cs-agenda-tabela") && !!$("#csPalco .cs-agenda-tabela"));
  $$("#csLista .cs-mini-item")[1].click();
}, 400);

// Exportar um slide: PNG de 2160×2700
step(function () { act("baixar-um"); }, 100);
step(function () {
  esperarArquivo(1, function (b) {
    var r = new FileReader();
    r.onload = function () {
      var u8 = new Uint8Array(r.result);
      ok("PNG gerado", b.type === "image/png" && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47);
      var dv = new DataView(r.result);
      ok("PNG em 2160 × 2700", dv.getUint32(16) === 2160 && dv.getUint32(20) === 2700, dv.getUint32(16) + "×" + dv.getUint32(20));
      ok("aviso de imagem gerada", /carrossel_.*_02\.png/.test($("#csMsg").textContent), $("#csMsg").textContent);
      act("ocultar");
      setTimeout(function () { act("baixar-todos"); esperarZip(); }, 400);
    };
    r.readAsArrayBuffer(b);
  });
  return "esperar";
}, 0);
function esperarZip() {
  esperarArquivo(2, function (z) {
    var r = new FileReader();
    r.onload = function () {
      var u8 = new Uint8Array(r.result), dv = new DataView(r.result), n = car().slides.filter(function (s) { return !s.oculto; }).length;
      ok(".zip gerado", z.type === "application/zip" && u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 3 && u8[3] === 4);
      var fim = dv.getUint16(r.result.byteLength - 22 + 10, true);
      ok(".zip com os slides visíveis (oculto fica fora)", fim === n, fim + " de " + n);
      var nome = new TextDecoder().decode(u8.slice(30, 30 + dv.getUint16(26, true)));
      ok("nomes numerados na ordem do carrossel", /^carrossel_.*_01\.png$/.test(nome), nome);
      run();
    };
    r.readAsArrayBuffer(z);
  });
}

step(function () {
  // Próxima edição: slides recomeçam, perfil fica
  var s = st(), d = s.editions[s.currentId].data;
  ok("perfil mantido para a próxima edição (dados)", d.carrossel.perfil === "@liga_teste");
  $('[data-modo="pagina"]').click();
}, 300);
step(function () {
  ok("volta para a Página", $("#carrosselView").hidden && !document.body.classList.contains("modo-carrossel"));
});

setTimeout(run, 900);
