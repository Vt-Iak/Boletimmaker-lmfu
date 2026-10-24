var R = []; window.addEventListener("error", function (e) { R.push("ERRO JS: " + e.message); });
function ok(n, c, x) { R.push((c ? "OK   " : "FALHA") + " " + n + (x != null && !c ? " — " + x : "")); }
function $(s) { return document.querySelector(s); }
function W(p) { return document.querySelector('#workspace [data-path="' + p + '"]'); }
setTimeout(function () {
  var t = $("#workspace table.thermo-table");
  ok("tabela com o novo layout", !!t && getComputedStyle(t).tableLayout === "fixed");
  ok("título numérico alinhado à direita", getComputedStyle(t.querySelector("th:nth-child(2)")).textAlign === "right");
  ok("variação negativa em vermelho", W("thermometer.groups.0.rows.0.varSemana").classList.contains("v-down"));
  ok("variação positiva em verde", W("thermometer.groups.0.rows.1.varSemana").classList.contains("v-up"));
  var sinal0 = W("thermometer.groups.0.rows.0.ativo").parentElement.querySelector("td.sinal");
  ok("seta automática pela semana (▼)", sinal0.textContent === "▼" && sinal0.classList.contains("trend-down"));
  var selic = W("thermometer.groups.0.rows.4.ativo").parentElement.querySelector("td.sinal");
  ok("sem variação: '—'", selic.textContent === "—", selic.textContent);
  var v = W("thermometer.groups.0.rows.0.varSemana"); v.focus(); v.textContent = "+2,10%"; v.dispatchEvent(new Event("input", { bubbles: true })); v.blur();
  ok("digitar muda cor e seta na hora", v.classList.contains("v-up") && sinal0.textContent === "▲");
  var x = W("thermometer.groups.0.rows.0.fonte").parentElement.querySelector(".thermo-row-x");
  ok("× da linha fica na coluna Fonte", !!x);
  var n0 = document.querySelectorAll("#workspace table.thermo-table tbody tr:not(.group-row)").length; x.click();
  ok("× remove a linha", document.querySelectorAll("#workspace table.thermo-table tbody tr:not(.group-row)").length === n0 - 1);
  var p = document.createElement("pre"); p.id = "th"; p.textContent = R.join("\n"); document.body.appendChild(p);
}, 1200);
