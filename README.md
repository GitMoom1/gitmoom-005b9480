erro# GitMoon Explorer

# GitMoon Lovable

Landing page completa do GitMoon, preparada como projeto Vite + React para rodar em localhost, importar no Lovable e publicar em hosts modernos.

## Stack

- Vite

- React

- CSS responsivo sem framework obrigatório

- Lucide React para icones

- Logo original em `public/gitmoon-logo.png`

## Rodar localmente

```bash

npm install

npm run dev

```

Abra:

```text

http://localhost:5173

```

## Build de producao

```bash

npm run build

npm run preview

```

Preview:

```text

http://localhost:4173

```

## Importar no Lovable

1. Suba esta pasta para um repositorio GitHub.

2. No Lovable, escolha importar projeto existente pelo repositorio.

3. Configure o comando de instalacao como `npm install`.

4. Configure o comando de desenvolvimento como `npm run dev`.

5. Configure o comando de build como `npm run build`.

6. Use `dist` como pasta de saida se o Lovable pedir output directory.

## Estrutura

```text

gitmoon-lovable/

  public/

    gitmoon-logo.png

  src/

    main.jsx

    styles.css

  docs/

    INSTALL_UBUNTU.md

    DEPLOY_LOVABLE.md

  index.html

  package.json

```

## Variaveis de ambiente

Copie `.env.example` para `.env` se quiser configurar metadata publica localmente:

```bash

cp .env.example .env

```

O app atual e estatico e nao exige variaveis obrigatorias.

## Setup rapido no Ubuntu

Tambem existe um script de instalacao:

```bash

chmod +x scripts/setup-ubuntu.sh

./scripts/setup-ubuntu.sh

```

# Deploy / Importacao no Lovable

## Checklist antes de subir

- `npm install` executa sem erro.

- `npm run build` gera a pasta `dist`.

- `public/gitmoon-logo.png` existe.

- O repositorio contem `package.json`, `index.html`, `src/main.jsx` e `src/styles.css`.

## Configuracao sugerida

```text

Framework: Vite

Install command: npm install

Dev command: npm run dev

Build command: npm run build

Output directory: dist

Node version: 20+

```

## Fluxo recomendado

1. Crie um repositorio no GitHub.

2. Envie todos os arquivos desta pasta.

3. Importe o repositorio no Lovable.

4. Confirme os comandos acima.

5. Rode o preview.

6. Publique.

## Observacoes

O projeto nao depende de backend. Ele pode ser publicado como site estatico em Lovable, Vercel, Netlify, Render Static Site, Cloudflare Pages ou qualquer host que sirva a pasta `dist`.

# Deploy / Importacao no Lovable

## Checklist antes de subir

- `npm install` executa sem erro.

- `npm run build` gera a pasta `dist`.

- `public/gitmoon-logo.png` existe.

- O repositorio contem `package.json`, `index.html`, `src/main.jsx` e `src/styles.css`.

## Configuracao sugerida

```text

Framework: Vite

Install command: npm install

Dev command: npm run dev

Build command: npm run build

Output directory: dist

Node version: 20+

```

## Fluxo recomendado

1. Crie um repositorio no GitHub.

2. Envie todos os arquivos desta pasta.

3. Importe o repositorio no Lovable.

4. Confirme os comandos acima.

5. Rode o preview.

6. Publique.

## Observacoes

O projeto nao depende de backend. Ele pode ser publicado como site estatico em Lovable, Vercel, Netlify, Render Static Site, Cloudflare Pages ou qualquer host que sirva a pasta `dist`. Falha ao carregar o conteúdo completo do arquivo

outputs/gitmoon-lovable/scripts/setup-ubuntu.sh

o conteúdo completo do arquivo

outputs/gitmoon-lovable/src/main.jsx

Falha ao carregar o conteúdo completo do arquivo

outputs/gitmoon-lovable/src/styles.css

r o conteúdo completo do arquivo

outputs/gitmoon-lovable/.env.example

r o conteúdo completo do arquivo

outputs/gitmoon-lovable/.gitignore

 conteúdo completo do arquivo

outputs/gitmoon-lovable/eslint.config.js

Falha ao carregar o conteúdo completo do arquivo

outputs/gitmoon-lovable/index.html

a ao carregar o conteúdo completo do arquivo

outputs/gitmoon-lovable/package.json

Falha ao carregar o conteúdo completo do arquivo

outputs/gitmoon-lovable/README.md

 ao carregar o conteúdo completo do arquivo

outputs/gitmoon-lovable/vite.config.js

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gitmoom.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2bf9b46b-adf6-454e-8c9c-33187901b854).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
