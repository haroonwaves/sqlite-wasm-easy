import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	root: '.', // Root directory for dev server
	plugins: [dts({ rollupTypes: true })],
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, 'src/index.ts'),
				'worker/sqliteWorker': resolve(__dirname, 'src/worker/sqliteWorker.ts'),
			},
			formats: ['es'],
			fileName: (format, entryName) => `${entryName}.js`,
		},
		rollupOptions: {
			external: ['@sqlite.org/sqlite-wasm'],
			output: {
				preserveModules: false,
			},
		},
		target: 'es2022',
		outDir: 'dist',
		emptyOutDir: true,
		sourcemap: true,
	},
	server: {
		open: '/examples/basic.html', // Auto-open examples on dev server start
		port: 5173,
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
	},
	optimizeDeps: {
		exclude: ['@sqlite.org/sqlite-wasm'], // Don't pre-bundle SQLite WASM
	},
	worker: {
		format: 'es',
	},
});
