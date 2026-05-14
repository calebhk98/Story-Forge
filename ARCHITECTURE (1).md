# Architecture

## Style: Hexagonal (Ports and Adapters)

The codebase is organized into three layers with a strict dependency rule.

```
┌────────────────────────────────────────────────────┐
│                  infrastructure                    │
│      adapters: DB, LLM providers, email, etc.      │
└────────────────────────────────────────────────────┘
                         │ implements
                         v
┌────────────────────────────────────────────────────┐
│                   application                      │
│     use cases, ports (interfaces), DTOs            │
└────────────────────────────────────────────────────┘
                         │ uses
                         v
┌────────────────────────────────────────────────────┐
│                     domain                         │
│        entities, value objects, pure logic         │
└────────────────────────────────────────────────────┘
```

**Dependency rule**: domain knows nothing of application or infrastructure. Application knows the domain and defines ports. Infrastructure knows application and implements ports. Infrastructure never appears in an `import` inside the domain or application layers.

The composition root (`src/composition-root.ts`) is the sole place where concrete adapters are constructed and injected into use cases. No DI framework. Manual wiring is explicit and avoids framework lock-in.

## How this satisfies SOLID

The hexagonal style was chosen to make each SOLID principle an enforced constraint rather than an aspiration:

- **S (Single Responsibility)**: file length limits (`CODE_STYLE.md`) and the requirement that each use case does one thing force this. When a file exceeds 300 lines, the rule is split, not bump the limit.
- **O (Open/Closed)**: adding a new LLM provider, DB backend, or vector store means writing a new adapter class plus one case in a factory. No existing code changes. The use cases never know which adapter they got.
- **L (Liskov)**: every adapter is a drop-in replacement for its port. Tests run against any adapter without modification (see the integration test matrix in `.github/workflows/ci.yml` which runs the same tests against Postgres and SQLite).
- **I (Interface Segregation)**: ports are narrow and purpose-specific. `IStoryRepository` does story persistence; persisting events is `IEventLog`; vector search is `IVectorStore`. No fat interface forces an adapter to implement methods it doesn't need.
- **D (Dependency Inversion)**: the domain layer defines no implementations and imports no infrastructure. Application defines the ports it needs. Infrastructure implements them. Dependency arrows point inward only.

A reviewer who sees a violation of any of these (a fat interface, a domain class importing from infrastructure, a use case branching on adapter type) should ask for changes.

## Project structure

```
src/
  domain/
    entities/
      Story.ts
      Character.ts
      Scene.ts
      Outline.ts
      Event.ts
      GenerationRun.ts
    value-objects/
      POVConfig.ts
      NarratorVoice.ts
      PlotMode.ts
      PerceptionMode.ts
      Prompt.ts
      Completion.ts
      Visibility.ts
  application/
    ports/
      ILLMProvider.ts
      IStoryRepository.ts
      ICharacterRepository.ts
      IEventLog.ts
      IVectorStore.ts
      IJobStore.ts
      ISettingsStore.ts
      IPerceptionFilter.ts
      INarrator.ts
      IDirector.ts
      IClock.ts
      ILogger.ts
    use-cases/
      GenerateOutline.ts
      GenerateCharacterProfile.ts
      GenerateCharacterCard.ts
      PlanScene.ts
      RunPerception.ts
      RunCharacterAgent.ts
      GenerateNarration.ts
      ReviewScene.ts
      ReviseScene.ts
      OrchestrateRun.ts
    dtos/
      ...
    errors/
      ApplicationError.ts
  infrastructure/
    adapters/
      llm/
        AnthropicLLMProvider.ts
        GeminiLLMProvider.ts
        OpenAICompatibleLLMProvider.ts
        MockLLMProvider.ts
      db/
        postgres/
          PostgresStoryRepository.ts
          PostgresEventLog.ts
          ...
        sqlite/
          SqliteStoryRepository.ts
          SqliteEventLog.ts
          ...
        memory/
          InMemoryStoryRepository.ts
      vector/
        PgvectorVectorStore.ts
        SqliteVecVectorStore.ts
      settings/
        DbSettingsStore.ts
      clock/
        SystemClock.ts
      logger/
        PinoLogger.ts
    factories/
      LLMProviderFactory.ts
      RepositoryFactory.ts
      VectorStoreFactory.ts
    config/
      Config.ts          # zod schema, env loader
      ConfigLoader.ts
    migrations/
      postgres/
      sqlite/
  composition-root.ts
  main.ts                # CLI entry, calls composition root then runs
  api/                   # optional, for service mode
    routes/
    server.ts

tests/
  unit/
    domain/
    application/
  integration/
    db/
    llm/
  e2e/
  fixtures/
  mocks/
```

No file in any directory exceeds 500 lines. See `CODE_STYLE.md`.

## Core ports

### `ILLMProvider`

```ts
/**
 * Provides text completion from a language model.
 * Implementations live in infrastructure/adapters/llm/.
 */
export interface ILLMProvider {
  /**
   * Generate a completion for the given prompt.
   * @param prompt - structured prompt with system, user, and optional assistant turns
   * @param opts - generation options (temperature, max tokens, stop sequences)
   * @returns the completion text and metadata (tokens used, finish reason)
   */
  complete(prompt: Prompt, opts?: GenerationOptions): Promise<Completion>;

  /**
   * Generate a completion constrained to a JSON schema.
   * Adapters that lack native structured output must implement
   * a parse-and-retry fallback.
   */
  completeStructured<T>(
    prompt: Prompt,
    schema: JsonSchema<T>,
    opts?: GenerationOptions,
  ): Promise<StructuredCompletion<T>>;

  /** Adapter identifier for logging and routing. */
  readonly id: string;
}
```

### `IStoryRepository`

