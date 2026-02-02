import type { WorkerMessage, WorkerResponse, SQLiteWASMConfig } from '../types/index';

let sqlite3InitModule: any = null;
let sqlite3: any = null;
let PoolUtil: any = null;
let db: any = null;
let currentConfig: SQLiteWASMConfig | null = null;

async function initDatabase(config: SQLiteWASMConfig) {
	currentConfig = config;

	// Import SQLite WASM
	sqlite3InitModule = await import('@sqlite.org/sqlite-wasm');

	// Setup console filtering if enabled
	if (config.logging?.filterSqlTrace) {
		const originalLog = console.log; // eslint-disable-line no-console
		const originalError = console.error;

		// eslint-disable-next-line no-console
		console.log = (...args) => {
			const message = args.join(' ');
			if (!message.includes('SQL TRACE') && !message.includes('TRACE #')) {
				originalLog(...args);
			}
		};

		console.error = (...args) => {
			const message = args.join(' ');
			if (!message.includes('SQL TRACE') && !message.includes('TRACE #')) {
				originalError(...args);
			}
		};
	}

	// Initialize SQLite3 (use defaults for print/printErr since functions can't be sent via postMessage)
	sqlite3 = await sqlite3InitModule.default({
		// eslint-disable-next-line no-console
		print: console.log,
		printErr: console.error,
	});

	// Setup VFS based on configuration
	const vfsType = config.vfs?.type || 'opfs';

	if (vfsType === 'opfs-sahpool') {
		PoolUtil = await sqlite3.installOpfsSAHPoolVfs({
			initialCapacity: config.vfs?.poolConfig?.initialCapacity || 3,
			clearOnInit: config.vfs?.poolConfig?.clearOnInit || false,
			name: config.vfs?.poolConfig?.name || 'sqlite-wasm-pool',
		});
	} else if (vfsType === 'opfs') {
		// Direct OPFS VFS (if available)
		PoolUtil = sqlite3.opfs || null;
	} else if (vfsType === 'memdb') {
		// In-memory database
		PoolUtil = null;
	}
}

async function openDatabase(filename: string) {
	if (db) throw new Error('Database already opened');

	const vfsType = currentConfig?.vfs?.type || 'opfs';

	if (vfsType === 'opfs-sahpool' && PoolUtil) {
		db = new PoolUtil.OpfsSAHPoolDb({
			filename,
			flags: 'create',
			vfs: 'opfs-sahpool',
		});
	} else if (vfsType === 'memdb') {
		db = new sqlite3.oo1.DB(':memory:', 'c');
	} else {
		// Check if OpfsDb is available (requires COOP/COEP headers)
		if (typeof sqlite3.oo1.OpfsDb !== 'function') {
			throw new Error(
				'OPFS VFS is not available. This usually means your server is not configured with ' +
					'the required COOP/COEP headers (Cross-Origin-Opener-Policy: same-origin, ' +
					"Cross-Origin-Embedder-Policy: require-corp). Consider using 'opfs-sahpool' instead, " +
					'which does not require these headers.'
			);
		}
		db = new sqlite3.oo1.OpfsDb(filename, 'c');
	}

	// Apply PRAGMA settings
	if (currentConfig?.pragma) {
		for (const [key, value] of Object.entries(currentConfig.pragma)) {
			if (value !== undefined) {
				await execSQL(`PRAGMA ${key} = ${value}`);
			}
		}
	}
}

async function closeDatabase() {
	if (!db) throw new Error('Database not opened');
	await db.close();
	db = null;
	PoolUtil = null;
	sqlite3 = null;
	sqlite3InitModule = null;
	currentConfig = null;
}

async function execSQL(sql: string, params: unknown[] = []): Promise<void> {
	if (!db) throw new Error('Database not opened');

	await db.exec({
		sql,
		bind: params,
		rowMode: 'array',
	});
}

async function querySQL<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
	if (!db) throw new Error('Database not opened');

	const results: T[] = [];
	await db.exec({
		sql,
		bind: params,
		rowMode: 'array',
		callback: (row: any[], statement: any) => {
			const columns = statement.getColumnNames();
			const rowObject: any = {};

			for (let i = 0; i < columns.length; i++) {
				const value = row[i];
				// Auto-parse JSON if it looks like JSON
				if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
					try {
						rowObject[columns[i]] = JSON.parse(value);
					} catch {
						rowObject[columns[i]] = value;
					}
				} else {
					rowObject[columns[i]] = value;
				}
			}

			results.push(rowObject);
		},
	});

	return results;
}

async function runSQL(
	sql: string,
	params: unknown[] = []
): Promise<{ lastInsertRowId?: number; changes?: number }> {
	if (!db) throw new Error('Database not opened');

	await db.exec({
		sql,
		bind: params,
		rowMode: 'array',
	});

	// Get last insert row ID and changes - explicitly convert to primitives
	// to ensure serializability via postMessage
	const changesCount = Number(db.changes) || 0;
	const lastInsertRowId =
		changesCount > 0 ? Number(db.selectValue('SELECT last_insert_rowid()')) : undefined;

	return { lastInsertRowId, changes: changesCount };
}

async function exportDatabase(): Promise<Uint8Array> {
	if (!PoolUtil?.exportFile) {
		throw new Error('Export not supported for this VFS type');
	}

	const data = await PoolUtil.exportFile(`/${currentConfig?.filename}`);
	return data;
}

async function importDatabase(filename: string, data: Uint8Array): Promise<void> {
	if (!PoolUtil?.importDb) {
		throw new Error('Import not supported for this VFS type');
	}

	await PoolUtil.importDb(filename, data);
}

async function deleteDatabase(): Promise<void> {
	if (db) {
		await db.close();
		db = null;
	}

	if (PoolUtil?.wipeFiles) {
		await PoolUtil.wipeFiles();
	}
}

async function handleDatabaseOperation(message: WorkerMessage): Promise<WorkerResponse> {
	const { id, operation, sql, params, config, filename, data } = message;

	try {
		switch (operation) {
			case 'init': {
				if (!config) throw new Error('Configuration required for init');
				await initDatabase(config);
				return { id, status: 'ready' };
			}

			case 'open': {
				if (!filename) throw new Error('Filename required for open');
				await openDatabase(filename);
				return { id, status: 'success' };
			}

			case 'close': {
				await closeDatabase();
				return { id, status: 'success' };
			}

			case 'exec': {
				if (!sql) throw new Error('SQL required for exec');
				await execSQL(sql, params);
				return { id, status: 'success' };
			}

			case 'query': {
				if (!sql) throw new Error('SQL required for query');
				const results = await querySQL(sql, params);
				return { id, status: 'success', results };
			}

			case 'run': {
				if (!sql) throw new Error('SQL required for run');
				const results = await runSQL(sql, params);
				return { id, status: 'success', results };
			}

			case 'export': {
				const results = await exportDatabase();
				return { id, status: 'success', results };
			}

			case 'import': {
				if (!filename || !data) throw new Error('Filename and data required for import');
				await importDatabase(filename, data);
				return { id, status: 'success' };
			}

			case 'delete': {
				await deleteDatabase();
				return { id, status: 'success' };
			}

			default: {
				throw new Error(`Unknown operation: ${operation}`);
			}
		}
	} catch (error: unknown) {
		return { id, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

// Worker message handler
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;

	// Security: Check message origin
	if (self.origin && event.origin && event.origin !== self.origin) {
		return self.postMessage({ id: message.id, status: 'error', error: 'Invalid message origin' });
	}

	const response = await handleDatabaseOperation(message);
	self.postMessage(response);
});
