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
| `preview.png` or `preview.svg` | optional | the card thumbnail, 16:9 looks best |
| more images, e.g. `screen-1.png` | optional | extra screenshots shown in the expanded view |
| `details.md` | optional | long-form documentation shown in the expanded view (Markdown) |

### `meta.json`

```json
{
  "title": "My CNC Dashboard",
  "author": "your-github-name",
  "description": "One or two sentences shown on the card.",
  "details": "details.md",
  "machine": "CNC",
  "tags": ["cnc", "touchscreen"],
  "file": "layout.dwclayout.json",
  "preview": "preview.png",
  "screenshots": ["preview.png", "screen-2.png"],
  "version": "1.1"
}
```

- **title, author, description, file** are required.
- **description**: the short summary on the card (keep it to a sentence or two).
- **details** (optional): longer write-up shown when the card is expanded. Either the name of a
  Markdown file in your folder (e.g. `"details.md"`) — recommended — or inline Markdown text. A file
  named `details.md` is picked up automatically even if you don't list it. Falls back to the short
  description when omitted.
- **machine**: `FFF`, `CNC`, `Laser`, or `any`.
- **tags**: free-form, lowercase; they power the filters.
- **preview**: the card thumbnail; omit if you don't have one.
- **screenshots** (optional): images for the expanded gallery. Any image files in your folder are
  picked up automatically, so this is only needed to control their order.
- **version** (optional): a version string shown on the card.

The widget count, page count, file type and **required plugins** are filled in automatically from your
export — you don't list those yourself. The **first-added and last-updated dates** are derived from the
repository history, so you don't set them. If your layout embeds another plugin's page, make sure you
exported it from a machine where that plugin was installed so the dependency is captured.

## Updating a layout you already shared

Just open another pull request that edits the files in your existing `layouts/<your-slug>/` folder —
swap in a fresh export, tweak `meta.json`, add screenshots, bump `version`. The "last updated" date
updates automatically on merge.

## 3. Open a pull request

A GitHub Action validates every contribution (valid JSON, a real Flexible Layouts export, required
meta fields). If it passes and a maintainer merges it, the site redeploys automatically.

## Tips

- Keep layouts generic where possible (avoid machine-specific IPs in webcam/HTTP widgets).
- Test your export by re-importing it into a clean Flexible Layouts install first.
- One layout per folder.
