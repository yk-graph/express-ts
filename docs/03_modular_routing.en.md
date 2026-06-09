# Express + TypeScript Project Memo

## What I did on this branch (`03_modular_routing`)

This branch introduces modular routing using Express Router, splitting route definitions and handler logic into separate files organized by resource and API version.

### Tasks completed

- [x] Created `src/routes/v1/index.ts` — v1 router that mounts all resource routers under `/v1`
- [x] Created `src/routes/v1/tasks/index.ts` — router for task-related endpoints
- [x] Created `src/routes/v1/tasks/controller.ts` — handler functions for task endpoints
- [x] Created `src/routes/v1/projects/index.ts` — router for project-related endpoints
- [x] Created `src/routes/v1/projects/controller.ts` — handler functions for project endpoints
- [x] Updated `src/server.ts` — mounts the v1 router at `/v1`
- [x] Updated `api-test.http` — added requests for all new endpoints
- [x] Removed `@/*` path alias from `tsconfig.json` — reverted to relative imports

---

## Directory structure

```
src/
└── routes/
    └── v1/
        ├── index.ts          ← mounts /tasks and /projects
        ├── tasks/
        │   ├── index.ts      ← GET /v1/tasks, GET /v1/tasks/:id
        │   └── controller.ts ← listTasks, getTask
        └── projects/
            ├── index.ts      ← GET /v1/projects, GET /v1/projects/:id, GET /v1/projects/:id/tasks
            └── controller.ts ← listProjects, getProject, listProjectTasks
```

> **Why this structure?** Each resource gets its own folder containing a router (`index.ts`) and a controller (`controller.ts`). As the app grows, new resources can be added without touching existing files — just create a new folder and mount it in `src/routes/v1/index.ts`.

---

## Configuration details

### 1. `src/routes/v1/index.ts`

```ts
import express, { Router } from 'express'

import tasks from './tasks'
import projects from './projects'

const v1: Router = express.Router()

v1.use('/tasks', tasks)
v1.use('/projects', projects)

export default v1
```

The v1 router acts as an aggregator. It imports each resource router and mounts it under a path prefix. Adding a new resource only requires importing it here and calling `v1.use()`.

---

### 2. `src/routes/v1/tasks/index.ts`

```ts
import express, { Router } from 'express'

import { listTasks, getTask } from './controller'

const tasks: Router = express.Router()

tasks.get('/', listTasks)
tasks.get('/:id', getTask)

export default tasks
```

| Endpoint          | Handler      | Description              |
| ----------------- | ------------ | ------------------------ |
| `GET /v1/tasks`   | `listTasks`  | Returns a list of tasks. |
| `GET /v1/tasks/:id` | `getTask`  | Returns a single task by ID. |

---

### 3. `src/routes/v1/tasks/controller.ts`

```ts
import { Request, Response } from 'express'

export const listTasks = (req: Request, res: Response) => {
  res.status(200).json([])
}

export const getTask = (req: Request, res: Response) => {
  res.status(200).json({ id: 1, name: 'Sample Task' })
}
```

Each handler is a named export, which makes it easy to import selectively in the router and to test in isolation. The current implementations return stub data — real database queries will replace these later.

---

### 4. `src/routes/v1/projects/index.ts`

```ts
import express, { Router } from 'express'

import { listProjects, getProject, listProjectTasks } from './controller'

const projects: Router = express.Router()

projects.get('/', listProjects)
projects.get('/:id', getProject)
projects.get('/:id/tasks', listProjectTasks)

export default projects
```

| Endpoint                       | Handler             | Description                             |
| ------------------------------ | ------------------- | --------------------------------------- |
| `GET /v1/projects`             | `listProjects`      | Returns a list of projects.             |
| `GET /v1/projects/:id`         | `getProject`        | Returns a single project by ID.         |
| `GET /v1/projects/:id/tasks`   | `listProjectTasks`  | Returns tasks belonging to a project.   |

---

### 5. `src/routes/v1/projects/controller.ts`

```ts
import { Request, Response } from 'express'

export const listProjects = (req: Request, res: Response) => {
  res.status(200).json([])
}

export const getProject = (req: Request, res: Response) => {
  res.status(200).json({ id: 1, name: 'Sample Project' })
}

export const listProjectTasks = (req: Request, res: Response) => {
  res.status(200).json([])
}
```

---

### 6. `src/server.ts` — mounting the v1 router

```ts
import v1 from './routes/v1'

app.use('/v1', v1)
```

`app.use('/v1', v1)` prefixes every route defined in the v1 router with `/v1`. For example, `tasks.get('/')` inside the tasks router becomes `GET /v1/tasks` in the running app.

---

### 7. `api-test.http` — updated endpoints

```http
### Health check
GET http://localhost:3000/health HTTP/1.1

### GET tasks
GET http://localhost:3000/v1/tasks HTTP/1.1

### GET task by ID
GET http://localhost:3000/v1/tasks/1 HTTP/1.1

### GET projects
GET http://localhost:3000/v1/projects HTTP/1.1

### GET project by ID
GET http://localhost:3000/v1/projects/1 HTTP/1.1

### GET project's tasks
GET http://localhost:3000/v1/projects/1/tasks HTTP/1.1
```

---

## File descriptions

| File                                    | Description                                                              |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `src/routes/v1/index.ts`               | v1 router. Mounts the tasks and projects routers under `/v1`.            |
| `src/routes/v1/tasks/index.ts`         | Tasks router. Defines `GET /tasks` and `GET /tasks/:id`.                 |
| `src/routes/v1/tasks/controller.ts`    | Handler functions for task endpoints (`listTasks`, `getTask`).           |
| `src/routes/v1/projects/index.ts`      | Projects router. Defines `GET /projects`, `GET /projects/:id`, and `GET /projects/:id/tasks`. |
| `src/routes/v1/projects/controller.ts` | Handler functions for project endpoints (`listProjects`, `getProject`, `listProjectTasks`). |
| `src/server.ts`                        | Mounts the v1 router at `/v1`.                                           |
| `api-test.http`                        | HTTP test file. Added requests for all new task and project endpoints.   |
