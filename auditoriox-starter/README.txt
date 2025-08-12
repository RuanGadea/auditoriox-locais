# AuditórioX - Starter (GitHub + GreatPages + Worker)

## 1) Publique estes arquivos no GitHub
- `data/locais.json` → dados dos locais
- `dist/ax-locais.min.js` → script de hidratação
- `edge/worker.js` → Cloudflare Worker (SEO no edge)

Crie uma tag `v1` (ou use `@main`) e pegue a URL no jsDelivr:
`https://cdn.jsdelivr.net/gh/SEU-USUARIO/SEU-REPO@v1/data/locais.json`

## 2) Na página /pag-base (GreatPages)
- Marque elementos com `data-field`: `nome, descricao, fotos, amenities, endereco, cidade, uf, cep, capacidade, preco_min`.
- Marque CTAs com `data-action`: `book`, `pay`, `whats`.
- Cole no final do <body>:
  <script src="https://cdn.jsdelivr.net/gh/SEU-USUARIO/SEU-REPO@v1/dist/ax-locais.min.js" defer></script>

Edite `ax-locais.min.js` e troque REPLACE_WITH_JSDELIVR_URL pela URL real do seu `locais.json`.

Acesse: `/pag-base?l=plataforma-internacional-alphaville` para testar.

## 3) URLs bonitas e SEO
- Transform Rule: `/locais/*` -> `/pag-base?l=$1`
- Worker: publique `edge/worker.js` e defina variável `DATA_JSON_URL` com a URL do `locais.json`.
