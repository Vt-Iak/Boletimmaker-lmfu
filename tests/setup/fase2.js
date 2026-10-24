// Roda ANTES do app. ?mode=migr grava no localStorage uma loja antiga (sem variáveis).
var MODE = (location.search.match(/mode=(\w+)/) || [])[1] || "novo";
try { localStorage.clear(); } catch (e) {}
if (MODE === "migr") {
  var oldData = {
    meta: { title: "PANORAMA ECONÔMICO", subtitle: "s", logo: null, publisherLogo: null },
    locked: false, elements: [], blockLayout: {},
    masthead: { line1: "SÁBADO, 25 DE ABRIL DE 2026 · SEMANAL · EDIÇÃO COMPACTA", line2: "EDIÇÃO N° 05/2026 · COBERTURA 19 A 24 DE ABRIL" },
    headline: { tag: "T", title: "Manchete antiga", deck: "d", image: null, paragraphs: ["p"] },
    ticker: [], columns: [], note: "", weekTable: { title: "", rows: [] },
    footerFront: { fontes: "", autoria: "", verso: "Verso: texto que eu escrevi à mão.", disclaimer: "" },
    page2Header: { editionLabel: "EDIÇÃO N° 05/2026", note: "" },
    thermometer: { title: "", subtitle: "Subtítulo escrito à mão", groups: [] },
    calendar: { title: "", subtitle: "Agenda escrita à mão", rows: [] },
    superQuarta: { title: "", body: "" }, glossary: { title: "", items: [] },
    footerBack: { editionInfo: "Info escrita à mão", fontes: "", disclaimer: "" }
  };
  localStorage.setItem("boletimMaker.v1", JSON.stringify({
    editions: { ed_old: { id: "ed_old", name: "Edição antiga", updatedAt: 1, data: oldData } },
    order: ["ed_old"], currentId: "ed_old",
    migrations: { publisherLogo: true, headerDividers: true, independentMastheadText: true, headerDividerBandXFix: true, modeloLogoMatch: true, inlineNewsLinks: true }
  }));
}
