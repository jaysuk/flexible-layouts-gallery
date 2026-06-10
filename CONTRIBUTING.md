# Contributing a layout

Thanks for sharing! Adding a layout is a small pull request — no build tools required on your side.

## 1. Export your layout from DuetWebControl

In **Flexible Layouts → Backup & share**, export what you want to share:

- a whole **layout** → `.dwclayout.json`
- a single **page** → `.dwcpage.json`
- a single **panel / custom widget** → `.dwcpanel.json`

## 2. Add a folder under `layouts/`

Create `layouts/<your-slug>/` (a short, lowercase, hyphenated name) containing:

| File | Required | What it is |
|------|----------|------------|
| your export, e.g. `layout.dwclayout.json` | ✅ | the file you exported in step 1 |
| `meta.json` | ✅ | the card details (see below) |
| `preview.png` or `preview.svg` | optional | a screenshot, 16:9 looks best |

### `meta.json`

```json
{
  "title": "My CNC Dashboard",
  "author": "your-github-name",
  "description": "One or two sentences about what it's for.",
  "machine": "CNC",
  "tags": ["cnc", "touchscreen"],
  "file": "layout.dwclayout.json",
  "preview": "preview.png"
}
```

- **title, author, description, file** are required.
- **machine**: `FFF`, `CNC`, `Laser`, or `any`.
- **tags**: free-form, lowercase; they power the filters.
- **preview**: omit if you don't have a screenshot.

The widget count, page count, file type and **required plugins** are filled in automatically from your
export — you don't list those yourself. If your layout embeds another plugin's page, make sure you
exported it from a machine where that plugin was installed so the dependency is captured.

## 3. Open a pull request

A GitHub Action validates every contribution (valid JSON, a real Flexible Layouts export, required
meta fields). If it passes and a maintainer merges it, the site redeploys automatically.

## Tips

- Keep layouts generic where possible (avoid machine-specific IPs in webcam/HTTP widgets).
- Test your export by re-importing it into a clean Flexible Layouts install first.
- One layout per folder.
