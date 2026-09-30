# Sealed PWA stub

Canonical host: **https://sealed.iconiaglobal.com**

Twelve fake letters. No Gmail. Desk → seal → read → file → chronicle.

## Host

GitHub Pages + Cloudflare.

1. Pages: branch `main`, folder `/` (root). Custom domain `sealed.iconiaglobal.com`.
2. Cloudflare DNS for `iconiaglobal.com`:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `sealed` | `slaze.github.io` | DNS only until SSL works |

## Local

```bash
python3 -m http.server 4173
```

## Model

See `data/model.md`. Fixture: `data/fixture.js`.
