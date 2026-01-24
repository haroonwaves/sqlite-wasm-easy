# sqlite-wasm-easy

A simple, zero-config wrapper around [@sqlite.org/sqlite-wasm](https://www.npmjs.com/package/@sqlite.org/sqlite-wasm) that makes SQLite in the browser easy to use.

## Features

✅ **Zero configuration** - Works out of the box with sensible defaults  
✅ **TypeScript first** - Full type safety and IntelliSense support  
✅ **Web Worker based** - Non-blocking database operations  
✅ **OPFS storage** - Persistent storage using Origin Private File System  
✅ **Fully configurable** - Customize VFS, PRAGMA settings, and more  
✅ **Simple API** - High-level methods without complex query builders  
✅ **Transaction support** - Built-in transaction handling  
✅ **Import/Export** - Easy database backup and restore  

## Browser Compatibility

Requires browsers with OPFS (Origin Private File System) support:
- Chrome/Edge 102+
- Firefox (with OPFS support)
- Safari (experimental)

## Installation

```bash
npm install sqlite-wasm-easy @sqlite.org/sqlite-wasm
```

## Quick Start

```typescript
import { SQLiteWASM } from 'sqlite-wasm-easy';

// 1. Create database instance
const db = new SQLiteWASM({ filename: 'myapp.db' });

// 2. Wait for initialization
await db.ready();

// 3. Create tables
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// 4. Insert data
await db.exec('INSERT INTO users (name, email) VALUES (?, ?)', ['Alice', 'alice@example.com']);

// 5. Query data
const users = await db.query('SELECT * FROM users');
console.log(users); // [{ id: 1, name: 'Alice', email: 'alice@example.com' }]
```

## API Reference

### Configuration

```typescript
interface SQLiteWASMConfig {
  filename: string;
  vfs?: VFSConfig;
  pragma?: PragmaConfig;
  worker?: WorkerConfig;
  logging?: LoggingConfig;
}
```

#### VFS Configuration

```typescript
interface VFSConfig {
  type?: 'opfs-sahpool' | 'opfs' | 'memdb'; // Default: 'opfs-sahpool'
  poolConfig?: {
    initialCapacity?: number;  // Default: 3
    clearOnInit?: boolean;     // Default: false
    name?: string;             // Default: 'sqlite-wasm-pool'
  };
}
```

#### PRAGMA Configuration

```typescript
interface PragmaConfig {
  journal_mode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';  // Default: 'WAL'
  synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';  // Default: 'NORMAL'
  temp_store?: 'DEFAULT' | 'FILE' | 'MEMORY';  // Default: 'MEMORY'
  cache_size?: number;
  page_size?: number;
  foreign_keys?: 'ON' | 'OFF';
  [key: string]: any;  // Any custom PRAGMA
}
```

#### Logging Configuration

```typescript
interface LoggingConfig {
  filterSqlTrace?: boolean;  // Default: true (filters out SQL trace logs)
  print?: (message: string) => void;
  printErr?: (message: string) => void;
}
```

### Methods

#### `ready(): Promise<void>`

Initialize the database and wait for it to be ready.

```typescript
const db = new SQLiteWASM({ filename: 'app.db' });
await db.ready();
```

#### `exec(sql: string, params?: any[]): Promise<void>`

Execute SQL without returning results. Use for INSERT, UPDATE, DELETE, CREATE, etc.

```typescript
await db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
await db.exec('INSERT INTO users (name) VALUES (?)', ['Alice']);
```

#### `query<T>(sql: string, params?: any[]): Promise<T[]>`

Execute SQL and return results. Use for SELECT queries.

```typescript
const users = await db.query('SELECT * FROM users');
const user = await db.query('SELECT * FROM users WHERE id = ?', [1]);
```

#### `run(sql: string, params?: any[]): Promise<RunResult>`

Execute SQL and return metadata (lastInsertRowId, changes).

```typescript
const result = await db.run('INSERT INTO users (name) VALUES (?)', ['Bob']);
console.log(result.lastInsertRowId); // 2
console.log(result.changes); // 1
```

#### `transaction(callback: (tx: Transaction) => Promise<void>): Promise<void>`

Execute multiple operations in a transaction.

```typescript
await db.transaction(async (tx) => {
  await tx.exec('INSERT INTO users (name) VALUES (?)', ['Charlie']);
  await tx.exec('INSERT INTO posts (userId, title) VALUES (?, ?)', [1, 'Hello World']);
  
  // If any operation fails, entire transaction is rolled back
});
```

#### `table<K>(name: K): TypedTable<T>`

Get a typed table accessor for type hints (when using TypeScript schemas).

```typescript
interface Schema {
  users: { id: number; name: string; email: string };
}

const db = new SQLiteWASM<Schema>({ filename: 'app.db' });
const usersTable = db.table('users');

// Type-safe queries
const users = await usersTable.query<Schema['users']>('SELECT * FROM users');
```

#### `export(): Promise<Uint8Array>`

Export the database as a Uint8Array.

```typescript
const backup = await db.export();
// Save to file, send to server, etc.
```

#### `import(filename: string, data: Uint8Array): Promise<void>`

Import a database from a Uint8Array.

```typescript
await db.import('/myapp.db', backupData);
```

#### `close(): Promise<void>`

Close the database connection.

```typescript
await db.close();
```

#### `delete(): Promise<void>`

Delete the database.

```typescript
await db.delete();
```

## Examples

### Basic Usage

```typescript
import { SQLiteWASM } from 'sqlite-wasm-easy';

const db = new SQLiteWASM({ filename: 'myapp.db' });
await db.ready();

// Create table
await db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Insert
await db.exec('INSERT INTO todos (title) VALUES (?)', ['Buy groceries']);

// Query
const todos = await db.query('SELECT * FROM todos ORDER BY created_at DESC');
console.log(todos);
```

### Custom Configuration

```typescript
const db = new SQLiteWASM({
  filename: 'myapp.db',
  vfs: {
    type: 'opfs-sahpool',
    poolConfig: {
      initialCapacity: 5,
      clearOnInit: false,
      name: 'myapp-pool'
    }
  },
  pragma: {
    journal_mode: 'WAL',
    synchronous: 'FULL',
    foreign_keys: 'ON',
    cache_size: -2000
  },
  logging: {
    filterSqlTrace: true,
    print: (msg) => console.log('[DB]', msg),
    printErr: (msg) => console.error('[DB ERROR]', msg)
  }
});

await db.ready();
```

### TypeScript Schema

```typescript
interface MySchema {
  users: {
    id: number;
    name: string;
    email: string;
    created_at: number;
  };
  posts: {
    id: number;
    userId: number;
    title: string;
    content: string;
  };
}

const db = new SQLiteWASM<MySchema>({ filename: 'myapp.db' });
await db.ready();

// Type-safe table access
const usersTable = db.table('users');
const postsTable = db.table('posts');

// TypeScript knows the return types
const users = await usersTable.query('SELECT * FROM users');
//    ^? { id: number; name: string; email: string; created_at: number }[]
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  // Create user
  const result = await tx.run(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    ['Alice', 'alice@example.com']
  );
  
  const userId = result.lastInsertRowId!;
  
  // Create user's first post
  await tx.exec(
    'INSERT INTO posts (userId, title, content) VALUES (?, ?, ?)',
    [userId, 'Hello World', 'This is my first post!']
  );
  
  // Update user stats
  await tx.exec(
    'UPDATE users SET post_count = post_count + 1 WHERE id = ?',
    [userId]
  );
});
```

### Export & Import

```typescript
// Export database
const backup = await db.export();

// Save to file (browser)
const blob = new Blob([backup], { type: 'application/x-sqlite3' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'backup.db';
link.click();
URL.revokeObjectURL(url);

// Import from file
const file = await selectFile(); // Your file picker
const arrayBuffer = await file.arrayBuffer();
const data = new Uint8Array(arrayBuffer);
await db.import('/myapp.db', data);
```

### In-Memory Database

```typescript
const db = new SQLiteWASM({
  filename: ':memory:',
  vfs: {
    type: 'memdb'
  }
});

await db.ready();
// Use like normal, but data won't persist
```

## Comparison with Raw @sqlite.org/sqlite-wasm

| Feature | Raw Package | sqlite-wasm-easy |
|---------|-------------|------------------|
| Setup | Manual worker, OPFS config | `new SQLiteWASM({ filename: 'db.db' })` |
| API | C-style low-level API | JavaScript-friendly high-level API |
| Type Safety | None | Full TypeScript support |
| Transactions | Manual BEGIN/COMMIT | `db.transaction(...)` |
| Worker | Manual creation | Automatic |
| Configuration | Manual | Declarative config object |

## How It Works

1. **Web Worker**: All SQLite operations run in a Web Worker to avoid blocking the main thread
2. **OPFS Storage**: Uses Origin Private File System for persistent, high-performance storage
3. **Message Queue**: Operations are queued and executed sequentially to prevent race conditions
4. **Auto-initialization**: Worker and database are initialized automatically on first use

## Acknowledgments

This package is a wrapper around [@sqlite.org/sqlite-wasm](https://www.npmjs.com/package/@sqlite.org/sqlite-wasm), which is licensed under Apache 2.0.

[SQLite](https://sqlite.org) itself is in the [Public Domain](https://sqlite.org/copyright.html) and is developed by [Hwaci](https://www.hwaci.com).

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
