# Nossas Finanças

Painel de finanças do casal (Matheus e Ana), com a mesma lógica da antiga planilha **DESPESAS**:
salários de cada um, faturas do **Nubank** e do **Inter**, contas fixas da casa, combustível sempre separado
e o **Mural da vergonha** (compras parceladas que entram sozinhas nas faturas).

**Dinheiro a ser guardado** de um mês = salários do mês seguinte − despesas do mês seguinte,
porque o cartão usado num mês é pago no outro.

## Onde está rodando

| O quê | Onde |
|---|---|
| App (Google Apps Script) | projeto **Nossas Finanças**, ligado à planilha **Nossas Finanças – dados** no Drive do Matheus |
| Link curto | https://tinyurl.com/nossas-financas |
| Dados | aba `_dados` da planilha (JSON, não editar à mão) e aba `Planilha` (cópia legível, refeita a cada alteração) |

Os dados financeiros **não** ficam neste repositório.

## Estrutura

```
apps-script/
  Code.gs        servidor: lê/grava a planilha, gera a aba "Planilha", serve o app
  Index.html     o app (desktop e celular)
prototipo/
  nossas-financas.html   mesma interface, versão usada no Claude (fonte do Index.html)
ferramentas/
  build_gas.py   gera apps-script/Index.html a partir do protótipo
ponte/           página para instalar no iPhone com ícone (GitHub Pages, opcional)
assets/
  icone.png      ícone 512 px
```

## Atualizar o app

1. Altere `prototipo/nossas-financas.html` e rode `python ferramentas/build_gas.py` (gera `apps-script/Index.html`).
2. No editor do Apps Script, cole o conteúdo novo em `Index.html` (e/ou `Code.gs`) e salve.
3. **Implantar → Gerenciar implantações → editar → Versão: Nova versão → Implantar.**
   Assim o link `/exec` continua o mesmo. Não crie uma implantação nova, senão o link muda.

## Instalação do zero

1. Crie uma Planilha Google e abra **Extensões → Apps Script**.
2. Cole `apps-script/Code.gs` em `Código.gs` e crie um arquivo HTML chamado `Index` com `apps-script/Index.html`.
3. Rode `configurar` uma vez e autorize.
4. **Implantar → Nova implantação → App da Web**: executar como **usuário que acessa o app**; acesso **qualquer pessoa com Conta do Google**.
5. Compartilhe a planilha como **Editor** com quem vai usar o app.

## Limitações conhecidas

- Com várias contas Google logadas no mesmo navegador, o app pode dar "Não foi possível abrir o arquivo" se a conta dona não for a principal. Use um perfil/janela só com a conta certa.
- A sincronização entre os dois é por consulta a cada ~20 s.
- O iPhone não usa o favicon do Apps Script no atalho da tela inicial; para ícone próprio use a pasta `ponte/` (GitHub Pages, exige repositório público só com ela) ou o app Atalhos.
