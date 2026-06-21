# Express + TypeScript Project Notes

## What we did in this branch (`05_prisma_orm`)

This branch sets up the database layer by integrating Prisma ORM with MariaDB.
We defined Task and Project models in the schema, ran the initial migration, and spun up a local Docker environment.
Controllers now query the actual database instead of returning placeholder data.

### Completed tasks

- [x] Create `docker-compose.yml` — local MariaDB environment
- [x] Create `prisma/schema.prisma` — define Task and Project models
- [x] Run initial migration — generate `tasks` / `projects` tables
- [x] Create `prisma.config.mjs` — Prisma v7 CLI configuration file
- [x] Create `src/lib/prisma.ts` — PrismaClient singleton
- [x] Update `package.json` — add Prisma-related npm scripts
- [x] Update `src/routes/v1/tasks/controller.ts` — `getTask` now queries the DB
- [x] Update `src/routes/v1/projects/controller.ts` — `getProject` now queries the DB

---

## Directory structure

```
.
├── docker-compose.yml          ← local MariaDB container definition
├── prisma.config.mjs           ← Prisma CLI config (v7 format)
├── prisma/
│   ├── schema.prisma           ← model definitions
│   └── migrations/
│       └── ***/migration.sql   ← auto-generated DDL
└── src/
    └── lib/
        └── prisma.ts           ← PrismaClient singleton
```

---

## Configuration details and rationale

### 1. Running MariaDB with Docker Compose

```yaml
# docker-compose.yml
services:
  db:
    image: mysql:latest
    platform: linux/amd64
    container_name: express-ts-mysql
    ports:
      - 3306:3306
    volumes:
      - mysql:/var/lib/mysql
    env_file:
      - .env
```

**Why `image: mysql:latest`**
MariaDB is highly compatible with MySQL, so the `mysql` image works as-is.
`platform: linux/amd64` is specified to ensure the container runs correctly on Apple Silicon (M1/M2) Macs.

**Why `env_file: .env`**
Loading credentials from `.env` avoids hardcoding sensitive values directly in the compose file,
keeping secrets out of the codebase.

---

### 2. Prisma schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mysql"
}

model Task {
  id           String    @id @default(cuid())
  user_id      String    @db.VarChar(36)
  project_id   String?
  name         String
  description  String?   @db.Text
  due_date     DateTime? @db.Date
  completed_on DateTime? @db.DateTime()
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt
  project      Project?  @relation(fields: [project_id], references: [id])

  @@index([user_id])
  @@map("tasks")
}

model Project {
  id          String   @id @default(cuid())
  user_id     String   @db.VarChar(36)
  name        String
  description String?  @db.Text
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  tasks       Task[]

  @@index([user_id])
  @@map("projects")
}
```

**Why `output = "../src/generated/prisma"`**
Prisma v7 recommends outputting the generated client under `src/` rather than `node_modules`.
This makes the generated TypeScript types an explicit part of the project and ensures IDE autocompletion works reliably.

**Why `@id @default(cuid())`**
Unlike auto-increment integers, CUIDs are globally unique across multiple servers and environments.
They also avoid leaking record counts when IDs are exposed in API responses.

**Why `@db.VarChar(36)` for `user_id`**
A UUID is 36 characters (including hyphens), so we narrow the column from Prisma's default `VARCHAR(191)`.
Since no User table exists yet, we store it as a plain string column without a foreign key constraint.

**Why `@@index([user_id])`**
The most frequent query will be `WHERE user_id = ?` when fetching a user's tasks or projects.
Without an index, this becomes a full table scan and degrades as data grows.

**Why `@@map("tasks")` / `@@map("projects")`**
Prisma models use PascalCase by convention, while database table names typically use lowercase snake_case.
`@@map` lets both naming conventions coexist without conflict.

**Why there is no `url` in `datasource db`**
In Prisma v7, the database connection URL is managed centrally in `prisma.config.mjs`.
The schema file only declares the `provider`; connection details live in the config file.

---

### 3. `prisma.config.mjs` — Prisma v7 CLI configuration

```js
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
```

**Why a separate config file in Prisma v7**
Prior to v7, you wrote `url = env("DATABASE_URL")` directly in the `datasource` block of `schema.prisma`.
In v7, CLI settings (schema path, migrations path, connection URL) are moved to `prisma.config.mjs` as the official recommendation.
This keeps the schema file focused purely on model definitions.

**Why the `.mjs` extension**
Because this project's `package.json` does not set `"type": "module"`, we use the `.mjs` extension to opt into ESM and enable `import` syntax explicitly.

---

### 4. `src/lib/prisma.ts` — PrismaClient singleton

```ts
import 'dotenv/config'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
})

const prisma = new PrismaClient({ adapter })

export { prisma }
```

**Why a Driver Adapter (`@prisma/adapter-mariadb`)**
Prisma v7 removed its built-in query engine and now requires a vendor-specific driver adapter.
`PrismaMariaDb` is the official adapter that wraps the `mariadb` npm package.

**Why explicitly set `connectionLimit: 5`**
Node.js is single-threaded and handles concurrency through async operations, so connection pools are shared across all concurrent requests.
Setting an explicit limit makes pool exhaustion visible as a timeout error, which is easier to detect and tune than relying on an opaque driver default.

**Why create `prisma` at module level (singleton)**
`new PrismaClient()` is expensive — it allocates a connection pool.
By instantiating it once at the top level and exporting it, the entire application shares one pool instead of opening new connections per request.

---

### 5. npm scripts

```json
"scripts": {
  "prisma:generate": "prisma generate",
  "migration:create": "prisma migrate dev --create-only",
  "migrate": "prisma migrate deploy"
}
```

| Script | Purpose |
|---|---|
| `prisma:generate` | Regenerate TypeScript types after schema changes |
| `migration:create` | Create a migration file without applying it (for review) |
| `migrate` | Apply all pending migrations in order (for CI / production) |

**Why `migrate deploy` instead of `migrate dev` in the `migrate` script**
`migrate dev` is a development-only command that checks schema drift and uses a shadow database.
`migrate deploy` simply applies existing migration files in order — no side effects, safe for CI and production.
