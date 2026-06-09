# Express + TypeScript プロジェクトメモ

## このブランチ（`04_error_handling`）でやったこと

カスタムエラークラスの階層・エラーハンドリングミドルウェア・エラーメッセージを安全に取り出すユーティリティ関数を導入し、エラー処理を一元管理する仕組みを構築したブランチです。

### 完了したタスク

- [x] `src/errors/types.d.ts` の作成 — エラーコードのグローバル型定義
- [x] `src/errors/CustomError.ts` の作成 — `Error` を継承したベースカスタムエラークラス
- [x] `src/errors/EntityNotFoundError.ts` の作成 — 404 Not Found 用の具体的なエラークラス
- [x] `src/middleware/error-handler.ts` の作成 — 一元化されたエラーハンドリングミドルウェア
- [x] `src/utils/error.utils.ts` の作成 — エラーメッセージを安全に取り出すユーティリティ関数
- [x] `src/routes/v1/tasks/controller.ts` の更新 — `getTask` で `EntityNotFoundError` を throw
- [x] `src/server.ts` の更新 — 一番下に `errorHandler` ミドルウェアをマウント
- [x] `tsconfig.json` の更新 — `"ts-node": { "files": true }` を追加して `.d.ts` ファイルを実行時に読み込む

---

## ディレクトリ構成

```
src/
├── errors/
│   ├── types.d.ts             ← グローバル型: ErrorCode
│   ├── CustomError.ts         ← ベースエラークラス
│   └── EntityNotFoundError.ts ← 404 専用エラークラス
├── middleware/
│   └── error-handler.ts       ← 一元化されたエラーハンドリングミドルウェア
└── utils/
    └── error.utils.ts         ← getErrorMessage() ユーティリティ
```

---

## エラーがアプリ内を流れる仕組み

```
ルートハンドラーが EntityNotFoundError を throw
        ↓
Express 5 が自動的にキャッチ（async ハンドラーのため）
        ↓
通常のミドルウェアをすべてスキップ
        ↓
error-handler ミドルウェアが受け取る  (err, req, res, next)
        ↓
CustomError のインスタンスか確認
  → yes: res.status(404).json({ error: { message, code } })
  → no:  res.status(500).json({ error: { message: getErrorMessage(error) } })
```

---

## 設定ファイルの詳細

### 1. `src/errors/types.d.ts`

```ts
type ErrorCode = 'ERR_NOT_FOUND' | 'ERR_VALIDATION_FAILED' | 'ERR_INTERNAL_SERVER_ERROR'
```

`.d.ts` ファイルは**グローバルな型定義ファイル**です。ここで定義した型は `import` なしでプロジェクト全体から使えます。

**Q: なぜ `tsconfig.json` に `"ts-node": { "files": true }` が必要なのか？**

`ts-node` はデフォルトで `tsconfig.json` の `include` 配列を無視します。明示的に `import` されているファイルだけを読み込むため、どこからも `import` されない `types.d.ts` はスキップされ、実行時に `ErrorCode` が未定義になってしまいます。

`"files": true` を設定することで、`ts-node` が `tsconfig.json` の `include` を尊重するようになり、`tsc` と同じ挙動になります：

```json
"ts-node": {
  "files": true
}
```

| | `tsc`（ビルド時） | `ts-node`（デフォルト） | `ts-node`（files: true） |
|---|---|---|---|
| `include` を読む | ✅ | ❌ | ✅ |
| `types.d.ts` を認識 | ✅ | ❌ | ✅ |

---

### 2. `src/errors/CustomError.ts`

```ts
class CustomError<C extends string> extends Error {
  message: string
  statusCode: number
  code?: C

  constructor({ message, statusCode, code }: { message: string; statusCode: number; code?: C }) {
    super()
    this.message = message
    this.statusCode = statusCode
    this.code = code
  }
}

export default CustomError
```

ベースエラークラスです。`<C extends string>` はジェネリック型パラメータで、`code` を文字列型に制約します。実際には `ErrorCode` が `C` として渡されます。

組み込みの `Error` クラスを継承することで、エラーハンドラー内の `instanceof CustomError` チェックが正しく機能します。

---

### 3. `src/errors/EntityNotFoundError.ts`

```ts
import CustomError from './CustomError'

class EntityNotFoundError extends CustomError<ErrorCode> {}

export default EntityNotFoundError
```

「リソースが見つからない」ケース専用の具体的なエラークラスです。ジェネリック型に `ErrorCode` を渡すことで、`code` には `'ERR_NOT_FOUND' | 'ERR_VALIDATION_FAILED' | 'ERR_INTERNAL_SERVER_ERROR'` のいずれかしか指定できません。

コントローラーでの使い方：

```ts
throw new EntityNotFoundError({
  message: 'Task not found',
  statusCode: 404,
  code: 'ERR_NOT_FOUND',
})
```

---

### 4. `src/middleware/error-handler.ts`

```ts
export default function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent || config.debug) {
    next(error)
    return
  }

  if (error instanceof CustomError) {
    res.status(error.statusCode).json({
      error: { message: error.message, code: error.code },
    })
    return
  }

  res.status(500).json({
    error: {
      message: getErrorMessage(error) || 'An error occurred. Please view logs for more details.',
    },
  })
}
```

