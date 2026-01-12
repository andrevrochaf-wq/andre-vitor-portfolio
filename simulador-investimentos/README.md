# Simulador de Investimentos (educativo)

Ferramenta educativa para comparar cenarios de investimento. Nao e recomendacao de investimento.

## Funcionalidades
- Simulacao mensal com aporte inicial e mensal
- Conversao de taxa anual para mensal
- Inflacao opcional para valor real aproximado
- Comparacao A vs B
- Grafico em Canvas e exportacao CSV
- Preferencias salvas localmente

## Como rodar
- Abra o `index.html` no navegador
- Ou use Live Server

## Como funciona o calculo
- Saldo inicial recebe aporte inicial
- A cada mes: (saldo + aporte_mensal) * (1 + taxa_mensal)

## Hospedagem gratis
### GitHub Pages
1. Crie um repositorio
2. Envie os arquivos
3. Settings → Pages → main /root

### Netlify
1. Faça login
2. Arraste a pasta do projeto

## Personalizacao
- Cores: edite `styles.css` (`:root`)
- Textos e disclaimers: `index.html`
