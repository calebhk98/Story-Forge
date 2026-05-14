# Contributing

Welcome. This document covers what you need to start contributing.

## Prerequisites

- **Node.js** 20 LTS or later
- **npm** 10+ (or `pnpm`, `yarn` if you prefer; project ships with `package-lock.json`)
- **git**
- One of: **Postgres** 14+ (for integration tests) or willingness to run only SQLite tests
- An LLM provider configured (one of):
  - **Anthropic API key** (recommended for development quality)
  - **OpenAI API key**
  - **Ollama** running locally (free, runs on most laptops)
  - Any OpenAI-compatible endpoint with credentials

## First-time setup

```bash
git clone <repo-url>
cd story-forge
npm install
cp .env.example .env
# Edit .env to set at minimum DB_TYPE and one LLM provider's credentials
npm run migrate
npm run lint
npm run typecheck
npm test
```

If all of those pass, you have a working environment.

## Run something

The CLI exposes the use cases as they are built. Example:

```bash
npm run cli -- generate-outline "A heist story set in a futuristic Tokyo"
```

See `npm run cli -- --help` for the current command list.

## Project orientation

Read these documents in order before opening your first PR:

1. `README.md`
2. `GLOSSARY.md`
3. `DOMAIN_MODEL.md`
4. `ARCHITECTURE.md`
5. `CODE_STYLE.md`
6. `TESTING.md`
7. The phase of `ROADMAP.md` you're working on

If you skip these and submit a PR, the review will mostly consist of references back to them.

## Branch strategy

- `main` is always shippable. Direct commits to `main` are blocked.
- Feature branches: `feature/<short-name>` or `fix/<short-name>`.
- One feature per branch. If you discover unrelated work, open a separate branch and PR.

## Workflow

1. Pick a phase from `ROADMAP.md` or an open issue.
2. Create a branch.
3. Follow the TDD loop in `TESTING.md` (red commit, green commit, refactor commit).
4. Push your branch, open a PR against `main`.
5. CI runs. Fix any failures.
6. Request review.
7. Address feedback. Push fixups.
8. When approved and green, merge.

## Pull request expectations

A good PR:

- Targets one phase or one issue
- Has a clear title following commit conventions (`feat: ...`, `fix: ...`)
- Describes what changed and why, with any context a reviewer needs
- Links to the relevant `ROADMAP.md` phase or issue
- Has all CI checks green
- Has at least one approving review
- Does not lower test coverage materially

Keep PRs small. A 5-file, 200-line PR gets a thoughtful review. A 40-file, 2000-line PR gets a rubber stamp or a rejection.

## Code review

As a reviewer, ask:

- Does this match `ARCHITECTURE.md`? (No infrastructure imports from domain or application?)
- Are the tests meaningful? Do they actually exercise behavior, not just construct objects?
- Are names good? Would a stranger understand?
- Are there comments where helpful and only where helpful?
- Is the `ownerId` scoping present on every query and constructor that needs it?
- Are errors handled at the right boundary?

As an author, expect:

- Questions, even on parts you thought were obvious
- Requests to split a PR if it grew larger than intended
- Requests for more tests if the test surface is thin

Reviews are not attacks. Defensive responses ("but it works") rarely improve anything. Treat each comment as a genuine question.

## Adding a new adapter

This is the most common contribution. Steps:

1. Identify the port the adapter implements (in `application/ports/`).
2. Create the adapter under `infrastructure/adapters/<category>/`.
3. Add it to the relevant factory in `infrastructure/factories/`.
4. Add a setting in `Config.ts` to allow selecting it.
5. Update `.env.example` with the new setting.
6. Write unit tests using the mock dependencies the port allows.
7. Write integration tests gated behind an env flag if the adapter needs real external services.
8. Update `README.md` if the adapter expands user-facing capability (new LLM provider, new DB).

## Adding a new use case

1. Define inputs and outputs as types in `application/dtos/`.
2. Identify ports the use case needs. Add any missing ports first.
3. Write failing unit tests (red commit) using mock implementations of the ports.
4. Implement the use case (green commit).
5. Wire it into the composition root.
6. Expose it via CLI or API if user-facing.
7. Update `ROADMAP.md` if it completes a phase.

## Asking questions

Open an issue with the `question` label or use whatever discussion channel the project has set up. Include:

- What you're trying to do
- What you tried
- What surprised you

A question worth asking is worth a thoughtful answer.

## Anti-patterns to avoid

These will be rejected in review:

- **Importing infrastructure from domain or application.** The domain has no idea Postgres exists.
- **Adding a default export.** Use named exports.
- **Skipping the red commit.** Bundling tests into the same commit as the implementation is TDD-shaped retrospective writing, and we can tell from the history.
- **Mocking the unit under test.** That's not a test.
- **Catching errors silently.** If you can't handle it, rethrow.
- **String-matching error messages.** Use typed error codes.
- **Bumping a setting limit because your file is too long.** Split the file.
- **Adding `any` "temporarily".** It will not be temporary. Use `unknown` and narrow.
- **Bypassing the perception filter "just for testing".** The whole point is that the filter is the only path. Write the test correctly.

## Performance

Don't optimize before profiling. The hot path in this system is LLM calls, which dominate by orders of magnitude. Anything else is noise until proven otherwise.

If you do find a real performance issue, document it: the bottleneck, the measurement, the change, the new measurement.

## Security and privacy

- Never log API keys, prompts containing PII, or raw LLM responses at info level (use debug, and even then be careful).
- Treat all user-provided prompts as untrusted input. Bound prompt sizes. Sanitize where they reach storage.
- Don't add telemetry that sends prompt content anywhere by default. If telemetry exists, it must be opt-in and documented.
- `ownerId` scoping is a security feature. Never write a query that omits it.

## License of contributions

By contributing, you agree your contributions are licensed under the project's MIT license. See `LICENSE`.
