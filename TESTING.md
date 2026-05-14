# Testing

This project follows Test-Driven Development. Tests are written before the code they verify. The git history reflects the discipline.

## The workflow

1. Pick a unit of work (a use case, a method, a behavior of a class).
2. Write the tests. Run them. Confirm they fail with the expected error (red bar).
3. Commit the failing tests with prefix `test:`. Example: `test: failing tests for GenerateOutline`. You can batch related tests in one commit. Typical batch size is 1-10 tests for a single unit. Avoid batches that span multiple unrelated units.
4. Implement the smallest change that makes the tests pass. Run tests. Confirm green.
5. Commit the implementation with prefix `feat:`, `fix:`, or appropriate.
6. Refactor if the code is now ugly. Run tests after each refactor. Commit `refactor:` if you made changes.

Repeat per unit.

## Commit-stage CI

Commits with `test:` as their type can have failing tests. They will fail CI when checked in isolation. This is by design.

**Pull requests must be all green before merge.** The PR represents the unit of work as a whole, and all tests must pass at the merge point. The intermediate red commits stay in the branch history (use squash-merge only if you don't care about the history; merge-commit or rebase-merge preserves it).

CI configuration:

- CI runs on `pull_request` events against the merge result, not individual branch commits.
- Optionally, CI also runs on `push` to feature branches, in which case red intermediate commits will show red. That's fine.
- CI must be green on the PR head before merge is allowed (branch protection rule).

## Commit message conventions

[Conventional Commits](https://www.conventionalcommits.org/) style:

| Prefix      | Use                                                       |
| ----------- | --------------------------------------------------------- |
| `test:`     | Adding or modifying tests, especially the red commits     |
| `feat:`     | A new feature, the green commit that makes tests pass     |
| `fix:`      | A bug fix                                                 |
| `refactor:` | Code change that neither fixes a bug nor adds a feature   |
| `docs:`     | Documentation only                                        |
| `chore:`    | Build, tooling, dependencies                              |
| `perf:`     | Performance improvement                                   |
| `style:`    | Formatting, missing semicolons, etc. (rare with prettier) |

Examples:

```
test: failing tests for OpenAICompatibleLLMProvider
feat: implement OpenAICompatibleLLMProvider
test: cases for budget enforcement in OrchestrateRun
feat: enforce token and call budgets in OrchestrateRun
refactor: extract perception assembly into helper
```

## Test types

### Unit tests

Test a single unit (use case, class, function) in isolation with all dependencies mocked. Live in `tests/unit/` mirroring `src/`. Fast (milliseconds per test). Run in every commit, every PR.

Example: `GenerateOutline` is tested with a `MockLLMProvider` that returns a scripted completion. The test asserts on what was passed to the mock and what the use case returned.

### Integration tests

Test one or two adapters working together against real external dependencies, or test a use case against real adapters. Live in `tests/integration/`. Slower (seconds per test). Gated behind env flags in CI for things that need credentials or external services.

Examples:

- `PostgresStoryRepository` against a real Postgres in a service container
- `OpenAICompatibleLLMProvider` against a local Ollama (if `OLLAMA_URL` is set), skipped otherwise

### End-to-end tests

Run the full pipeline. Live in `tests/e2e/`. Slow (minutes). Run on a schedule or manually, not on every PR.

Example: generate a complete short story from a fixed prompt and assert structural properties (has prose, has events, no POV violations detected by the critic).

## Mocking strategy

- **For domain types**: no mocking needed. Construct real instances with test data.
- **For ports**: create a mock implementation in `tests/mocks/`. The mock is a typed class that records calls and returns scripted values.
- **For external services (HTTP, DB)**: use the mock adapters for unit tests. Use real adapters (with `testcontainers` or local files) for integration tests.

Do not mock the unit under test. Do not mock domain entities. If mocking a domain entity seems necessary, the entity is doing too much or the test is at the wrong level.

## Test naming

Use `describe` for the unit under test and `it` for the behavior. Behavior described as a sentence.

```ts
describe('GenerateOutline', () => {
  describe('when given a valid prompt', () => {
    it('returns an outline with at least one beat', async () => {
      ...
    });

    it('persists the outline to the repository', async () => {
      ...
    });
  });

  describe('when the LLM returns malformed JSON', () => {
    it('throws an ApplicationError with code MALFORMED_RESPONSE', async () => {
      ...
    });
  });
});
```

## Snapshot tests

Use sparingly. Snapshots are great for catching unintended changes in stable output. They are terrible for catching regressions in evolving output.

Acceptable:

- The structure of a `Prompt` object built by a use case
- The shape of an error response

Unacceptable:

- Full LLM responses (they vary by model, by version, by sampling)
- Generated prose (varies wildly)

## Coverage targets

| Layer                      | Target line coverage                        |
| -------------------------- | ------------------------------------------- |
| `domain/`                  | 95%+                                        |
| `application/`             | 85%+                                        |
| `infrastructure/adapters/` | 70%+ (some adapters need integration tests) |
| Overall                    | 80%+                                        |

Coverage is reported in CI. PRs that lower coverage are flagged but not blocked automatically (reviewer judgment).

## Determinism

LLM calls are inherently non-deterministic. Tests must not depend on real LLM output. Patterns:

- Unit tests use `MockLLMProvider` with scripted returns.
- Integration tests for LLM adapters verify connection and format, not content. Assert that a response was received, that it parses, that token usage is reported. Don't assert on specific text.
- E2E tests assert on structural properties: was prose produced, do the events form a valid sequence, did the critic find blockers.

## Test data

Test fixtures live in `tests/fixtures/`. Use builders for complex entities:

```ts
const story = aStory()
  .withTitle('Test Story')
  .withCharacters([aCharacter().named('Alice').build()])
  .build();
```

Builders are simpler than they look and dramatically reduce test fragility when entity shapes evolve.

## Pre-commit

`husky` runs `lint-staged` which:

- Formats with Prettier
- Lints with ESLint (auto-fix where possible)
- Runs the test command on changed test files only (`vitest related <files>`)

You can bypass with `git commit --no-verify` for emergencies. Don't make this a habit.
