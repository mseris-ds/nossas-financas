/**
 * Nossas Finanças — servidor (Google Apps Script)
 * Os dados ficam nesta planilha: a aba "_dados" guarda tudo (não edite à mão)
 * e a aba "Planilha" é refeita a cada alteração, para consulta e backup.
 * @OnlyCurrentDoc
 */
const ABA_DADOS = '_dados';
const ABA_PLANILHA = 'Planilha';
const PEDACO = 40000; // caracteres por célula (limite do Google é 50.000)

// Opcional: link público de uma imagem PNG para virar o ícone da aba e do atalho.
const ICONE_URL = 'https://lh3.googleusercontent.com/d/1gW-ruCoA1QfO2aPqX44AjTevTQur5EOl=s192#icone.png';

function doGet() {
  const out = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Nossas Finanças')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .addMetaTag('mobile-web-app-capable', 'yes');
  if (ICONE_URL) out.setFaviconUrl(ICONE_URL);
  return out;
}

/** Rode esta função UMA vez pelo editor (botão Executar) para criar as abas e importar os dados. */
function configurar() {
  const atual = ler_();
  if (!atual.data && DADOS_INICIAIS) gravar_(DADOS_INICIAIS, 1);
  atualizarPlanilha_(ler_().data);
  const aba = SpreadsheetApp.getActive().getSheetByName(ABA_DADOS);
  aba.getRange('A1:B1').setNote('Dados do app Nossas Finanças. Não edite estas células à mão.');
  return 'Pronto. Agora publique como app da Web.';
}

// ---------- chamadas do app ----------
function carregar() {
  return JSON.stringify(ler_());
}
function versao() {
  const aba = SpreadsheetApp.getActive().getSheetByName(ABA_DADOS);
  return aba ? Number(aba.getRange('A1').getValue()) || 0 : 0;
}
function salvar(patchJson, substituir) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const atual = ler_();
    const patch = JSON.parse(patchJson);
    const dados = substituir || !atual.data ? patch : merge_(atual.data, patch);
    const v = atual.version + 1;
    gravar_(dados, v);
    try { atualizarPlanilha_(dados); } catch (e) { console.error(e); }
    return JSON.stringify({ data: dados, version: v });
  } finally {
    lock.releaseLock();
  }
}

// ---------- armazenamento ----------
function aba_(nome) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(nome) || ss.insertSheet(nome);
}
function ler_() {
  const aba = SpreadsheetApp.getActive().getSheetByName(ABA_DADOS);
  if (!aba || aba.getLastRow() < 2) return { data: null, version: 0 };
  const n = aba.getLastRow();
  const v = Number(aba.getRange('A1').getValue()) || 0;
  const json = aba.getRange(2, 1, n - 1, 1).getValues().map(r => r[0]).join('');
  return { data: json ? JSON.parse(json) : null, version: v };
}
function gravar_(dados, v) {
  const aba = aba_(ABA_DADOS);
  const s = JSON.stringify(dados);
  const partes = [];
  for (let i = 0; i < s.length; i += PEDACO) partes.push([s.slice(i, i + PEDACO)]);
  aba.clearContents();
  aba.getRange('A1').setValue(v);
  aba.getRange('B1').setValue(new Date());
  aba.getRange(2, 1, partes.length, 1).setNumberFormat('@').setValues(partes);
}
function merge_(t, p) {
  for (const k in p) {
    const a = p[k], b = t[k];
    const obj = x => x && typeof x === 'object' && !Array.isArray(x);
    if (obj(a) && obj(b)) merge_(b, a); else t[k] = a;
  }
  return t;
}

