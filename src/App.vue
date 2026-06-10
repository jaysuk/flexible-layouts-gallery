<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

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

onMounted(async () => {
	try {
		const res = await fetch(`${base}gallery.json`, { cache: "no-cache" });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as Gallery;
		layouts.value = data.layouts ?? [];
	} catch (e) {
		error.value = `Couldn't load the gallery index (${(e as Error).message}).`;
	} finally {
		loading.value = false;
	}
});

const machines = computed(() => ["all", ...new Set(layouts.value.map((l) => l.machine).filter(Boolean))]);
const tags = computed(() => [...new Set(layouts.value.flatMap((l) => l.tags))].sort());

const filtered = computed(() => {
	const q = search.value.trim().toLowerCase();
	return layouts.value.filter((l) => {
		if (machine.value !== "all" && l.machine !== machine.value) return false;
		if (activeTag.value && !l.tags.includes(activeTag.value)) return false;
		if (!q) return true;
		return [l.title, l.author, l.description, ...l.tags, ...l.requiredPlugins.map((p) => p.name)]
			.join(" ").toLowerCase().includes(q);
	});
});

function assetUrl(path: string): string {
	return `${base}${path}`;
}

// --- JSON preview modal ---
const previewEntry = ref<GalleryEntry | null>(null);
const previewJson = ref("");
const previewLoading = ref(false);
const copied = ref(false);

async function openPreview(entry: GalleryEntry): Promise<void> {
	previewEntry.value = entry;
	previewJson.value = "";
	previewLoading.value = true;
	copied.value = false;
	try {
		const res = await fetch(assetUrl(entry.file), { cache: "no-cache" });
		previewJson.value = JSON.stringify(await res.json(), null, 2);
	} catch (e) {
		previewJson.value = `// Failed to load: ${(e as Error).message}`;
	} finally {
		previewLoading.value = false;
	}
}
function closePreview(): void {
	previewEntry.value = null;
}
async function copyJson(): Promise<void> {
	try {
		await navigator.clipboard.writeText(previewJson.value);
		copied.value = true;
		setTimeout(() => (copied.value = false), 1500);
	} catch { /* clipboard blocked - ignore */ }
}
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

		<section v-else class="grid">
			<article v-for="l in filtered" :key="l.slug" class="card">
				<a class="preview" :href="assetUrl(l.file)" :download="l.file.split('/').pop()">
					<img v-if="l.preview" :src="assetUrl(l.preview)" :alt="`${l.title} preview`" loading="lazy" />
					<div v-else class="preview-empty">{{ l.kindLabel }}</div>
				</a>
				<div class="body">
					<div class="row">
						<h2>{{ l.title }}</h2>
						<span class="badge" :data-kind="l.kind">{{ l.kindLabel }}</span>
					</div>
					<p class="by">by {{ l.author }} · {{ l.machine }}</p>
					<p class="desc">{{ l.description }}</p>

					<ul class="meta">
						<li>{{ l.widgetCount }} widget{{ l.widgetCount === 1 ? "" : "s" }}</li>
						<li v-if="l.kind === 'dwclayout'">{{ l.pageCount }} page{{ l.pageCount === 1 ? "" : "s" }}</li>
					</ul>

					<div v-if="l.requiredPlugins.length" class="plugins">
						Needs:
						<span v-for="p in l.requiredPlugins" :key="p.id" class="plugin">🔌 {{ p.name }}</span>
					</div>

					<div v-if="l.tags.length" class="taglist">
						<span v-for="t in l.tags" :key="t" class="tagpill">#{{ t }}</span>
					</div>

					<div class="actions">
						<a class="btn primary" :href="assetUrl(l.file)" :download="l.file.split('/').pop()">Download</a>
						<button class="btn" @click="openPreview(l)">View JSON</button>
					</div>
				</div>
			</article>
		</section>

		<p class="howto">
			Download a file, then in DuetWebControl open <strong>Flexible Layouts → Backup &amp; share → Import</strong>
			and pick it. Layouts that list a required plugin will warn you if it isn't installed.
		</p>
	</main>

	<div v-if="previewEntry" class="modal" @click.self="closePreview">
		<div class="dialog">
			<div class="dialog-head">
				<strong>{{ previewEntry.title }}</strong>
				<div>
					<button class="btn" @click="copyJson">{{ copied ? "Copied!" : "Copy" }}</button>
					<button class="btn" @click="closePreview">Close</button>
				</div>
			</div>
			<pre v-if="!previewLoading" class="json">{{ previewJson }}</pre>
			<p v-else class="state">Loading…</p>
		</div>
	</div>

	<footer class="site-footer wrap">
		<p>Not affiliated with Duet3D. Layouts are contributed by the community.</p>
	</footer>
</template>
