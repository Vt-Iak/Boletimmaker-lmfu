// Boletim Maker — coletor da Pauta (Node 20, sem dependências).
//
// Coleta as matérias do período de cobertura nos canais de coleta/canais.json,
// filtra (domínio da lista, período, assunto econômico, duplicadas), classifica
// por editoria (coleta/editorias.json), agrupa por tema e grava
// pautas/<inicio>.json + pautas/index.json no formato "boletimMaker.pauta".
//
// Nada aqui inventa texto: título e resumo de cada tema são trechos reais das
// matérias coletadas, e todo link vem da própria fonte.
//
// Uso:  node coleta/coletar.mjs
//   INICIO=2026-10-19 FIM=2026-10-23  período (padrão: última semana seg–sex)
//   TERMO=Petrobras                   busca por palavra-chave (grava busca-…)
//   SAIDA=pautas                      pasta de saída (testes usam outra)
//   ATRASO_MS=250                     pausa entre pedidos a um mesmo site

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(RAIZ, process.env.SAIDA || "pautas");
const ATRASO = Number(process.env.ATRASO_MS || 250);
const TERMO = (process.env.TERMO || "").trim();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 BoletimMaker-Pauta/1.0";
const TRECHO_MAX = 300;
const MAX_DECODIFICAR = 250; // links do Google Notícias resolvidos por execução

const log = (...a) => console.log(...a);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Datas (fuso de Brasília, UTC−3) ----------
const iso = (d) => d.toISOString().slice(0, 10);
const noFuso = (s, h) => new Date(s + "T" + h + "-03:00");
function periodoPadrao(agora = new Date()) {
  // Hoje em Brasília; a semana coberta é a última segunda–sexta já terminada.
  const hoje = new Date(agora.getTime() - 3 * 3600e3);
  const dia = hoje.getUTCDay(); // 0 dom … 6 sáb
  const voltaSexta = dia === 6 ? 1 : dia === 0 ? 2 : dia + 2;
  const sexta = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - voltaSexta));
  const segunda = new Date(sexta.getTime() - 4 * 864e5);
  return { inicio: iso(segunda), fim: iso(sexta) };
}
function diasEntre(inicio, fim) {
  const out = [];
  for (let d = new Date(inicio + "T12:00:00Z"); iso(d) <= fim; d = new Date(d.getTime() + 864e5)) out.push(iso(d));
  return out;
}

// ---------- Texto ----------
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function limpaHtml(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;/g, "'").replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, "—").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ").trim();
}
function cortar(s, max = TRECHO_MAX) {
  // Rodapé automático dos feeds WordPress ("The post X appeared first on Y.")
  s = limpaHtml(s).replace(/\s*\b(The post|O post)\b[\s\S]*?\b(appeared first on|apareceu primeiro em)\b[\s\S]*$/i, "").trim();
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  return corte.slice(0, Math.max(corte.lastIndexOf(" "), max - 40)).replace(/[\s,;:.]+$/, "") + "…";
}
function frases(s) { return limpaHtml(s).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“])/).filter((f) => f.length > 25); }
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const temTermo = (texto, termo) => new RegExp("(^|[^a-z0-9])" + escRe(termo) + "($|[^a-z0-9])").test(texto);

// ---------- Rede ----------
const ultimoPedido = {};
async function baixar(url, opcoes = {}) {
  const host = new URL(url).hostname;
  // O Google Notícias limita pedidos seguidos: espaça mais.
  const pausa = host === "news.google.com" ? Math.max(ATRASO, 1200) : ATRASO;
  const desde = Date.now() - (ultimoPedido[host] || 0);
  if (desde < pausa) await espera(pausa - desde);
  ultimoPedido[host] = Date.now();
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const r = await fetch(url, { ...opcoes, headers: { "user-agent": UA, accept: "*/*", ...(opcoes.headers || {}) }, signal: AbortSignal.timeout(25000) });
      return { status: r.status, texto: await r.text(), url: r.url };
    } catch (e) {
      if (tentativa) return { status: 0, texto: "", erro: e.message };
      await espera(1500);
    }
  }
}

