var R = [];
function ok(name, cond, extra) { R.push((cond ? "OK   " : "FALHA") + " " + name + (extra != null ? " — " + extra : "")); }
function $(s) { return document.querySelector(s); }
function txt(p) { var e = document.querySelector('#workspace [data-path="' + p + '"]'); return e ? e.textContent : null; }
function setVar(id, v) { var i = $("#" + id); i.value = v; i.dispatchEvent(new Event("change", { bubbles: true })); }
function done() { var p = document.createElement("pre"); p.id = "f2out"; p.textContent = R.join("\n"); document.body.appendChild(p); }

if (MODE === "novo") {
  setTimeout(function () {
    // 1. Modelo novo: textos gerados = textos originais do modelo
    var esperado = {
      "masthead.line1": "SÁBADO, 25 DE ABRIL DE 2026 · SEMANAL · EDIÇÃO COMPACTA",
      "masthead.line2": "EDIÇÃO N° 05/2026 · COBERTURA 19 A 24 DE ABRIL",
      "page2Header.editionLabel": "EDIÇÃO N° 05/2026",
      "thermometer.subtitle": "Fechamentos de sexta-feira, 24/04/2026. Variação de 2026 no acumulado do ano.",
      "calendar.subtitle": "Calendário de eventos que devem mexer com os mercados — semana de 27 de abril a 2 de maio.",
      "footerFront.verso": "Verso: Termômetro da Semana e agenda de 27/04 a 02/05.",
      "footerBack.editionInfo": "Panorama Econômico — Edição N° 05/2026 · Cobertura 19/04 a 24/04/2026 · Emitido em 25/04/2026 · Próxima edição: 02/05/2026."
    };
    Object.keys(esperado).forEach(function (p) { ok("modelo: " + p, txt(p) === esperado[p], txt(p) === esperado[p] ? null : txt(p)); });
    ok("faixa mostra as variáveis", $("#varEdicao").value === "05/2026" && $("#varData").value === "2026-04-25");
    ok("nome do PDF na faixa", $("#varsHint").textContent.indexOf("boletim_2026-05_edicao.pdf") !== -1, $("#varsHint").textContent);
    ok("campo automático marcado", $('[data-path="masthead.line2"]').dataset.var === "auto");

    // 2. Nova semana: muda as variáveis
    setVar("varEdicao", "06/2026");
    setVar("varData", "2026-05-02");
    setVar("varCobIni", "2026-04-27");
    setVar("varCobFim", "2026-04-30");
    setVar("varProxima", "2026-05-09");
    ok("data atualizada", txt("masthead.line1") === "SÁBADO, 2 DE MAIO DE 2026 · SEMANAL · EDIÇÃO COMPACTA", txt("masthead.line1"));
    ok("edição/cobertura atualizadas", txt("masthead.line2") === "EDIÇÃO N° 06/2026 · COBERTURA 27 A 30 DE ABRIL", txt("masthead.line2"));
    ok("verso atualizado", txt("page2Header.editionLabel") === "EDIÇÃO N° 06/2026");
    ok("termômetro atualizado", txt("thermometer.subtitle") === "Fechamentos de quinta-feira, 30/04/2026. Variação de 2026 no acumulado do ano.", txt("thermometer.subtitle"));
    ok("agenda atualizada", txt("calendar.subtitle") === "Calendário de eventos que devem mexer com os mercados — semana de 4 a 9 de maio.", txt("calendar.subtitle"));
    ok("rodapé atualizado", txt("footerBack.editionInfo") === "Panorama Econômico — Edição N° 06/2026 · Cobertura 27/04 a 30/04/2026 · Emitido em 02/05/2026 · Próxima edição: 09/05/2026.", txt("footerBack.editionInfo"));
    ok("nome do PDF atualizado", $("#varsHint").textContent.indexOf("boletim_2026-06_edicao.pdf") !== -1);

    // 3. Desfazer a última variável
    $("#btnUndo").click();
    ok("desfazer volta a variável", $("#varProxima").value === "2026-05-02" && txt("footerBack.editionInfo").indexOf("Próxima edição: 02/05/2026") !== -1, $("#varProxima").value);
    $("#btnRedo").click();

    // 4. Editar um campo automático -> vira manual e para de acompanhar
    var l2 = $('[data-path="masthead.line2"]');
    l2.focus(); l2.textContent = "MINHA LINHA MANUAL"; l2.dispatchEvent(new Event("input", { bubbles: true }));
    ok("editar passa para manual", l2.dataset.var === "manual");
    ok("painel mostra 'Voltar ao automático'", !!$('#inspectorSelection [data-action="var-auto"]'));
    l2.blur();
    setVar("varEdicao", "07/2026");
    ok("campo manual não muda com as variáveis", txt("masthead.line2") === "MINHA LINHA MANUAL");
    ok("faixa avisa 1 campo manual", !$("#btnVarsAutoAll").hidden && $("#btnVarsAutoAll").textContent.indexOf("1 campo") === 0, $("#btnVarsAutoAll").textContent);
    // volta pelo botão da faixa
    $("#btnVarsAutoAll").click();
    setTimeout(function () {
      $("#appDialogOk").click();
      setTimeout(function () {
        ok("voltar ao automático regenera", txt("masthead.line2") === "EDIÇÃO N° 07/2026 · COBERTURA 27 A 30 DE ABRIL", txt("masthead.line2"));
        // 5. Nome do PDF na impressão
        var tituloNaHora = null; window.print = function () { tituloNaHora = document.title; };
        $("#btnPrint").click();
        setTimeout(function () {
          $("#checkExport").click();
          setTimeout(function () {
            ok("título do documento = nome do PDF na impressão", tituloNaHora === "boletim_2026-07_edicao", tituloNaHora);
            ok("título volta depois", document.title !== "boletim_2026-07_edicao");
            // 6. Coluna Var. AAAA do termômetro
            setVar("varCobFim", "2027-01-08");
            var th = Array.prototype.map.call(document.querySelectorAll(".thermo-wrap th"), function (t) { return t.textContent; });
            ok("coluna do termômetro segue o ano", th.indexOf("Var. 2027") !== -1, th.join("|"));
            done();
          }, 100);
        }, 100);
      }, 100);
    }, 100);
  }, 800);
}