// ---------- aba "Planilha" (mesma lógica do app) ----------
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function addM_(k, n) { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function val_(map, m) { let best = null; for (const k in map || {}) { if (map[k] == null) continue; if (k <= m && (best === null || k > best)) best = k; } return best ? +map[best] : 0; }
function lista_(o) { return Object.keys(o || {}).filter(k => o[k] && typeof o[k] === 'object').map(k => Object.assign({ id: k }, o[k])).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)); }
function atualizarPlanilha_(d) {
  if (!d) return;
  const cartoes = lista_(d.cartoes), contas = lista_(d.contas), parcelas = lista_(d.parcelas);
  const parcDo = (m, cid) => parcelas.filter(p => p.inicio <= m && p.fim >= m && (cid === undefined || (p.cartao || '') === cid));
  const soma = a => a.reduce((s, x) => s + (+x || 0), 0);
  const fatura = (k, m) => { const l = (k.faturas || {})[m]; return l != null && l > 0 ? { v: +l, lanc: true } : { v: soma(parcDo(m, k.id).map(p => p.valor)), lanc: false }; };
  const chaves = [];
  ['eu', 'ela'].forEach(q => chaves.push(...Object.keys((d.salarios || {})[q] || {})));
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
  const ini = chaves.length ? chaves.sort()[0] : hoje;
  let fim = addM_(hoje, 6);
  parcelas.forEach(p => { if (p.fim > fim) fim = p.fim; });
  const ms = []; for (let m = ini; m <= fim && ms.length < 36; m = addM_(m, 1)) ms.push(m);
  const mes = m => {
    const E = val_(d.salarios.eu, m) + val_(d.salarios.ela, m);
    const D = soma(cartoes.map(k => fatura(k, m).v)) + soma(contas.map(c => val_(c.valores, m)));
    return { E, D, saldo: E - D };
  };
  const nome = q => (d.pessoas && d.pessoas[q] && d.pessoas[q].nome) || q;
  const rotulo = m => { const [y, mm] = m.split('-'); return MESES[+mm - 1] + '/' + y.slice(2); };
  const linhas = [];
  linhas.push(['', ...ms.map(rotulo)]);
  linhas.push(['Entradas', ...ms.map(() => '')]);
  ['eu', 'ela'].forEach(q => linhas.push(['Salário ' + nome(q), ...ms.map(m => val_(d.salarios[q], m))]));
  linhas.push(['Total', ...ms.map(m => mes(m).E)]);
  linhas.push(['', ...ms.map(() => '')]);
  linhas.push(['Despesas', ...ms.map(() => '')]);
  const prevista = [];
  cartoes.forEach(k => {
    const extra = contas.filter(c => c.cartao === k.id).map(c => c.nome.toLowerCase());
    linhas.push([k.banco + (extra.length ? ' (sem ' + extra.join(', ') + ')' : ''), ...ms.map((m, j) => { const f = fatura(k, m); if (!f.lanc) prevista.push([linhas.length + 1, j + 2]); return f.v; })]);
  });
  contas.forEach(c => linhas.push([c.nome, ...ms.map(m => val_(c.valores, m))]));
  linhas.push(['TOTAL despesas', ...ms.map(m => mes(m).D)]);
  linhas.push(['Dinheiro a ser guardado', ...ms.map(m => mes(addM_(m, 1)).saldo)]);
  const fimTabela = linhas.length;
  linhas.push(['', ...ms.map(() => '')]);
  linhas.push(['MURAL DA VERGONHA', ...ms.map(() => '')]);
  parcelas.filter(p => p.fim >= ms[0]).forEach(p => linhas.push([p.nome + ' (' + ((d.cartoes[p.cartao] || {}).banco || 'sem cartão') + ')', ...ms.map(m => p.inicio <= m && p.fim >= m ? +p.valor : '')]));
  linhas.push(['TOTAL parcelas', ...ms.map(m => soma(parcDo(m).map(p => p.valor)))]);

  const aba = aba_(ABA_PLANILHA);
  aba.clear();
  aba.getRange(1, 1, linhas.length, ms.length + 1).setValues(linhas);
  aba.getRange(2, 2, linhas.length - 1, ms.length).setNumberFormat('"R$" #,##0.00');
  aba.getRange(1, 1, 1, ms.length + 1).setFontWeight('bold').setBackground('#eef1f7');
  aba.getRange(1, 1, linhas.length, 1).setFontWeight('bold');
  aba.getRange(fimTabela - 1, 1, 1, ms.length + 1).setBackground('#f8d7da');
  aba.getRange(fimTabela, 1, 1, ms.length + 1).setBackground('#fff3cd');
  prevista.forEach(([r, c]) => aba.getRange(r, c).setFontStyle('italic').setFontColor('#9a6700'));
  aba.getRange(fimTabela + 2, 1, 1, ms.length + 1).setBackground('#dc2626').setFontColor('#ffffff').setFontWeight('bold');
  aba.setFrozenRows(1); aba.setFrozenColumns(1);
  aba.getRange('A1').setNote('Gerada automaticamente pelo app a cada alteração. Edite pelo app, não aqui. Itálico = fatura prevista (só parcelas).');
}

// Dados iniciais para importar na primeira execução de configurar().
// Ficam fora do repositório de propósito (são dados financeiros reais).
// Para uma instalação nova, cole aqui o JSON exportado ou deixe null para começar vazio.
const DADOS_INICIAIS = null;