// ---------- Feeds ----------
const tag = (xml, nome) => { const m = new RegExp("<" + nome + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + nome + ">", "i").exec(xml); return m ? m[1] : ""; };
function lerRss(xml) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map((it) => ({
    titulo: limpaHtml(tag(it, "title")),
    url: limpaHtml(tag(it, "link")) || ((/<guid[^>]*>(https?:[^<]+)<\/guid>/i.exec(it) || [])[1] || ""),
    data: new Date(limpaHtml(tag(it, "pubDate")) || limpaHtml(tag(it, "dc:date"))),
    trecho: tag(it, "description"),
    fonteGoogle: (/<source url="([^"]+)">/i.exec(it) || [])[1] || null,
    fonteNome: limpaHtml((/<source url="[^"]+">([^<]*)<\/source>/i.exec(it) || [])[1] || "")
  }));
}
function lerAtom(xml) {
  return (xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []).map((en) => {
    const links = [...en.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
    const alt = links.find((l) => /rel="alternate"/.test(l)) || links[0] || "";
    return {
      titulo: limpaHtml(tag(en, "title")),
      url: (/href="([^"]+)"/.exec(alt) || [])[1] || "",
      data: new Date(limpaHtml(tag(en, "published")) || limpaHtml(tag(en, "updated"))),
      trecho: tag(en, "summary") || tag(en, "content")
    };
  });
}

// ---------- Google Notícias ----------
function buscaGoogle(busca, idioma, inicio, fim) {
  const antes = iso(new Date(new Date(fim + "T12:00:00Z").getTime() + 864e5));
  const depois = iso(new Date(new Date(inicio + "T12:00:00Z").getTime() - 864e5));
  const q = busca + (TERMO ? " " + TERMO : "") + " after:" + depois + " before:" + antes;
  const loc = idioma === "en" ? "hl=en-US&gl=US&ceid=US:en" : "hl=pt-BR&gl=BR&ceid=BR:pt-419";
  return "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&" + loc;
}
let decodificados = 0;
// O link do Google Notícias é um redirecionamento: obtém o endereço original.
async function linkOriginal(urlGoogle) {
  if (decodificados >= MAX_DECODIFICAR) return null;
  const id = (urlGoogle.split("/articles/")[1] || "").split("?")[0];
  if (!id) return null;
  decodificados++;
  // /rss/articles/ responde mesmo quando /articles/ limita pedidos (429)
  let pag = await baixar("https://news.google.com/rss/articles/" + id);
  if (pag.status === 429) { await espera(6000); pag = await baixar("https://news.google.com/rss/articles/" + id); }
  const sg = (/data-n-a-sg="([^"]+)"/.exec(pag.texto) || [])[1], ts = (/data-n-a-ts="([^"]+)"/.exec(pag.texto) || [])[1];
  if (!sg || !ts) return null;
  const req = [[["Fbv4je", JSON.stringify(["garturlreq", [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]), null, "generic"]]];
  const r = await baixar("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: "f.req=" + encodeURIComponent(JSON.stringify(req))
  });
  const m = /"garturlres\\",\\"(https?:[^\\"]+)/.exec(r.texto);
  return m ? m[1] : null;
}
// Trecho de matérias que vieram só com título: a descrição da própria página.
async function descricaoDaPagina(url) {
  const r = await baixar(url);
  if (r.status !== 200) return "";
  const m = /<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i.exec(r.texto)
    || /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:description|description)["']/i.exec(r.texto);
  return m ? m[1] : "";
}

