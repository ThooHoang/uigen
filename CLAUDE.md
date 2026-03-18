# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Setup (first time)
npm run setup          # install deps + prisma generate + migrate

# Development
npm run dev            # Next.js with Turbopack on port 3000

# Testing
npx vitest             # run all tests
npx vitest run <path>  # run a single test file
npx vitest --coverage  # run with coverage

# Database
npm run db:reset       # reset SQLite database

# Build
npm run build && npm run start
```

## Environment

Copy `.env.example` to `.env`. `ANTHROPIC_API_KEY` is optional — without it the app uses a `MockLanguageModel` that returns static components. The JWT secret defaults to `"development-secret-key"` if `JWT_SECRET` is not set.

## Architecture

UIGen is an AI-powered React component generator. The user describes a component in chat, Claude responds with tool calls that create/edit files in a VirtualFileSystem, and the result is compiled client-side and rendered in an iframe.

### Request flow

1. User submits a chat message → `ChatContext` calls `useChat` (Vercel AI SDK) → `POST /api/chat`
2. `/api/chat/route.ts` calls `streamText()` with Claude (or mock) and two tools: `str_replace_editor` and `file_manager`
3. Tool call results stream back; `ChatContext.onToolCall` delegates to `FileSystemContext.handleToolCall()` which updates in-memory VirtualFileSystem state
4. On stream completion, the API saves serialized messages + file system to the DB project row
5. `PreviewFrame` detects FS changes, calls `createPreviewHTML()` which Babel-transforms JSX and builds an HTML page with an esm.sh import map, then sets it as the iframe `srcdoc`

### Key modules

| Path | Purpose |
|------|---------|
| `src/lib/file-system.ts` | `VirtualFileSystem` class — in-memory tree, CRUD, serialize/deserialize |
| `src/lib/contexts/file-system-context.tsx` | React context wrapping VFS; `handleToolCall()` applies Claude tool results |
| `src/lib/contexts/chat-context.tsx` | Wraps `useChat`; passes serialized FS to API and routes tool calls |
| `src/lib/provider.ts` | Returns `anthropic("claude-haiku-4-5")` or `MockLanguageModel` |
| `src/lib/tools/str-replace.ts` | Zod-validated `str_replace_editor` tool (view/create/str_replace/insert) |
| `src/lib/tools/file-manager.ts` | `file_manager` tool (rename/delete) |
| `src/lib/transform/jsx-transformer.ts` | Babel standalone transform + esm.sh import map + `createPreviewHTML()` |
| `src/lib/prompts/generation.tsx` | System prompt sent to Claude |
| `src/lib/auth.ts` | JWT session (jose) with httpOnly cookies; `createSession` / `verifySession` |
| `src/actions/` | Server actions: auth (`signUp`, `signIn`, `signOut`) and project CRUD |
| `src/app/api/chat/route.ts` | Streaming AI endpoint; persists project on finish |

### State management

Two React contexts manage all runtime state:

- **FileSystemContext** — owns the `VirtualFileSystem` instance. Components call `createFile`, `updateFile`, etc. The `handleToolCall` method is the only entry point for AI-driven mutations.
- **ChatContext** — owns chat history via `useChat`. Serializes the current FS and sends it as `files` in every API request body so Claude has full context.

### Persistence

Projects are stored in SQLite (Prisma). Each `Project` row stores:
- `messages` — JSON-stringified chat history array
- `data` — JSON-serialized `VirtualFileSystem` (output of `fs.serialize()`)

Anonymous users can generate components without an account; their work is tracked via `anon-work-tracker.ts` and can be saved after sign-up.

### Preview pipeline

`PreviewFrame` → `createPreviewHTML(files)` → Babel transforms each `.jsx/.tsx` file → builds `<script type="importmap">` mapping bare specifiers to `esm.sh` CDN → finds entry point (`App.jsx`, `index.jsx`, etc.) → renders in iframe via `srcdoc`. No server-side bundling.

### UI layout

`main-content.tsx` is the root UI shell:
- Left panel (35%): `ChatInterface`
- Right panel (65%): tabs
  - **Preview** tab: `PreviewFrame`
  - **Code** tab: nested split — `FileTree` (30%) + `CodeEditor` (Monaco, 70%)

### Database

The schema is defined in `prisma/schema.prisma`. Reference it whenever you need to understand the structure of data stored in the database.

### Testing

Tests live in `__tests__/` subdirectories next to source files. The vitest config uses jsdom. Focus areas: `VirtualFileSystem` unit tests, context behavior, JSX transformer, and component tests.
