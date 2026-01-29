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
				worker: resolve(__dirname, 'src/worker/sqliteWorker.ts'),
			},
			formats: ['es'],
			fileName: (format, entryName) => `${entryName}.js`,
		},
		rollupOptions: {
			// Don't mark sqlite-wasm as external - bundle it into the worker
			// so the inlined worker is self-contained and works offline
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
		rollupOptions: {
			output: {
				// Force everything into a single chunk for the worker
				inlineDynamicImports: true,
			},
		},
	},
});
