# Express + TypeScript Project Notes

## What we did in this branch (`06_database_seeding`)

This branch adds a seed script to populate the database with initial development data.
`@faker-js/faker` generates random dummy records, and a single `npx prisma db seed` command inserts them.

### Completed tasks

- [x] Create `prisma/seed.ts` — seed script that inserts Task and Project records using faker
- [x] Create `prisma/tsconfig.json` — TypeScript configuration scoped to the prisma directory
- [x] Update `prisma.config.mjs` — register the seed command under `migrations.seed`
- [x] Update `tsconfig.json` — narrow `include` to `src/**/*` only
- [x] Update `package.json` — add `@faker-js/faker`, add `db:seed` script, remove legacy `prisma.seed`

---

## Directory structure

```
.
├── prisma.config.mjs      ← seed command added to migrations.seed
├── tsconfig.json          ← include narrowed to src/**/* only
├── prisma/
│   ├── seed.ts            ← initial data insertion script
│   └── tsconfig.json      ← TypeScript config scoped to prisma/
└── package.json           ← @faker-js/faker added, db:seed script added
```

---

## Configuration details and rationale

### 1. `prisma/seed.ts` — seed script

```ts
import { faker } from '@faker-js/faker'
import { prisma } from '../src/lib/prisma'

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

const userIds = [
  '216c1653-7b13-49bd-9499-53007ead0126',
  '0cdbed84-0b12-4b89-91ae-5572e8e1258e',
  '4dd4510b-2b01-438d-be7a-0064460230a1',
]

async function main() {
  for (const userId of userIds) {
    const createdProject = await prisma.project.create({
      data: {
        user_id: userId,
        name: capitalize(faker.word.noun()),
      },
    })

    for (let i = 1; i <= 2; i++) {
      await prisma.task.create({
        data: {
          user_id: userId,
          project_id: i % 2 === 0 ? createdProject.id : null,
          name: `${capitalize(faker.word.verb())} ${faker.word.noun()}`,
          description: faker.lorem.sentence(),
          due_date: faker.date.future(),
        },
      })
    }
  }
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

**Why use `@faker-js/faker` for random data**
Hardcoded seed data means every record has the same values, which makes it impossible to properly test filtering, sorting, or pagination.
Random data produced by faker gives each run a realistic spread of values, letting you exercise API endpoints the way a real user would.

**Why `userIds` is a fixed UUID array**
There is no User table yet, so we cannot dynamically create users during seeding.
Using fixed UUIDs means you always know which `user_id` to use when testing the API — no need to look up what was inserted.

**Why `i % 2 === 0 ? createdProject.id : null`**
Mixing tasks that belong to a project with tasks that don't gives you data to verify `project_id`-based filtering in the API without having to manually craft edge cases.

**Why call `main()` with `then/catch`**
`prisma.$disconnect()` must be called after the script finishes to close the connection pool, otherwise the process hangs and never exits.
On error, we still disconnect and then call `process.exit(1)` so that CI pipelines can detect the failure.

---

### 2. Registering the seed command in `prisma.config.mjs`

```js
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',   // ← added
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
```

**Why `migrations.seed` instead of `package.json`'s `prisma.seed`**
Prisma v7 centralises all CLI configuration in `prisma.config.mjs`.
The `"prisma": { "seed": ... }` field in `package.json` is the v6 approach; in v7 the CLI reads `migrations.seed` from the config file.

> From the official docs: "Remove any prisma.seed from package.json (the config above replaces it)."

**Why `tsx`**
`tsx` runs TypeScript files directly in Node.js, similar to `ts-node`, but with better ESM compatibility and zero configuration.
It is also the tool used in Prisma v7's official documentation examples.

---

### 3. `package.json` changes

```json
{
  "scripts": {
    "db:seed": "npx prisma db seed"
  },
  "devDependencies": {
    "@faker-js/faker": "^10.5.0"
  }
}
```

**Why add a `db:seed` script**
`npx prisma db seed` is verbose to type repeatedly. The `npm run db:seed` alias keeps the workflow concise.

**Why `@faker-js/faker` goes in `devDependencies`**
The seed script is only used in development and testing — it is never needed in production.
Placing it in `devDependencies` keeps it out of production bundles and makes the dependency intent explicit.

**Why the `"prisma": { "seed": ... }` field was removed**
In Prisma v7, the seed command is configured via `migrations.seed` in `prisma.config.mjs`.
The `prisma.seed` field in `package.json` is the v6 approach; keeping both would create duplicate and conflicting configuration.

---

### 4. TypeScript configuration cleanup

#### Narrowing `include` in `tsconfig.json`

```json
// Before
"include": ["src/**/*", "*.mjs", "*.ts"]

// After
"include": ["src/**/*"]
```

**Why remove `*.mjs` and `*.ts`**
With `rootDir: "./src"` set, the intent is clearly to compile only files under `src/`.
Aligning `include` with `rootDir` keeps the configuration consistent and explicit.
Leaving extra patterns also caused the TypeScript language server to apply project settings ambiguously to files outside `src/` (like `prisma/seed.ts`), leading to unstable type resolution.

#### Creating `prisma/tsconfig.json`

```json
{
  "extends": "@tsconfig/node24/tsconfig.json",
  "compilerOptions": {
    "lib": ["DOM"],
    "types": ["node"]
  }
}
```

**Why `seed.ts` needs its own tsconfig**
`seed.ts` lives in `prisma/`, which is outside the `rootDir: "./src"` scope of the root `tsconfig.json`.
When the root tsconfig doesn't apply, `@types/node` globals like `process` are not resolved, causing editor warnings.

Placing a `tsconfig.json` in `prisma/` lets the TypeScript language server use it as the configuration for all files in that directory, resolving Node.js global types correctly.

**Why a dedicated tsconfig instead of `/// <reference types="node" />`**
Adding `/// <reference types="node" />` directly to a file is a per-file workaround that has to be repeated for every new script added under `prisma/`.
A dedicated `tsconfig.json` in the directory applies automatically to all files there — a cleaner and more scalable approach.

---

## How to run the seed

```bash
# First time only: install tsx
npm install --save-dev tsx

# Run the seed
npm run db:seed
# or
npx prisma db seed
```

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `spawn tsx ENOENT` | `tsx` is not installed | `npm install --save-dev tsx` |
| `Access denied for user ''` | `DATABASE_*` variables are missing from `.env` | Add `DATABASE_HOST/USER/PASSWORD/NAME` to `.env` |
| `pool timeout` | DB container is not running | `docker compose up -d` to start MariaDB |
