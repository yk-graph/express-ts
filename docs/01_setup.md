# Express + TypeScript Project Memo

## What I did on this branch (`setup/initial-config`)

This branch sets up the initial project configuration from scratch, following a YouTube tutorial on building an Express.js + TypeScript application.

### Tasks completed

- [x] Created `.gitignore` (node_modules, dist, .env, logs, editor files)
- [x] Configured `tsconfig.json` with `@tsconfig/node24` as base
- [x] Set up `jest.config.mjs` for testing with `ts-jest`
- [x] Set up `eslint.config.mjs` with TypeScript, Jest, and Prettier support
- [x] Created `src/server.ts` — Express app factory
- [x] Created `src/index.ts` — entry point that starts the server
- [x] Created `src/utils.ts` — utility functions (e.g. `add`)
- [x] Created `src/tests/add.test.ts` — first test for `add()`
- [x] Configured `nodemon.json` for hot-reloading during development

---

## Configuration details

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

| Setting | What it means |
| --- | --- |
| `extends` | Inherits all recommended settings for Node.js 24 from the community-maintained `@tsconfig/node24` package. Avoids writing every option manually. |
| `rootDir` | Tells TypeScript that all source files live in `./src`. |
| `outDir` | Compiled JavaScript files are output to `./dist`. |
| `forceConsistentCasingInFileNames` | Errors if an import path's casing doesn't match the actual filename. Prevents bugs on case-sensitive Linux servers even when developing on macOS. |
| `types` | Explicitly loads type definitions for `node` (`@types/node`) and `jest` (`@types/jest`). Without this, `it()`, `expect()`, etc. are not recognized by TypeScript. |
| `include` | Tells TypeScript which files to check. `src/**/*` covers all source files; `*.mjs` and `*.ts` cover root-level config files like `jest.config.mjs`. |
| `exclude` | Tells TypeScript to ignore `node_modules` and the compiled `dist` output. |

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

| Setting | What it means |
| --- | --- |
| `preset: 'ts-jest'` | Uses `ts-jest` to transform `.ts` files before Jest runs them. Without this, Jest cannot understand TypeScript. |
| `testEnvironment: 'node'` | Runs tests in a Node.js environment (not a browser). Required for Express/backend projects. |
| `roots` | Tells Jest to only look for tests inside `./src/tests`. |
| `testRegex` | A regex pattern that matches test files ending in `.test.ts` or `.spec.ts`. |
| `moduleFileExtensions` | The file extensions Jest will resolve. `ts` is listed first so TypeScript files take priority over JavaScript. |

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

| Setting | What it means |
| --- | --- |
| `ignores: ['dist/']` | Skips linting the compiled output folder. |
| `files: ['src/**/*.{js,ts}']` | Applies rules only to `.js` and `.ts` files inside `src/`. |
| `globals: globals.node` | Tells ESLint that Node.js globals (e.g. `process`, `__dirname`) are valid. |
| `pluginJs.configs.recommended` | Enables the standard recommended JavaScript rules. |
| `tseslint.configs.recommended` | Enables the recommended TypeScript-specific rules (e.g. no `any`, no unused variables). |
| `jest.configs['flat/recommended']` | Enables Jest-specific linting rules for test files (e.g. no disabled tests, no focused tests). |
| `jest/prefer-expect-assertions: 'off'` | Disables the rule that forces every test to call `expect.assertions()`. Too strict for beginners. |
| `@typescript-eslint/no-unused-vars: 'off'` | Disables the unused variable warning from TypeScript ESLint (TypeScript itself already catches this). |
| `prettier/prettier` | Enforces Prettier formatting as an ESLint error. Options match `.prettierrc`: single quotes, no semicolons, 200-char line width, etc. Inline options are used to ensure ESLint always applies the correct settings. |
| `eslintPluginPrettierRecommended` | Disables ESLint rules that conflict with Prettier formatting. Always added last. |

---

## File descriptions

| File | Description |
| --- | --- |
| `src/index.ts` | Entry point. Calls `createServer()` and starts listening on port 3000. |
| `src/server.ts` | Express app factory. Sets up middleware (morgan, cors, body parsing) and defines routes. Returns the `app` instance. |
| `src/utils.ts` | Utility functions shared across the app. Currently contains `add(a, b)`. |
| `src/tests/add.test.ts` | Jest test for the `add()` function in `utils.ts`. |
| `tsconfig.json` | TypeScript compiler config. Extends `@tsconfig/node24` and adds project-specific options. |
| `jest.config.mjs` | Jest configuration. Uses `ts-jest` preset to run TypeScript tests. |
| `eslint.config.mjs` | ESLint flat config. Includes TypeScript, Jest, and Prettier rules. |
| `nodemon.json` | Nodemon config for hot-reloading. Watches `src/` and restarts on file changes. |
| `.gitignore` | Lists files/folders to exclude from Git (node_modules, dist, .env, etc.). |
| `package.json` | Project metadata, scripts (`test`, `lint`), and dependencies. |
