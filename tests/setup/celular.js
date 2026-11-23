try { localStorage.clear(); } catch (e) {}
// Layout de celular forçado (como em Configurações → Interface → Celular)
try { localStorage.setItem("boletimMaker.layout", "celular"); } catch (e) {}
(function () { var st = window.setTimeout; window.setTimeout = function (f, d) { if (d === 400 && typeof f === "function") { f(); return 0; } return st.apply(window, arguments); }; })();
