# Express + TypeScript プロジェクトメモ

## このブランチ（`feature/configuration`）でやったこと

環境変数の管理とパスエイリアスを導入し、ハードコードされた値を一元管理された config オブジェクトに置き換えたブランチです。

### 完了したタスク

- [x] `dotenv-cli` の追加 — 開発サーバー起動前に `.env` を読み込む
- [x] `src/config.ts` の作成 — 環境変数を読み込む一元管理された config オブジェクト
- [x] `.env.example` の作成 — 必要な環境変数を列挙したテンプレートファイル
- [x] `tsconfig.json` にパスエイリアス `@/*` を追加 — `'../server'` のような相対パスを `'@/server'` に置き換える
- [x] `src/index.ts` の更新 — ポートを `3000` のハードコードから `config.port` で読み込むよう変更
- [x] `src/server.ts` の更新 — `/health` レスポンスに `environment` フィールドを追加
- [x] `api-test.http` の作成 — VS Code 上でAPIエンドポイントをテストするための HTTP ファイル

---

## 設定ファイルの詳細

### 1. `src/config.ts`

```ts
const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || '3000',
} as const

export default config
```

| 設定       | 意味 |
| ---------- | ---- |
| `env`      | 環境変数 `NODE_ENV` を読み込む。未設定の場合は `'development'` にフォールバックする。 |
| `port`     | 環境変数 `PORT` を読み込む。未設定の場合は `'3000'` にフォールバックする。 |
| `as const` | オブジェクトとすべての値を深くreadonlyにする。意図しない書き換えを防ぐ。 |

> **なぜ config を一元管理するのか？** `process.env.X` をコードベース全体に散在させると、アプリがどの環境変数に依存しているか把握しにくくなる。`config.ts` を一箇所にまとめることで、監査・テストでのモック・拡張がしやすくなる。

---

### 2. `.env.example`

```
NODE_ENV=
```

必要な環境変数を値なしで列挙し、Git にコミットするテンプレートファイル。開発者はこのファイルを `.env` にコピーしてローカルで値を入力する。`.env` 本体は `.gitignore` で Git の管理対象から除外し、シークレットがコミットされないようにする。

---

### 3. `tsconfig.json` — パスエイリアス

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

| 設定   | 意味 |
| ------ | ---- |
| `@/*`  | `./src/*` に対応するショートハンドエイリアス。例えば `import config from '@/config'` は `src/config.ts` に解決される。 |

> **なぜパスエイリアスを使うのか？** `'../../config'` のような相対パスは、ファイルを移動すると静かに壊れる上に読みにくい。`@/` プレフィックスを使うと、すべての import が `src/` ルートからの絶対パス風になり、可読性とリファクタリング耐性が上がる。

---

### 4. `package.json` — dev スクリプト

```json
{
  "scripts": {
    "dev": "dotenv -- nodemon"
  }
}
```

| 設定        | 意味 |
| ----------- | ---- |
| `dotenv --` | 次のコマンドを実行する前に `.env` をプロセス環境に読み込む。`--` は `dotenv-cli` の引数と実行コマンドを区切る。 |
| `nodemon`   | これまで通りホットリロードで開発サーバーを起動する。 |

---

### 5. `api-test.http`

```http
### Health check

GET http://localhost:3000/health HTTP/1.1
```

VS Code の [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) 拡張が読み込むプレーンテキストファイル。各ブロックの上に表示される「Send Request」をクリックすると HTTP リクエストが送信され、レスポンスがインラインに表示される。Postman や curl に切り替える必要がない。

---

## 更新されたファイル

### `src/index.ts`

```ts
import { createServer } from '@/server'
import config from '@/config'

const server = createServer()

server.listen(config.port, () => {
  console.log(`api running on ${config.port}`)
})
```

ポートが `3000` のハードコードから `config.port`（`process.env.PORT` を読む）に変わった。import パスも `@/` エイリアスを使うよう更新している。

---

### `src/server.ts`

```ts
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true, environment: config.env })
})
```

`/health` エンドポイントのレスポンスに `environment` の値を含めるようにした。起動中のサーバーがどの環境で動いているか確認しやすくなる。

---

## 各ファイルの説明

| ファイル          | 説明 |
| ----------------- | ---- |
| `src/config.ts`   | 一元管理された config オブジェクト。環境変数から `NODE_ENV` と `PORT` を読み込む。 |
| `src/index.ts`    | エントリーポイント。`config` からポートを読み込み、サーバーを起動する。 |
| `src/server.ts`   | Express アプリのファクトリ関数。`/health` レスポンスに `environment` を含める。 |
| `.env.example`    | 必要な環境変数のテンプレート。`.env` にコピーしてローカルで値を入力する。 |
| `api-test.http`   | REST Client VS Code 拡張用の HTTP リクエストファイル。エディタ上でAPIエンドポイントをテストできる。 |
| `tsconfig.json`   | `./src/*` を指す `@/*` パスエイリアスを追加した。 |
| `package.json`    | `dev` スクリプトを `dotenv-cli` 経由で `.env` を読み込んでから Nodemon を起動するよう更新した。 |
