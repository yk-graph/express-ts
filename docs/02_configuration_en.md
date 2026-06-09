# Express + TypeScript Project Memo

## What I did on this branch (`feature/configuration`)

This branch introduces environment variable management and path aliases, replacing hardcoded values with a centralized config object.

### Tasks completed

- [x] Added `dotenv-cli` — loads `.env` before starting the dev server
- [x] Created `src/config.ts` — centralized config object reading from environment variables
- [x] Created `.env.example` — template listing required environment variables
- [x] Added path alias `@/*` in `tsconfig.json` — replaces relative imports like `'../server'` with `'@/server'`
- [x] Updated `src/index.ts` — reads port from `config.port` instead of hardcoding `3000`
- [x] Updated `src/server.ts` — adds `environment` field to `/health` response
- [x] Created `api-test.http` — HTTP file for testing API endpoints directly in VS Code

---

## Configuration details

### 1. `src/config.ts`

```ts
const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || '3000',
} as const

export default config
```

| Setting | What it means |
| ------- | ------------- |
| `env`   | Reads `NODE_ENV` from environment variables. Falls back to `'development'` if not set. |
| `port`  | Reads `PORT` from environment variables. Falls back to `'3000'` if not set. |
| `as const` | Makes the object and all its values deeply readonly. Prevents accidental mutation. |

> **Why centralize config?** Scattering `process.env.X` calls across the codebase makes it hard to track which env vars the app depends on. A single `config.ts` acts as a single source of truth — easy to audit, mock in tests, and extend.

---

### 2. `.env.example`

```
NODE_ENV=
```

A template file committed to Git that lists all required environment variables without their values. Developers copy this to `.env` and fill in the values locally. `.env` itself is excluded from Git via `.gitignore` to prevent secrets from being committed.

---

### 3. `tsconfig.json` — path aliases

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

| Setting       | What it means |
| ------------- | ------------- |
| `@/*`         | A shorthand alias that maps to `./src/*`. For example, `import config from '@/config'` resolves to `src/config.ts`. |

> **Why use path aliases?** Relative imports like `'../../config'` break silently when files are moved and are hard to read. The `@/` prefix makes every import an absolute-style path from the `src/` root, which is both readable and refactor-safe.

---

### 4. `package.json` — dev script

```json
{
  "scripts": {
    "dev": "dotenv -- nodemon"
  }
}
```

| Setting        | What it means |
| -------------- | ------------- |
| `dotenv --`    | Loads `.env` into the process environment before running the next command. The `--` separates `dotenv-cli` arguments from the command to run. |
| `nodemon`      | Starts the dev server with hot-reloading as before. |

---

### 5. `api-test.http`

```http
### Health check

GET http://localhost:3000/health HTTP/1.1
```

A plain-text file using the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) VS Code extension format. Clicking "Send Request" above each block sends the HTTP request and shows the response inline — no need to switch to Postman or curl.

---

## Updated files

### `src/index.ts`

```ts
import { createServer } from '@/server'
import config from '@/config'

const server = createServer()

server.listen(config.port, () => {
  console.log(`api running on ${config.port}`)
})
```

Port is now read from `config.port` (which reads `process.env.PORT`) instead of being hardcoded as `3000`. The import path also uses the `@/` alias.

---

### `src/server.ts`

```ts
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true, environment: config.env })
})
```

The `/health` endpoint now includes the current `environment` value in its response, making it easy to confirm which environment the running server is in.

---

## File descriptions

| File              | Description                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `src/config.ts`   | Centralized config object. Reads `NODE_ENV` and `PORT` from environment variables.             |
| `src/index.ts`    | Entry point. Reads the port from `config` and starts the server.                               |
| `src/server.ts`   | Express app factory. Includes `environment` in the `/health` response.                         |
| `.env.example`    | Template for required environment variables. Copy to `.env` and fill in values locally.        |
| `api-test.http`   | HTTP request file for the REST Client VS Code extension. Used to test API endpoints in-editor. |
| `tsconfig.json`   | Added `@/*` path alias pointing to `./src/*`.                                                  |
| `package.json`    | Updated `dev` script to load `.env` via `dotenv-cli` before starting Nodemon.                  |
