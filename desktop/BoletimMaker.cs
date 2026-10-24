/* ==========================================================================
   Boletim Maker — aplicativo para Windows (versão offline)

   Janela nativa com o motor do Edge (WebView2) que abre o mesmo editor da
   pasta do projeto (index.html, css, js, fontes, imagens), embutido no .exe.
   Nada é instalado: na primeira execução os arquivos do editor e as DLLs do
   WebView2 são extraídos para %LOCALAPPDATA%\BoletimMaker.

   - Dados: localStorage do perfil %LOCALAPPDATA%\BoletimMaker\WebView2, na
     origem fixa https://boletim.example (nunca mudar: é onde ficam as edições).
   - PDF: a página pede {tipo:"pdf"} e o app usa PrintToPdfAsync (A4, sem
     margens, com fundos e links clicáveis), sem janela de impressão.
   - Arquivos: {tipo:"salvar"} abre "Salvar como" do Windows (JSON, backup).
   - Links externos abrem no navegador padrão.
   - Autoteste: BoletimMaker-Beta.exe --selftest <saida.txt> (perfil
     temporário; não toca nos dados do usuário).

   Compilação: desktop\build.ps1 (csc do .NET Framework 4.8, sem SDK).
   ========================================================================== */
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("Boletim Maker")]
[assembly: AssemblyProduct("Boletim Maker")]
[assembly: AssemblyDescription("Editor do Boletim Econômico semanal — versão offline")]
[assembly: AssemblyCompany("Liga de Mercado Financeiro")]
[assembly: AssemblyCopyright("João Vitor C. Soares")]
[assembly: AssemblyVersion("1.3.0.0")]
[assembly: AssemblyFileVersion("1.3.0.0")]
[assembly: AssemblyInformationalVersion("1.3.0-beta")]

namespace BoletimMaker
{
    static class Program
    {
        public const string Version = "1.3.0-beta";
        public const string Host = "boletim.example";
        static readonly Dictionary<string, byte[]> Libs = new Dictionary<string, byte[]>();

        [STAThread]
        static int Main(string[] args)
        {
            // As DLLs do WebView2 vêm embutidas: carregadas da memória.
            AppDomain.CurrentDomain.AssemblyResolve += delegate (object s, ResolveEventArgs e)
            {
                string name = new AssemblyName(e.Name).Name + ".dll";
                byte[] bytes;
                if (Libs.TryGetValue(name, out bytes)) return Assembly.Load(bytes);
                bytes = ReadResource("lib/" + name);
                if (bytes == null) return null;
                Libs[name] = bytes;
                return Assembly.Load(bytes);
            };
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            return Run(args);
        }

        // Separado do Main para o AssemblyResolve já estar ativo quando os
        // tipos do WebView2 forem carregados.
        [MethodImpl(MethodImplOptions.NoInlining)]
        static int Run(string[] args)
        {
            string selftestOut = null;
            for (int i = 0; i < args.Length - 1; i++)
                if (args[i] == "--selftest") selftestOut = args[i + 1];
            string baseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "BoletimMaker");
            string appDir, binDir;
            try
            {
                appDir = Path.Combine(baseDir, "app");
                binDir = Path.Combine(baseDir, "bin");
                Extract("app/", appDir);
                Extract("native/", binDir);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Não foi possível preparar os arquivos do Boletim Maker:\n" + ex.Message, "Boletim Maker", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
            string profile = selftestOut != null
                ? Path.Combine(Path.GetTempPath(), "BoletimMakerSelfTest_" + Process.GetCurrentProcess().Id)
                : Path.Combine(baseDir, "WebView2");
            var form = new MainForm(appDir, binDir, profile, selftestOut);
            Application.Run(form);
            return form.ExitCode;
        }

        public static byte[] ReadResource(string name)
        {
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
            {
                if (s == null) return null;
                var ms = new MemoryStream();
                s.CopyTo(ms);
                return ms.ToArray();
            }
        }

