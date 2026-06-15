<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";

import type { Gallery, GalleryEntry } from "./types";

const base = import.meta.env.BASE_URL;
const PLUGIN_URL = "https://github.com/jaysuk/Flexible-Layouts";
const REPO_URL = "https://github.com/jaysuk/flexible-layouts-gallery";

const layouts = ref<Array<GalleryEntry>>([]);
const loading = ref(true);
const error = ref("");

const search = ref("");
const machine = ref("all");
const activeTag = ref("");
const sortBy = ref<"updated" | "created" | "title" | "widgets">("updated");

const SORTS: Array<{ value: typeof sortBy.value; label: string }> = [
	{ value: "updated", label: "Recently updated" },
	{ value: "created", label: "Recently added" },
	{ value: "title", label: "Title (A–Z)" },
	{ value: "widgets", label: "Most widgets" },
];

onMounted(async () => {
	try {
		const res = await fetch(`${base}gallery.json`, { cache: "no-cache" });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as Gallery;
		layouts.value = data.layouts ?? [];
		openFromHash();
	} catch (e) {
		error.value = `Couldn't load the gallery index (${(e as Error).message}).`;
	} finally {
		loading.value = false;
	}
	window.addEventListener("hashchange", openFromHash);
	window.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
	window.removeEventListener("hashchange", openFromHash);
	window.removeEventListener("keydown", onKeydown);
});

const machines = computed(() => ["all", ...new Set(layouts.value.map((l) => l.machine).filter(Boolean))]);
const tags = computed(() => [...new Set(layouts.value.flatMap((l) => l.tags))].sort());

const filtered = computed(() => {
	const q = search.value.trim().toLowerCase();
	const list = layouts.value.filter((l) => {
		if (machine.value !== "all" && l.machine !== machine.value) return false;
		if (activeTag.value && !l.tags.includes(activeTag.value)) return false;
		if (!q) return true;
		return [l.title, l.author, l.description, l.details, ...l.tags, ...l.requiredPlugins.map((p) => p.name)]
			.join(" ").toLowerCase().includes(q);
	});
	const time = (s: string | null) => (s ? Date.parse(s) || 0 : 0);
	return list.sort((a, b) => {
		switch (sortBy.value) {
			case "title": return a.title.localeCompare(b.title);
			case "widgets": return b.widgetCount - a.widgetCount;
			case "created": return time(b.created) - time(a.created);
			default: return time(b.updated) - time(a.updated);
		}
	});
});

function assetUrl(path: string): string {
	return `${base}${path}`;
}
function sourceUrl(entry: GalleryEntry): string {
	return `${REPO_URL}/tree/main/layouts/${entry.slug}`;
}
function fileName(entry: GalleryEntry): string {
	return entry.file.split("/").pop() ?? "layout.json";
}

