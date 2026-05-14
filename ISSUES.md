# Issues

A pre-populated set of issues sized to one pull request each. Use this document to seed GitHub issues at the start of the project. Once issues exist in GitHub, they become the source of truth and this document is for reference only.

## How to use this document

Copy each issue's title and body into a new GitHub issue. Apply the suggested labels. Set the milestone to the corresponding phase. Reference predecessors by the GitHub issue number they get assigned (not the `#NNN` reference used here, which is an internal numbering for this doc).

Each issue is sized so a contributor can complete it in one focused work session to a few days, producing one pull request. If an issue's scope grows during work, split it before opening the PR.

## TDD reminder

Every implementation issue requires the red-then-green commit pattern from `TESTING.md`. The PR description must reference at least one `test:` commit and one `feat:` (or equivalent) commit. CI on the PR head must be green at merge.

## Label scheme

Suggested labels to create in GitHub before opening these issues.

| Group    | Labels                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type     | `type:feature`, `type:refactor`, `type:bug`, `type:test`, `type:docs`, `type:chore`                                                                                         |
| Area     | `area:domain`, `area:application`, `area:infrastructure`, `area:db`, `area:llm`, `area:perception`, `area:critic`, `area:orchestration`, `area:api`, `area:ci`, `area:docs` |
| Phase    | `phase-0` through `phase-16`                                                                                                                                                |
| Size     | `size:xs` (under 2h), `size:s` (2-8h), `size:m` (1-3d), `size:l` (3-7d), `size:xl` (over a week, should be split)                                                           |
| Priority | `priority:critical`, `priority:high`, `priority:medium`, `priority:low`                                                                                                     |
| Status   | `blocked`, `needs-design`, `good-first-issue`, `help-wanted`                                                                                                                |

---

# Phase 0: Project setup

## #001 - Initialize TypeScript project

**Labels**: `phase-0`, `type:chore`, `area:ci`, `size:s`
**Depends on**: nothing

Deliverable:

- `package.json` with TypeScript 5+, basic dev dependencies
- `tsconfig.json` with all strict settings from `CODE_STYLE.md`
- `tsconfig.build.json` extending base for production builds
- npm scripts: `build`, `typecheck`, `start`
- `src/main.ts` that logs "started" and exits cleanly
- Path alias `@/*` -> `src/*` configured in `tsconfig.json` and resolvable at runtime

Acceptance:

