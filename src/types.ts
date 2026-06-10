export interface RequiredPlugin {
	id: string;
	name: string;
}

export interface GalleryEntry {
	slug: string;
	title: string;
	author: string;
	description: string;
	machine: string;
	tags: Array<string>;
	kind: "dwclayout" | "dwcpage" | "dwcpanel";
	kindLabel: string;
	file: string;
	preview: string | null;
	widgetCount: number;
	pageCount: number;
	requiredPlugins: Array<RequiredPlugin>;
}

export interface Gallery {
	generatedAt: string;
	count: number;
	layouts: Array<GalleryEntry>;
}
