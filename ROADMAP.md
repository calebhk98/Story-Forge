# Roadmap

A phased implementation plan. Each phase has a goal, deliverables, and a clear "definition of done" so a contributor knows when to stop and move on.

Phases are sequential. Skipping ahead is allowed in personal exploration but the merge order should respect dependencies.

---

## Phase 0: Project setup

**Goal**: A repository that compiles, lints, tests, and runs an empty `main` without errors.

**Deliverables**:

- `package.json` with TypeScript 5+, Vitest, ESLint, Prettier, Husky, lint-staged
- `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true`
- `.eslintrc.cjs` enforcing the rules in `CODE_STYLE.md` (max-depth 4, max-lines 500, JSDoc requirements)
- `.prettierrc`
- `vitest.config.ts`
- `.husky/pre-commit` running lint + typecheck on staged files
- Empty `src/main.ts` that logs "started" and exits cleanly
- `.github/workflows/ci.yml` running lint, typecheck, and tests on PRs
- README updated with `npm install && npm test` working

**Definition of done**: `npm install && npm run lint && npm run typecheck && npm test && npm start` all succeed on a clean clone.

---

## Phase 1: Domain entities

**Goal**: Plain-object representations of the core story concepts, with no dependencies on infrastructure.

**Deliverables**:

- `domain/entities/`: `Story`, `Character`, `Scene`, `Outline`, `Event`
- `domain/value-objects/`: `POVConfig`, `NarratorVoice`, `PlotMode`, `PerceptionMode`, `Visibility`
- Each entity has a constructor that validates its inputs
- Each value object is immutable
- Unit tests for every validator and any non-trivial method
- JSDoc on every exported type, class, method, and file

**Definition of done**: 100% line coverage on domain layer. No imports from outside `domain/`.

---

## Phase 2: Config and logging

**Goal**: A typed `Config` object and structured logging available throughout the app.

**Deliverables**:

- `infrastructure/config/Config.ts`: zod schema for all settings
- `infrastructure/config/ConfigLoader.ts`: reads `.env`, validates, returns `Config`
- `.env.example` updated to match the schema
- `application/ports/ILogger.ts`
- `infrastructure/adapters/logger/PinoLogger.ts`
- `infrastructure/adapters/clock/SystemClock.ts` and `IClock` port
- Composition root reads config and instantiates logger, passes them as injected dependencies

**Definition of done**: A malformed `.env` causes startup to fail with a clear error message. A correct `.env` produces logs with `runId`, `stepId`, `tier` fields when set.

---

## Phase 3: First LLM adapter

**Goal**: Generate a completion from a real provider.

**Deliverables**:

- `application/ports/ILLMProvider.ts` with `complete` and `completeStructured`
- `domain/value-objects/Prompt.ts`, `Completion.ts`
- `infrastructure/adapters/llm/OpenAICompatibleLLMProvider.ts` (start here, covers the most providers)
- `infrastructure/adapters/llm/MockLLMProvider.ts` for tests
- `infrastructure/factories/LLMProviderFactory.ts` reading config to pick an adapter
- A throwaway script `scripts/smoke-llm.ts` that loads config, gets a provider, and prints a completion
- Unit tests for `MockLLMProvider` and for the factory
- Integration test for `OpenAICompatibleLLMProvider` against a local Ollama or a small hosted model, gated behind an env flag so CI can skip it

**Definition of done**: Smoke script prints a real LLM response when run with valid config.

---

## Phase 4: Storage layer foundation

**Goal**: Repositories for stories and characters, working against both Postgres and SQLite.

**Deliverables**:

- `application/ports/IStoryRepository.ts`, `ICharacterRepository.ts`
- `infrastructure/adapters/db/sqlite/SqliteStoryRepository.ts` and character counterpart
- `infrastructure/adapters/db/postgres/PostgresStoryRepository.ts` and character counterpart
- `infrastructure/adapters/db/memory/InMemoryStoryRepository.ts` (used in unit tests)
- Migrations: `infrastructure/migrations/sqlite/` and `postgres/` with initial schema
- `infrastructure/factories/RepositoryFactory.ts` selecting based on `DB_TYPE`
- A migration runner script
- Integration tests run against both backends in CI (Postgres via service container, SQLite as file)
- Every primary entity table has an `owner_id` column with an index

