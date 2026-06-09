# Express + TypeScript Project Memo

## What I did on this branch (`04_error_handling`)

This branch introduces a centralized error handling system using a custom error class hierarchy, an error-handling middleware, and a utility function for safely extracting error messages.

### Tasks completed

- [x] Created `src/errors/types.d.ts` — global type definition for error codes
- [x] Created `src/errors/CustomError.ts` — base custom error class extending `Error`
- [x] Created `src/errors/EntityNotFoundError.ts` — specific error class for 404 not found cases
- [x] Created `src/middleware/error-handler.ts` — centralized error-handling middleware
- [x] Created `src/utils/error.utils.ts` — utility function for safely extracting error messages
- [x] Updated `src/routes/v1/tasks/controller.ts` — throws `EntityNotFoundError` in `getTask`
- [x] Updated `src/server.ts` — mounts `errorHandler` middleware at the bottom
- [x] Updated `tsconfig.json` — added `"ts-node": { "files": true }` to load `.d.ts` files at runtime

---

## Directory structure

```
src/
├── errors/
│   ├── types.d.ts          ← global type: ErrorCode
│   ├── CustomError.ts      ← base error class
│   └── EntityNotFoundError.ts ← 404-specific error class
├── middleware/
│   └── error-handler.ts    ← centralized error-handling middleware
└── utils/
    └── error.utils.ts      ← getErrorMessage() utility
```

---

## How errors flow through the app

```
route handler throws EntityNotFoundError
        ↓
Express 5 catches it automatically (because the handler is async)
        ↓
skips all normal middleware
        ↓
error-handler middleware receives it  (err, req, res, next)
        ↓
checks: is it a CustomError?
  → yes: res.status(404).json({ error: { message, code } })
  → no:  res.status(500).json({ error: { message: getErrorMessage(error) } })
```

---

## Configuration details

### 1. `src/errors/types.d.ts`

```ts
type ErrorCode = 'ERR_NOT_FOUND' | 'ERR_VALIDATION_FAILED' | 'ERR_INTERNAL_SERVER_ERROR'
```

A `.d.ts` file is a **global type declaration file**. Types defined here are available throughout the entire project without any `import` statement.

**Q: Why is `"ts-node": { "files": true }` needed in `tsconfig.json`?**

By default, `ts-node` ignores the `include` array in `tsconfig.json` — it only loads files that are explicitly imported. Since `types.d.ts` is never imported anywhere (it's a global declaration), `ts-node` skips it at runtime and `ErrorCode` becomes undefined.

Setting `"files": true` tells `ts-node` to respect `tsconfig.json`'s `include` setting, just like `tsc` does:

```json
"ts-node": {
  "files": true
}
```

| | `tsc` (build) | `ts-node` (default) | `ts-node` (files: true) |
|---|---|---|---|
| Reads `include` | ✅ | ❌ | ✅ |
| Recognizes `types.d.ts` | ✅ | ❌ | ✅ |

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

The base error class. `<C extends string>` is a generic type parameter that constrains `code` to a string type — in practice, `ErrorCode` is passed as `C`.

Extending the built-in `Error` class means `instanceof CustomError` checks work correctly in the error handler.

---

### 3. `src/errors/EntityNotFoundError.ts`

```ts
import CustomError from './CustomError'

class EntityNotFoundError extends CustomError<ErrorCode> {}

export default EntityNotFoundError
```

A concrete error class for "resource not found" cases. It passes `ErrorCode` as the generic type, so `code` must be one of `'ERR_NOT_FOUND' | 'ERR_VALIDATION_FAILED' | 'ERR_INTERNAL_SERVER_ERROR'`.

Usage in a controller:

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

**Q: What cases does `if (res.headersSent || config.debug)` prevent?**

| Condition | Why | Result |
|---|---|---|
| `res.headersSent === true` | Headers already sent — the response can no longer be modified | Calling `res.json()` now would crash with "Cannot set headers after they are sent". Delegating to `next(error)` lets Express close the connection safely. |
| `config.debug === true` | Debug mode — want full stack trace, not a clean JSON response | Forwarding to `next(error)` lets Express's default handler print detailed error output. |

**Q: When `res.headersSent` is true and `next(error)` is called, what happens?**

Express's default error handler receives the error and **closes the TCP connection**. Per the official docs:

> *"If headers have already been sent, the default error handler closes the connection."*

**Q: Why `next(error)` and not `next()`?**

In Express, what you pass to `next()` determines where execution goes:

```
next()        → moves to the next normal middleware
next(error)   → skips all normal middleware, jumps to error-handling middleware (4 args)
```

If `next()` were used instead, Express would treat it as a normal flow — the error object would be lost, and the error-handling middleware `(err, req, res, next)` would never be called.

> Per the official Express docs:
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

In TypeScript, `error` in a `catch` block has type `unknown`. Any value can be thrown:

```ts
throw new Error('failed')   // Error object — has .message
throw 'error string'        // string — no .message
throw 404                   // number — no .message
throw null                  // null
```

The function handles each case safely:

| Case | Check | Returns |
|---|---|---|
| `Error` instance | `instanceof Error` | `error.message` directly |
| Object with `message` key | `typeof === 'object' && 'message' in error` | `String(error.message)` |
| Plain string | `typeof === 'string'` | the string itself |
| Anything else | fallthrough | `'An unknown error occurred.'` |

**Q: Even with `'message' in error`, can `message` be something other than a string?**

Yes. `'message' in error` only checks that the key exists — not the value's type. Any of these pass the check:

```ts
throw { message: 404 }          // number
throw { message: null }         // null
throw { message: undefined }    // undefined
throw { message: { detail: '' } } // object
```

That's why `String(error.message)` is used — it safely converts any type to a string. The one edge case is that an object value returns `'[object Object]'`, which is not meaningful. In practice this is accepted because passing a non-string `message` is an unusual case.

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

**`async` + `throw`** — In Express 5, when an async route handler throws, Express automatically calls `next(error)` for you. No `try/catch` needed.

**`NextFunction`** — The third argument that lets Express forward errors to the next middleware. Required in the function signature even when not called explicitly, because Express 5 needs it to forward the thrown error.

In Express 4, the same code would require manual error forwarding:

```ts
// Express 4 — manual try/catch required
export const getTask = async (req, res, next) => {
  try {
    throw new EntityNotFoundError({ ... })
  } catch (err) {
    next(err)
  }
}
```

---

## File descriptions

| File | Description |
|---|---|
| `src/errors/types.d.ts` | Global type declaration for `ErrorCode`. Available project-wide without imports. |
| `src/errors/CustomError.ts` | Base error class. Extends `Error` with `statusCode` and `code` fields. |
| `src/errors/EntityNotFoundError.ts` | Error class for 404 not found cases. Extends `CustomError<ErrorCode>`. |
| `src/middleware/error-handler.ts` | Centralized error-handling middleware. Mounted last in `server.ts`. |
| `src/utils/error.utils.ts` | `getErrorMessage()` safely extracts a string message from any thrown value. |
| `src/routes/v1/tasks/controller.ts` | `getTask` throws `EntityNotFoundError`. Error is forwarded automatically by Express 5. |
| `src/server.ts` | Mounts `errorHandler` at the bottom, after all routes. |
| `tsconfig.json` | Added `"ts-node": { "files": true }` so `ts-node` loads `types.d.ts` at runtime. |
