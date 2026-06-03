# Landing Page Acredita

Landing page estática do Workshop de Nefrologia & Hemodiálise.

## Deploy na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Na Vercel, clique em `Add New > Project`.
3. Importe o repositório.
4. Em `Framework Preset`, escolha `Other`.
5. Deixe `Build Command` vazio.
6. Deixe `Output Directory` vazio.
7. Clique em `Deploy`.

## Google Sheets

O formulário envia os dados para o Web App configurado em:

`assets/js/script.js`

```js
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbywYYZUHCxrhkqQJfCxZAvcvetHLUw8lumpry1HoI3v2gNyxRtC-cUtam-ChpeNteIZ/exec";
```

O arquivo `google-apps-script.gs` é apenas o código-fonte para colar no Google Apps Script. Ele não precisa ser publicado na Vercel.
