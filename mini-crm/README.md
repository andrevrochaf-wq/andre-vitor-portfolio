# Mini CRM — Leads

Projeto completo e offline de um mini CRM para organizar leads em funil de vendas (Novo → Contato → Proposta → Fechado → Perdido). Foi criado para demonstrar UI premium, fluxo de dados local e recursos de produtividade sem frameworks.

## Funcionalidades
- CRUD completo de leads com validacao de dados
- Funil Kanban com drag & drop
- Visualizacao em lista com busca e filtros
- Ordenacao por recente, nome, valor e follow-up
- Prioridades com follow-ups hoje/atrasados
- Exportacao JSON + CSV
- Importacao JSON (mesclar ou substituir)
- Preferencias salvas (visualizacao, reduzir animacoes)
- Tudo offline via localStorage

## Rodar localmente
Opcoes simples:
- Abrir o `index.html` diretamente no navegador
- Ou usar Live Server (VS Code)

## Hospedagem gratis
### GitHub Pages
1. Crie um repositorio no GitHub.
2. Envie todos os arquivos do projeto.
3. Em **Settings → Pages**, selecione a branch `main` e a pasta `/root`.
4. Salve e aguarde a URL ser publicada.

### Netlify
1. Acesse o Netlify e faca login.
2. Arraste a pasta do projeto para a area de deploy.
3. O link publico sai em segundos.

## Importar/Exportar e resetar
- Exportar: clique em **Exportar** para baixar JSON e CSV.
- Importar: clique em **Importar**, selecione um JSON e escolha **mesclar** ou **substituir**.
- Resetar: em **Config**, use **Resetar dados** (com confirmacao).

## Personalizacao
- Cores: ajuste as variaveis em `styles.css` (bloco `:root`).
- Colunas: edite os status em `app.js` (STATUS_LABELS e STATUS_ORDER).
- Textos: altere no `index.html`.

## Estrutura
- `index.html`
- `styles.css`
- `app.js`
- `assets/icons/`