**Q: `if (res.headersSent || config.debug)` はどんなケースを防いでいるのか？**

| 条件 | 理由 | 結果 |
|---|---|---|
| `res.headersSent === true` | レスポンスのヘッダーがすでに送信済みで変更できない | `res.json()` を呼ぶと "Cannot set headers after they are sent" でクラッシュする。`next(error)` で委譲することで Express が安全にコネクションを閉じる。 |
| `config.debug === true` | デバッグモードでは クリーンな JSON レスポンスでなくスタックトレースを見たい | `next(error)` で転送することで Express のデフォルトハンドラーが詳細なエラーを出力する。 |

**Q: `res.headersSent` が true のとき `next(error)` を呼ぶとどうなるか？**

Express の組み込みデフォルトハンドラーがエラーを受け取り、**TCP コネクションを強制的に閉じます**。公式ドキュメントより：

> *"If headers have already been sent, the default error handler closes the connection."*

**Q: `next()` ではなく `next(error)` にしている理由は？**

Express では `next()` に何を渡すかで次の挙動が変わります：

```
next()        → 次の通常ミドルウェアへ進む
next(error)   → 通常ミドルウェアをすべてスキップしてエラーハンドリングミドルウェア（引数4つ）へ飛ぶ
```

`next()` にしてしまうと、Express は正常な流れと判断してエラーオブジェクトを失い、エラーハンドリングミドルウェア `(err, req, res, next)` は呼ばれません。

> 公式ドキュメントより：
> *"If you pass anything to the `next()` function (except the string `'route'`), Express regards the current request as being an error."*

---

### 5. `src/utils/error.utils.ts`

```ts
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unknown error occurred.'
}
```

TypeScript では `catch` ブロックの `error` の型は `unknown` です。どんな値でも throw できます：

```ts
throw new Error('failed')   // Error オブジェクト — .message あり
throw 'error string'        // 文字列 — .message なし
throw 404                   // 数値 — .message なし
throw null                  // null
```

各ケースを安全に処理しています：

| ケース | チェック | 返す値 |
|---|---|---|
| `Error` のインスタンス | `instanceof Error` | `error.message` をそのまま返す |
| `message` キーを持つオブジェクト | `typeof === 'object' && 'message' in error` | `String(error.message)` |
| 文字列 | `typeof === 'string'` | その文字列 |
| それ以外 | フォールスルー | `'An unknown error occurred.'` |

**Q: `'message' in error` を通過しても、`message` の値が文字列以外になるケースは存在するのか？**

はい、存在します。`'message' in error` は「`message` というキーが存在するか」しか確認しないので、値の型は何でも入れられます：

```ts
throw { message: 404 }             // number
throw { message: null }            // null
throw { message: undefined }       // undefined
throw { message: { detail: '' } }  // object
```

だから `String(error.message)` で必ず文字列に変換しています。ただし、`message` がオブジェクトの場合は `'[object Object]'` という意味のない文字列になります。実用上 `message` に文字列以外が来るケースはほぼないと判断して `String()` で済ませています。

---

### 6. `src/routes/v1/tasks/controller.ts`

```ts
export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  throw new EntityNotFoundError({
    message: 'Task not found',
    statusCode: 404,
    code: 'ERR_NOT_FOUND',
  })
}
```

**`async` + `throw`** — Express 5 では、async ルートハンドラーが throw すると自動的に `next(error)` が呼ばれます。`try/catch` は不要です。

**`NextFunction`** — エラーを次のミドルウェアへ転送するための第3引数。明示的に呼ばなくても、Express 5 がエラーを転送するためにシグネチャとして必要です。

Express 4 では同じコードに手動の `try/catch` が必要でした：

```ts
// Express 4 — 手動の try/catch が必要
export const getTask = async (req, res, next) => {
  try {
    throw new EntityNotFoundError({ ... })
  } catch (err) {
    next(err)
  }
}
```

---

## 各ファイルの説明

| ファイル | 説明 |
|---|---|
| `src/errors/types.d.ts` | `ErrorCode` のグローバル型定義。`import` なしでプロジェクト全体から使える。 |
| `src/errors/CustomError.ts` | ベースエラークラス。`Error` を継承し `statusCode` と `code` フィールドを追加。 |
| `src/errors/EntityNotFoundError.ts` | 404 Not Found 用エラークラス。`CustomError<ErrorCode>` を継承。 |
| `src/middleware/error-handler.ts` | 一元化されたエラーハンドリングミドルウェア。`server.ts` の一番下にマウントする。 |
| `src/utils/error.utils.ts` | `getErrorMessage()` が throw された値から安全に文字列メッセージを取り出す。 |
| `src/routes/v1/tasks/controller.ts` | `getTask` が `EntityNotFoundError` を throw。Express 5 が自動的に転送する。 |
| `src/server.ts` | すべてのルートの後に `errorHandler` を一番下にマウントする。 |
| `tsconfig.json` | `"ts-node": { "files": true }` を追加し、実行時に `types.d.ts` を読み込めるようにした。 |