        // Recursos "app/css/style.css" -> <destino>\css\style.css. Reescreve
        // sempre: a versão do .exe é a que vale.
        static void Extract(string prefix, string dest)
        {
            foreach (string name in Assembly.GetExecutingAssembly().GetManifestResourceNames())
            {
                if (!name.StartsWith(prefix, StringComparison.Ordinal)) continue;
                string path = Path.Combine(dest, name.Substring(prefix.Length).Replace('/', Path.DirectorySeparatorChar));
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                byte[] data = ReadResource(name);
                if (File.Exists(path))
                {
                    try { if (new FileInfo(path).Length == data.Length && SameBytes(File.ReadAllBytes(path), data)) continue; }
                    catch (IOException) { continue; } // em uso por outra janela aberta: mantém
                }
                File.WriteAllBytes(path, data);
            }
        }

        static bool SameBytes(byte[] a, byte[] b)
        {
            if (a.Length != b.Length) return false;
            for (int i = 0; i < a.Length; i++) if (a[i] != b[i]) return false;
            return true;
        }
    }

    class MainForm : Form
    {
        readonly string appDir, binDir, profile, selftestOut;
        readonly WebView2 web = new WebView2();
        readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
        CoreWebView2Environment env;
        bool closingReady;
        public int ExitCode;

        public MainForm(string appDir, string binDir, string profile, string selftestOut)
        {
            this.appDir = appDir; this.binDir = binDir; this.profile = profile; this.selftestOut = selftestOut;
            Text = "Boletim Maker Beta";
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            MinimumSize = new Size(900, 600);
            Size = new Size(1400, 900);
            StartPosition = FormStartPosition.CenterScreen;
            if (selftestOut == null) WindowState = FormWindowState.Maximized;
            else { ShowInTaskbar = false; Opacity = 0; }
            web.Dock = DockStyle.Fill;
            web.DefaultBackgroundColor = Color.FromArgb(0xE4, 0xE7, 0xEC);
            Controls.Add(web);
            Load += async delegate { await Init(); };
            FormClosing += OnClosing;
        }

        async Task Init()
        {
            try
            {
                CoreWebView2Environment.SetLoaderDllFolderPath(binDir);
                env = await CoreWebView2Environment.CreateAsync(null, profile, new CoreWebView2EnvironmentOptions());
                await web.EnsureCoreWebView2Async(env);
            }
            catch (Exception ex)
            {
                Fail("O Boletim Maker precisa do Microsoft Edge WebView2 Runtime (já vem no Windows 11).\n" +
                     "Se faltar, instale em: https://go.microsoft.com/fwlink/p/?LinkId=2124703\n\n" + ex.Message);
                return;
            }
            var core = web.CoreWebView2;
            core.SetVirtualHostNameToFolderMapping(Program.Host, appDir, CoreWebView2HostResourceAccessKind.Allow);
            core.Settings.AreDevToolsEnabled = selftestOut != null;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsZoomControlEnabled = false; // o editor tem o próprio zoom
            core.NewWindowRequested += delegate (object s, CoreWebView2NewWindowRequestedEventArgs e)
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };
            core.NavigationStarting += delegate (object s, CoreWebView2NavigationStartingEventArgs e)
            {
                if (!e.Uri.StartsWith("https://" + Program.Host + "/", StringComparison.OrdinalIgnoreCase)) { e.Cancel = true; OpenExternal(e.Uri); }
            };
            core.WebMessageReceived += OnMessage;
            if (selftestOut != null) core.NavigationCompleted += async delegate { await SelfTest(); };
            core.Navigate("https://" + Program.Host + "/index.html");
        }

        static void OpenExternal(string uri)
        {
            Uri u;
            if (!Uri.TryCreate(uri, UriKind.Absolute, out u)) return;
            if (u.Scheme != "http" && u.Scheme != "https" && u.Scheme != "mailto") return;
            try { Process.Start(new ProcessStartInfo(u.AbsoluteUri) { UseShellExecute = true }); } catch { }
        }