Standard repository surface. CRUD with `ownerId` scoping. Migrations live in `infrastructure/migrations/<dialect>/`. Both Postgres and SQLite ship as first-class adapters from day one.

### `IPerceptionFilter`

```ts
/**
 * Decides what events a character perceived in a scene.
 * Two implementations: binary (visibility tags) and llm-judged.
 */
export interface IPerceptionFilter {
  filter(characterId: CharacterId, scene: Scene, events: Event[]): Promise<PerceivedEvent[]>;
}
```

### `IJobStore`

Persists `GenerationRun` state, step outputs, and idempotency cache entries. The orchestrator depends only on this interface.

### `ISettingsStore`

Read/write settings at runtime. Backed by the DB. Read-through cache acceptable but writes must commit before returning. Some settings are flagged `restartRequired` and refused for hot updates.

## Extending the pattern: other adapters

The ports listed above cover what's needed for the story-generation core. The same pattern applies to anything else the project grows to need:

- **Email** (transactional notifications when a long run completes or fails): define `IEmailService`, ship adapters for SMTP, SendGrid, SES, or `ConsoleEmailService` for dev.
- **Geolocation** (if stories need real-world location context): define `IGeoService`, ship adapters for whatever provider you choose.
- **Payments, file storage, queues, observability**: same shape every time. Port in `application/ports/`, adapters in `infrastructure/adapters/<category>/`, factory in `infrastructure/factories/`, config switch in `.env.example`.

Anything that crosses the application boundary into the outside world goes through a port. No exceptions.

## Configuration hierarchy

Settings resolve in this order, later values override earlier ones:

1. Hardcoded defaults in code
2. `.env` file (read once at startup, seeds the settings table if empty)
3. DB settings table (persists across restarts, this is where the UI/API edits)
4. Per-run overrides (passed by caller, ephemeral)

Settings are loaded once at startup into a typed `Config` object built and validated with `zod`. Changes via the settings store trigger a `rebuildAdapters()` call on the composition root for affected factories.

### Model configuration shape

```yaml
models:
  default:
    provider: openai-compatible
    baseURL: http://localhost:11434/v1 # Ollama
    apiKey: ''
    model: llama-3.1-8b-instruct
  critic: # overrides default
    provider: anthropic
    model: claude-sonnet-4-5
  narrator:
    provider: anthropic
    model: claude-sonnet-4-5
  # character, perception, summarizer inherit from default
```

Verify schema with `zod`. If a tier is missing, fall back to `default`.

## Job orchestration

`OrchestrateRun` is the use case that drives long-running generation.

A `GenerationRun` is a persisted state machine: `queued → running → paused → failed → complete`.

Every unit of work is a `Step` with a stable id like `run:abc.scene:7.draft`. Steps are idempotent: re-running a step returns the cached output rather than regenerating, so a resumed run sees the same intermediate values as the original.

**Cache invalidation is explicit, never automatic.** Resumed runs always hit the cache. Operators or callers can trigger a fresh generation for a specific step via a `regenerateStep(stepId)` action exposed on the orchestrator. This invalidates the cache entry, reruns the step, and lets downstream steps see the new output on their next execution. Default behavior favors determinism; quality-fix regeneration is opt-in.

**Failure handling**:

- Transient errors (network, rate limit, timeout): retry with exponential backoff per the provider's policy
- Persistent errors after max retries: step enters dead-letter state, run pauses, operator action required
- Process crashes: on restart, the orchestrator finds the latest unfinished step and continues

**Budgets** are enforced before each LLM call:

- `maxTokens`: cumulative tokens this run
- `maxCalls`: cumulative LLM calls this run
- `maxWallClockSeconds`: real-time cap
- `maxCostUSD`: optional, requires per-provider price config

Any tripped budget pauses the run with a clear reason. No silent overruns.

**Backups** are a deployment concern. The application guarantees DB consistency at every checkpoint. Operators run their own backups (`pg_dump`, `.backup` for SQLite, etc.). An `onCheckpoint` hook is exposed if you want to plug something in.

## Multi-tenancy

Every primary entity carries `ownerId: string`. A single-user local install uses a constant like `"local"`. A hosted service plugs in whatever its auth layer produces. The application never interprets `ownerId`, only scopes by it.

All repository queries take `ownerId` and use it in WHERE clauses. No cross-tenant queries exist in the codebase. Tests verify this with table-level checks.

## Concurrency

Designed for parallel runs against shared storage:

- `GenerationRun` rows use row-level locking (`SELECT FOR UPDATE` in Postgres, `BEGIN IMMEDIATE` in SQLite)
- Idempotency cache writes are conditional inserts
- The composition root is per-process; multiple processes can share a DB

Single-user local installs ignore most of this and only see the simple case.

## Logging

Structured logs only. Every log line carries:

- `runId` (when in a run context)
- `stepId` (when in a step context)
- `characterId` (when applicable)
- `tier` (which model tier was used)
- `tokens`, `latencyMs`, `attemptNumber` (for LLM calls)

Use `pino` or equivalent. Log level is configurable per module via the settings store.

## Error model

Three error categories:

1. **Domain errors**: business rule violations. Defined in `domain/errors/`. Always recoverable, never surface stack traces to logs.
2. **Application errors**: use case preconditions, missing data. Defined in `application/errors/`. Logged with context, may pause runs.
3. **Infrastructure errors**: adapter failures, network, DB. Caught at use case boundaries and translated to application errors. Stack traces logged.

Errors carry typed codes. No string matching for error handling.

## Testability checklist

A unit test for any use case must be able to:

1. Construct the use case with mock implementations of every port it depends on
2. Drive the test scenario by configuring mock returns
3. Assert on the use case's output and on calls made to its dependencies

If any of those is awkward, the use case has the wrong shape. See `TESTING.md`.
