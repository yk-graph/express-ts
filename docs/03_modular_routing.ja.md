# Express + TypeScript プロジェクトメモ

## このブランチ（`03_modular_routing`）でやったこと

Express Router を使ったモジュール型ルーティングを導入し、ルート定義とハンドラーロジックをリソースごと・APIバージョンごとに別ファイルへ分割したブランチです。

### 完了したタスク

- [x] `src/routes/v1/index.ts` の作成 — すべてのリソースルーターを `/v1` 以下にまとめる v1 ルーター
- [x] `src/routes/v1/tasks/index.ts` の作成 — タスク関連エンドポイントのルーター
- [x] `src/routes/v1/tasks/controller.ts` の作成 — タスクエンドポイントのハンドラー関数
- [x] `src/routes/v1/projects/index.ts` の作成 — プロジェクト関連エンドポイントのルーター
- [x] `src/routes/v1/projects/controller.ts` の作成 — プロジェクトエンドポイントのハンドラー関数
- [x] `src/server.ts` の更新 — v1 ルーターを `/v1` にマウント
- [x] `api-test.http` の更新 — 新しいエンドポイントのリクエストを追加
- [x] `tsconfig.json` から `@/*` パスエイリアスを削除 — 相対パス import に戻す

---

## ディレクトリ構成

```
src/
└── routes/
    └── v1/
        ├── index.ts          ← /tasks と /projects をマウントする
        ├── tasks/
        │   ├── index.ts      ← GET /v1/tasks, GET /v1/tasks/:id
        │   └── controller.ts ← listTasks, getTask
        └── projects/
            ├── index.ts      ← GET /v1/projects, GET /v1/projects/:id, GET /v1/projects/:id/tasks
            └── controller.ts ← listProjects, getProject, listProjectTasks
```

> **なぜこの構成にするのか？** リソースごとにフォルダを切り、その中にルーター（`index.ts`）とコントローラー（`controller.ts`）を置く。アプリが成長しても既存ファイルに触れず、新しいフォルダを作って `src/routes/v1/index.ts` にマウントするだけで追加できる。

---

## 設定ファイルの詳細

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

v1 ルーターは各リソースルーターを集約する役割を持つ。リソースをインポートして `v1.use()` を呼ぶだけで追加できる。新しいリソースが増えてもここだけ変更すれば済む。

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

| エンドポイント        | ハンドラー   | 説明 |
| --------------------- | ------------ | ---- |
| `GET /v1/tasks`       | `listTasks`  | タスクの一覧を返す。 |
| `GET /v1/tasks/:id`   | `getTask`    | ID を指定して単一のタスクを返す。 |

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

各ハンドラーを名前付きエクスポートにすることで、ルーター側で選択的にインポートでき、単体テストも書きやすい。現時点はスタブデータを返すのみで、後のブランチで実際のデータベース処理に置き換える。

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

| エンドポイント                    | ハンドラー          | 説明 |
| --------------------------------- | ------------------- | ---- |
| `GET /v1/projects`                | `listProjects`      | プロジェクトの一覧を返す。 |
| `GET /v1/projects/:id`            | `getProject`        | ID を指定して単一のプロジェクトを返す。 |
| `GET /v1/projects/:id/tasks`      | `listProjectTasks`  | プロジェクトに紐づくタスクの一覧を返す。 |

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

### 6. `src/server.ts` — v1 ルーターのマウント

```ts
import v1 from './routes/v1'

app.use('/v1', v1)
```

`app.use('/v1', v1)` を呼ぶことで、v1 ルーター内で定義したすべてのルートに `/v1` プレフィックスが付く。例えばタスクルーター内の `tasks.get('/')` は、実行中のアプリでは `GET /v1/tasks` になる。

---

### 7. `api-test.http` — 追加されたエンドポイント

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

## 各ファイルの説明

| ファイル                                | 説明 |
| --------------------------------------- | ---- |
| `src/routes/v1/index.ts`               | v1 ルーター。タスクとプロジェクトのルーターを `/v1` 以下にマウントする。 |
| `src/routes/v1/tasks/index.ts`         | タスクルーター。`GET /tasks` と `GET /tasks/:id` を定義する。 |
| `src/routes/v1/tasks/controller.ts`    | タスクエンドポイントのハンドラー関数（`listTasks`、`getTask`）。 |
| `src/routes/v1/projects/index.ts`      | プロジェクトルーター。`GET /projects`、`GET /projects/:id`、`GET /projects/:id/tasks` を定義する。 |
| `src/routes/v1/projects/controller.ts` | プロジェクトエンドポイントのハンドラー関数（`listProjects`、`getProject`、`listProjectTasks`）。 |
| `src/server.ts`                        | v1 ルーターを `/v1` にマウントする。 |
| `api-test.http`                        | HTTP テストファイル。タスク・プロジェクトの新エンドポイントのリクエストを追加した。 |
