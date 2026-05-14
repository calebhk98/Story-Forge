# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Story Forge is an AI-driven story generation system. Its central idea: instead of one LLM narrating everything, each named character is an independent agent that only ever sees its own **belief state** — the events it actually perceived. The world state is omniscient ground truth; a separate narrator decides what the reader learns. This separation is structural, not instructional — character agents are never passed information outside their belief state.

The repo is currently **documentation-only** (Phase 0 not yet started). All `src/` paths referenced below describe the planned layout, not existing files.

## Commands

```bash
npm install          # install dependencies (Node 20 LTS required)
cp .env.example .env # then edit .env with DB and LLM credentials

npm run migrate      # run DB migrations (set DB_TYPE and DB URL in .env first)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run format:check # Prettier check (used by CI)
npm test             # all tests
npm run test:unit    # unit tests only (fast, no external deps)
npm run test:integration  # integration tests (needs DB; set DB_TYPE env var)

# Run a single test file
npx vitest run tests/unit/application/GenerateOutline.test.ts

# Run tests related to changed files (what the pre-commit hook does)
npx vitest related <files>

# CLI (once implemented)
npm run cli -- generate-outline "A heist story set in futuristic Tokyo"
npm run cli -- --help
```

Pre-commit hook (husky + lint-staged) auto-runs Prettier, ESLint auto-fix, and `vitest related` on staged files.

## Architecture

Strict hexagonal / ports-and-adapters with three layers:

```
infrastructure  →  implements ports defined in  →  application  →  uses  →  domain
```

**Dependency rule**: `domain` imports nothing outside itself. `application` imports `domain` and defines ports (interfaces). `infrastructure` implements ports and imports `application`. A domain or application file that imports from `infrastructure` is a bug.

`src/composition-root.ts` is the **only** place where concrete adapters are constructed and injected — no DI framework, manual wiring only.

### Layer responsibilities

| Layer          | Location                  | Contains                                                                 |
| -------------- | ------------------------- | ------------------------------------------------------------------------ |
| Domain         | `src/domain/`             | Entities, value objects, pure business logic. Zero deps.                 |
| Application    | `src/application/`        | Use cases, port interfaces (`IXxx`), DTOs, `ApplicationError` subclasses |
| Infrastructure | `src/infrastructure/`     | Adapter implementations, factories, config loading, migrations           |
| Entry points   | `src/main.ts`, `src/api/` | CLI entry and optional HTTP service                                      |

### Key ports (interfaces in `application/ports/`)

- `ILLMProvider` — `complete()` and `completeStructured<T>()`. All LLM calls go through this.
- `IStoryRepository` / `ICharacterRepository` — CRUD scoped by `ownerId`.
- `IEventLog` — append-only world-event log.
- `IPerceptionFilter` — decides what events a character perceived in a scene. Two implementations: `BinaryPerceptionFilter` (visibility tags, deterministic) and `LLMPerceptionFilter`.
- `IJobStore` — persists `GenerationRun` state machine and idempotency cache.
- `ISettingsStore` — DB-backed runtime settings with hot-reload for some keys.
- `IDirector`, `INarrator`, `IClock`, `ILogger`

### Domain concepts

- **World state**: full event history, seen only by director and narrator.
- **Belief state**: per-character filtered view assembled from perceived events + own thoughts/speech/actions + memory summary when context budget is tight.
- **Event visibility**: `public | private | withId(characterId) | withinRange(m) | concealedFrom(ids)` — drives the binary perception filter.
- **Generation run**: persisted state machine (`queued → running → paused → failed → complete`). Every step has a stable id and is idempotent via cache.
- **Model tiers**: `default | critic | character | narrator | perception | summarizer`. Each tier can point to a different provider/model; missing tiers fall back to `default`.

### Scene pipeline (per scene, in order)

1. Director plans canonical events from the outline beat
2. PerceptionFilter builds per-character belief states
3. CharacterAgent LLM calls (only speaking/acting characters in multi-POV)
4. Director resolves outcomes
5. Narrator produces prose
6. Critic reviews (POV violations, continuity, character consistency, outline adherence)
7. Reviser regenerates if critic returns `block` severity (max 3 iterations)
8. Commit scene + events

### Multi-tenancy

Every primary entity and every repository query carries `ownerId: string`. Single-user installs use `"local"`. Never write a query that omits `ownerId` scoping.

## TypeScript rules

- Strict mode: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` — all on.
- Path alias: `@/*` → `src/*` (use for internal imports, not relative `../../../`).
- No `any` (use `unknown` + narrowing), no default exports, no `enum` (use string literal unions or `as const`), no `.then()` chains (use `async/await`).
- Every exported symbol needs a JSDoc comment. Every file needs a `@fileoverview` header.
- File hard limit: 500 lines. Function soft limit: 50 lines. Max nesting depth: 4.
- Interfaces for ports use `I` prefix: `ILLMProvider`, `IStoryRepository`.

## Testing rules

TDD is enforced by convention: write failing tests first, commit with `test:` prefix, then implement with `feat:` / `fix:`. PRs must be all-green; intermediate red commits in branch history are fine.

- Unit tests (`tests/unit/`): mock every port. Use `MockLLMProvider` with scripted returns — never real LLM calls.
- Integration tests (`tests/integration/`): real adapters against real external services, gated behind env flags so CI can skip when credentials are absent. CI runs both SQLite and Postgres in parallel.
- E2E tests (`tests/e2e/`): full pipeline, run on schedule or manually, not every PR.
- Mock classes live in `tests/mocks/`. Test fixtures in `tests/fixtures/` — use builder pattern (`aStory().withCharacters([...]).build()`).
- Do not mock the unit under test. Do not mock domain entities.

### Commit prefixes

`test:` | `feat:` | `fix:` | `refactor:` | `docs:` | `chore:` | `perf:` | `style:`

## Configuration

`.env` seeds the DB settings table on first run; after that the DB table is authoritative. Config is validated with `zod` at startup — a malformed `.env` must fail fast with a clear message.

Key env vars: `DB_TYPE` (`sqlite`|`postgres`), `SQLITE_PATH`, `POSTGRES_URL`, `VECTOR_STORE`, `LLM_DEFAULT_PROVIDER`, `LLM_DEFAULT_MODEL`, per-tier overrides (`LLM_CRITIC_*`, etc.), `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`. See `env.example` for the full list.

## Adding an adapter or use case

**New adapter**: implement the port from `application/ports/`, place it under `infrastructure/adapters/<category>/`, register it in the relevant factory in `infrastructure/factories/`, add a config switch to `Config.ts` and `env.example`.

**New use case**: define DTOs first, identify/add any needed ports, write failing unit tests (`test:` commit), implement (`feat:` commit), wire into composition root, expose via CLI or API if user-facing.

## Error handling

Three error categories with typed codes — never string-match error messages:

- `DomainError` (`domain/errors/`): business-rule violations, no stack traces in logs.
- `ApplicationError` (`application/errors/`): use-case preconditions, logged with context.
- Infrastructure errors: caught at use-case boundaries, wrapped in `ApplicationError`.

## Logging

Use the injected `ILogger` (never `console.log` outside `scripts/`). Log structured fields: `logger.info({ runId, stepId, tier, tokens, latencyMs }, 'step started')`. Never log API keys, prompts with PII, or full LLM responses at `info` level — use `debug`.
