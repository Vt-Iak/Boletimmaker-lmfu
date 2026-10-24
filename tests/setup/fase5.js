var MODE = (location.search.match(/mode=(\w+)/) || [])[1] || "novo";
try { localStorage.clear(); } catch (e) {}
(function () { var st = window.setTimeout; window.setTimeout = function (f, d) { if (d === 400 && typeof f === "function") { f(); return 0; } return st.apply(window, arguments); }; })();
if (MODE === "migr") {
  // Loja de depois da Fase 2 (tem variáveis), de antes da Fase 5
  var d = {
    meta: { title: "PANORAMA ECONÔMICO", subtitle: "s", logo: null, publisherLogo: null, vars: { edicao: "05/2026", data: "", coberturaInicio: "", coberturaFim: "", proxima: "" }, overrides: { "masthead.line1": true } },
    locked: false, elements: [], blockLayout: {},
    masthead: { line1: "L1", line2: "L2" },
    headline: { tag: "T", title: "Manchete", deck: "d", image: null, paragraphs: ["p"] },
    ticker: [
      { label: "DÓLAR", value: "R$ 4,98", change: "-0,60%", trend: "up" },
      { label: "BRENT", value: "US$ 100", change: "+1,00%", trend: "up" }
    ],
    columns: [{ tag: "X", title: "Notícia", body: "b", linkText: '<a href="https://www.reuters.com/x">Leia mais →</a>', image: null }],
    note: "", weekTable: { title: "", rows: [] },
    footerFront: { fontes: "", autoria: "", verso: "", disclaimer: "" },
    page2Header: { editionLabel: "", note: "" },
    thermometer: { title: "", subtitle: "", groups: [] },
    calendar: { title: "", subtitle: "", rows: [] },
    superQuarta: { title: "", body: "" }, glossary: { title: "", items: [] },
    footerBack: { editionInfo: "", fontes: "Fontes: escritas à mão", disclaimer: "" }
  };
  localStorage.setItem("boletimMaker.v1", JSON.stringify({
    editions: { ed_old: { id: "ed_old", name: "Edição antiga", updatedAt: 1, data: d } },
    order: ["ed_old"], currentId: "ed_old",
    migrations: { publisherLogo: true, headerDividers: true, independentMastheadText: true, headerDividerBandXFix: true, modeloLogoMatch: true, inlineNewsLinks: true, phase2Vars: true }
  }));
}