- [ ] `npm install` succeeds on a clean clone
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm start` prints "started" and exits 0
- [ ] `import { Foo } from '@/domain/Foo'` resolves correctly when added

## #002 - Set up ESLint and Prettier

**Labels**: `phase-0`, `type:chore`, `area:ci`, `size:s`
**Depends on**: #001

Deliverable:

- `.eslintrc.cjs` enforcing rules from `CODE_STYLE.md`: `max-depth: 4`, `max-lines: 500`, `max-lines-per-function: 50` (warn), `complexity: 10` (warn), `eslint-plugin-jsdoc` requiring docs on exports, no-default-export, no-`any`, etc.
- `.prettierrc` with formatting choices
- `.editorconfig` for editor consistency
- npm scripts: `lint`, `lint:fix`, `format`, `format:check`

Acceptance:

- [ ] `npm run lint` passes on the empty project
- [ ] `npm run format:check` passes
- [ ] Intentionally adding a 5-level-deep function fails lint
- [ ] Intentionally adding an exported function without a JSDoc comment fails lint

## #003 - Set up Vitest with coverage

**Labels**: `phase-0`, `type:chore`, `area:ci`, `size:s`
**Depends on**: #001

Deliverable:

- `vitest.config.ts` with coverage enabled (v8 provider)
- npm scripts: `test`, `test:unit`, `test:integration`, `test:e2e`, `test:watch`, `test:coverage`
- Directory layout: `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/fixtures/`, `tests/mocks/`
- One trivial passing test to verify the setup

Acceptance:

- [ ] `npm test` runs the trivial test and passes
- [ ] `npm run test:coverage` produces a coverage report
- [ ] Coverage thresholds configured but not enforced yet (warn only)

## #004 - Set up Husky pre-commit hooks

**Labels**: `phase-0`, `type:chore`, `area:ci`, `size:xs`
**Depends on**: #002, #003

Deliverable:

- Husky installed with `prepare` script
- `.husky/pre-commit` running `lint-staged`
- `lint-staged` config: format with prettier, lint with eslint --fix, run related tests on staged test files

Acceptance:

- [ ] Committing an unformatted file auto-formats it
- [ ] Committing code that fails lint blocks the commit
- [ ] `git commit --no-verify` still works for emergencies

---

# Phase 1: Domain entities

## #005 - Value object: Visibility

**Labels**: `phase-1`, `type:feature`, `area:domain`, `size:s`
**Depends on**: #004

Deliverable:

- `src/domain/value-objects/Visibility.ts` modeling who can perceive an event
- Variants: `public`, `private`, `withCharacter(id)`, `withinRange(meters)`, `concealedFrom(ids)`
- Method `isVisibleTo(characterId, sceneState): boolean`
- Immutable, validated construction
- Unit tests covering each variant

Acceptance:

- [ ] All variants have unit tests
- [ ] Type can be discriminated cleanly (exhaustive switch with no `default`)
- [ ] No infrastructure imports in the file

## #006 - Value objects: configuration enums

**Labels**: `phase-1`, `type:feature`, `area:domain`, `size:s`
**Depends on**: #004

Deliverable:

- `src/domain/value-objects/POVConfig.ts` (`single` | `multi`)
- `src/domain/value-objects/NarratorVoice.ts` (`first`, `second`, `third-limited`, `third-omniscient`)
- `src/domain/value-objects/PlotMode.ts` (`strict`, `guided`, `emergent`)
- `src/domain/value-objects/PerceptionMode.ts` (`binary`, `llm-judged`)
- String literal unions backed by `as const` arrays, with parse/validate functions
- Unit tests for parsing valid and invalid strings

Acceptance:

- [ ] Invalid strings throw a typed `DomainError`
- [ ] Parsed values are exhaustively type-checked

## #007 - Value objects: Prompt and Completion

**Labels**: `phase-1`, `type:feature`, `area:domain`, `size:s`
**Depends on**: #004

Deliverable:

- `src/domain/value-objects/Prompt.ts` with system, user, optional prior assistant turns
- `src/domain/value-objects/Completion.ts` with text, finish reason, token usage, latency
- `src/domain/value-objects/GenerationOptions.ts` with temperature, maxTokens, stop sequences, seed
- Unit tests verifying construction and validation

Acceptance:

- [ ] Prompts are immutable
- [ ] Token counts are non-negative integers
- [ ] Tests cover edge cases (empty user, no system, etc.)

## #008 - Entity: Event

**Labels**: `phase-1`, `type:feature`, `area:domain`, `size:m`
**Depends on**: #005

Deliverable:

- `src/domain/entities/Event.ts` with id, sceneId, time (ordinal), actor, action (typed union: Move, Speak, PerformAction, EnvironmentalChange), targets, visibility, payload
- Factory functions for each action variant
- Unit tests for construction and validation of each variant

Acceptance:

- [ ] Each action variant has a dedicated factory
- [ ] Events are immutable
- [ ] Tests cover all action variants

## #009 - Entity: Character

**Labels**: `phase-1`, `type:feature`, `area:domain`, `size:m`
**Depends on**: #006

Deliverable:

- `src/domain/entities/Character.ts` with id, name, profile (background, personality, traits, goals, starting knowledge), voiceSpec (style notes, vocabulary, sample lines), ownerId
- Profile and voiceSpec as nested types
- Validation of required fields
- Unit tests

Acceptance:

- [ ] Constructing without required fields throws `DomainError`
- [ ] Voice samples are validated as non-empty strings if provided

## #010 - Entity: Scene

**Labels**: `phase-1`, `type:feature`, `area:domain`, `size:m`
**Depends on**: #006, #008, #009

Deliverable:

- `src/domain/entities/Scene.ts` with id, storyId, setting, presentCharacters (ids), povConfig, narratorVoice, plotMode, beatId, events, prose, status (`planned`, `drafted`, `reviewed`, `revised`, `final`)
- Methods to append events, attach prose, transition status
- Status transitions validated (can't go backwards inappropriately)
- Unit tests

Acceptance:

- [ ] Invalid status transitions throw
- [ ] Events are appended in order
- [ ] Tests cover all status transitions

## #011 - Entity: Outline

**Labels**: `phase-1`, `type:feature`, `area:domain`, `size:s`
**Depends on**: #004

Deliverable:

- `src/domain/entities/Outline.ts` with id, storyId, beats (ordered list of `Beat`)
- `Beat` with id, summary, goals, fulfillingSceneId (nullable), status
- Methods to mark a beat fulfilled
- Unit tests

Acceptance:

- [ ] Beats maintain order
- [ ] Marking fulfillment requires a scene id
- [ ] Tests cover fulfillment flow

## #012 - Entity: Story

**Labels**: `phase-1`, `type:feature`, `area:domain`, `size:m`
**Depends on**: #009, #010, #011

Deliverable:

- `src/domain/entities/Story.ts` with id, ownerId, title, prompt, outline reference, character ids, scene ids (ordered), config (defaults for POV, voice, plot mode, perception), status, createdAt, updatedAt
- Methods to add characters, add scenes, update config
- Unit tests

Acceptance:

- [ ] OwnerId is required and validated
- [ ] Config defaults are applied if not provided
- [ ] Tests cover all mutation methods

---

# Phase 2: Config and logging

## #013 - Config schema and loader

**Labels**: `phase-2`, `type:feature`, `area:infrastructure`, `size:m`
**Depends on**: #012

Deliverable:

- `src/infrastructure/config/Config.ts` defining a zod schema for every setting in `.env.example`
- `src/infrastructure/config/ConfigLoader.ts` that reads `.env`, validates with zod, and returns a typed `Config`
- Clear error messages for missing or malformed values
- Unit tests with valid, partial, and invalid env inputs

Acceptance:

- [ ] Missing required env vars produce a readable error pointing at the field
- [ ] Type-safe access throughout the codebase
- [ ] Defaults match `.env.example` comments

## #014 - Port and adapter: ILogger

**Labels**: `phase-2`, `type:feature`, `area:infrastructure`, `size:s`
**Depends on**: #013

Deliverable:

- `src/application/ports/ILogger.ts` with `trace`, `debug`, `info`, `warn`, `error`, `fatal` methods accepting structured fields plus message
- `src/infrastructure/adapters/logger/PinoLogger.ts`
- `child(fields)` method on the logger interface for context inheritance
- Unit tests using a mock logger

Acceptance:

- [ ] Logs include structured fields, not formatted strings
- [ ] `child` returns a new logger with combined fields
- [ ] Log level is configurable from `Config`

## #015 - Port and adapter: IClock

**Labels**: `phase-2`, `type:feature`, `area:infrastructure`, `size:xs`
**Depends on**: #013

Deliverable:

- `src/application/ports/IClock.ts` with `now(): Date` and `monotonicMs(): number`
- `src/infrastructure/adapters/clock/SystemClock.ts`
- `tests/mocks/MockClock.ts` allowing tests to set time deterministically

Acceptance:

- [ ] All time-dependent code uses `IClock`, never `new Date()` directly
- [ ] MockClock enables deterministic time-travel in tests

---

# Phase 3: First LLM adapter

## #016 - Port: ILLMProvider

**Labels**: `phase-3`, `type:feature`, `area:llm`, `size:s`
**Depends on**: #007

Deliverable:

- `src/application/ports/ILLMProvider.ts` with `complete`, `completeStructured`, and `id`
- DTOs for structured completion response
- Error types: `LLMRateLimitError`, `LLMTimeoutError`, `LLMInvalidResponseError`
- No implementation yet, just the interface and types

Acceptance:

- [ ] Interface compiles
- [ ] Error hierarchy documented

## #017 - Adapter: MockLLMProvider

**Labels**: `phase-3`, `type:feature`, `area:llm`, `size:s`
**Depends on**: #016

Deliverable:

- `tests/mocks/MockLLMProvider.ts` with scripted responses
- Methods to queue completions, record calls, assert on prompts
- Used in unit tests throughout the project

Acceptance:

- [ ] Queueing N responses returns them in order
- [ ] Records every call with the prompt for assertions
- [ ] Throws if a call is made with no queued response (test misconfiguration)

## #018 - Adapter: OpenAICompatibleLLMProvider

**Labels**: `phase-3`, `type:feature`, `area:llm`, `size:l`
**Depends on**: #017

Deliverable:

- `src/infrastructure/adapters/llm/OpenAICompatibleLLMProvider.ts` implementing `ILLMProvider`
- Uses `fetch` or `openai` SDK pointing at configurable `baseURL`
- Retry with exponential backoff (per `Config`)
- Timeout enforcement
- `completeStructured` with JSON-mode where supported, parse-and-repair fallback using `jsonrepair`
- Integration test gated behind `OLLAMA_URL` env flag

Acceptance:

- [ ] Smoke test against local Ollama returns a real completion
- [ ] Timeout produces `LLMTimeoutError`
- [ ] Rate-limit responses retry with backoff
- [ ] Malformed JSON falls back to repair before throwing

## #019 - Factory: LLMProviderFactory

**Labels**: `phase-3`, `type:feature`, `area:llm`, `size:s`
**Depends on**: #018

Deliverable:

- `src/infrastructure/factories/LLMProviderFactory.ts` reading `Config` and returning the right adapter per tier
- Tier resolution: default + per-task overrides (critic, character, narrator, perception, summarizer)
- Returns a `Map<Tier, ILLMProvider>` or accessor
- Unit tests with mock configs

Acceptance:

- [ ] Default-only config produces one provider used everywhere
- [ ] Per-tier overrides produce different providers
- [ ] Missing tier inherits from default

---

# Phase 4: Storage layer foundation

## #020 - Port: IStoryRepository and ICharacterRepository

**Labels**: `phase-4`, `type:feature`, `area:db`, `size:s`
**Depends on**: #012

Deliverable:

- `src/application/ports/IStoryRepository.ts` with `save`, `findById`, `findByOwner`, `delete` methods
- `src/application/ports/ICharacterRepository.ts` with equivalent surface
- Every method takes `ownerId` and uses it in queries
- Returns DTOs, not entity instances directly (separation of persistence model from domain)

Acceptance:

- [ ] Cross-tenant access is impossible by interface design (ownerId is always required)
- [ ] Interfaces are minimal (no methods we don't yet need)

## #021 - Adapter: InMemoryStoryRepository

**Labels**: `phase-4`, `type:feature`, `area:db`, `size:s`
**Depends on**: #020

Deliverable:

- `tests/mocks/InMemoryStoryRepository.ts` and equivalent for characters
- Used in unit tests as the default for application-layer tests
- Tenant-aware (multiple owners are isolated)

Acceptance:

- [ ] Two owners writing different stories with the same id do not collide
- [ ] All interface methods implemented

## #022 - Migration runner

**Labels**: `phase-4`, `type:chore`, `area:db`, `size:m`
**Depends on**: #020

Deliverable:

- Migration tooling (recommend `node-pg-migrate` for Postgres, similar for SQLite, or use `knex` for both with dialect-aware files)
- npm script: `migrate`, `migrate:rollback`, `migrate:status`
- Initial empty migration to verify the tooling works
- CI sets up both databases and runs migrations as a check

Acceptance:

- [ ] `npm run migrate` succeeds against both SQLite and Postgres
- [ ] Rollback works
- [ ] CI runs migrations as part of integration tests

## #023 - Adapter: SqliteStoryRepository and SqliteCharacterRepository

**Labels**: `phase-4`, `type:feature`, `area:db`, `size:l`
**Depends on**: #021, #022

Deliverable:

- `src/infrastructure/adapters/db/sqlite/` with both repositories
- Initial migration creating `stories`, `characters` tables with `owner_id` indexed
- Integration tests covering CRUD and tenant isolation

Acceptance:

- [ ] All `IStoryRepository` and `ICharacterRepository` methods pass against SQLite
- [ ] Tenant isolation verified by integration test

## #024 - Adapter: PostgresStoryRepository and PostgresCharacterRepository

**Labels**: `phase-4`, `type:feature`, `area:db`, `size:l`
**Depends on**: #023

Deliverable:

- `src/infrastructure/adapters/db/postgres/` with both repositories
- Postgres-specific migration mirroring SQLite schema
- Integration tests reused from #023, run against Postgres in CI service container

Acceptance:

- [ ] Same integration tests pass against Postgres
- [ ] CI matrix runs both backends

## #025 - Factory: RepositoryFactory

**Labels**: `phase-4`, `type:feature`, `area:db`, `size:s`
**Depends on**: #023, #024

Deliverable:

- `src/infrastructure/factories/RepositoryFactory.ts` selecting SQLite or Postgres based on `DB_TYPE`
- Composition root uses it to build a single set of repositories at startup
- Unit tests for the factory selection logic

Acceptance:

- [ ] Switching `DB_TYPE` switches all repositories together
- [ ] Invalid `DB_TYPE` produces a startup error

---

# Phase 5: GenerateOutline

## #026 - Use case: GenerateOutline

**Labels**: `phase-5`, `type:feature`, `area:application`, `size:l`
**Depends on**: #019, #025

Deliverable:

- `src/application/use-cases/GenerateOutline.ts` taking a story prompt and config, producing an `Outline`
- Uses `ILLMProvider` (default tier) and `IStoryRepository`
- Failing tests committed first (red commit): mock LLM returns scripted outline, assert on prompt structure and parsing
- Implementation passes the tests (green commit)

Acceptance:

- [ ] Unit tests pass with MockLLMProvider
- [ ] Outline persists to the repository on success
- [ ] Malformed LLM response throws `ApplicationError` with code `INVALID_OUTLINE`

## #027 - CLI: generate-outline command

**Labels**: `phase-5`, `type:feature`, `area:application`, `size:s`
**Depends on**: #026

Deliverable:

- CLI entry point in `src/main.ts` with command parsing (recommend `commander` or `yargs`)
- `generate-outline <prompt>` command wires up composition root and runs the use case
- Outline is saved and the id printed to stdout
- Integration test running the CLI end-to-end against a real LLM

Acceptance:

- [ ] `npm run cli -- generate-outline "a heist story"` produces a saved outline
- [ ] CLI exits 0 on success, non-zero with error message on failure

---

# Phase 6: GenerateCharacterProfile

## #028 - Use case: GenerateCharacterProfile

**Labels**: `phase-6`, `type:feature`, `area:application`, `size:l`
**Depends on**: #026

Deliverable:

- `src/application/use-cases/GenerateCharacterProfile.ts` taking an outline and producing character profiles for every named character
- Uses `ILLMProvider` and `ICharacterRepository`
- Generates voice spec, profile, starting knowledge
- Failing tests then implementation

Acceptance:

- [ ] All named characters in the outline have profiles after running
- [ ] Profiles validate as non-empty
- [ ] Tests cover edge case: outline with zero named characters

## #029 - CLI: generate-profiles command

**Labels**: `phase-6`, `type:feature`, `area:application`, `size:xs`
**Depends on**: #028

Deliverable:

- `generate-profiles <storyId>` CLI command
- Persists profiles, prints character ids

Acceptance:

- [ ] CLI command works against a story produced by #027

---

# Phase 7: World state and perception

## #030 - Port and adapter: IEventLog

**Labels**: `phase-7`, `type:feature`, `area:db`, `size:m`
**Depends on**: #025

Deliverable:

- `src/application/ports/IEventLog.ts` with append-only semantics: `append(event)`, `findByScene(sceneId)`, `findByStory(storyId)`
- SQLite and Postgres adapters
- Migration for `events` table with `owner_id`, `story_id`, `scene_id`, `time` indexed
- Integration tests for both backends

Acceptance:

- [ ] Appending is atomic
- [ ] Events are returned in time order
- [ ] No update or delete operations exposed

## #031 - Port: IPerceptionFilter

**Labels**: `phase-7`, `type:feature`, `area:perception`, `size:s`
**Depends on**: #008

Deliverable:

- `src/application/ports/IPerceptionFilter.ts` with `filter(characterId, scene, events): Promise<PerceivedEvent[]>`
- DTO `PerceivedEvent` with the original event plus perception metadata (clarity, inference)

Acceptance:

- [ ] Interface compiles
- [ ] DTO is immutable

## #032 - Adapter: BinaryPerceptionFilter

**Labels**: `phase-7`, `type:feature`, `area:perception`, `size:m`
**Depends on**: #031

Deliverable:

- `src/infrastructure/adapters/perception/BinaryPerceptionFilter.ts` using `Visibility` tags from events
- Pure function, no LLM calls, deterministic
- Test scenario: poison drink scene where Alice does not see the poison should produce an Alice perception list without it

Acceptance:

- [ ] Poison test passes deterministically
- [ ] All Visibility variants are handled
- [ ] No I/O

## #033 - Adapter: LLMPerceptionFilter

**Labels**: `phase-7`, `type:feature`, `area:perception`, `size:l`
**Depends on**: #031, #018

Deliverable:

- `src/infrastructure/adapters/perception/LLMPerceptionFilter.ts` calling `ILLMProvider` (perception tier)
- Per-scene per-character call returning a structured list of perceived events with optional inference notes
- Configurable subtle-clue inclusion
- Tests with mock LLM verify call shape and output parsing

Acceptance:

- [ ] LLM is called once per character per scene
- [ ] Output is parsed and validated
- [ ] Falls back gracefully if LLM returns malformed output

---

# Phase 8: Character agent

## #034 - Helper: ContextBuilder

**Labels**: `phase-8`, `type:feature`, `area:application`, `size:l`
**Depends on**: #033

Deliverable:

- `src/application/services/ContextBuilder.ts` assembling a character's prompt within a token budget
- Inputs: character profile, voice spec, memory log, current perception, scene goal, narrator directive (if `strict` mode)
- Outputs: a `Prompt` plus a token estimate
- Memory summarization triggered when raw log exceeds budget threshold
- Unit tests for each assembly stage

Acceptance:

- [ ] Within budget, full memory is included
- [ ] Over budget, summarization kicks in
- [ ] Profile and current perception are always included
- [ ] Token estimate is reasonably accurate

## #035 - Memory store

**Labels**: `phase-8`, `type:feature`, `area:db`, `size:l`
**Depends on**: #030

Deliverable:

- `src/application/ports/ICharacterMemory.ts` with `append`, `findByCharacter`, `summarize`
- SQLite and Postgres adapters
- Migration for `character_memory` table
- Integration tests

Acceptance:

- [ ] Memory is append-only
- [ ] Retrieval supports time-range queries
- [ ] Tenant-isolated

## #036 - Use case: RunCharacterAgent

**Labels**: `phase-8`, `type:feature`, `area:application`, `size:l`
**Depends on**: #034, #035

Deliverable:

- `src/application/use-cases/RunCharacterAgent.ts` producing `{ thoughts, dialogue, actions[] }` for a character in a scene
- Strict JSON schema with `jsonrepair` fallback
- Uses `ILLMProvider` (character tier)
- Persists thoughts to character memory
- Failing tests verify: character never receives world-state-only content, output validates, summarization happens under budget

Acceptance:

- [ ] Round-trips through JSON schema cleanly
- [ ] World-state info is never in the assembled prompt (test asserts on prompt content)
- [ ] Token-budget-tight scenarios trigger summarization

---

# Phase 9: Director

## #037 - Port and use case: IDirector and PlanScene

**Labels**: `phase-9`, `type:feature`, `area:application`, `size:l`
**Depends on**: #036

Deliverable:

- `src/application/ports/IDirector.ts`
- `src/infrastructure/adapters/director/LLMDirector.ts` translating an outline beat into a sequence of canonical events
- For `strict` plot mode, generates per-character directives
- `src/application/use-cases/PlanScene.ts` orchestrates director + persistence

Acceptance:

- [ ] A scripted beat ("Alice arrives at the manor") produces a coherent event sequence
- [ ] Strict mode produces directives, guided mode produces motivations only

## #038 - Plot mode handling

**Labels**: `phase-9`, `type:feature`, `area:application`, `size:m`
**Depends on**: #037

Deliverable:

- Plot-mode-specific logic in `PlanScene` or `LLMDirector`
- `emergent` mode: outline is suggestion, divergence allowed, downstream replanning hook
- `guided` mode: motivations crafted, no directive
- `strict` mode: directive injected into character prompts
- Tests for each mode

Acceptance:

- [ ] Tests verify each mode produces different output for the same beat
- [ ] Mode is configurable per scene, overriding story default

---

# Phase 10: Narrator

## #039 - Port: INarrator and templates

**Labels**: `phase-10`, `type:feature`, `area:application`, `size:m`
**Depends on**: #036

Deliverable:

- `src/application/ports/INarrator.ts`
- Voice-specific prompt templates for `first`, `second`, `third-limited`, `third-omniscient`
- Template selection based on scene config

Acceptance:

- [ ] Each voice template produces structurally distinct output (first uses "I", third doesn't)

## #040 - Adapter and use case: LLMNarrator and GenerateNarration

**Labels**: `phase-10`, `type:feature`, `area:application`, `size:l`
**Depends on**: #039

Deliverable:

- `src/infrastructure/adapters/narrator/LLMNarrator.ts` calling `ILLMProvider` (narrator tier)
- `src/application/use-cases/GenerateNarration.ts` taking scene + structured character outputs + events, returning prose
- For limited modes, narrator receives only POV character's belief state
- For omniscient mode, narrator receives full world state
- Tests assert prose stays within belief state for limited modes

Acceptance:

- [ ] `third-limited` test scene does not reveal hidden events
- [ ] `third-omniscient` test scene may reveal them
- [ ] Prose passes basic structural checks (non-empty, paragraph breaks)

---

# Phase 11: Scene loop

## #041 - Use case: RunScene

**Labels**: `phase-11`, `type:feature`, `area:application`, `size:l`
**Depends on**: #032, #033, #036, #037, #040

Deliverable:

- `src/application/use-cases/RunScene.ts` orchestrating: director → perception filter (per character) → character agents (active speakers) → director outcome resolution → narrator
- Persists events as they happen, commits prose at end
- Speaking-actor-only optimization: silent observers do not get agent calls
- Integration test with a real provider running a small two-character scene

Acceptance:

- [ ] One scene from one beat produces saved events and readable prose
- [ ] Silent characters in multi-POV mode do not trigger agent calls
- [ ] All persistence is consistent at scene-commit time

## #042 - CLI: run-scene command

**Labels**: `phase-11`, `type:feature`, `area:application`, `size:s`
**Depends on**: #041

Deliverable:

- `run-scene <storyId> <beatId>` CLI command

Acceptance:

- [ ] CLI produces a generated scene end to end against configured providers

---

# Phase 12: Critic and reviser

## #043 - Use case: ReviewScene

**Labels**: `phase-12`, `type:feature`, `area:critic`, `size:l`
**Depends on**: #041

Deliverable:

- `src/application/use-cases/ReviewScene.ts` checking: POV violations, continuity, character consistency, outline adherence, information leakage
- Output schema: `Critique[]` with severity (`block`, `warn`, `note`)
- Uses `ILLMProvider` (critic tier)
- Test: a scene with a deliberate POV violation should be flagged `block`

Acceptance:

- [ ] Injected violation reliably flagged
- [ ] Severity correctly distinguishes blocking from informational
- [ ] No false positives on a clean test scene (best-effort, with retries)

## #044 - Use case: ReviseScene

**Labels**: `phase-12`, `type:feature`, `area:critic`, `size:m`
**Depends on**: #043

Deliverable:

- `src/application/use-cases/ReviseScene.ts` regenerating flagged content given critiques
- Iteration cap configurable (default 3)
- Only `block` critiques trigger revision
- Returns revised scene; updates persisted

Acceptance:

- [ ] Reviser produces a corrected version that subsequent review passes
- [ ] Iteration cap prevents runaway

## #045 - Critic loop integration

**Labels**: `phase-12`, `type:feature`, `area:critic`, `size:m`
**Depends on**: #044

Deliverable:

- Wire critic + reviser into `RunScene` so scenes are auto-reviewed and revised before final commit
- Configurable per-story (skip critic, critic-only, critic-and-revise)

Acceptance:

- [ ] End-to-end scene generation now includes review/revision
- [ ] Configuration knob respected

---

# Phase 13: Job orchestration

## #046 - Entity: GenerationRun

**Labels**: `phase-13`, `type:feature`, `area:domain`, `size:m`
**Depends on**: #012

Deliverable:

- `src/domain/entities/GenerationRun.ts` with state machine: `queued`, `running`, `paused`, `failed`, `complete`
- Methods for valid transitions only; invalid transitions throw
- Carries `ownerId`, `storyId`, budgets, current step, error info if failed
- Unit tests covering every transition

Acceptance:

- [ ] All transitions tested
- [ ] Invalid transitions produce `DomainError`

## #047 - Port and adapter: IJobStore

**Labels**: `phase-13`, `type:feature`, `area:db`, `size:l`
**Depends on**: #046, #025

Deliverable:

- `src/application/ports/IJobStore.ts` with run persistence, step output cache (idempotency), and dead-letter queue
- SQLite and Postgres adapters
- Migrations for `generation_runs`, `step_outputs`, `dead_letters` tables
- Integration tests

Acceptance:

- [ ] Step output cache hits return identical output
- [ ] Dead-letter entries are queryable
- [ ] Both backends pass the same test suite

## #048 - Use case: OrchestrateRun

**Labels**: `phase-13`, `type:feature`, `area:orchestration`, `size:xl`
**Depends on**: #045, #047

Deliverable:

- `src/application/use-cases/OrchestrateRun.ts` driving a run from start to finish: outline → profiles → scene loop → final polish
- Per-step idempotency: re-running a step returns cached output
- `regenerateStep(stepId)` action invalidates cache and reruns
- Step ids stable across restarts (`run:abc.scene:7.draft`)
- Resume logic on startup: find latest unfinished step, continue

Acceptance:

- [ ] Mid-run process kill followed by restart resumes correctly
- [ ] Manual regenerate produces fresh output
- [ ] Tests verify step idempotency

## #049 - Budget enforcement

**Labels**: `phase-13`, `type:feature`, `area:orchestration`, `size:m`
**Depends on**: #048

Deliverable:

- Budget check before every LLM call: `maxTokens`, `maxCalls`, `maxWallClockSeconds`, `maxCostUSD` (when price config present)
- Trip behavior: pause run with clear reason, no silent overrun
- Cost calculation requires a price table per provider/model

Acceptance:

- [ ] Hard caps enforced
- [ ] Cost calculation accurate for at least one configured provider
- [ ] Paused runs can be resumed after budget increase

## #050 - Retry and dead-letter policy

**Labels**: `phase-13`, `type:feature`, `area:orchestration`, `size:m`
**Depends on**: #048

Deliverable:

- Retry policy per provider: exponential backoff, max attempts, timeout per call
- Persistent failure after max retries: step enters dead-letter state, run pauses
- Operator action via CLI: list dead letters, retry, abandon
- Tests with simulated transient and persistent failures

Acceptance:

- [ ] Transient errors retry and eventually succeed
- [ ] Persistent errors land in dead-letter and pause the run
- [ ] CLI commands work against the dead-letter queue

## #051 - Structured logging integration

**Labels**: `phase-13`, `type:feature`, `area:orchestration`, `size:s`
**Depends on**: #048

Deliverable:

- All orchestration code uses child loggers with `runId`, `stepId`, `characterId`, `tier`
- LLM calls log `tokens`, `latencyMs`, `attemptNumber`
- Log review of a sample failed run is enough to debug without external tooling

Acceptance:

- [ ] Sample log output reviewed and confirmed sufficient by another contributor

---

# Phase 14: Settings store

## #052 - Port and adapter: ISettingsStore

**Labels**: `phase-14`, `type:feature`, `area:infrastructure`, `size:m`
**Depends on**: #025

Deliverable:

- `src/application/ports/ISettingsStore.ts` with `get(key)`, `set(key, value)`, `getAll()`, `getByPrefix(prefix)`
- `src/infrastructure/adapters/settings/DbSettingsStore.ts`
- Migration for `settings` table with `key`, `value`, `scope`, `updated_at`
- Settings flagged `restartRequired: true` refused for hot update

Acceptance:

- [ ] Reads use a cache, writes commit before returning
- [ ] Tenant-scoped settings supported (scope column)
- [ ] Restart-required settings produce a clear error when hot-updated

## #053 - Settings hierarchy resolver

**Labels**: `phase-14`, `type:feature`, `area:infrastructure`, `size:m`
**Depends on**: #052

Deliverable:

- Resolution order: hardcoded defaults < `.env` < DB settings < per-run overrides
- On first startup: read `.env`, populate DB settings if empty
- On subsequent startup: prefer DB settings
- Unit tests for the hierarchy

Acceptance:

- [ ] Each precedence level tested
- [ ] Seeding from `.env` happens only when DB is empty

## #054 - Adapter rebuild on settings change

**Labels**: `phase-14`, `type:feature`, `area:infrastructure`, `size:m`
**Depends on**: #053

Deliverable:

- `rebuildAdapters()` on the composition root invalidates and rebuilds factories for hot-changeable settings
- LLM provider change rebuilds the affected provider only
- DB change is rejected as restart-required
- Integration test: change provider in DB, trigger rebuild, verify next call uses new provider

Acceptance:

- [ ] Test passes
- [ ] In-flight calls are not interrupted (they finish with old adapter; new calls use new adapter)

---

# Phase 15: Character promotion mid-story

## #055 - Use case: GenerateCharacterCard

**Labels**: `phase-15`, `type:feature`, `area:application`, `size:m`
**Depends on**: #048

Deliverable:

- `src/application/use-cases/GenerateCharacterCard.ts` taking story context + prior mentions of an entity, producing a profile consistent with what has been shown
- Uses `ILLMProvider`
- Persists to character repository

Acceptance:

- [ ] Generated card aligns with prior mentions (tested with fixture story)

## #056 - Use case: BackfillCharacterMemory

**Labels**: `phase-15`, `type:feature`, `area:application`, `size:m`
**Depends on**: #055

Deliverable:

- `src/application/use-cases/BackfillCharacterMemory.ts` running the perception filter retroactively over scenes the character was present in
- Persists memory entries with backdated timestamps
- CLI command: `promote-character <storyId> <entityDescription>`

Acceptance:

- [ ] Promoted character has memory entries for scenes they participated in
- [ ] From the next scene onward, they have an agent like any other character

---

# Phase 16: API (optional)

## #057 - HTTP server scaffolding

**Labels**: `phase-16`, `type:feature`, `area:api`, `size:m`
**Depends on**: #054

Deliverable:

- `src/api/server.ts` (Fastify or Express)
- Health endpoint
- `ownerId` extraction from a configurable header
- Error handler that translates application errors to HTTP responses

Acceptance:

- [ ] Health endpoint returns 200
- [ ] Missing `ownerId` header returns 400 with clear error
- [ ] Application errors map to appropriate HTTP status codes

## #058 - Story endpoints

**Labels**: `phase-16`, `type:feature`, `area:api`, `size:m`
**Depends on**: #057

Deliverable:

- `POST /stories`, `GET /stories`, `GET /stories/:id`, `DELETE /stories/:id`
- All scoped by `ownerId`
- Integration tests

Acceptance:

- [ ] CRUD round-trips work
- [ ] Tenant isolation enforced at API layer

## #059 - Run endpoints

**Labels**: `phase-16`, `type:feature`, `area:api`, `size:m`
**Depends on**: #058

Deliverable:

- `POST /stories/:id/runs` to start a run
- `GET /runs/:id` for status, `POST /runs/:id/pause`, `POST /runs/:id/resume`, `POST /runs/:id/regenerate-step`
- Integration tests covering start, pause, resume, regenerate

Acceptance:

- [ ] Full run lifecycle accessible via API

## #060 - Settings endpoints

**Labels**: `phase-16`, `type:feature`, `area:api`, `size:s`
**Depends on**: #057

Deliverable:

- `GET /settings`, `PATCH /settings`, `GET /settings/:key`
- Restart-required settings return a clear error on hot-update attempt

Acceptance:

- [ ] Settings UI can be built against these endpoints

## #061 - OpenAPI spec

**Labels**: `phase-16`, `type:docs`, `area:api`, `size:m`
**Depends on**: #058, #059, #060

Deliverable:

- `openapi.yaml` or auto-generated from route definitions
- Served at `/openapi.json` and `/docs` (Swagger UI)

Acceptance:

- [ ] Spec validates against OpenAPI 3.1
- [ ] Swagger UI renders all endpoints

---

# Repository housekeeping

## #062 - GitHub issue and PR templates

**Labels**: `type:chore`, `area:docs`, `size:xs`
**Depends on**: nothing

Deliverable:

- `.github/ISSUE_TEMPLATE/bug.md`, `.github/ISSUE_TEMPLATE/feature.md`, `.github/ISSUE_TEMPLATE/question.md`
- `.github/pull_request_template.md` reminding contributors of the TDD red/green commit pattern

Acceptance:

- [ ] New issues use the templates
- [ ] PR template appears when opening a PR

## #063 - Dependabot or Renovate configuration

**Labels**: `type:chore`, `area:ci`, `size:xs`
**Depends on**: #001

Deliverable:

- `.github/dependabot.yml` (or `renovate.json`)
- Weekly updates for npm dependencies, grouped to avoid PR spam
- Auto-merge non-major dev dependency updates (optional)

Acceptance:

- [ ] First dependency PR opens automatically within a week

## #064 - Branch protection on main

**Labels**: `type:chore`, `area:ci`, `size:xs`
**Depends on**: #001

Deliverable: (manual configuration, not a code PR)

- Branch protection on `main`: require PR, require CI green, require at least one approving review, no force-push, no direct commits
- Document the settings in `CONTRIBUTING.md`

Acceptance:

- [ ] Settings verified by attempting a direct push (should fail)

## #065 - CODEOWNERS (optional)

**Labels**: `type:chore`, `area:docs`, `size:xs`
**Depends on**: nothing

Deliverable:

- `.github/CODEOWNERS` if the project grows past a single maintainer

Acceptance:

- [ ] Reviewers auto-assigned on PRs touching covered paths

---

# Ongoing / cross-cutting

## #066 - Add ADR template and initial decisions

**Labels**: `type:docs`, `area:docs`, `size:s`
**Depends on**: nothing

Deliverable:

- `docs/adr/template.md` (Michael Nygard format)
- `docs/adr/0001-typescript.md`
- `docs/adr/0002-hexagonal-architecture.md`
- `docs/adr/0003-postgres-and-sqlite-first-class.md`
- `docs/adr/0004-no-di-framework.md`

Acceptance:

- [ ] Each ADR is one page or less, written in the present tense at decision time

## #067 - Coverage threshold enforcement in CI

**Labels**: `type:chore`, `area:ci`, `size:xs`
**Depends on**: #003, several feature phases

Deliverable:

- CI fails if line coverage drops below thresholds in `TESTING.md`
- Per-layer thresholds where Vitest supports them, otherwise overall

Acceptance:

- [ ] PR that lowers coverage fails CI

## #068 - Performance baseline and budget tracking

**Labels**: `type:chore`, `area:orchestration`, `size:m`
**Depends on**: #048

Deliverable:

- Record token usage and wall-clock for a baseline generation (small story, fixed prompt, fixed model)
- Track in a `BENCHMARKS.md` file
- Update on major changes

Acceptance:

- [ ] First baseline recorded
- [ ] Process documented for updating

---

# Notes for maintainers

- These issues are starting points. Real work will surface follow-ups; create them as new issues, link to predecessors.
- Sizes are estimates. If an issue grows past `size:l` during implementation, split it before opening the PR.
- This document does not get updated as issues close. GitHub is the source of truth once issues exist.
- If a phase reorders or merges, update `ROADMAP.md` first, then re-derive affected issues here.
