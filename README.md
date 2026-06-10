# Flexible Layouts Gallery

A community gallery of shareable layouts for the
[Flexible Layouts](https://github.com/jaysuk/Flexible-Layouts) DuetWebControl plugin. Browse, preview
and download layouts, pages and custom panels, then import them into your own DWC.

The site is a small Vite + Vue single-page app served from **GitHub Pages**. Contributions are plain
pull requests that add a folder under [`layouts/`](layouts/) — see **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## How it works

```
layouts/<slug>/          a contribution: the exported .json + meta.json + optional preview
scripts/build-index.mjs  scans layouts/, validates them, writes public/gallery.json + copies files
src/                     the Vue SPA that fetches gallery.json and renders the gallery
.github/workflows/       builds the index + site and deploys to GitHub Pages
```

Contributors never run the build — the GitHub Action validates each PR and redeploys on merge.

## Running locally

```sh
npm install
npm run dev      # builds the index, then starts Vite
# or
npm run build && npm run preview
```

## First-time setup (for the repo owner)

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main` (or run the workflow manually). The gallery deploys to
   `https://<user>.github.io/<repo>/`.

The site uses a **relative base** (`vite.config.ts`), so it works at any Pages path without
hard-coding the repository name.

## License

Site code: MIT. Contributed layouts remain the property of their authors.