// ---------- Coleta por canal ----------
async function coletarCanal(canal, inicio, fim) {
  const c = canal.coleta || {};
  const brutos = [];
  if (c.metodo === "atom" || c.metodo === "rss") {
    const ler = c.metodo === "atom" ? lerAtom : lerRss;
    if (c.porDia) {
      for (const dia of diasEntre(inicio, fim)) {
        const [A, M, D] = dia.split("-");
        const base = c.porDia.replace("{AAAA}", A).replace("{MM}", M).replace("{DD}", D);
        for (let p = 1; p <= (c.maxPaginas || 10); p++) {
          const r = await baixar(base + (p > 1 ? "?paged=" + p : ""));
          if (r.status !== 200) break;
          const itens = ler(r.texto);
          if (!itens.length) break;
          brutos.push(...itens);
          if (itens.length < 10) break;
        }
      }
    } else {
      for (const end of c.enderecos || [c.endereco]) {
        const r = await baixar(end);
        if (r.status === 200) brutos.push(...ler(r.texto));
        else log("  ! " + canal.nome + ": " + end + " respondeu " + r.status);
      }
    }
  } else if (c.metodo === "api") {
    const [A, M, D] = inicio.split("-"), [A2, M2, D2] = fim.split("-");
    const url = c.endereco.replace("{AAAA}", A).replace("{MM}", M).replace("{DD}", D).replace("{AAAA2}", A2).replace("{MM2}", M2).replace("{DD2}", D2)
      + (TERMO ? "&busca=" + encodeURIComponent(TERMO) : "");
    const r = await baixar(url);
    try {
      for (const it of JSON.parse(r.texto).items || []) {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}:\d{2}:\d{2}))?/.exec(it.data_publicacao || "");
        brutos.push({ titulo: it.titulo, url: it.link, trecho: it.introducao, data: m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] || "12:00:00"}-03:00`) : new Date(NaN) });
      }
    } catch { log("  ! " + canal.nome + ": resposta da API ilegível (" + r.status + ")"); }
  } else if (c.metodo === "busca_site") {
    const r = await baixar(buscaGoogle(c.busca || "site:" + canal.dominio, c.idioma, inicio, fim));
    for (const it of lerRss(r.texto)) {
      // O Google acrescenta " - Nome do veículo" ao título: tira.
      const sufixo = it.fonteNome ? " - " + it.fonteNome : "";
      it.titulo = sufixo && it.titulo.endsWith(sufixo) ? it.titulo.slice(0, -sufixo.length) : it.titulo.replace(/\s+-\s+[^-]+$/, "");
      it.viaGoogle = true;
      it.trecho = "";
      brutos.push(it);
    }
  }
  return brutos;
}

// ---------- Classificação ----------
// Termos em português valem para fontes em português; em inglês ("en"), para
// fontes em inglês (Reuters, Yahoo, Advisor Perspectives).
function prepararEditorias(dic) {
  return dic.editorias.map((e) => ({
    tag: e.tag,
    pt: [...new Set((e.termos || []).map(semAcento))],
    en: [...new Set((e.en || []).map(semAcento))],
    ambiguos: (e.ambiguos || []).map(semAcento)
  }));
}
function classificar(m, editorias) {
  const t = semAcento(m.titulo), x = semAcento(m.trecho);
  let melhor = null;
  for (const e of editorias) {
    let pontos = 0, fortes = 0;
    const achados = [];
    for (const termo of m.idioma === "en" ? e.en : e.pt) {
      const noTitulo = temTermo(t, termo), noTrecho = temTermo(x, termo);
      if (noTitulo || noTrecho) { fortes++; pontos += noTitulo ? 2 : 1; if (noTitulo) achados.push(termo); }
    }
    if (fortes) for (const termo of e.ambiguos) if (temTermo(t, termo) || temTermo(x, termo)) pontos += 0.5;
    // O assunto precisa aparecer no título (ou duas vezes no trecho): corta matéria que só cita o tema de passagem.
    if (fortes && (achados.length || fortes >= 2) && (!melhor || pontos > melhor.pontos)) melhor = { tag: e.tag, pontos, achados };
  }
  return melhor;
}

// ---------- Temas ----------
const PARADAS = new Set(semAcento("para pela pelo pelos pelas como mais menos sobre entre apos antes ainda desde durante contra sem com uma umas uns dos das nos nas aos que seu sua seus suas este esta isso essa esse ser sao foi tem ter vai diz dizem afirma segundo after with from that this will said says over amid into what have has were their about more than than semana".split(/\s+/)));
const palavras = (s) => new Set(semAcento(s).split(/[^a-z0-9&-]+/).filter((w) => w.length >= 4 && !PARADAS.has(w)));
// Cada tema nasce de uma matéria-semente (a de maior prioridade); as outras
// só entram se forem parecidas com a semente — nunca por encadeamento
// (A parecida com B, B com C…), que juntava a semana inteira num tema só.
function parecidas(a, b, eventos) {
  if (a.editoria !== b.editoria || Math.abs(a.data - b.data) > 2 * 864e5) return false;
  if (a.achados.some((t) => eventos.has(t) && b.achados.includes(t))) return true;
  let comuns = 0;
  for (const w of a.palavras) if (b.palavras.has(w)) comuns++;
  const uniao = a.palavras.size + b.palavras.size - comuns;
  return comuns >= 3 || (comuns >= 2 && uniao && comuns / uniao >= 0.25);
}
function agrupar(materias, eventos) {
  const grupos = [];
  for (const m of materias) {
    const g = grupos.find((gr) => gr.length < 12 && parecidas(gr[0], m, eventos));
    if (g) g.push(m); else grupos.push([m]);
  }
  return grupos;
}
function montarTema(grupo, n) {
  grupo.sort((a, b) => a.prioridade - b.prioridade || a.data - b.data);
  const veiculos = new Set(grupo.map((m) => m.canalId)).size;
  const principal = grupo[0];
  // Resumo: a primeira frase do trecho de até 3 matérias, na ordem de
  // prioridade. resumoFrases guarda de qual matéria saiu cada frase, para o
  // app pôr o link certo ao lado de cada dado.
  const resumo = [], resumoDe = [], resumoFrases = [];
  for (const m of grupo) {
    let f = frases(m.trecho)[0];
    if (!f || /…$/.test(f) || resumo.some((r) => r.slice(0, 40) === f.slice(0, 40))) continue; // frase cortada não entra
    if (!/[.!?]["”]?$/.test(f)) f += ".";
    resumo.push(f);
    resumoDe.push(m.id);
    resumoFrases.push({ texto: f, de: m.id });
    if (resumo.length === 3 || resumo.join(" ").length > 420) break;
  }
  let relevancia = 1;
  if (grupo.length >= 2) relevancia++;
  if (veiculos >= 3) relevancia++;
  if (grupo.some((m) => m.grupo === "oficial")) relevancia++;
  if (grupo.length >= 5) relevancia++;
  return {
    id: "tema_" + n,
    titulo: principal.titulo,
    editoria: principal.editoria,
    resumo: resumo.join(" "),
    resumoDe,
    resumoFrases,
    relevancia: Math.min(5, relevancia),
    veiculos,
    materias: grupo.map(publica)
  };
}
const publica = (m) => ({
  id: m.id, canalId: m.canalId, veiculo: m.veiculo, dominio: m.dominio, grupo: m.grupo, prioridade: m.prioridade,
  titulo: m.titulo, url: m.url, linkConfirmado: m.linkConfirmado, publicadoEm: iso(new Date(m.data.getTime() - 3 * 3600e3)),
  editoria: m.editoria, trecho: m.trecho
});

// ---------- Principal ----------
async function principal() {
  const padrao = periodoPadrao();
  const inicio = process.env.INICIO || padrao.inicio, fim = process.env.FIM || padrao.fim;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim) throw new Error("Período inválido: " + inicio + " a " + fim);
  const canaisArq = JSON.parse(readFileSync(join(RAIZ, "coleta", "canais.json"), "utf8"));
  const dic = JSON.parse(readFileSync(join(RAIZ, "coleta", "editorias.json"), "utf8"));
  const editorias = prepararEditorias(dic);
  const eventos = new Set((dic.eventos || []).map(semAcento));
  const canais = canaisArq.canais.filter((c) => c.dominio && c.coleta).sort((a, b) => (a.prioridade || 99) - (b.prioridade || 99));
  const dominios = canais.map((c) => c.dominio.replace(/^www\./, ""));
  const canalDoHost = (host) => canais.find((c) => host === c.dominio || host.endsWith("." + c.dominio));
  const de = noFuso(inicio, "00:00:00"), ate = noFuso(fim, "23:59:59");
  log(`Pauta ${inicio} a ${fim}${TERMO ? " · termo: " + TERMO : ""} · ${canais.length} canais`);

  const descartadas = { foraDaLista: 0, foraDoPeriodo: 0, semData: 0, foraDoTema: 0, duplicadas: 0 };
  const vistas = new Set(), titulosVistos = new Set(), materias = [];
  const porCanal = {};
  for (const canal of canais) {
    const brutos = await coletarCanal(canal, inicio, fim);
    porCanal[canal.nome] = { brutos: brutos.length, aceitas: 0 };
    for (const b of brutos) {
      if (!b.titulo) continue;
      // Página de anexo (imagem, PDF) que a busca devolve como se fosse matéria
      if (/^[\w-]+\.(jpe?g|png|gif|webp|pdf)\b/i.test(b.titulo)) { descartadas.foraDoTema++; continue; }
      if (isNaN(b.data)) { descartadas.semData++; continue; }
      if (b.data < de || b.data > ate) { descartadas.foraDoPeriodo++; continue; }
      // Domínio: do próprio link (feed) ou da origem informada pelo Google
      let host = "";
      try { host = new URL(b.viaGoogle ? b.fonteGoogle || "" : b.url).hostname.replace(/^www\d*\./, ""); } catch { host = ""; }
      const dono = canalDoHost(host);
      if (!dono || dono.id !== canal.id) { descartadas.foraDaLista++; continue; }
      const m = {
        canalId: canal.id, veiculo: canal.nome, dominio: canal.dominio, grupo: canal.grupo, prioridade: canal.prioridade || 99,
        idioma: (canal.coleta && canal.coleta.idioma) || "pt",
        titulo: limpaHtml(b.titulo), url: b.url, data: b.data, trecho: cortar(b.trecho), linkConfirmado: !b.viaGoogle, viaGoogle: !!b.viaGoogle
      };
      // Assunto: editoria pelo dicionário. Fontes oficiais (BC, IBGE, IFI, B3)
      // já são econômicas: entram mesmo sem termo do dicionário, na editoria
      // padrão do canal. Numa busca por termo, basta citar o termo.
      const cl = classificar(m, editorias);
      const oficial = canal.grupo === "oficial";
      const citaTermo = TERMO && temTermo(semAcento(m.titulo + " " + m.trecho), semAcento(TERMO));
      if (TERMO ? !citaTermo && !m.viaGoogle : !cl && !oficial) { descartadas.foraDoTema++; continue; }
      m.editoria = cl ? cl.tag : (canal.coleta && canal.coleta.editoria) || "OUTROS";
      m.achados = cl ? cl.achados : [];
      const chaveTitulo = semAcento(m.titulo).replace(/[^a-z0-9]/g, "");
      if (vistas.has(m.url) || titulosVistos.has(chaveTitulo)) { descartadas.duplicadas++; continue; }
      vistas.add(m.url);
      titulosVistos.add(chaveTitulo);
      materias.push(m);
      porCanal[canal.nome].aceitas++;
    }
  }

  // Links do Google Notícias → endereço original; trecho pela página da matéria.
  for (const m of materias) {
    if (m.viaGoogle) {
      const original = await linkOriginal(m.url);
      if (original) {
        let host = "";
        try { host = new URL(original).hostname.replace(/^www\d*\./, ""); } catch { host = ""; }
        if (canalDoHost(host) && canalDoHost(host).id === m.canalId) { m.url = original; m.linkConfirmado = true; }
      }
    }
    if (!m.trecho && m.linkConfirmado) {
      m.trecho = cortar(await descricaoDaPagina(m.url));
      const cl = classificar(m, editorias);
      if (cl && m.editoria === "OUTROS") { m.editoria = cl.tag; m.achados = cl.achados; }
    }
  }
  materias.sort((a, b) => a.prioridade - b.prioridade || a.data - b.data);
  materias.forEach((m, i) => { m.id = "m_" + (i + 1); m.palavras = palavras(m.titulo); });

  const grupos = agrupar(materias, eventos);
  const temas = grupos.filter((g) => g.length >= 2)
    .map((g, i) => montarTema(g, i + 1))
    .sort((a, b) => b.relevancia - a.relevancia || b.materias.length - a.materias.length || a.materias[0].prioridade - b.materias[0].prioridade)
    .map((t, i) => ({ ...t, id: "tema_" + (i + 1) }));
  const avulsas = grupos.filter((g) => g.length === 1).map((g) => publica(g[0]));

  const pauta = {
    formato: "boletimMaker.pauta",
    versao: 1,
    geradoEm: new Date().toISOString(),
    cobertura: { inicio, fim },
    canais: dominios,
    coleta: { origem: process.env.GITHUB_ACTIONS ? "github-actions" : "local", termo: TERMO || null, descartadas, porCanal },
    temas,
    avulsas
  };
  validar(pauta);

  mkdirSync(SAIDA, { recursive: true });
  const slug = TERMO ? "-" + semAcento(TERMO).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) : "";
  const arquivo = TERMO ? `busca-${iso(new Date())}${slug}.json` : `${inicio}.json`;
  writeFileSync(join(SAIDA, arquivo), JSON.stringify(pauta, null, 1) + "\n");
  const idxCaminho = join(SAIDA, "index.json");
  const idx = existsSync(idxCaminho) ? JSON.parse(readFileSync(idxCaminho, "utf8")) : { formato: "boletimMaker.pautas", versao: 1, pautas: [] };
  idx.pautas = idx.pautas.filter((p) => p.arquivo !== arquivo);
  idx.pautas.unshift({ arquivo, tipo: TERMO ? "busca" : "semana", termo: TERMO || null, inicio, fim, geradoEm: pauta.geradoEm, temas: temas.length, materias: materias.length });
  idx.pautas.sort((a, b) => (b.geradoEm > a.geradoEm ? 1 : -1));
  idx.atualizadoEm = pauta.geradoEm;
  writeFileSync(idxCaminho, JSON.stringify(idx, null, 1) + "\n");

  log("Canais:");
  for (const [nome, c] of Object.entries(porCanal)) log(`  ${nome.padEnd(26)} ${String(c.brutos).padStart(4)} lidas · ${String(c.aceitas).padStart(3)} aceitas`);
  log(`Descartadas: ${JSON.stringify(descartadas)}`);
  log(`Gravado ${arquivo}: ${temas.length} temas, ${avulsas.length} avulsas, ${materias.length} matérias (${materias.filter((m) => !m.linkConfirmado).length} sem link confirmado).`);
}

// Regras de confiabilidade (seção 5.6 do CONTEXTO.md): o arquivo só é gravado se passar.
function validar(p) {
  const dominios = new Set(p.canais);
  const ids = new Set();
  const conferir = (m) => {
    if (!/^https?:\/\//.test(m.url)) throw new Error("Link inválido: " + m.url);
    if (m.linkConfirmado) {
      const host = new URL(m.url).hostname.replace(/^www\d*\./, "");
      if (![...dominios].some((d) => host === d || host.endsWith("." + d))) throw new Error("Domínio fora da lista: " + m.url);
    }
    if (m.publicadoEm < p.cobertura.inicio || m.publicadoEm > p.cobertura.fim) throw new Error("Fora do período: " + m.url + " " + m.publicadoEm);
    if ((m.trecho || "").length > TRECHO_MAX + 1) throw new Error("Trecho longo demais: " + m.id);
    ids.add(m.id);
  };
  p.temas.forEach((t) => t.materias.forEach(conferir));
  p.avulsas.forEach(conferir);
  p.temas.forEach((t) => t.resumoDe.forEach((id) => { if (!t.materias.some((m) => m.id === id)) throw new Error("Resumo sem matéria de origem: " + t.id); }));
}

principal().catch((e) => { console.error("ERRO: " + e.message); process.exit(1); });
