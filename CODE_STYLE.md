# Code Style

This document defines the project's coding standards. CI enforces what can be enforced. Reviewers enforce the rest.

## Language

TypeScript 5+ with strict mode. Concretely, `tsconfig.json` must have at minimum:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Formatting

`prettier` handles formatting. Don't argue about it.

- 2 spaces, no tabs
- Single quotes for strings except where escaping argues otherwise
- Trailing commas everywhere multi-line allows them
- 100 character line limit (soft, prettier wraps)

## Indentation depth (never nesting)

Max depth: 4. Enforced by ESLint `max-depth: ["error", 4]`.

When you find yourself at depth 4 and need to go deeper, extract a function or invert the condition. The two main techniques:

**Guard clauses / early returns** instead of nested conditionals:

```ts
// Bad
function processCharacter(character: Character) {
  if (character.isAlive) {
    if (character.hasGoal()) {
      if (character.canAct()) {
        // do work
      }
    }
  }
}

// Good
function processCharacter(character: Character) {
  if (!character.isAlive) return;
  if (!character.hasGoal()) return;
  if (!character.canAct()) return;
  // do work
}
```

**Extract methods** when the loop body grows:

```ts
// Bad
for (const scene of story.scenes) {
  for (const character of scene.characters) {
    if (character.isPOV) {
      // 30 lines of work
    }
  }
}

// Good
for (const scene of story.scenes) {
  processScene(scene);
}

function processScene(scene: Scene) {
  for (const character of scene.characters) {
    if (!character.isPOV) continue;
    handlePOVCharacter(character, scene);
  }
}
```

## File length

Hard limit: 500 lines. ESLint `max-lines: ["error", { max: 500, skipBlankLines: true, skipComments: true }]`.

Warn at 300. If a file approaches this, it almost always means it has more than one responsibility. Split it.

Test files are exempt from the warning level but still subject to the hard limit. If your test file is 600 lines, the unit under test probably needs splitting.

## Function length

Soft limit: 50 lines. ESLint `max-lines-per-function: ["warn", 50]`.

Long functions get long because they do many things. Name the things, extract them.

## Cyclomatic complexity

Soft limit: 10. ESLint `complexity: ["warn", 10]`.

If a function has more than 10 branches, it's hard to test exhaustively. Consider a strategy or polymorphism.

## Documentation comments

Required on every exported function, class, method, interface, type, and at the top of every file. Enforced by `eslint-plugin-jsdoc`.

### File header

Every file starts with:

```ts
/**
 * @fileoverview Short description of what this file contains and why.
 * Reference related files or concepts where helpful.
 */
```

### Function and method docs

```ts
/**
 * One sentence summary of what the function does.
 *
 * Longer explanation if the behavior or contract is non-obvious.
 *
 * @param scene - the scene being processed; must have at least one POV character
 * @param events - events occurring during the scene, in chronological order
 * @returns the prose narration with the configured voice
 * @throws {ApplicationError} if the scene has no POV character configured
 */
function generateNarration(scene: Scene, events: Event[]): Promise<Prose> {
  ...
}
```

### Class docs

```ts
/**
 * Orchestrates scene generation by coordinating the director,
 * perception filter, character agents, and narrator.
 *
 * One instance is constructed per run.
 */
export class RunScene {
  ...
}
```

### When less is more

Trivial getters and setters on simple value objects don't need a paragraph. A one-line description suffices:

```ts
/** @returns the character's display name */
get name(): string { return this._name; }
```

## Naming

- **Classes, interfaces, types**: `PascalCase` (`Story`, `IStoryRepository`, `Completion`)
- **Interfaces representing ports**: `I` prefix (`ILLMProvider`, `IStoryRepository`)
- **Functions, methods, variables**: `camelCase` (`generateOutline`, `currentScene`)
- **Constants**: `SCREAMING_SNAKE_CASE` for true compile-time constants only (`MAX_RETRIES`, `DEFAULT_BUDGET_TOKENS`)
- **Files**: match the primary export (`Story.ts` exports `Story`, `RunScene.ts` exports `RunScene`)
- **Test files**: `<name>.test.ts` colocated isn't used; tests live in `tests/` mirroring `src/`

Names are nouns for things, verbs for actions, adjectives for qualities. `validate` not `validation`. `IsPOV` reads as a boolean question, so `isPOV` is correct for a boolean property.

## Error handling

- Domain errors: subclasses of `DomainError` in `domain/errors/`. Thrown for business-rule violations.
- Application errors: subclasses of `ApplicationError` in `application/errors/`. Thrown for use-case preconditions.
- Infrastructure errors: caught at the boundary, wrapped in `ApplicationError` with a code and cause.

No string matching on error messages, ever. Use `instanceof` or typed error codes.

No throwing strings, numbers, or plain objects. Always an `Error` subclass.

No `try/catch` to swallow errors silently. Log or rethrow.

## Imports

Order in three groups, blank line between:

```ts
// 1. External modules
import { z } from 'zod';
import pino from 'pino';

// 2. Internal absolute imports
import { Story } from '@/domain/entities/Story';
import { ILLMProvider } from '@/application/ports/ILLMProvider';

// 3. Relative imports
import { buildPrompt } from './buildPrompt';
```

Configure path aliases in `tsconfig.json` (`@/*` -> `src/*`) so absolute internal imports work everywhere.

## Forbidden patterns

- `any` (use `unknown` and narrow)
- `// @ts-ignore` (use `// @ts-expect-error` with a comment explaining why and a `// TODO` if it should go away)
- `// @ts-expect-error` without an explanation comment on the same line or above
- `Function` type (use `(...) => ...` signatures)
- `Object` type (use `Record<K, V>` or specific shapes)
- Default exports (named exports only, for refactor-ability)
- `enum` (use string literal unions or `as const` objects, for tree-shaking and clarity)
- Mutation of function parameters
- `let` when `const` works
- Top-level `await` in library files (only allowed in `main.ts` and similar entry points)

## Async

- Always `async/await`, never `.then` chains
- Always specify a return type on `async` functions (`Promise<T>`)
- Never start a promise without awaiting or attaching a handler
- Use `Promise.all` for parallel independent work; never sequential `await` in a loop unless ordering matters

## Logging

- Never `console.log` outside `scripts/`. Use the injected `ILogger`.
- Log structured fields, not formatted strings. Good: `logger.info({ runId, stepId }, 'step started')`. Avoid: `logger.info(\`step ${stepId} started for run ${runId}\`)`.
- Never log secrets, prompts containing user data, or full LLM responses at info level. Use debug.

## TODOs

`// TODO: description` is acceptable temporarily. CI fails on `// FIXME` and `// XXX`. Include a username or ticket reference if the project has issue tracking.

## Comments

Prefer self-documenting code. A comment that restates the code is noise. A comment that explains _why_ is gold.

Bad:

```ts
// Increment the counter
counter++;
```

Good:

```ts
// Retry once on transient errors; provider docs say this is the recommended pattern.
attempt++;
```

## What CI enforces

- Type errors: build fails
- ESLint errors (the rules above marked `error`): build fails
- Tests: any failure fails the build
- Format check: `prettier --check`, fails the build
- ESLint warnings: do not fail the build, but reviewers see them in PRs

What reviewers enforce: naming, comments-when-helpful, no-comments-when-noise, sensible abstractions, alignment with `ARCHITECTURE.md`.
