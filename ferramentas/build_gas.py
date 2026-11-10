"""Gera apps-script/Index.html a partir de prototipo/nossas-financas.html.
Rode da raiz do repositório:  python ferramentas/build_gas.py
"""
import re
PERSIST=r'''/* persistência: Google Apps Script + planilha */
let versao=0,salvando=0,chain=Promise.resolve();
const gs=(fn,...a)=>new Promise((res,rej)=>{google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...a)});
const msgErro=e=>String((e&&e.message)||e||"erro desconhecido");
function ocupado(){const ae=document.activeElement;return !$("#ov").hidden||(ae&&ae.closest&&ae.closest("#main")&&/INPUT|SELECT/.test(ae.tagName))}
function talvezRender(){if(ocupado()){S.pending=true;renderSide()}else render()}
function save(patch,replace){
  merge(S.data,patch);render();
  const body=JSON.stringify(replace?S.data:patch);
  salvando++;S.sync="saving";renderSide();
  chain=chain.then(()=>gs("salvar",body,!!replace)).then(r=>{const o=JSON.parse(r);versao=o.version;salvando--;if(!salvando){S.data=norm(o.data);S.sync="ok";talvezRender()}})
   .catch(e=>{salvando--;S.sync="err";renderSide();toast("Não deu para salvar: "+msgErro(e))});
}
async function carregar(){
  try{const o=JSON.parse(await gs("carregar"));versao=o.version;S.data=o.data?norm(o.data):null;S.sync="ok";talvezRender()}
  catch(e){S.erro=msgErro(e);S.sync="err";render()}
}
async function checar(){if(document.hidden||salvando||S.sync==="err")return;try{const v=await gs("versao");if(v!==versao)carregar()}catch(e){}}
function init(){
  try{const th=lsGet("theme");if(th)document.documentElement.setAttribute("data-theme",th)}catch(e){}
  render();carregar();
  setInterval(checar,20000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checar()});
}

'''
src=open('prototipo/nossas-financas.html').read()
a=src.index('/* persistência */'); b=src.index('/* ações */')
src=src[:a]+PERSIST+src[b:]
def rep(x,y):
    global src
    assert x in src, x[:70]
    src=src.replace(x,y)
rep('const st={load:["","Carregando…"],ok:["g","Sincronizado"],local:["a","Só neste navegador"],ro:["a","Somente leitura"],stale:["a","Sem conexão"],err:["r","Erro ao sincronizar"]}[S.sync]||["",""];',
 'const st={load:["","Carregando…"],ok:["g","Salvo na planilha"],saving:["a","Salvando…"],err:["r","Erro ao sincronizar"]}[S.sync]||["",""];')
rep('main.innerHTML=topBar(false)+(S.sync==="load"?`<div class="card empty"><p>Carregando seus dados…</p></div>`:S.sync==="stale"?`<div class="card empty"><p>Os dados ainda não chegaram. Verifique a conexão; a página continua tentando.</p></div>`:vEmpty());return}',
 'main.innerHTML=topBar(false)+(S.sync==="load"?`<div class="card empty"><p>Carregando seus dados…</p></div>`:S.sync==="err"?`<div class="card empty"><h2>Não deu para abrir os dados</h2><p>${esc(S.erro||"")}</p><p>Se você não é o dono, peça para ele compartilhar a planilha de dados com o seu e-mail como <b>Editor</b>.</p><button class="btn pri" style="margin-top:14px" data-act="recarregar">Tentar de novo</button></div>`:vEmpty());return}')
rep('case "close":closeModal();break;','case "close":closeModal();break;\n    case "recarregar":S.sync="load";render();carregar();break;')
rep('S={data:null,exists:false,','S={data:null,erro:"",')
rep(',ref:null,canWrite:true,',',canWrite:true,')
head_end=src.index('<style>')
head=src[:head_end].replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
body_start=src.index('<div class="app">')
style=src[head_end:body_start]
doc='<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<base target="_top">\n<meta charset="utf-8">\n'+head+style+'</head>\n<body>\n'+src[body_start:]+'\n</body>\n</html>\n'
doc=doc.replace('html,body{min-height:100%}','html,body{min-height:100%}\nbody{margin:0;padding-top:env(safe-area-inset-top,0px)}',1)
assert 'window.claude' not in doc and 'S.ref' not in doc
open('apps-script/Index.html','w').write(doc)
print(len(doc))
