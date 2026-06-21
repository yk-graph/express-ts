# Express + TypeScript プロジェクトメモ

## このブランチ（`06_database_seeding`）でやったこと

開発用の初期データを DB に投入する seed スクリプトを整備したブランチです。
`@faker-js/faker` でランダムなダミーデータを生成し、`npx prisma db seed` 一発で投入できる仕組みを構築しました。

### 完了したタスク

- [x] `prisma/seed.ts` の作成 — faker を使った Task・Project の初期データ投入スクリプト
- [x] `package.json` の更新 — `@faker-js/faker` の追加・seed コマンドの設定
- [x] `prisma.config.mjs` の更新 — `migrations.seed` への seed コマンド登録

---

## ディレクトリ構成

```
.
├── prisma.config.mjs    ← seed コマンドを migrations.seed に追加
├── prisma/
│   └── seed.ts          ← 初期データ投入スクリプト
└── package.json         ← @faker-js/faker の追加・db:seed スクリプトの追加
```

---

## 設定の詳細と「なぜそうしたか」

### 1. `prisma/seed.ts` — 初期データ投入スクリプト

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

**`@faker-js/faker` でランダムデータを生成する理由**
固定の文字列を手書きした seed データは、API のフィルタリングやソートを確認するとき「全件が同じ値」になってしまい機能の動作確認になりません。
ランダムなデータが入ることで、一覧取得・検索・ソートなどのエンドポイントを実際の使用に近い状態でテストできます。

**`userIds` を固定の UUID 配列にする理由**
現時点では User テーブルが存在しないため、seed で動的に user を作ることができません。
API のテスト時に「どの user_id でリクエストすれば data が返るか」を事前に把握しておく必要があるため、固定値にしています。

**`i % 2 === 0 ? createdProject.id : null` にする理由**
プロジェクトに紐づくタスクとそうでないタスクが混在するデータを作ることで、
`project_id` の有無でフィルタリングする API を確認しやすくするためです。

**`main()` を `then/catch` で呼ぶ理由**
seed 終了後に必ず `prisma.$disconnect()` を呼び、DB コネクションを明示的に閉じるためです。
切断しないとプロセスが終了せずにハングします。
エラー時も同様に切断してから `process.exit(1)` でエラーコードを返し、CI などで失敗を検知できるようにしています。

---

### 2. `prisma.config.mjs` への seed コマンド登録

```js
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',   // ← 追加
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
```

**`migrations.seed` に書く理由（`package.json` の `prisma.seed` ではなく）**
Prisma v7 では設定の一元管理を `prisma.config.mjs` で行うのが公式推奨です。
`package.json` の `"prisma": { "seed": ... }` は v6 以前の書き方であり、v7 では `prisma.config.mjs` の `migrations.seed` が読み込まれます。

> 公式ドキュメントより：「Remove any prisma.seed from package.json (the config above replaces it)」

**`tsx` を使う理由**
`tsx` は TypeScript ファイルを Node.js でそのまま実行できるツールです。
`ts-node` と同様の役割ですが、ESM との互換性が高く、設定不要で動作します。
Prisma v7 の公式ドキュメントのサンプルでも `tsx` が採用されています。

---

### 3. `package.json` の変更

```json
{
  "scripts": {
    "db:seed": "npx prisma db seed"
  },
  "devDependencies": {
    "@faker-js/faker": "^10.5.0"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

**`db:seed` スクリプトを追加する理由**
`npx prisma db seed` は長いため、`npm run db:seed` という短いエイリアスを作っています。

**`@faker-js/faker` を `devDependencies` に入れる理由**
seed スクリプトは開発・テスト環境でのみ使うものであり、本番ビルドには不要です。
`dependencies` ではなく `devDependencies` に分類することで、本番デプロイ時のバンドルサイズに影響しません。

---

## seed の実行方法

```bash
# 初回のみ：tsx のインストール
npm install --save-dev tsx

# seed 実行
npm run db:seed
# または
npx prisma db seed
```

## トラブルシューティング

| エラー | 原因 | 対処 |
|---|---|---|
| `spawn tsx ENOENT` | `tsx` が未インストール | `npm install --save-dev tsx` |
| `Access denied for user ''` | `.env` の `DATABASE_*` 変数が未設定 | `.env` に `DATABASE_HOST/USER/PASSWORD/NAME` を追加 |
| `pool timeout` | DB コンテナが起動していない | `docker compose up -d` で MariaDB を起動 |
