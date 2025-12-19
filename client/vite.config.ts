import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryPlugin = sentryAuthToken
	? sentryVitePlugin({
			org: "quadball",
			project: "javascript-react",
			authToken: sentryAuthToken,
			telemetry: false,
		})
	: null;

// Note: No proxy config needed - access via SST Router URL when running `sst dev`
// The Router handles /api/*, /u/*, and /r/* routing to Lambda and S3
export default defineConfig({
	plugins: [react(), tailwindcss(), ...(sentryPlugin ? [sentryPlugin] : [])],
	build: {
		sourcemap: Boolean(sentryAuthToken),
	},
});
