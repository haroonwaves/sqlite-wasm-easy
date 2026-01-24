# Running Examples

## ⚠️ Important: Cannot Open HTML Files Directly

You **cannot** open the example HTML files directly in your browser (using `file://` protocol) because:
- ES modules require HTTP/HTTPS protocol
- Browsers block ES module imports from `file://` due to CORS security

## ✅ How to Run Examples

### Option 1: Using the Dev Server (Recommended)

```bash
cd sqlite-wasm-easy

# Build and start dev server
npm run dev:examples
```

This will:
1. Build the package (`dist/` folder)
2. Start Vite dev server at `http://localhost:5173`
3. Auto-open `http://localhost:5173/examples/basic.html` in your browser

### Option 2: Just Dev Server (After Building)

```bash
# Build once
npm run build

# Start dev server
npm run dev
```

Then open: `http://localhost:5173/examples/basic.html`

### Option 3: Use Python's HTTP Server

If you don't want to use npm scripts:

```bash
# Build first
npm run build

# Start a simple HTTP server
python3 -m http.server 8000
```

Then open: `http://localhost:8000/examples/basic.html`

### Option 4: Use Node's HTTP Server

```bash
# Install http-server globally (one time)
npm install -g http-server

# Build
npm run build

# Start server
http-server -p 8000
```

Then open: `http://localhost:8000/examples/basic.html`

## Available Examples

1. **basic.html** - Simple CRUD operations
   - Create table
   - Insert data
   - Query data
   - Export database

2. **typed-schema.html** - TypeScript schema with type safety
   - Typed tables
   - Transactions
   - JOIN queries

## Troubleshooting

### Error: "CORS policy" or "file:// not supported"

**Solution:** Don't open HTML files directly. Use a dev server (see options above).

### Error: "Failed to load module script (Wrong MIME type)"

**Solution:** Make sure you've run `npm run build` before starting the dev server.

### Error: "postMessage could not be cloned"

**Solution:** This was fixed in the latest version. Make sure to rebuild:
```bash
npm run build
```

### Error: "Worker not found"

**Solution:** The worker path might be wrong. Use the dev server instead of opening files directly.

## What Happens When You Run dev:examples

```bash
npm run dev:examples
```

This does 3 things:
1. Compiles TypeScript (`tsc`)
2. Bundles code with Vite → creates `dist/index.js` and `dist/worker/sqliteWorker.js`
3. Starts a dev server at `http://localhost:5173`

## Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Build the package
npm run build

# 3. Run examples
npm run dev

# 4. Open in browser
# → http://localhost:5173/examples/basic.html
# → http://localhost:5173/examples/typed-schema.html
```

## Notes

- Examples import from `../dist/index.js` (the built version)
- You must build before running examples
- Vite dev server handles ES modules correctly
- The server auto-reloads when you save changes to source files
