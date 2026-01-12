# ANDRÉ VITOR — Landing Page/Portfólio

Landing page pessoal com visual futurista, animações leves e foco em primeira impressão para entrada no mercado.

## Rodar localmente

Opção 1: abrir direto
- Clique duas vezes em `index.html`.

Opção 2: Live Server (VS Code)
- Abra a pasta do projeto.
- Clique com o botão direito em `index.html` → **Open with Live Server**.

## Hospedagem grátis

### 1) GitHub Pages (passo a passo)
1. Crie um repositório no GitHub.
2. Envie todos os arquivos deste projeto para o repositório.
3. No GitHub, vá em **Settings → Pages**.
4. Em **Branch**, selecione `main` e a pasta `/root`.
5. Salve e aguarde a URL ser publicada.

### 2) Netlify (arrastar a pasta)
1. Acesse o Netlify e faça login.
2. Arraste a pasta do projeto para a área de deploy.
3. Em segundos, você recebe o link público.

### 3) Vercel (importar repositório)
1. Crie conta na Vercel.
2. Importe o repositório do GitHub.
3. A Vercel detecta como site estático e publica automaticamente.

## Personalização

- Links de contato: altere em `index.html` (seção Contato)
  - Email: `mailto:andre@email.com`
  - LinkedIn e GitHub: substitua os `href="#"`
- Cores e estilo: edite as variáveis em `styles.css` (`:root`).
- Textos: altere diretamente em `index.html`.
- Email do formulário: troque o endereço em `app.js` (mailto).

## Estrutura

- `index.html`
- `styles.css`
- `app.js`
- `assets/icons/`
- `assets/img/`
- `mini-crm/` (projeto do repertório)
