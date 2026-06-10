import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// Relative base so the built site works at any path (e.g. https://<user>.github.io/<repo>/) without
// hard-coding the repository name. This is a single-page app with no deep links, so relative is safe.
export default defineConfig({
	base: "./",
	plugins: [vue()],
});
