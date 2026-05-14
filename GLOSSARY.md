# Glossary

Terms used across the codebase and documentation. Group is by topic, not alphabetical.

## Story content

**Story**
The top-level work being generated. Contains an outline, a cast of characters, an ordered list of scenes, and configuration.

**Outline**
An ordered list of plot beats describing what should happen in the story. The granularity depends on configuration. Each beat references the scene that fulfills it once generated.

**Character**
A named entity with a profile (background, personality, goals, knowledge, voice notes). Characters with profiles get LLM agents in scene generation. Unnamed background entities are handled by the narrator.

**Character Card / Profile**
The persistent description of a character. Includes personality, motivations, voice samples, and starting knowledge. Cards can be created mid-story for promoted background characters.

**Scene**
A unit of generation. Has a setting, present characters, a POV configuration, a narrator voice, a beat reference, and produces both world events and prose.

**Event**
A single thing that happened in the world. Recorded in the event log with a timestamp, actor, action, targets, and a visibility specification that determines who could have perceived it.

## Knowledge layers

**World State**
The omniscient ground truth. Every event ever happened lives here, including secret ones. Only the director and narrator have access.

**Belief State**
What a single character has perceived, remembered, thought, said, and done. Built by filtering the world state through that character's perception. A character agent only ever sees this.

**Narrator View**
The narrator has access to the full world state and decides what reaches the reader. In omniscient mode it may reveal hidden events. In limited mode it stays inside the POV character's belief state.

## Roles (LLM-backed components)

**Character Agent**
An LLM call configured with a single character's profile, memory, and current scene perception. Outputs structured thoughts, dialogue, and actions.

**Narrator**
An LLM call that takes structured scene output plus relevant world events and produces prose in the configured narrator voice.

**Critic**
An LLM call that reviews generated scenes for POV violations, continuity issues, character consistency, and outline adherence. Emits structured critiques with severity levels.

**Reviser**
An LLM call that regenerates flagged content given the critique. Same shape as the original generator with the critique attached.

**Director**
Decides what happens next in the canonical world. May be a deterministic translator of the outline or LLM-driven for emergent mode.

**Perception Filter**
Either a rule-based filter using event visibility tags (binary mode) or an LLM call that judges what a character would have noticed (llm-judged mode).

**Summarizer**
An LLM call that compresses a character's memory log into a shorter "what I remember" string when token budgets demand it.

## Configuration

**POV (Point of View)**
The character whose experience anchors a scene. Configured per scene as either a single character id (single POV) or a list (multi POV, round-robin per turn).

**Narrator Voice**
The grammatical perspective of the prose. Options: `first`, `second`, `third-limited`, `third-omniscient`. Configured per scene.

**Plot Mode**
Controls outline adherence. Options: `strict` (characters get outline beats as directives), `guided` (characters get motivations that should produce the beat), `emergent` (outline is suggestion, drift permitted, downstream re-plans).

**Perception Mode**
How character agents learn what is observable. Options: `binary` (events have visibility tags, fast and deterministic) or `llm-judged` (an LLM decides what each character noticed in the scene, richer but adds calls).

**Model Tier**
A logical role for an LLM. Tiers include `default`, `critic`, `character`, `narrator`, `perception`, `summarizer`. Each can be configured to a different provider/model, or all can inherit from `default`.

## Orchestration

**Generation Run**
A long-running execution that takes a prompt and produces a story. Has a persisted state machine: `queued`, `running`, `paused`, `failed`, `complete`. Resumable from disk.

**Step**
A single unit of work within a run, identified by a stable id (for example, `run:abc.scene:7.draft`). Output is persisted on completion.

**Idempotency Cache**
Per-step output cache. Re-running a step returns the cached output so the critic's input stays stable.

**Checkpoint**
The persisted moment after a step completes. The DB is guaranteed consistent at every checkpoint, so any backup snapshot is valid.

**Budget**
Hard limits on a run: `maxTokens`, `maxCalls`, `maxWallClockSeconds`, optional `maxCostUSD`. Any limit trips, the run pauses.

## Architecture

**Port**
An interface in the application layer that the domain depends on but does not implement. Example: `ILLMProvider`, `IStoryRepository`.

**Adapter**
A concrete implementation of a port living in the infrastructure layer. Example: `AnthropicLLMProvider`, `PostgresStoryRepository`.

**Composition Root**
The single place where adapters are instantiated and wired into use cases. Read configuration once, build the graph, hand off to the application.

**Factory**
A function that reads configuration and returns the appropriate adapter for a port. Example: `createLLMProvider(config)` returns one of several implementations.

**Use Case**
A class in the application layer that orchestrates a single piece of business logic by calling ports. Example: `GenerateOutline`, `ReviewStory`.

## Tenancy

**Owner Id**
An opaque string identifying who owns a given record. A single-user local install uses a constant like `"local"`. A hosted consumer plugs in whatever its auth layer produces. Required on every primary entity from day one.