// --- Dates ---
function fmtDate(iso: string | null): string {
	if (!iso) return "";
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
function recentlyUpdated(entry: GalleryEntry): boolean {
	if (!entry.updated || !entry.created || entry.updated === entry.created) return false;
	return Date.now() - (Date.parse(entry.updated) || 0) < RECENT_MS;
}

// --- Expanded detail view (deep-linkable via #slug) ---
const detail = ref<GalleryEntry | null>(null);
const activeShot = ref(0);

function openDetail(entry: GalleryEntry): void {
	detail.value = entry;
	activeShot.value = 0;
	jsonOpen.value = false;
	if (location.hash.slice(1) !== entry.slug) location.hash = entry.slug;
}
function closeDetail(): void {
	detail.value = null;
	if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}
function openFromHash(): void {
	const slug = decodeURIComponent(location.hash.replace(/^#/, ""));
	if (!slug) { detail.value = null; return; }
	const entry = layouts.value.find((l) => l.slug === slug);
	if (entry) openDetail(entry);
}
function onKeydown(e: KeyboardEvent): void {
	if (e.key === "Escape") detail.value ? closeDetail() : null;
}

// --- JSON viewer (inside the detail modal) ---
const jsonOpen = ref(false);
const jsonText = ref("");
const jsonLoading = ref(false);
const copied = ref(false);

async function toggleJson(): Promise<void> {
	if (jsonOpen.value) { jsonOpen.value = false; return; }
	jsonOpen.value = true;
	copied.value = false;
	if (jsonText.value || !detail.value) return;
	jsonLoading.value = true;
	try {
		const res = await fetch(assetUrl(detail.value.file), { cache: "no-cache" });
		jsonText.value = JSON.stringify(await res.json(), null, 2);
	} catch (e) {
		jsonText.value = `// Failed to load: ${(e as Error).message}`;
	} finally {
		jsonLoading.value = false;
	}
}
watch(detail, () => { jsonText.value = ""; });
async function copyJson(): Promise<void> {
	try {
		await navigator.clipboard.writeText(jsonText.value);
		copied.value = true;
		setTimeout(() => (copied.value = false), 1500);
	} catch { /* clipboard blocked - ignore */ }
}

// --- Minimal, safe Markdown (community content: escape first, then limited formatting) ---
function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inlineMd(s: string): string {
	return s
		.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
		.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
function renderMarkdown(src: string): string {
	const lines = escapeHtml(src.replace(/\r\n/g, "\n")).split("\n");
	const out: Array<string> = [];
	let inUl = false, inOl = false, inCode = false;
	let para: Array<string> = [];
	const flushPara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join(" "))}</p>`); para = []; } };
	const closeLists = () => { if (inUl) { out.push("</ul>"); inUl = false; } if (inOl) { out.push("</ol>"); inOl = false; } };
	for (const line of lines) {
		if (/^```/.test(line)) {
			flushPara(); closeLists();
			out.push(inCode ? "</code></pre>" : "<pre><code>"); inCode = !inCode; continue;
		}
		if (inCode) { out.push(line); continue; }
		if (!line.trim()) { flushPara(); closeLists(); continue; }
		const h = /^(#{1,4})\s+(.*)$/.exec(line);
		if (h) { flushPara(); closeLists(); out.push(`<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`); continue; }
		const ul = /^[-*]\s+(.*)$/.exec(line);
		if (ul) { flushPara(); if (inOl) { out.push("</ol>"); inOl = false; } if (!inUl) { out.push("<ul>"); inUl = true; } out.push(`<li>${inlineMd(ul[1])}</li>`); continue; }
		const ol = /^\d+\.\s+(.*)$/.exec(line);
		if (ol) { flushPara(); if (inUl) { out.push("</ul>"); inUl = false; } if (!inOl) { out.push("<ol>"); inOl = true; } out.push(`<li>${inlineMd(ol[1])}</li>`); continue; }
		para.push(line.trim());
	}
	flushPara(); closeLists(); if (inCode) out.push("</code></pre>");
	return out.join("\n");
}
const detailHtml = computed(() =>
	detail.value ? renderMarkdown(detail.value.details?.trim() || detail.value.description) : "");
</script>

<template>
	<header class="site-header">
		<div class="wrap">
			<h1>Flexible Layouts <span>Gallery</span></h1>
			<p class="tagline">Community-shared layouts for the Flexible Layouts DuetWebControl plugin.</p>
			<nav class="links">
				<a :href="PLUGIN_URL" target="_blank" rel="noopener">The plugin</a>
				<a :href="`${REPO_URL}/blob/main/CONTRIBUTING.md`" target="_blank" rel="noopener">Contribute a layout</a>
				<a :href="REPO_URL" target="_blank" rel="noopener">Source</a>
			</nav>
		</div>
	</header>

	<main class="wrap">
		<div class="controls">
			<input v-model="search" class="search" type="search" placeholder="Search layouts, authors, tags…" />
			<label class="sort">
				<span>Sort</span>
				<select v-model="sortBy">
					<option v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</option>
				</select>
			</label>
			<div class="chips">
				<button v-for="m in machines" :key="m" class="chip" :class="{ active: machine === m }" @click="machine = m">
					{{ m === "all" ? "All machines" : m }}
				</button>
			</div>
		</div>
		<div v-if="tags.length" class="chips tags">
			<button class="chip" :class="{ active: activeTag === '' }" @click="activeTag = ''">All tags</button>
			<button v-for="t in tags" :key="t" class="chip" :class="{ active: activeTag === t }"
					@click="activeTag = activeTag === t ? '' : t">#{{ t }}</button>
		</div>

		<p v-if="loading" class="state">Loading…</p>
		<p v-else-if="error" class="state error">{{ error }}</p>
		<p v-else-if="!filtered.length" class="state">No layouts match. <a :href="`${REPO_URL}/blob/main/CONTRIBUTING.md`">Be the first to add one →</a></p>

		<template v-else>
			<p class="count">{{ filtered.length }} layout{{ filtered.length === 1 ? "" : "s" }}</p>
			<section class="grid">
				<article v-for="l in filtered" :key="l.slug" class="card" @click="openDetail(l)">
					<div class="preview">
						<img v-if="l.preview" :src="assetUrl(l.preview)" :alt="`${l.title} preview`" loading="lazy" />
						<div v-else class="preview-empty">{{ l.kindLabel }}</div>
						<span v-if="recentlyUpdated(l)" class="ribbon">Updated</span>
					</div>
					<div class="body">
						<div class="row">
							<h2>{{ l.title }}</h2>
							<span class="badge" :data-kind="l.kind">{{ l.kindLabel }}</span>
						</div>
						<p class="by">by {{ l.author }} · {{ l.machine }}<span v-if="l.version"> · v{{ l.version }}</span></p>
						<p class="desc">{{ l.description }}</p>

						<ul class="meta">
							<li>{{ l.widgetCount }} widget{{ l.widgetCount === 1 ? "" : "s" }}</li>
							<li v-if="l.kind === 'dwclayout'">{{ l.pageCount }} page{{ l.pageCount === 1 ? "" : "s" }}</li>
							<li v-if="l.updated" class="muted">Updated {{ fmtDate(l.updated) }}</li>
						</ul>

						<div v-if="l.requiredPlugins.length" class="plugins">
							Needs:
							<span v-for="p in l.requiredPlugins" :key="p.id" class="plugin">🔌 {{ p.name }}</span>
						</div>

						<div v-if="l.tags.length" class="taglist">
							<span v-for="t in l.tags" :key="t" class="tagpill">#{{ t }}</span>
						</div>

						<div class="actions">
							<a class="btn primary" :href="assetUrl(l.file)" :download="fileName(l)" @click.stop>Download</a>
							<button class="btn" @click.stop="openDetail(l)">Details</button>
						</div>
					</div>
				</article>
			</section>
		</template>

		<p class="howto">
			Download a file, then in DuetWebControl open <strong>Flexible Layouts → Backup &amp; share → Import</strong>
			and pick it. Layouts that list a required plugin will warn you if it isn't installed.
		</p>
	</main>

	<!-- Expanded layout card -->
	<div v-if="detail" class="modal" @click.self="closeDetail">
		<div class="dialog detail" role="dialog" aria-modal="true">
			<button class="close" aria-label="Close" @click="closeDetail">✕</button>
			<div class="detail-grid">
				<div class="detail-media">
					<img v-if="detail.screenshots.length" class="shot" :src="assetUrl(detail.screenshots[activeShot])"
						 :alt="`${detail.title} screenshot`" />
					<div v-else class="preview-empty big">{{ detail.kindLabel }}</div>
					<div v-if="detail.screenshots.length > 1" class="thumbs">
						<button v-for="(s, i) in detail.screenshots" :key="s" class="thumb" :class="{ active: i === activeShot }"
								@click="activeShot = i">
							<img :src="assetUrl(s)" :alt="`screenshot ${i + 1}`" loading="lazy" />
						</button>
					</div>
				</div>

				<div class="detail-info">
					<div class="row">
						<h2>{{ detail.title }}</h2>
						<span class="badge" :data-kind="detail.kind">{{ detail.kindLabel }}</span>
					</div>
					<p class="by">by {{ detail.author }} · {{ detail.machine }}<span v-if="detail.version"> · v{{ detail.version }}</span></p>

					<ul class="meta">
						<li>{{ detail.widgetCount }} widget{{ detail.widgetCount === 1 ? "" : "s" }}</li>
						<li v-if="detail.kind === 'dwclayout'">{{ detail.pageCount }} page{{ detail.pageCount === 1 ? "" : "s" }}</li>
					</ul>
					<p v-if="detail.created || detail.updated" class="dates">
						<span v-if="detail.created">Added {{ fmtDate(detail.created) }}</span>
						<span v-if="detail.updated && detail.updated !== detail.created"> · Updated {{ fmtDate(detail.updated) }}</span>
					</p>

					<div v-if="detail.requiredPlugins.length" class="plugins">
						Needs:
						<span v-for="p in detail.requiredPlugins" :key="p.id" class="plugin">🔌 {{ p.name }}</span>
					</div>
					<div v-if="detail.tags.length" class="taglist">
						<span v-for="t in detail.tags" :key="t" class="tagpill">#{{ t }}</span>
					</div>

					<!-- eslint-disable-next-line vue/no-v-html — rendered through the sanitising renderMarkdown above -->
					<div class="markdown" v-html="detailHtml" />

					<div class="actions">
						<a class="btn primary" :href="assetUrl(detail.file)" :download="fileName(detail)">Download</a>
						<button class="btn" @click="toggleJson">{{ jsonOpen ? "Hide JSON" : "View JSON" }}</button>
						<a class="btn" :href="sourceUrl(detail)" target="_blank" rel="noopener">View source</a>
					</div>

					<div v-if="jsonOpen" class="json-wrap">
						<div class="json-head">
							<button class="btn small" @click="copyJson">{{ copied ? "Copied!" : "Copy" }}</button>
						</div>
						<pre v-if="!jsonLoading" class="json">{{ jsonText }}</pre>
						<p v-else class="state">Loading…</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<footer class="site-footer wrap">
		<p>Not affiliated with Duet3D. Layouts are contributed by the community.</p>
	</footer>
</template>
