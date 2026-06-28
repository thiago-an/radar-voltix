# Radar Voltix

Sistema local para monitorar promoções de eletrônicos, calcular oportunidade de revenda e enviar alertas pelo WhatsApp Web.

## O que esta primeira versão entrega

- API local com Express.
- WhatsApp Web com sessão local persistida em `storage/sessions`.
- Watchlist em SQLite.
- Crawlers modulares para Kabum, Pichau, Terabyte, Mercado Livre, Amazon, Magazine Luiza, Casas Bahia, Fast Shop e Google Shopping.
- Busca em camadas: API publica quando disponivel, HTML com Axios/Cheerio e fallback com Puppeteer.
- Deal Sources para Pelando, Promobit e Google Shopping, integradas ao mesmo historico e motor de oportunidades.
- Profit Engine com taxas, frete, lucro liquido e ROI para Mercado Livre, Shopee e TikTok Shop.
- Marketplace Intelligence compara Mercado Livre, TikTok Shop, Facebook Marketplace e Shopee pelo lucro liquido.
- Estoque com compras, vendas, ajustes, custo medio, lucro esperado e aviso de reposicao nos alertas.
- Crawler Manager com descoberta automatica, execucao paralela e timeout independente por loja.
- Motor de oportunidade com lucro, margem, preço máximo, score e recomendação.
- Anti-duplicação de alertas com janela de 24h e reenvio quando o preço cai.
- Logs em `storage/logs`.
- Screenshots de erro dos crawlers em `storage/screenshots`.
- Estrutura preparada para dashboard, Meta WhatsApp API, PostgreSQL/Supabase/Firebase e IA de análise de margem.

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` a partir do exemplo:

```bash
copy .env.example .env
```

Edite o `.env` e configure pelo menos:

```env
WHATSAPP_TARGET_NUMBER=55DDDNUMERO@c.us
```

O número deve ficar apenas no `.env`, nunca direto no código.

## Banco local

```bash
npm run db:init
```

Esse comando cria `storage/radar.sqlite` e carrega a watchlist inicial de `src/data/watchlist.seed.json` se o banco ainda estiver vazio.

## Iniciar o Radar Voltix

```bash
npm run dev
```

ou:

```bash
npm start
```

Dashboard local:

```text
http://localhost:3000/dashboard
```

Na primeira execução, escaneie o QR Code exibido no terminal usando o WhatsApp. Depois disso, a sessão fica salva em `storage/sessions`.

## Rodar o radar manualmente

```bash
npm run radar:run
```

O job automático roda a cada `RADAR_INTERVAL_MINUTES`, com padrão de 30 minutos.

## Testar os crawlers

```bash
npm run crawlers:test
```

O teste consulta `mouse gamer`, `ssd nvme 1tb` e `notebook ryzen 5` em todas as lojas habilitadas. Bloqueios, HTTP 403, timeouts e resultados vazios aparecem no resumo sem interromper as outras lojas.

Por padrao, Kabum, Pichau, Terabyte e Mercado Livre ficam habilitados. Amazon, Magazine Luiza, Casas Bahia e Fast Shop ficam desabilitados ate serem ativados no `.env`.

## Testar as fontes de promocoes

```bash
npm run deal-sources:test
```

Pelando e Promobit ficam habilitados por padrao. Google Shopping pode ser ativado com `GOOGLE_SHOPPING_SOURCE_ENABLED=true`. O dashboard exibe o estado de cada fonte em `Status das Fontes`, e a API correspondente esta em `GET /deal-sources/status`.

## Simular lucro

```http
GET /profit/simulate?buy=220&sell=349&marketplace=mercadolivre
```

O alerta so avanca para o WhatsApp quando o lucro liquido e de pelo menos R$ 30 e o ROI e de pelo menos 20%. As taxas padrao podem ser ajustadas no `.env`.

O dashboard tambem exibe o simulador e os dez maiores lucros estimados do dia. A API do ranking esta em `GET /profit/top?limit=10`.

O Marketplace Intelligence reutiliza o Profit Engine para ordenar as plataformas por lucro liquido e ROI. O dashboard mostra a recomendacao da oportunidade mais recente, e os alertas informam o melhor lugar estimado para vender.

## Controlar o estoque

O dashboard permite adicionar compras, registrar vendas e fazer ajustes manuais. Cada alteracao gera um movimento auditavel, e o painel calcula quantidade, custo total, venda esperada e lucro estimado.

Quando uma oportunidade passa pelo Profit Engine, o alerta informa quantas unidades do produto ja estao em estoque. Com duas unidades ou menos, tambem exibe `Hora de repor estoque`.

## Testar WhatsApp

```bash
npm run whatsapp:test
```

Também existe a rota:

```http
POST /whatsapp/test
```

Body opcional:

```json
{
  "text": "Mensagem de teste do Radar Voltix"
}
```

## Rotas locais

- `GET /health`
- `GET /dashboard`
- `GET /crawlers/status`
- `GET /history`
- `GET /history/:productHash`
- `GET /inventory`
- `POST /inventory`
- `PUT /inventory/:id`
- `DELETE /inventory/:id`
- `POST /inventory/:id/movement`
- `GET /marketplace-advisor/:productId`
- `POST /radar/run`
- `GET /alerts`
- `GET /watchlist`
- `POST /watchlist`
- `PUT /watchlist/:id`
- `DELETE /watchlist/:id`
- `POST /whatsapp/test`

## Exemplo de item na watchlist

```json
{
  "name": "Mouse Gamer Fantech VX6",
  "query": "mouse gamer fantech vx6",
  "maxBuyPrice": 35,
  "expectedSellPrice": 59.9,
  "minMarginPercent": 25,
  "category": "mouse gamer",
  "priority": 4,
  "allowedStores": ["Kabum", "Pichau", "Terabyte", "Mercado Livre"]
}
```

Depois do banco criado, use as rotas `/watchlist` para adicionar, editar ou remover produtos monitorados.

## Próximos passos planejados

- Migração opcional para Prisma + PostgreSQL/Supabase.
- Integração com API oficial da Meta para WhatsApp.
- IA para estimar preço de revenda, risco e liquidez.
- Comparação com Mercado Livre, Shopee e histórico interno.
- Regras avançadas de frete, reputação e marketplace.