**Definition of done**: `npm run migrate` creates the schema on both backends. Integration tests pass against both.

---

## Phase 5: First use case (GenerateOutline)

**Goal**: Given a story prompt and configuration, produce an outline.

**Deliverables**:

- `application/use-cases/GenerateOutline.ts`
- Failing tests committed first (red commit): unit tests with mocked LLM, asserting on prompt structure and parsing
- Implementation that passes the tests (green commit)
- The use case is wired in the composition root behind a CLI command: `npm run cli -- generate-outline <prompt>`
- Outline persists to the configured repository

**Definition of done**: CLI command produces a valid outline saved to DB, retrievable on a subsequent run.

---

## Phase 6: Character profiles

**Goal**: Given an outline, generate character cards for every named character.

**Deliverables**:

- `application/use-cases/GenerateCharacterProfile.ts`
- Failing tests then implementation
- CLI command: `generate-profiles <storyId>`

**Definition of done**: Profiles for all characters mentioned in the outline are persisted with proper voice specs.

---

## Phase 7: World state and perception

**Goal**: Event log, world state, and perception filtering.

**Deliverables**:

- `application/ports/IEventLog.ts` with append-only semantics
- DB adapters for the event log (both dialects)
- `application/ports/IPerceptionFilter.ts`
- `infrastructure/adapters/perception/BinaryPerceptionFilter.ts` (visibility-tag based)
- `infrastructure/adapters/perception/LLMPerceptionFilter.ts` (uses ILLMProvider)
- Tests for both: a poisoning scene where Alice does not see the poison should produce an Alice belief state without it
- A CLI test scenario that runs a small pre-scripted scene through both filters and prints what each character knew

**Definition of done**: The poison test passes deterministically for binary mode and reliably for llm-judged mode against a configured provider.

---

## Phase 8: Character agent

**Goal**: A single character LLM call that produces structured output from a belief state.

**Deliverables**:

- `application/use-cases/RunCharacterAgent.ts`
- Strict JSON schema for the output: `{ thoughts, dialogue, actions[] }`
- Robust parsing with `jsonrepair` fallback for providers without structured output
- A `ContextBuilder` helper that assembles the character's prompt within a token budget (profile, memory summary, recent memory, current perception, scene goal)
- Tests verifying:
  - Character agent never receives world-state-only content
  - Output validates against schema
  - When token budget is tight, summarization kicks in

**Definition of done**: Given a fixed character, a fixed perception, and a fixed seed, the agent produces structured output that round-trips through the schema.

---

## Phase 9: Director

**Goal**: Translate outline beats into canonical world events for a scene.

**Deliverables**:

- `application/use-cases/PlanScene.ts` (director functionality)
- `IDirector` port
- A simple LLM-driven director adapter that takes the beat plus prior state and emits an event sequence
- For `strict` plot mode, the director writes directives for character agents
- Tests for each plot mode

**Definition of done**: A scripted beat ("Alice arrives at the manor") produces a sensible event sequence. Strict mode produces directives. Emergent mode allows divergence.

---

## Phase 10: Narrator

**Goal**: Turn structured scene output and events into prose.

**Deliverables**:

- `application/use-cases/GenerateNarration.ts`
- `INarrator` port with one adapter using `ILLMProvider`
- Narrator voice templates for each voice option
- Tests asserting prose stays within belief state for limited modes and may exceed it for omniscient
- Voice spec adherence checked structurally where possible (first-person uses "I", third-person doesn't, etc.)

**Definition of done**: A test scene generates readable prose. The same scene in `third-limited` does not reveal hidden events. The same scene in `third-omniscient` may.

---

## Phase 11: Scene loop (end-to-end without orchestration)

**Goal**: Run a single scene from beat to committed prose with all the pieces wired up.

**Deliverables**:

- `application/use-cases/RunScene.ts` orchestrating: director, perception, character agents, director resolution, narrator
- CLI command: `run-scene <storyId> <beatId>`
- Persists events and prose
- Integration test running a small two-character scene end to end against a real provider

**Definition of done**: One scene from one beat, produced and saved, readable by humans.

---

## Phase 12: Critic and reviser

**Goal**: Detect and fix POV violations, continuity errors, and outline drift.

**Deliverables**:

- `application/use-cases/ReviewScene.ts`
- `application/use-cases/ReviseScene.ts`
- Critic output schema with severity (`block`, `warn`, `note`)
- Iteration cap (default 3) enforced
- Tests: a scene with a deliberate POV violation should be flagged `block` and revised

**Definition of done**: Critic flags an injected violation reliably. Reviser produces a corrected version that the critic accepts.

---

## Phase 13: Job orchestration

**Goal**: Long-running, resumable, budgeted runs.

**Deliverables**:

- `domain/entities/GenerationRun.ts` with state machine
- `application/ports/IJobStore.ts`
- DB adapters for job store (both dialects), including idempotency cache
- `application/use-cases/OrchestrateRun.ts`
- Budget enforcement before every LLM call
- Crash-recovery test: kill the process mid-run, restart, verify resumption from the correct step
- Structured logging integration so a failed run is debuggable from logs

**Definition of done**: Generate a full short story end to end. Kill the process at a random point during generation. Restart. The run completes and the output is coherent with what would have been produced without the crash.

---

## Phase 14: Settings store

**Goal**: DB-backed runtime settings replacing reload-from-env.

**Deliverables**:

- `application/ports/ISettingsStore.ts`
- `infrastructure/adapters/settings/DbSettingsStore.ts`
- Migration adds `settings` table
- Startup: read `.env`, seed settings table if empty, otherwise read from DB
- `rebuildAdapters()` on the composition root for hot-changeable settings
- `restartRequired: true` flag on settings that cannot hot-reload
- Tests for the hierarchy (defaults < env < db < per-run override)

**Definition of done**: Change the LLM provider in the settings table, trigger rebuild, next call uses the new provider. Change the DB type, get a clear "restart required" error.

---

## Phase 15: Character promotion mid-story

**Goal**: Promote a background entity to a named character with backfilled memory.

**Deliverables**:

- `application/use-cases/GenerateCharacterCard.ts` (works on existing story context)
- `application/use-cases/BackfillCharacterMemory.ts`
- CLI command: `promote-character <storyId> <entityDescription>`
- Triggers: user-initiated for now (director-initiated and critic-flagged are stretch goals)

**Definition of done**: Promote "the clerk" mentioned in three prior scenes. The new character has a card consistent with prior mentions and memory entries for those scenes.

---

## Phase 16: API (optional, for service deployments)

**Goal**: HTTP surface for a consumer to build a website on.

**Deliverables**:

- `src/api/server.ts` (Express or Fastify)
- Routes for: create story, list stories, get story, start run, get run status, pause run, resume run, get settings, update settings
- All routes scope by `ownerId` from a header (consumer plugs in auth)
- OpenAPI spec generated or hand-maintained
- Integration tests against the running server

**Definition of done**: A `curl` script can create a story, start a run, poll status, and fetch the finished prose.

---

## What is explicitly out of scope (for now)

- User authentication or session management. Consumers handle this and pass `ownerId` to us.
- A frontend UI. The API is the contract.
- Image generation, audio, or any non-text modality.
- Real-time streaming output. Generation is async by design (runs take minutes to hours).
- Voice cloning or character voice acting.
- Story templates or genre presets (could be added as a thin layer on top later).

## Phase ordering rationale

Phases 0-4 build the skeleton: setup, domain, config, one provider, one storage backend. Without these, nothing runs.

Phases 5-7 establish the simplest end-to-end vertical slice: prompt in, outline out, profiles out, perception works. Confirms the architecture supports the domain.

Phases 8-11 build the scene-generation core: agents, director, narrator, scene loop. This is where the story-gen "magic" lives.

Phases 12-13 add quality and durability: critic loop and resumable orchestration. The system becomes usable for real overnight runs.

Phases 14-16 polish and extend: hot settings, character promotion, API surface.

If a contributor has limited time, complete through Phase 11 produces a usable single-scene generator. Through Phase 13 produces a usable long-form generator.
