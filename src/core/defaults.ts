import type { SQLiteWASMConfig, VFSConfig, PragmaConfig, LoggingConfig } from '../types/index';

/**
 * Default VFS configuration
 */
export const DEFAULT_VFS_CONFIG: Required<VFSConfig> = {
	type: 'opfs',
	poolConfig: {
		initialCapacity: 3,
		clearOnInit: false,
		name: 'sqlite-wasm-pool',
	},
};

/**
 * Default PRAGMA configuration
 */
export const DEFAULT_PRAGMA_CONFIG: PragmaConfig = {
	journal_mode: 'WAL',
	synchronous: 'NORMAL',
	temp_store: 'MEMORY',
};

/**
 * Default logging configuration
 */
export const DEFAULT_LOGGING_CONFIG: Required<LoggingConfig> = {
	filterSqlTrace: true,
	print: console.log, // eslint-disable-line no-console
	printErr: console.error,
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: SQLiteWASMConfig): Required<SQLiteWASMConfig> {
	return {
		filename: userConfig.filename,
		vfs: {
			type: userConfig.vfs?.type ?? DEFAULT_VFS_CONFIG.type,
			poolConfig: {
				initialCapacity:
					userConfig.vfs?.poolConfig?.initialCapacity ??
					DEFAULT_VFS_CONFIG.poolConfig.initialCapacity,
				clearOnInit:
					userConfig.vfs?.poolConfig?.clearOnInit ?? DEFAULT_VFS_CONFIG.poolConfig.clearOnInit,
				name: userConfig.vfs?.poolConfig?.name ?? DEFAULT_VFS_CONFIG.poolConfig.name,
			},
		},
		pragma: {
			...DEFAULT_PRAGMA_CONFIG,
			...userConfig.pragma,
		},
		worker: {
			path: userConfig.worker?.path,
		},
		logging: {
			filterSqlTrace: userConfig.logging?.filterSqlTrace ?? DEFAULT_LOGGING_CONFIG.filterSqlTrace,
			print: userConfig.logging?.print ?? DEFAULT_LOGGING_CONFIG.print,
			printErr: userConfig.logging?.printErr ?? DEFAULT_LOGGING_CONFIG.printErr,
		},
	};
}
