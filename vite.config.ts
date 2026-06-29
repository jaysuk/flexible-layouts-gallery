import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";

// Inject the Google Analytics (GA4) gtag.js snippet into index.html at build time, but only when a
// Measurement ID is supplied via the VITE_GA_ID env var. This keeps the ID out of the repo and means
// local dev builds and contributor forks (which won't have the variable set) ship no analytics.
// The CI deploy workflow passes it from the GA_MEASUREMENT_ID GitHub Actions repo variable.
function googleAnalytics(measurementId: string | undefined): Plugin {
	return {
		name: "inject-google-analytics",
		transformIndexHtml(html) {
			if (!measurementId) {
				return html; // no ID configured → leave the page analytics-free
			}
			const id = JSON.stringify(measurementId);
			const tag = [
				`<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>`,
				"<script>",
				"window.dataLayer = window.dataLayer || [];",
				"function gtag(){dataLayer.push(arguments);}",
				"gtag('js', new Date());",
				`gtag('config', ${id});`,
				"</script>",
			].join("\n    ");
			return html.replace("</head>", `    ${tag}\n  </head>`);
		},
	};
}

// Relative base so the built site works at any path (e.g. https://<user>.github.io/<repo>/) without
// hard-coding the repository name. This is a single-page app with no deep links, so relative is safe.
export default defineConfig({
	base: "./",
	plugins: [vue(), googleAnalytics(process.env.VITE_GA_ID)],
});
