export interface RequiredPlugin {
	id: string;
	name: string;
}

export interface GalleryEntry {
	slug: string;
	title: string;
	author: string;
	/** Short, one-or-two-sentence summary shown on the card. */
	description: string;
	/** Optional long-form markdown shown in the expanded view; falls back to `description`. */
	details: string;
	machine: string;
	tags: Array<string>;
	kind: "dwclayout" | "dwcpage" | "dwcpanel";
	kindLabel: string;
	file: string;
	/** Card thumbnail (first screenshot, or the dedicated preview). */
	preview: string | null;
	/** All images for the expanded gallery (includes the preview). */
	screenshots: Array<string>;
	widgetCount: number;
	pageCount: number;
	requiredPlugins: Array<RequiredPlugin>;
	/** Optional contributor-set version string. */
	version: string | null;
	/** ISO timestamps derived from git history (first / latest commit touching the folder). */
	created: string | null;
	updated: string | null;
}

export interface Gallery {
	generatedAt: string;
	count: number;
	layouts: Array<GalleryEntry>;
}