        async void OnMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            Dictionary<string, object> msg;
            try { msg = json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson); }
            catch { return; }
            string tipo = Str(msg, "tipo"), id = Str(msg, "id");
            var reply = new Dictionary<string, object>();
            reply["id"] = id;
            try
            {
                if (tipo == "pdf")
                {
                    string path = AskSave(Str(msg, "nome"), "PDF (*.pdf)|*.pdf");
                    if (path == null) reply["cancelado"] = true;
                    else
                    {
                        bool ok = await PrintPdf(path);
                        reply["ok"] = ok;
                        reply["arquivo"] = Path.GetFileName(path);
                        if (!ok) reply["erro"] = "o motor de impressão recusou o arquivo";
                    }
                }
                else if (tipo == "salvar")
                {
                    string nome = Str(msg, "nome");
                    string path = AskSave(nome, nome.EndsWith(".json", StringComparison.OrdinalIgnoreCase) ? "JSON (*.json)|*.json" : "Todos os arquivos (*.*)|*.*");
                    if (path == null) reply["cancelado"] = true;
                    else
                    {
                        File.WriteAllText(path, Str(msg, "texto"), new UTF8Encoding(false));
                        reply["ok"] = true;
                        reply["arquivo"] = Path.GetFileName(path);
                    }
                }
                else return;
            }
            catch (Exception ex)
            {
                reply["ok"] = false;
                reply["erro"] = ex.Message;
            }
            web.CoreWebView2.PostWebMessageAsJson(json.Serialize(reply));
        }

        Task<bool> PrintPdf(string path)
        {
            var ps = env.CreatePrintSettings();
            ps.Orientation = CoreWebView2PrintOrientation.Portrait;
            ps.PageWidth = 210 / 25.4;   // A4 em polegadas
            ps.PageHeight = 297 / 25.4;
            ps.MarginTop = ps.MarginBottom = ps.MarginLeft = ps.MarginRight = 0;
            ps.ScaleFactor = 1;
            ps.ShouldPrintBackgrounds = true;
            ps.ShouldPrintHeaderAndFooter = false;
            return web.CoreWebView2.PrintToPdfAsync(path, ps);
        }

        string AskSave(string name, string filter)
        {
            using (var dlg = new SaveFileDialog())
            {
                dlg.FileName = string.IsNullOrEmpty(name) ? "arquivo" : name;
                dlg.Filter = filter;
                dlg.InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                dlg.OverwritePrompt = true;
                return dlg.ShowDialog(this) == DialogResult.OK ? dlg.FileName : null;
            }
        }

        static string Str(Dictionary<string, object> m, string k)
        {
            object v;
            return m.TryGetValue(k, out v) && v != null ? v.ToString() : "";
        }

        // Fechar logo após digitar: tira o foco do campo (o editor grava ao
        // sair do campo e no pagehide) e fecha meio segundo depois.
        async void OnClosing(object sender, FormClosingEventArgs e)
        {
            if (closingReady || web.CoreWebView2 == null) return;
            e.Cancel = true;
            closingReady = true;
            try
            {
                await web.CoreWebView2.ExecuteScriptAsync("document.activeElement && document.activeElement.blur && document.activeElement.blur();");
                await Task.Delay(600);
            }
            catch { }
            Close();
        }

        void Fail(string text)
        {
            if (selftestOut != null) { File.WriteAllText(selftestOut, "FALHA " + text.Replace("\n", " ")); ExitCode = 2; Close(); return; }
            MessageBox.Show(this, text, "Boletim Maker", MessageBoxButtons.OK, MessageBoxIcon.Error);
            ExitCode = 1;
            Close();
        }

        // Autoteste (build.ps1): o editor abre pela origem do app, reconhece
        // o modo desktop, grava no localStorage e o PDF sai em 2 páginas A4.
        bool selftestDone;
        async Task SelfTest()
        {
            if (selftestDone) return;
            selftestDone = true;
            var r = new List<string>();
            try
            {
                await Task.Delay(2500);
                string res = await web.CoreWebView2.ExecuteScriptAsync(
                    "JSON.stringify({ titulo: (document.querySelector('[data-path=\"meta.title\"]') || {}).textContent || '', " +
                    "botao: document.getElementById('btnPrintLabel').textContent, " +
                    "versao: document.getElementById('versionChip').title, " +
                    "salvo: !!localStorage.getItem('boletimMaker.v1'), " +
                    "fontes: document.fonts.check('400 12px \"IBM Plex Sans\"'), " +
                    "origem: location.origin })");
                var o = json.Deserialize<Dictionary<string, object>>(json.Deserialize<string>(res));
                Check(r, "editor carregado", Str(o, "titulo").Length > 0, Str(o, "titulo"));
                Check(r, "modo desktop reconhecido (Salvar PDF)", Str(o, "botao") == "Salvar PDF", Str(o, "botao"));
                Check(r, "versão Beta identificada", Str(o, "versao").Contains(Program.Version), Str(o, "versao"));
                Check(r, "dados gravados no armazenamento local", Str(o, "salvo") == "True", Str(o, "salvo"));
                Check(r, "fonte da interface carregada do pacote", Str(o, "fontes") == "True", Str(o, "fontes"));
                Check(r, "origem fixa dos dados", Str(o, "origem") == "https://" + Program.Host, Str(o, "origem"));
                // O modelo inicial não tem links com endereço: põe um na tela (sem gravar).
                await web.CoreWebView2.ExecuteScriptAsync("var f = document.querySelector('#workspace [data-path=\"columns.0.linkText\"]'); if (f) f.innerHTML = '<a class=\"inline-link\" href=\"https://www.bcb.gov.br/\">Banco Central</a>';");
                string pdf = Path.Combine(Path.GetTempPath(), "BoletimMakerSelfTest_" + Process.GetCurrentProcess().Id + ".pdf");
                bool ok = await PrintPdf(pdf);
                string txt = ok && File.Exists(pdf) ? Encoding.GetEncoding("ISO-8859-1").GetString(File.ReadAllBytes(pdf)) : "";
                int pages = System.Text.RegularExpressions.Regex.Matches(txt, @"/Type\s*/Page[^s]").Count;
                Check(r, "PDF gerado", ok && txt.StartsWith("%PDF"), ok.ToString());
                Check(r, "PDF com 2 páginas", pages == 2, pages + " páginas");
                Check(r, "PDF em A4 (595 x 842 pt)", System.Text.RegularExpressions.Regex.IsMatch(txt, @"/MediaBox\s*\[\s*0\s+0\s+59[45]\.?\d*\s+84[12]\.?\d*"), "");
                Check(r, "PDF com links clicáveis", txt.Contains("/Annots") || txt.Contains("/URI"), "");
                if (r.Exists(x => x.StartsWith("FALHA")) || Environment.GetEnvironmentVariable("BOLETIM_MANTER_PDF") == "1") r.Add("PDF mantido para conferência: " + pdf);
                else try { File.Delete(pdf); } catch { }
            }
            catch (Exception ex) { r.Add("FALHA autoteste: " + ex.Message); }
            File.WriteAllText(selftestOut, string.Join("\r\n", r), new UTF8Encoding(false));
            ExitCode = r.Exists(x => x.StartsWith("FALHA")) ? 1 : 0;
            closingReady = true;
            Close();
        }

        static void Check(List<string> r, string name, bool ok, string extra)
        {
            r.Add((ok ? "OK    " : "FALHA ") + name + (!ok && !string.IsNullOrEmpty(extra) ? " — " + extra : ""));
        }
    }
}
