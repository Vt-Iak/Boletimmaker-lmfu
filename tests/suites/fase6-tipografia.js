// Fase 6 — tipografia. Etapa 2: fontes locais empacotadas. Resultado em <pre id="f6out">.
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }

setTimeout(function () {
  var pedidos = [
    ["Source Serif 4 400", '400 12pt "Source Serif 4"'],
    ["Source Serif 4 400 itálico", 'italic 400 12pt "Source Serif 4"'],
    ["Source Serif 4 600", '600 12pt "Source Serif 4"'],
    ["Source Serif 4 700", '700 12pt "Source Serif 4"'],
    ["Source Serif 4 700 itálico", 'italic 700 12pt "Source Serif 4"'],
    ["IBM Plex Sans 400", '400 12pt "IBM Plex Sans"']
  ];
  Promise.all(pedidos.map(function (p) {
    return document.fonts.load(p[1], "ÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç").then(function (f) { return [p[0], f.length > 0]; }, function () { return [p[0], false]; });
  })).then(function (res) {
    res.forEach(function (r) { ok("fonte local carregada: " + r[0], r[1]); });
    ok("acentos do português cobertos pela fonte", document.fonts.check('400 12pt "Source Serif 4"', "ãõçéêíóúâô"));
    // Tema clássico intocado: nada na página usa a fonte nova ainda.
    var usa = Array.prototype.some.call(document.querySelectorAll("#workspace .page *"), function (el) {
      return /Source Serif/.test(getComputedStyle(el).fontFamily);
    });
    ok("página continua com a tipografia clássica", !usa);
    ok("título da notícia segue em Georgia", /Georgia/.test(getComputedStyle($("#workspace .news-title")).fontFamily));
    var p = document.createElement("pre"); p.id = "f6out"; p.textContent = R.join("\n"); document.body.appendChild(p);
  });
}, 900);
