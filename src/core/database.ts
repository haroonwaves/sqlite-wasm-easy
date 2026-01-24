import type {
	SQLiteWASMConfig,
	Transaction,
	TypedTable,
	RunResult,
	WorkerMessage,
	WorkerResponse,
} from '../types/index';
import { mergeConfig } from './defaults';

/**
 * Main SQLiteWASM class - provides a simple interface to SQLite WASM
 */
export class SQLiteWASM<Schema = any> {
	private config: Required<SQLiteWASMConfig>;
	private worker: Worker | null = null;
	private messageId = 0;
	private pendingRequests = new Map<
		string,
		{ resolve: (value: any) => void; reject: (error: Error) => void }
	>();
	private isReady = false;
	private readyPromise: Promise<void> | null = null;

	constructor(config: SQLiteWASMConfig) {
		this.config = mergeConfig(config);
	}

	/**
	 * Initialize the database and wait for it to be ready
	 */
	async ready(): Promise<void> {
		if (this.isReady) return;
		if (this.readyPromise) return this.readyPromise;

		this.readyPromise = this.initialize();
		await this.readyPromise;
		this.isReady = true;
	}

	private async initialize(): Promise<void> {
		// Create worker
		const workerPath =
			this.config.worker.path || new URL('../worker/sqliteWorker.js', import.meta.url).href;
		this.worker = new Worker(workerPath, { type: 'module' });

		// Setup message handler
		this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));

		// Create serializable config (remove functions that can't be cloned)
		const serializableConfig: SQLiteWASMConfig = {
			filename: this.config.filename,
			vfs: this.config.vfs,
			pragma: this.config.pragma,
			worker: this.config.worker,
			logging: {
				filterSqlTrace: this.config.logging.filterSqlTrace,
				// Don't send function references - worker will use defaults
			},
		};

		// Initialize SQLite
		await this.sendMessage({ operation: 'init', config: serializableConfig });

		// Open database
		await this.sendMessage({ operation: 'open', filename: this.config.filename });
	}

	private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
		const response = event.data;
		const pending = this.pendingRequests.get(response.id);

		if (!pending) return;

		this.pendingRequests.delete(response.id);

		if (response.status === 'error') {
			pending.reject(new Error(response.error || 'Unknown error'));
		} else {
			pending.resolve(response.results);
		}
	}

	private sendMessage(message: Omit<WorkerMessage, 'id'>): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.worker) {
				return reject(new Error('Worker not initialized'));
			}

			const id = `msg_${++this.messageId}`;
			this.pendingRequests.set(id, { resolve, reject });

			this.worker.postMessage({ ...message, id });
		});
	}

	/**
	 * Execute SQL without returning results (INSERT, UPDATE, DELETE, CREATE, etc.)
	 */
	async exec(sql: string, params?: any[]): Promise<void> {
		if (!this.isReady) await this.ready();
		return this.sendMessage({ operation: 'exec', sql, params });
	}

	/**
	 * Execute SQL and return results (SELECT)
	 */
	async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
		if (!this.isReady) await this.ready();
		return this.sendMessage({ operation: 'query', sql, params });
	}

	/**
	 * Execute SQL and return run results (lastInsertRowId, changes)
	 */
	async run(sql: string, params?: any[]): Promise<RunResult> {
		if (!this.isReady) await this.ready();
		return this.sendMessage({ operation: 'run', sql, params });
	}

	/**
	 * Execute multiple operations in a transaction
	 */
	async transaction(callback: (_tx: Transaction) => Promise<void>): Promise<void> {
		if (!this.isReady) await this.ready();

		const tx: Transaction = {
			exec: async (sql: string, params?: any[]) => {
				return this.sendMessage({ operation: 'exec', sql, params });
			},
			query: async <_T = any>(sql: string, params?: any[]) => {
				return this.sendMessage({ operation: 'query', sql, params });
			},
			run: async (sql: string, params?: any[]) => {
				return this.sendMessage({ operation: 'run', sql, params });
			},
		};

		try {
			await this.exec('BEGIN IMMEDIATE');
			await callback(tx);
			await this.exec('COMMIT');
		} catch (error) {
			await this.exec('ROLLBACK');
			throw error;
		}
	}

	/**
	 * Get a typed table accessor (for type hints only)
	 */
	table<K extends keyof Schema>(_name: K): TypedTable<Schema[K]> {
		return {
			query: async <R = Schema[K]>(sql: string, params?: any[]) => {
				return this.query<R>(sql, params);
			},
			exec: async (sql: string, params?: any[]) => {
				return this.exec(sql, params);
			},
			run: async (sql: string, params?: any[]) => {
				return this.run(sql, params);
			},
		};
	}

	/**
	 * Export the database as a Uint8Array
	 */
	async export(): Promise<Uint8Array> {
		if (!this.isReady) await this.ready();
		return this.sendMessage({ operation: 'export' });
	}

	/**
	 * Import a database from a Uint8Array
	 */
	async import(filename: string, data: Uint8Array): Promise<void> {
		if (!this.isReady) await this.ready();
		return this.sendMessage({ operation: 'import', filename, data });
	}

	/**
	 * Close the database connection
	 */
	async close(): Promise<void> {
		if (!this.isReady) return;

		await this.sendMessage({ operation: 'close' });
		this.worker?.terminate();
		this.worker = null;
		this.isReady = false;
		this.readyPromise = null;
	}

	/**
	 * Delete the database
	 */
	async delete(): Promise<void> {
		if (!this.isReady) await this.ready();

		await this.sendMessage({ operation: 'delete' });
		this.worker?.terminate();
		this.worker = null;
		this.isReady = false;
		this.readyPromise = null;
	}
}
