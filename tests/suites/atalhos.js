// Atalhos ajustáveis e configurações pessoais. Resultado em <pre id="atout">.
var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function tecla(code, mods, alvo) {
  var key = /^Key/.test(code) ? code.slice(3).toLowerCase() : /^Digit/.test(code) ? code.slice(5) : code === "Comma" ? "," : code;
  var o = Object.assign({ code: code, key: key, bubbles: true, cancelable: true }, mods || {});
  var ev = new KeyboardEvent("keydown", o);
  (alvo || document.body).dispatchEvent(ev);
  return ev;
}
function prefs() { return JSON.parse(localStorage.getItem("boletimMaker.prefs") || "{}"); }
function linhaDe(nome) { return Array.prototype.filter.call(document.querySelectorAll("#settingsBody tr"), function (tr) { return tr.cells[0] && tr.cells[0].textContent.indexOf(nome) === 0; })[0]; }
var passos = [], i = 0;
function passo(fn, w) { passos.push([fn, w || 250]); }
function rodar() { var p = passos[i++]; if (!p) return; try { p[0](); } catch (e) { R.push("ERRO " + e.message); } setTimeout(rodar, p[1]); }

passo(function () {
  var ev = tecla("F1");
  ok("F1 abre os atalhos", !$("#settingsDialog").hidden && ev.defaultPrevented && /Verificar pendências/.test($("#settingsBody").textContent));
  ok("lista os fixos também", /Desfazer \/ refazer/.test($("#settingsBody").textContent));
  linhaDe("Verificar pendências").querySelector('[data-settings-act="alterar"]').click();
});
passo(function () {
  ok("modo de captura", /Pressione a nova combinação/.test($("#settingsBody").textContent));
  tecla("KeyT", { ctrlKey: true });
  ok("recusa atalho do navegador (Ctrl+T)", /Ctrl\+T é do navegador/.test($("#settingsMsg").textContent), $("#settingsMsg").textContent);
  tecla("KeyQ");
  ok("recusa tecla sem Ctrl/Alt", /Use Ctrl ou Alt/.test($("#settingsMsg").textContent));
  tecla("KeyV", { ctrlKey: true, altKey: true });
  ok("grava o novo atalho", prefs().atalhos.verificar === "Ctrl+Alt+V", JSON.stringify(prefs().atalhos));
  ok("mostra a combinação", linhaDe("Verificar pendências").cells[1].textContent.replace(/\s/g, "") === "Ctrl+Alt+V", linhaDe("Verificar pendências").cells[1].textContent);
  // Conflito: pôr F3 (calculadora) no Exportar PDF
  linhaDe("Exportar PDF").querySelector('[data-settings-act="alterar"]').click();
  tecla("F3");
  ok("conflito: o outro comando fica sem atalho", prefs().atalhos.pdf === "F3" && prefs().atalhos.calculadora === "" && /saiu de "Calculadora/.test($("#settingsMsg").textContent), $("#settingsMsg").textContent);
  linhaDe("Exportar PDF").querySelector('[data-settings-act="padrao"]').click();
  ok("voltar ao padrão", prefs().atalhos.pdf === undefined);
  $("#settingsClose").click();
});
passo(function () {
  tecla("F2");
  ok("F2 antigo não abre mais o Verificar", $("#checkDialog").hidden);
  tecla("KeyV", { ctrlKey: true, altKey: true });
  ok("Ctrl+Alt+V abre o Verificar", !$("#checkDialog").hidden);
  $("#checkClose").click();
  // AltGr (Ctrl+Alt no teclado ABNT2) dentro do texto não dispara atalho
  var t = document.querySelector('#workspace [data-path="headline.title"]');
  t.focus();
  var ev = tecla("KeyV", { ctrlKey: true, altKey: true, modifierAltGraph: true }, t);
  ok("AltGr não é atalho (digitação ABNT2)", !ev.defaultPrevented && $("#checkDialog").hidden);
  t.blur();
  var s = tecla("KeyS", { ctrlKey: true });
  ok("Ctrl+S salva sem abrir o 'salvar página' do navegador", s.defaultPrevented);
  tecla("F4");
});
passo(function () {
  ok("F4 abre nova observação", !$("#tabRevisao").hidden && !!$("#notaTexto"));
  $('[data-nota-action="cancelar"]').click();
  tecla("Digit1", { altKey: true });
  ok("Alt+1 volta para a aba Estrutura", !$("#tabEstrutura").hidden);
  tecla("F6");
});
passo(function () {
  ok("F6 abre o acervo", !$("#acervoDialog").hidden);
  $("#acervoClose").click();
  tecla("Comma", { ctrlKey: true });
});
passo(function () {
  ok("Ctrl+, abre Configurações > Interface", !$("#settingsDialog").hidden && !!$('#settingsBody select[data-pref="dicas"]'));
  var d = $('#settingsBody select[data-pref="dicas"]'); d.value = "false"; d.dispatchEvent(new Event("change", { bubbles: true }));
  ok("ocultar textos de ajuda", document.body.classList.contains("hide-hints") && prefs().dicas === false);
  var t = $('#settingsBody select[data-pref="tema"]'); t.value = "dark"; t.dispatchEvent(new Event("change", { bubbles: true }));
  ok("tema escolhido nas configurações", document.documentElement.getAttribute("data-ui-theme") === "dark" && prefs().tema === "dark");
  $("#settingsClose").click();
  var p = document.createElement("pre"); p.id = "atout"; p.textContent = R.join("\n"); document.body.appendChild(p);
});
setTimeout(rodar, 900);
