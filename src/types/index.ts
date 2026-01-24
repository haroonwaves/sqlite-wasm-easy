/**
 * VFS (Virtual File System) type options
 */
export type VFSType = 'opfs-sahpool' | 'opfs' | 'memdb';

/**
 * PRAGMA journal_mode options
 */
export type JournalMode = 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';

/**
 * PRAGMA synchronous options
 */
export type SynchronousMode = 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';

/**
 * PRAGMA temp_store options
 */
export type TempStoreMode = 'DEFAULT' | 'FILE' | 'MEMORY';

/**
 * Configuration for OPFS SAH Pool VFS
 */
export interface PoolConfig {
	initialCapacity?: number;
	clearOnInit?: boolean;
	name?: string;
}

/**
 * VFS configuration
 */
export interface VFSConfig {
	type?: VFSType;
	poolConfig?: PoolConfig;
}

/**
 * PRAGMA configuration
 */
export interface PragmaConfig {
	journal_mode?: JournalMode;
	synchronous?: SynchronousMode;
	temp_store?: TempStoreMode;
	cache_size?: number;
	page_size?: number;
	foreign_keys?: 'ON' | 'OFF';
	[key: string]: any;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
	filterSqlTrace?: boolean;
	print?: (message: string) => void;
	printErr?: (message: string) => void;
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
	path?: string;
}

/**
 * Main configuration for SQLiteWASM
 */
export interface SQLiteWASMConfig {
	filename: string;
	vfs?: VFSConfig;
	pragma?: PragmaConfig;
	worker?: WorkerConfig;
	logging?: LoggingConfig;
}

/**
 * Result of a run() operation
 */
export interface RunResult {
	lastInsertRowId?: number;
	changes?: number;
}

/**
 * Transaction interface
 */
export interface Transaction {
	exec(sql: string, params?: any[]): Promise<void>;
	query<T = any>(sql: string, params?: any[]): Promise<T[]>;
	run(sql: string, params?: any[]): Promise<RunResult>;
}

/**
 * Typed table interface (for type hints only)
 */
export interface TypedTable<T> {
	query<R = T>(sql: string, params?: any[]): Promise<R[]>;
	exec(sql: string, params?: any[]): Promise<void>;
	run(sql: string, params?: any[]): Promise<RunResult>;
}

/**
 * Worker message types
 */
export type WorkerOperation =
	| 'init'
	| 'open'
	| 'close'
	| 'exec'
	| 'query'
	| 'run'
	| 'export'
	| 'import'
	| 'delete';

export interface WorkerMessage {
	id: string;
	operation: WorkerOperation;
	sql?: string;
	params?: unknown[];
	config?: SQLiteWASMConfig;
	filename?: string;
	data?: Uint8Array;
}

export interface WorkerResponse {
	id: string;
	status: 'success' | 'error' | 'ready';
	results?: any;
	error?: string;
}
