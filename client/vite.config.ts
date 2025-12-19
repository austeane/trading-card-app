import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Note: No proxy config needed - access via SST Router URL when running `sst dev`
// The Router handles /api/*, /u/*, and /r/* routing to Lambda and S3
export default defineConfig({
	plugins: [react(), tailwindcss()],
});
