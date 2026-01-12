# Controle de Caixa

Controle financeiro offline para entradas e saidas com relatorios e graficos, pensado para uso pessoal ou pequenos negocios.

## Funcionalidades
- CRUD de lancamentos com entradas/saidas
- KPIs mensais (saldo, entradas, saidas, maior gasto)
- Graficos em Canvas (barras por categoria e saldo acumulado)
- Relatorio mensal com top gastos e dias de maior saida
- Importacao/exportacao JSON e CSV
- Categorias e limites personalizaveis

## Como rodar
- Abra o `index.html` no navegador
- Ou use Live Server

## Hospedagem gratis
### GitHub Pages
1. Crie um repositorio
2. Envie os arquivos
3. Settings → Pages → main /root

### Netlify
1. Faça login
2. Arraste a pasta do projeto

## Importar/Exportar
- Exportar: botao **Exportar** gera JSON + CSV do mes
- Importar: botao **Importar** aceita JSON com mesclar/substituir

## Personalizacao
- Categorias e limites: em **Config**
- Cores: edite `styles.css` (`:root`)

## Estrutura
- `index.html`
- `styles.css`
- `app.js`
- `assets/icons/`
