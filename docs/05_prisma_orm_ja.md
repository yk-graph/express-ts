# Express + TypeScript プロジェクトメモ

## このブランチ（`05_prisma_orm`）でやったこと

Prisma ORM と MariaDB を組み合わせた DB 接続基盤を構築したブランチです。
ローカル開発用の Docker 環境を整え、Task・Project の 2 モデルをスキーマに定義してマイグレーションを実行。
コントローラーが実際の DB を参照するようになりました。

### 完了したタスク

- [x] `docker-compose.yml` の作成 — ローカル MariaDB 環境の構築
- [x] `prisma/schema.prisma` の作成 — Task・Project モデルの定義
- [x] 初回マイグレーションの実行 — `tasks` / `projects` テーブルの生成
- [x] `prisma.config.mjs` の作成 — Prisma v7 用 CLI 設定ファイル
- [x] `src/lib/prisma.ts` の作成 — PrismaClient シングルトンの定義
- [x] `package.json` の更新 — Prisma 関連の npm スクリプト追加
- [x] `src/routes/v1/tasks/controller.ts` の更新 — `getTask` を DB 参照に変更
- [x] `src/routes/v1/projects/controller.ts` の更新 — `getProject` を DB 参照に変更

---

## ディレクトリ構成

```
.
├── docker-compose.yml          ← ローカル MariaDB コンテナの定義
├── prisma.config.mjs           ← Prisma CLI 設定（v7 形式）
├── prisma/
│   ├── schema.prisma           ← モデル定義
│   └── migrations/
│       └── ***/migration.sql   ← 自動生成された DDL
└── src/
    └── lib/
        └── prisma.ts           ← PrismaClient シングルトン
```

---

## 設定の詳細と「なぜそうしたか」

### 1. Docker Compose で MariaDB を立てる

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

**`image: mysql:latest` を使う理由**
MariaDB は MySQL との互換性が高く、`mysql` イメージがそのまま使えます。
`platform: linux/amd64` を指定しているのは Apple Silicon（M1/M2）Mac で動作させるためです。

**`env_file: .env` にしている理由**
パスワードなどの機密情報をハードコードせず、`.env` から読み込む形にすることで、
コードベースに credentials を残さない構成にするためです。

---

### 2. Prisma スキーマ（`prisma/schema.prisma`）

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

**`output = "../src/generated/prisma"` にする理由**
デフォルトの出力先は `node_modules` 内ですが、Prisma v7 では `src/` 配下への出力が推奨されています。
TypeScript の型補完が確実に効くようになるうえ、生成コードがプロジェクトの一部として明示的になります。

**`@id @default(cuid())` を使う理由**
自動インクリメントの整数 ID と違い、CUID は複数サーバー/環境をまたいでもユニーク性が保証されます。
API のレスポンスで ID が外部に露出する場合でも、連番から件数が推測されるリスクがありません。

**`user_id` を `@db.VarChar(36)` にする理由**
UUID は 36 文字（ハイフン含む）なので、Prisma のデフォルト `VARCHAR(191)` より短い桁数に明示指定しています。
現時点では User テーブルが存在しないため、`@relation` は貼らずに外部キー制約なしの文字列カラムとして持たせています。

**`@@index([user_id])` を張る理由**
タスク・プロジェクトの一覧取得は `WHERE user_id = ?` が最も頻度の高いクエリになるためです。
インデックスなしでは全件スキャンになり、データ量が増えると性能劣化します。

**`@@map("tasks")` / `@@map("projects")` を付ける理由**
Prisma のモデル名は PascalCase が慣例ですが、RDB のテーブル名は snake_case の小文字が一般的です。
`@@map` で両方の命名規則を共存させています。

**`datasource db` に `url` を書かない理由**
Prisma v7 では DB 接続 URL を `prisma.config.mjs` に一元管理する設計になりました。
スキーマファイルには `provider` だけ残し、接続情報は設定ファイルに分離します。

---

### 3. `prisma.config.mjs` — Prisma v7 用 CLI 設定

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

**Prisma v7 で設定ファイルを別に作る理由**
v6 までは `schema.prisma` の `datasource` に `url = env("DATABASE_URL")` と書いていましたが、
v7 からは CLI の動作設定（スキーマパス・マイグレーションパス・接続 URL）を `prisma.config.mjs` に分離するのが公式推奨になりました。
スキーマファイルをモデル定義だけに集中させることで、役割が明確になります。

**`.mjs` 拡張子にする理由**
このプロジェクトの `package.json` に `"type": "module"` が設定されていないため、
`import` 構文を使うために ESM を明示する `.mjs` 拡張子を使っています。

---

### 4. `src/lib/prisma.ts` — PrismaClient シングルトン

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

**Driver Adapter（`@prisma/adapter-mariadb`）を使う理由**
Prisma v7 では組み込みエンジンが廃止され、各 DB ベンダーのドライバーを Adapter 経由で繋ぐ構成が必須になりました。
`PrismaMariaDb` は `mariadb` npm パッケージをラップした公式 Adapter です。

**`connectionLimit: 5` を指定する理由**
Node.js はシングルスレッドで非同期処理を並走させます。
コネクションプールのサイズを明示しておくことで、同時接続数が上限を超えた場合に「タイムアウト」として検知しやすくなります。
（指定しない場合はドライバー既定値に依存するため、本番での挙動が予測しにくくなります）

**モジュールレベルで `prisma` を生成してシングルトンにする理由**
`new PrismaClient()` はコネクションプールを生成するコストの高い処理です。
ファイルのトップレベルで一度だけインスタンスを作り、アプリ全体で使い回すことで
リクエストのたびに接続を張り直すオーバーヘッドを避けています。

---

### 5. npm スクリプト

```json
"scripts": {
  "prisma:generate": "prisma generate",
  "migration:create": "prisma migrate dev --create-only",
  "migrate": "prisma migrate deploy"
}
```

| スクリプト | 用途 |
|---|---|
| `prisma:generate` | スキーマ変更後に TypeScript 型を再生成する |
| `migration:create` | マイグレーションファイルだけ作成し、DB への適用は行わない（レビュー用） |
| `migrate` | 未適用のマイグレーションを順番に DB へ適用する（本番向け） |

**`migrate dev` ではなく `migrate deploy` を `migrate` スクリプトに割り当てる理由**
`migrate dev` は開発専用コマンドで、スキーマとの差分チェックや shadow database の操作を行います。
CI・本番環境での適用には副作用のない `migrate deploy`（既存ファイルを順番に適用するだけ）を使います。
