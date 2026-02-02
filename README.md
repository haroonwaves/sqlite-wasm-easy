# @haroonwaves/sqlite-wasm-easy

A simple, zero-config wrapper around `@sqlite.org/sqlite-wasm` that runs SQLite in a Web Worker
automatically.

## Why?

The official [@sqlite.org/sqlite-wasm](https://github.com/sqlite/sqlite-wasm) is powerful but
low-level. Setting it up with Web Workers, handling OPFS (Origin Private File System), and managing
message passing can be complex.

**sqlite-wasm-easy** solves this by:

- 🚀 **Zero-Config**: Works out of the box.
- 🧵 **Worker-First**: Runs in a Web Worker by default to keep your main thread unblocked.
- 💾 **OPFS Support**: Easy persistence configuration.
- 🛡️ **Type-Safe**: Written in TypeScript with full type definitions.

## Installation

```bash
npm install @haroonwaves/sqlite-wasm-easy
```

## TypeScript Usage (Recommended)

For the best experience, define your schema interface and use the `table()` helper. This gives you
strong typing and a cleaner API.

```typescript
import { SQLiteWASM } from '@haroonwaves/sqlite-wasm-easy';

// 1. Define your schema
interface DatabaseSchema {
	users: {
		id: number;
		name: string;
		email: string;
		created_at: number;
	};
	posts: {
		id: number;
		title: string;
		content: string;
	};
}

// 2. Initialize with Schema
const db = new SQLiteWASM<DatabaseSchema>({ filename: 'my-app.db' });

await db.ready();

// 3. Use the table() API
// The '$' symbol is automatically replaced by the table name ('users')

// Create Table
await db.table('users').exec(`
  CREATE TABLE IF NOT EXISTS $ (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT
  )
`);

// Insert (Fully typed params are not enforced yet, but return types are)
await db
	.table('users')
	.run('INSERT INTO $ (name, email) VALUES (?, ?)', ['Alice', 'alice@dev.com']);

// Query (Returns User[])
const allUsers = await db.table('users').query('SELECT * FROM $');
```

## Configuration

The `SQLiteWASM` constructor accepts a configuration object to tailor the database to your needs.

```typescript
const db = new SQLiteWASM({
	filename: 'my-database.db', // Required: Database file name
});
```

## Available APIs

Use these APIs to interact with the database.

### `exec(sql, params?)`

Execute SQL statements (e.g., `CREATE`, `DELETE`) without returning rows.

### `query<T>(sql, params?)`

Execute a `SELECT` query and return an array of results.

### `run(sql, params?)`

Execute a statement (e.g., `INSERT`, `UPDATE`) and return `{ lastInsertRowId, changes }`.

### `transaction(callback)`

Run multiple operations in a transaction. Automatically handles `BEGIN`, `COMMIT`, and `ROLLBACK`.

```typescript
await db.transaction(async (tx) => {
	await tx.run('INSERT INTO log (action) VALUES (?)', ['update_start']);
	await tx.run('UPDATE users SET name = ? WHERE id = ?', ['Bob', 1]);
});
```

### `export() / import()`

Export the entire database as a `Uint8Array` or import one from memory.

## Type Reference

Key interfaces for better TypeScript integration.

### `SQLiteWASMConfig`

```typescript
interface SQLiteWASMConfig {
	filename: string; // Required: Database file name
	vfs?: {
		type?: 'opfs' | 'opfs-sahpool' | 'memdb'; // Default: 'opfs'
		poolConfig?: {
			// Only used when type is 'opfs-sahpool'
			initialCapacity?: number; // Default: 3
			clearOnInit?: boolean; // Default: false
			name?: string; // Default: 'sqlite-wasm-pool'
		};
	};
	pragma?: {
		journal_mode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF'; // Default: 'WAL'
		synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA'; // Default: 'NORMAL'
		temp_store?: 'DEFAULT' | 'FILE' | 'MEMORY'; // Default: 'MEMORY'
		foreign_keys?: 'ON' | 'OFF'; // Default: undefined (not set)
	};
	logging?: {
		filterSqlTrace?: boolean; // Default: true
		print?: (message: string) => void; // Default: console.log
		printErr?: (message: string) => void; // Default: console.error
	};
}
```

> **Note:** The `opfs` VFS requires your server to set COOP/COEP headers
> (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`). If
> these headers are not available, use `opfs-sahpool` instead, which works without them.

### `RunResult`

Returned by `run()` and `table().run()`.

```typescript
interface RunResult {
	lastInsertRowId?: number; // ID of the last inserted row
	changes?: number; // Number of rows affected
}
```
