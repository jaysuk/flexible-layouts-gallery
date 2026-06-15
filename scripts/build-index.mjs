/**
 * Build the gallery index.
 *
 * Scans every `layouts/<slug>/meta.json`, validates it, reads the referenced layout file to derive
 * extra facts (kind, widget count, required plugins), then:
 *   - writes `public/gallery.json` (the manifest the SPA fetches), and
 *   - copies each layout's `meta.json`, layout file and preview into `public/layouts/<slug>/` so
 *     they're downloadable from the deployed static site.
 *
 * Contributors only touch `layouts/` - this runs automatically in `npm run build` (and in CI).
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * First/last commit dates touching a layout folder = created/updated. Needs full git history (the
 * deploy workflow checks out with fetch-depth: 0); returns nulls on a shallow clone / outside git.
 */
function gitDates(slug) {
	const rel = `layouts/${slug}`;
	const log = (args) => {
		try {
			return execFileSync("git", ["log", ...args, "--format=%cI", "--", rel], { cwd: root, encoding: "utf8" }).trim();
		} catch {
			return "";
		}
	};
	const created = log(["--reverse"]).split("\n").filter(Boolean)[0] || null;
	const updated = log(["-1"]) || null;
	return { created, updated };
}

/** Image files in a folder usable as screenshots (the dedicated preview is listed first). */
const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg)$/i;
const layoutsDir = join(root, "layouts");
const publicDir = join(root, "public");
const outDir = join(publicDir, "layouts");

const REQUIRED_META = ["title", "author", "description", "file"];
const KINDS = { dwclayout: "Layout", dwcpage: "Page", dwcpanel: "Panel" };

/** Recursively count widgets in a layout document (page items + responsive variants + group children). */
function countWidgets(doc) {
	let n = 0;
	const visit = (items) => {
		if (!Array.isArray(items)) return;
		for (const it of items) {
			if (!it || !it.widget) continue;
			n++;
			if (it.widget.type === "group") visit(it.widget.items);
		}
	};
	for (const page of Object.values(doc?.pages ?? {})) {
		visit(page?.items);
		visit(page?.variants?.md);
		visit(page?.variants?.sm);
	}
	visit(doc?.header?.items);
	return n;
}

/** Normalise any of the three file kinds to a {pages} document so the counters can walk it. */
function documentOf(file) {
	if (file.kind === "dwclayout") return file.document ?? {};
	if (file.kind === "dwcpage") return { pages: { _: file.page } };
	if (file.kind === "dwcpanel") return { pages: { _: { items: [file.item] } } };
	return {};
}

function requiredPlugins(file, doc) {
	const deps = Array.isArray(file?.document?.dependencies) ? file.document.dependencies : [];
	const out = new Map(deps.map((d) => [d.pluginId, d.name || d.pluginId]));
	// Also catch plugin-page widgets not mirrored into the dependencies array.
	const visit = (items) => {
		if (!Array.isArray(items)) return;
		for (const it of items) {
			const w = it?.widget;
			if (w?.type === "pluginPage" && w.pluginId) out.set(w.pluginId, out.get(w.pluginId) || w.label || w.pluginId);
			if (w?.type === "group") visit(w.items);
		}
	};
	for (const page of Object.values(doc?.pages ?? {})) visit(page?.items);
	return [...out].map(([id, name]) => ({ id, name }));
}

const slugs = existsSync(layoutsDir)
	? readdirSync(layoutsDir).filter((s) => statSync(join(layoutsDir, s)).isDirectory())
	: [];

const entries = [];
const errors = [];

// Rebuild the published copies from scratch so removed/renamed contributions don't linger.
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const slug of slugs) {
	const dir = join(layoutsDir, slug);
	const metaPath = join(dir, "meta.json");
	if (!existsSync(metaPath)) { errors.push(`${slug}: missing meta.json`); continue; }

	let meta;
	try { meta = JSON.parse(readFileSync(metaPath, "utf8")); }
	catch (e) { errors.push(`${slug}: meta.json is not valid JSON (${e.message})`); continue; }

	const missing = REQUIRED_META.filter((k) => !meta[k]);
	if (missing.length) { errors.push(`${slug}: meta.json missing required field(s): ${missing.join(", ")}`); continue; }

	const layoutPath = join(dir, meta.file);
	if (!existsSync(layoutPath)) { errors.push(`${slug}: layout file "${meta.file}" not found`); continue; }

	let file;
	try { file = JSON.parse(readFileSync(layoutPath, "utf8")); }
	catch (e) { errors.push(`${slug}: ${meta.file} is not valid JSON (${e.message})`); continue; }

	if (file.app !== "FlexibleLayouts" || !KINDS[file.kind]) {
		errors.push(`${slug}: ${meta.file} is not a Flexible Layouts export (kind=${file.kind})`);
		continue;
	}

	const doc = documentOf(file);

	// Publish the contributor's files for download from the built site.
	const pub = join(outDir, slug);
	mkdirSync(pub, { recursive: true });
	cpSync(metaPath, join(pub, "meta.json"));
	cpSync(layoutPath, join(pub, meta.file));

	// Screenshots for the expanded view: the explicit `screenshots` list if given, plus any other
	// image files in the folder. The dedicated `preview` (if any) is kept first as the card thumbnail.
	const url = (name) => `layouts/${slug}/${name}`;
	const listed = Array.isArray(meta.screenshots) ? meta.screenshots : [];
	const discovered = readdirSync(dir).filter((f) => IMAGE_RE.test(f));
	const ordered = [...new Set([...(meta.preview ? [meta.preview] : []), ...listed, ...discovered])]
		.filter((name) => existsSync(join(dir, name)));
	for (const name of ordered) cpSync(join(dir, name), join(pub, name));
	const screenshots = ordered.map(url);
	const preview = meta.preview && existsSync(join(dir, meta.preview)) ? url(meta.preview) : (screenshots[0] ?? null);

	// Long-form details: a referenced/auto-detected markdown file wins, else an inline string.
	let details = "";
	const detailsFile = (meta.details && existsSync(join(dir, meta.details))) ? meta.details
		: (existsSync(join(dir, "details.md")) ? "details.md" : null);
	if (detailsFile) {
		details = readFileSync(join(dir, detailsFile), "utf8");
		cpSync(join(dir, detailsFile), join(pub, detailsFile));
	} else if (typeof meta.details === "string") {
		details = meta.details;
	}

	const { created, updated } = gitDates(slug);

	entries.push({
		slug,
		title: meta.title,
		author: meta.author,
		description: meta.description,
		details,
		machine: meta.machine || "any",
		tags: Array.isArray(meta.tags) ? meta.tags : [],
		kind: file.kind,
		kindLabel: KINDS[file.kind],
		file: `layouts/${slug}/${meta.file}`,
		preview,
		screenshots,
		widgetCount: countWidgets(doc),
		pageCount: Object.keys(doc?.pages ?? {}).length,
		requiredPlugins: requiredPlugins(file, doc),
		version: typeof meta.version === "string" ? meta.version : null,
		created,
		updated,
	});
}

if (errors.length) {
	console.error("Gallery index build failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
	process.exit(1);
}

entries.sort((a, b) => a.title.localeCompare(b.title));
mkdirSync(publicDir, { recursive: true });
writeFileSync(
	join(publicDir, "gallery.json"),
	JSON.stringify({ generatedAt: new Date().toISOString(), count: entries.length, layouts: entries }, null, 2),
);
console.log(`Gallery index built: ${entries.length} layout(s).`);
