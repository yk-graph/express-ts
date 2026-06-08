# Express + TypeScript プロジェクトメモ

## このブランチ（`setup/initial-config`）でやったこと

YouTube の Express.js + TypeScript チュートリアルをもとに、プロジェクトの初期設定をゼロから構築したブランチです。

### 完了したタスク

- [x] `.gitignore` の作成（node_modules・dist・.env・ログ・エディタファイルを除外）
- [x] `tsconfig.json` の設定（`@tsconfig/node24` をベースに使用）
- [x] `jest.config.mjs` の設定（`ts-jest` を使ったテスト環境の構築）
- [x] `eslint.config.mjs` の設定（TypeScript・Jest・Prettier のルールを追加）
- [x] `src/server.ts` の作成 — Express アプリのファクトリ関数
- [x] `src/index.ts` の作成 — サーバーを起動するエントリーポイント
- [x] `src/utils.ts` の作成 — ユーティリティ関数（例：`add`）
- [x] `src/tests/add.test.ts` の作成 — `add()` の最初のテスト
- [x] `nodemon.json` の設定 — 開発中のホットリロード

---

## 設定ファイルの詳細

### 1. `tsconfig.json`

```json
{
  "extends": "@tsconfig/node24/tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "forceConsistentCasingInFileNames": true,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*", "*.mjs", "*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

| 設定 | 意味 |
| --- | --- |
| `extends` | コミュニティが管理する `@tsconfig/node24` パッケージから Node.js 24 向けの推奨設定を継承する。すべてのオプションを手動で書く必要がなくなる。 |
| `rootDir` | TypeScript のソースファイルが `./src` にあることを示す。 |
| `outDir` | コンパイル後の JavaScript ファイルを `./dist` に出力する。 |
| `forceConsistentCasingInFileNames` | import パスの大文字・小文字が実際のファイル名と一致しない場合にエラーにする。macOS では区別されないが、Linux（本番サーバー）では区別されるため、このオプションで早期に検出できる。 |
| `types` | `node`（`@types/node`）と `jest`（`@types/jest`）の型定義を明示的に読み込む。これがないと `it()` や `expect()` が TypeScript に認識されない。 |
| `include` | TypeScript がチェックするファイルを指定する。`src/**/*` でソースファイル全体を、`*.mjs` と `*.ts` でルートの設定ファイルをカバーする。 |
| `exclude` | `node_modules` とコンパイル後の `dist` を TypeScript の対象から除外する。 |

---

### 2. `jest.config.mjs`

```js
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./src/tests"],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "js", "json", "node"],
};
```

| 設定 | 意味 |
| --- | --- |
| `preset: 'ts-jest'` | Jest が実行する前に `ts-jest` で `.ts` ファイルを変換する。これがないと Jest は TypeScript を理解できない。 |
| `testEnvironment: 'node'` | テストをブラウザではなく Node.js 環境で実行する。Express などのバックエンドプロジェクトに必須。 |
| `roots` | Jest がテストファイルを探す場所を `./src/tests` のみに限定する。 |
| `testRegex` | `.test.ts` または `.spec.ts` で終わるファイルをテストファイルとして認識する正規表現パターン。 |
| `moduleFileExtensions` | Jest が解決するファイル拡張子の一覧。`ts` を先頭にすることで TypeScript ファイルが JavaScript より優先される。 |

---

### 3. `eslint.config.mjs`

```js
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import jest from "eslint-plugin-jest";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  { ignores: ["dist/"] },
  { files: ["src/**/*.{js,ts}"] },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/tests/**/*.{js,ts}"],
    ...jest.configs["flat/recommended"],
    rules: {
      ...jest.configs["flat/recommended"].rules,
      "jest/prefer-expect-assertions": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "prettier/prettier": [
        "error",
        {
          semi: false,
          singleQuote: true,
          printWidth: 200,
          bracketSameLine: true,
          htmlWhitespaceSensitivity: "strict",
          proseWrap: "never",
          endOfLine: "auto",
        },
      ],
    },
  },
  eslintPluginPrettierRecommended,
];
```

| 設定 | 意味 |
| --- | --- |
| `ignores: ['dist/']` | コンパイル後の出力フォルダをリントの対象から除外する。 |
| `files: ['src/**/*.{js,ts}']` | `src/` 以下の `.js` と `.ts` ファイルにのみルールを適用する。 |
| `globals: globals.node` | `process` や `__dirname` など Node.js のグローバル変数を ESLint に認識させる。 |
| `pluginJs.configs.recommended` | 標準の JavaScript 推奨ルールを有効にする。 |
| `tseslint.configs.recommended` | TypeScript 固有の推奨ルールを有効にする（例：`any` 禁止・未使用変数の検出）。 |
| `jest.configs['flat/recommended']` | テストファイル向けの Jest 固有ルールを有効にする（例：無効化されたテストの検出）。 |
| `jest/prefer-expect-assertions: 'off'` | すべてのテストで `expect.assertions()` の呼び出しを強制するルールを無効にする。初学者には厳しすぎるため。 |
| `@typescript-eslint/no-unused-vars: 'off'` | TypeScript ESLint の未使用変数警告を無効にする（TypeScript 本体がすでに検出するため）。 |
| `prettier/prettier` | Prettier のフォーマットを ESLint のエラーとして強制する。オプションを明示的に指定することで、ESLint が常に正しい設定を使うようにしている。 |
| `eslintPluginPrettierRecommended` | Prettier のフォーマットと競合する ESLint ルールを無効にする。必ず最後に追加する。 |

---

## 各ファイルの説明

| ファイル | 説明 |
| --- | --- |
| `src/index.ts` | エントリーポイント。`createServer()` を呼び出し、ポート 3000 でサーバーを起動する。 |
| `src/server.ts` | Express アプリのファクトリ関数。ミドルウェア（morgan・cors・ボディパース）の設定とルートの定義を行い、`app` インスタンスを返す。 |
| `src/utils.ts` | アプリ全体で共有するユーティリティ関数。現在は `add(a, b)` を含む。 |
| `src/tests/add.test.ts` | `utils.ts` の `add()` 関数に対する Jest テスト。 |
| `tsconfig.json` | TypeScript コンパイラの設定。`@tsconfig/node24` を継承し、プロジェクト固有のオプションを追加している。 |
| `jest.config.mjs` | Jest の設定。`ts-jest` プリセットを使って TypeScript のテストを実行する。 |
| `eslint.config.mjs` | ESLint のフラット設定。TypeScript・Jest・Prettier のルールを含む。 |
| `nodemon.json` | Nodemon の設定。`src/` を監視し、ファイルの変更時にサーバーを自動再起動する。 |
| `.gitignore` | Git の管理対象から除外するファイル・フォルダの一覧（node_modules・dist・.env など）。 |
| `package.json` | プロジェクトのメタ情報、スクリプト（`test`・`lint`）、依存パッケージの一覧。 |