if (MODE === "migr") {
  setTimeout(function () {
    ok("edição antiga: nada mudou na linha 1", txt("masthead.line1") === "SÁBADO, 25 DE ABRIL DE 2026 · SEMANAL · EDIÇÃO COMPACTA");
    ok("edição antiga: verso manual preservado", txt("footerFront.verso") === "Verso: texto que eu escrevi à mão.");
    ok("edição antiga: subtítulos preservados", txt("thermometer.subtitle") === "Subtítulo escrito à mão" && txt("calendar.subtitle") === "Agenda escrita à mão");
    ok("edição antiga: rodapé preservado", txt("footerBack.editionInfo") === "Info escrita à mão");
    ok("edição antiga: todos marcados manual (8, com o rodapé de fontes)", document.querySelectorAll('[data-var="manual"]').length === 8, document.querySelectorAll('[data-var="manual"]').length);
    ok("edição antiga: número da edição aproveitado", $("#varEdicao").value === "05/2026", $("#varEdicao").value);
    ok("edição antiga: faixa avisa 8 manuais", $("#btnVarsAutoAll").textContent.indexOf("8 campos") === 0, $("#btnVarsAutoAll").textContent);
    ok("edição antiga: coluna continua Var. 2026", Array.prototype.some.call(document.querySelectorAll(".thermo-wrap th"), function (t) { return t.textContent === "Var. 2026"; }));
    // mudar variável não mexe em nada
    setVar("varData", "2026-05-02");
    ok("variável nova não altera campos manuais", txt("masthead.line1") === "SÁBADO, 25 DE ABRIL DE 2026 · SEMANAL · EDIÇÃO COMPACTA");
    // importar JSON antigo também migra
    var dt = new DataTransfer();
    var d = JSON.parse(localStorage.getItem("boletimMaker.v1")).editions.ed_old.data;
    delete d.meta.vars; delete d.meta.overrides; d.page2Header.editionLabel = "EDIÇÃO N° 09/2026";
    dt.items.add(new File([JSON.stringify(d)], "antiga.json", { type: "application/json" }));
    var inp = $("#importFileInput"); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
    setTimeout(function () {
      ok("JSON antigo importado com campos manuais", document.querySelectorAll('[data-var="manual"]').length === 8 && $("#varEdicao").value === "09/2026", $("#varEdicao").value);
      done();
    }, 600);
  }, 800);
}
