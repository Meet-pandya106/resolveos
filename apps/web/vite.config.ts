import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react() as any],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@resolveos/shared": path.resolve(__dirname, "../../packages/shared/src"),
			"@resolveos/domain": path.resolve(__dirname, "../../packages/domain/src"),
			"@resolveos/validation": path.resolve(
				__dirname,
				"../../packages/validation/src",
			),
		},
	},
	server: {
		port: 5173,
		host: true,
		proxy: {
			"/api": {
				target: "http://localhost:4000",
				changeOrigin: true,
			},
			"/ws": {
				target: "ws://localhost:4000",
				ws: true,
			},
		},
	},
	build: {
		outDir: "dist",
		sourcemap: true,
	},
});
