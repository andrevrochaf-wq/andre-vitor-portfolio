# Dashboard de Metas

Dashboard offline para acompanhar metas de vendas, registrar vendas diarias e visualizar KPIs, graficos e insights. Ideal para profissionais de vendas que querem clareza e consistencia.

## Funcionalidades
- Definicao de meta mensal por mes/ano
- Registro de vendas com CRUD completo
- KPIs automaticos (total, % meta, faltante, media diaria, melhor dia, projecao, meta do dia)
- Insights de ritmo e consistencia
- Graficos em Canvas (linha acumulada, barras por canal, heatmap do mes)
- Filtros, busca e ordenacao
- Exportacao JSON + CSV
- Importacao JSON com mesclar/substituir
- Preferencia de dias uteis e reduzir animacoes

## Como rodar
- Abra o `index.html` no navegador
- Ou use Live Server no VS Code

## Hospedagem gratis
### GitHub Pages
1. Crie um repositorio no GitHub
2. Envie os arquivos do projeto
3. Em **Settings → Pages**, selecione `main` e `/root`
4. Salve e aguarde a URL publicar

### Netlify
1. Acesse o Netlify e faca login
2. Arraste a pasta do projeto para a area de deploy
3. O link publico sai em segundos

## Importar/Exportar
- Exportar: clique em **Exportar** para baixar JSON (dados completos) e CSV (vendas do mes)
- Importar: clique em **Importar**, selecione um JSON e escolha mesclar ou substituir

## Estrutura do projeto
- `index.html`
- `styles.css`
- `app.js`
- `assets/icons/`

## Personalizacao
- Cores: edite as variaveis em `styles.css` (bloco `:root`)
- Canais: edite `CONFIG.channels` em `app.js`
- Textos: ajuste diretamente em `index.html`
