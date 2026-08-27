# Sacolão — Automatizador de E-mail

App simples (HTML + CSS + JS puro, sem instalação) para agilizar o envio das notas
e custos para as lojas: **Lapa, Hig, C.E e Perdizes**.

## Estrutura de pastas

```
sacolao-email-automator/
├── index.html        → estrutura da página
├── css/
│   └── style.css      → visual, tema claro/escuro e animações
├── js/
│   ├── config.js       → ⚠️ aqui você cadastra os e-mails das lojas
│   └── app.js           → lógica do app (tema, loja, anexos, envio)
├── img/
│   └── logo.jfif         → logo do Sacolão
└── README.md
```

## Como usar

1. Abra o arquivo **`js/config.js`** e troque os e-mails de exemplo pelos
   e-mails reais de cada loja:

   ```js
   const STORE_EMAILS = {
     lapa:     "email-real-da-lapa@...",
     hig:      "email-real-do-hig@...",
     ce:       "email-real-do-ce@...",
     perdizes: "email-real-perdizes@...",
   };
   ```

2. Dê dois cliques em **`index.html`** para abrir no navegador (ou hospede a
   pasta em qualquer servidor estático — Netlify, GitHub Pages, etc.).

3. No app:
   - Clique na loja → o destinatário é preenchido sozinho.
   - Escreva o **assunto** (é o único campo que não vem automático).
   - A **mensagem** já vem pronta, com "Bom dia / Boa tarde / Boa noite"
     de acordo com o horário do seu computador.
   - Arraste os arquivos (ou clique) na área de anexos.
   - Clique em **"Abrir no Gmail"**.

## Sobre a integração com o Gmail (importante)

O botão **"Abrir no Gmail"** abre uma aba do Gmail (`mail.google.com`) já com
o **destinatário, assunto e mensagem preenchidos**, usando a conta Google em
que você já estiver logado no navegador — não precisa configurar login nem
senha no app.

**Anexos não podem ser inseridos automaticamente.** Isso não é uma limitação
deste app, e sim uma regra de segurança de todo navegador: nenhuma página
web tem permissão para colocar arquivos dentro da janela do Gmail sozinha
(senão qualquer site poderia "vazar" arquivos do seu computador para
qualquer lugar). Por isso, depois que o Gmail abrir, é só **arrastar os
arquivos que você já selecionou no app para dentro da janela do Gmail**
(ou usar o clipe de anexo do próprio Gmail) — o app te avisa quantos
arquivos você precisa arrastar.

### Quer anexo 100% automático (sem esse passo manual)?

Isso é possível, mas exige um passo a mais: usar a **Gmail API** com login
oficial do Google (OAuth), o que precisa de um projeto no Google Cloud
Console (client ID) e, em geral, um pequeno servidor por trás — não dá pra
fazer com segurança só com HTML/CSS/JS soltos, porque a chave de acesso não
pode ficar exposta no código do navegador. Se quiser, posso te ajudar a
montar essa versão depois.

## Paleta usada (baseada na logo)

| Uso              | Cor        |
|-------------------|------------|
| Fundo (escuro)     | `#1c2a1c`  |
| Anel dourado        | `#e0973b`  |
| Lapa (laranja)       | `#e8871e`  |
| Hig (uva)             | `#9c2b6e`  |
| C.E (pera)             | `#b9c23f`  |
| Perdizes (maçã)         | `#c43b3b`  |

## Personalização rápida

- **Mensagem automática**: edite a função `buildDefaultBody()` em `js/app.js`.
- **Cores das lojas**: mude `style="--chip-color:#..."` em cada botão no `index.html`.
- **Fontes**: `Baloo 2` (títulos) e `Inter` (texto), carregadas do Google Fonts.
