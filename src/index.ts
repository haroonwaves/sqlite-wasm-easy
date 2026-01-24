/**
 * sqlite-wasm-easy
 * A simple, zero-config wrapper around @sqlite.org/sqlite-wasm
 */

export { SQLiteWASM } from './core/database';
export type {
	SQLiteWASMConfig,
	VFSConfig,
	VFSType,
	PoolConfig,
	PragmaConfig,
	LoggingConfig,
	WorkerConfig,
	JournalMode,
	SynchronousMode,
	TempStoreMode,
	RunResult,
	Transaction,
	TypedTable,
} from './types/index';
export { DEFAULT_VFS_CONFIG, DEFAULT_PRAGMA_CONFIG, DEFAULT_LOGGING_CONFIG } from './core/defaults';
