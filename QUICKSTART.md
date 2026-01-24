# Quick Start Guide - sqlite-wasm-easy

## Installation

```bash
npm install sqlite-wasm-easy @sqlite.org/sqlite-wasm
```

## Basic Usage (3 Steps)

### 1. Create Database Instance

```typescript
import { SQLiteWASM } from 'sqlite-wasm-easy';

const db = new SQLiteWASM({ filename: 'myapp.db' });
```

### 2. Wait for Ready

```typescript
await db.ready();
```

### 3. Start Using!

```typescript
// Create table
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// Insert data
await db.exec('INSERT INTO users (name, email) VALUES (?, ?)', 
  ['Alice', 'alice@example.com']);

// Query data
const users = await db.query('SELECT * FROM users');
console.log(users);
// [{ id: 1, name: 'Alice', email: 'alice@example.com' }]
```

## Common Patterns

### Insert with ID Return

```typescript
const result = await db.run(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['Bob', 'bob@example.com']
);

console.log(result.lastInsertRowId); // 2
console.log(result.changes);          // 1
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.exec('INSERT INTO users (name) VALUES (?)', ['Charlie']);
  await tx.exec('INSERT INTO posts (userId, title) VALUES (?, ?)', [3, 'Hello']);
  // Both succeed or both roll back
});
```

### TypeScript Type Safety

```typescript
interface Schema {
  users: { id: number; name: string; email: string };
}

const db = new SQLiteWASM<Schema>({ filename: 'app.db' });
const usersTable = db.table('users');

// TypeScript knows the return type!
const users = await usersTable.query('SELECT * FROM users');
//    ^? { id: number; name: string; email: string }[]
```

### Custom Configuration

```typescript
const db = new SQLiteWASM({
  filename: 'myapp.db',
  vfs: {
    type: 'opfs-sahpool',  // or 'opfs', 'memdb'
    poolConfig: {
      initialCapacity: 5,
      name: 'my-custom-pool'
    }
  },
  pragma: {
    journal_mode: 'WAL',    // or 'DELETE', 'MEMORY', etc.
    synchronous: 'NORMAL',  // or 'OFF', 'FULL', 'EXTRA'
    foreign_keys: 'ON'
  }
});
```

### Export/Import Database

```typescript
// Export
const backup = await db.export();

// Save to file
const blob = new Blob([backup], { type: 'application/x-sqlite3' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'backup.db';
link.click();
URL.revokeObjectURL(url);

// Import
const file = /* user selected file */;
const arrayBuffer = await file.arrayBuffer();
const data = new Uint8Array(arrayBuffer);
await db.import('/myapp.db', data);
```

## All Available Methods

```typescript
// Core operations
await db.exec(sql, params)           // Execute without results
await db.query(sql, params)          // Execute with results
await db.run(sql, params)            // Execute with metadata

// Transactions
await db.transaction(async (tx) => { /* ... */ })

// Type hints
const table = db.table('tableName')

// Database management
await db.export()                    // Get database as Uint8Array
await db.import(filename, data)      // Import database
await db.close()                     // Close connection
await db.delete()                    // Delete database
```

## Configuration Options Reference

```typescript
{
  filename: string;                  // Required: database filename
  
  vfs?: {
    type?: 'opfs-sahpool'            // Default: 'opfs-sahpool'
         | 'opfs' 
         | 'memdb';
    poolConfig?: {
      initialCapacity?: number;      // Default: 3
      clearOnInit?: boolean;         // Default: false
      name?: string;                 // Default: 'sqlite-wasm-pool'
    };
  };
  
  pragma?: {
    journal_mode?: 'WAL' | ...;      // Default: 'WAL'
    synchronous?: 'NORMAL' | ...;    // Default: 'NORMAL'
    temp_store?: 'MEMORY' | ...;     // Default: 'MEMORY'
    cache_size?: number;
    foreign_keys?: 'ON' | 'OFF';
    [key: string]: any;              // Any custom PRAGMA
  };
  
  logging?: {
    filterSqlTrace?: boolean;        // Default: true
    print?: (msg: string) => void;
    printErr?: (msg: string) => void;
  };
}
```

## Browser Requirements

- Chrome/Edge 102+
- Firefox (with OPFS support)
- Safari (experimental)

## Troubleshooting

### Database not working?
```typescript
// Make sure to await ready()
await db.ready();
```

### Worker not found?
```typescript
// Specify custom worker path if needed
const db = new SQLiteWASM({
  filename: 'app.db',
  worker: { path: '/custom/worker/path.js' }
});
```

### Want to see SQL logs?
```typescript
const db = new SQLiteWASM({
  filename: 'app.db',
  logging: {
    filterSqlTrace: false,  // Show all SQL traces
    print: (msg) => console.log('[DB]', msg)
  }
});
```

## Examples

See the `examples/` directory:
- `basic.html` - Interactive CRUD example
- `typed-schema.html` - TypeScript schema example

## Need More Help?

- Read the full [README.md](./README.md)
- Check [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- Review examples in `examples/` directory
