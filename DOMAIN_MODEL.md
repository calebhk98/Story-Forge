# Domain Model

This document describes the story-generation mechanics independent of the software architecture. Read `ARCHITECTURE.md` for how the model is structured in code.

## The mental model

The system models story generation the way a tabletop RPG with a GM and several players works.

- The **world** is the canonical record of what has happened. Hidden actions are recorded here.
- Each **character** is a player who only knows what their character has perceived, thought, and done.
- The **narrator** is the GM describing scenes to the audience, with access to the full world but free to withhold or reveal as the configured voice dictates.

This separation is not a stylistic choice, it is a structural constraint enforced by the architecture. A character agent is incapable of referencing information that is not in its belief state, because the system never passes that information to its prompt.

## Entities

### Story

The top-level container. Holds an outline, a cast, an ordered scene list, and configuration. Stories carry an `ownerId` and a generation run reference.

### Outline

Ordered plot beats. Granularity is configurable: a beat can be a sentence ("Alice arrives at the manor") or a paragraph with subgoals. Each beat tracks its fulfillment status and links to the scene that fulfilled it.

### Character

A named entity that participates in scenes. Required fields include `id`, `name`, `profile`, and `voiceSpec`. Profile contains background, personality traits, current goals, starting knowledge, and relationships. Voice spec contains dialogue style notes, vocabulary preferences, and sample lines.

Background entities without character cards are handled by the narrator and have no agent calls.

### Scene

A unit of generation. Carries:
- Setting (location, time)
- Present characters (ids)
- POV configuration (single character or multi)
- Narrator voice for this scene
- Plot mode for this scene
- Beat reference being fulfilled
- Produced events (added during generation)
- Produced prose (added by narrator)

### Event

A single thing that happened. Recorded with:
- `id`, `sceneId`, `time` (ordinal within scene)
- `actor` (character id or `narrator` for environmental)
- `action` (structured, for example `Move`, `Speak`, `PerformAction`, `EnvironmentalChange`)
- `targets` (entities affected)
- `visibility` (one of: `public`, `private`, `withId(characterId)`, `withinRange(meters)`, `concealedFrom(characterIds)`)
- `payload` (action-specific data)

The visibility specification is the engine of the perception filter in binary mode.

### Character Memory

A per-character append-only log. Stores what that character perceived, thought, said, and did. Each entry has a timestamp and is tagged with its source (`perceived`, `thought`, `acted`, `spoke`). The character agent's context is assembled from this log.

## Knowledge layers in detail

### World state

The world state is the union of the event log and the current state of entities (positions, possessions, statuses). It is the source of truth. Only the director and narrator read it directly. Mutations only happen through events.

### Belief state

A character's belief state is built by:

1. Taking the events visible to them according to their visibility tags or the perception LLM's judgment
2. Appending their own thoughts, dialogue, and actions
3. Including their persistent profile and voice spec
4. Including a memory summary if the raw log exceeds the model's context budget

The character agent's prompt is constructed from this belief state. It never sees the full world state. There is no "ignore this part" instruction trusted to a model.

### Narrator view

The narrator receives:
- The full event log for the current scene
- The world state at scene start
- The POV character's belief state (for limited modes)
- The narrator voice configuration
- The structured outputs from each character agent in the scene

The narrator produces prose. In `third-omniscient` it may describe events the POV character did not perceive. In `first`, `second`, and `third-limited` it must stay inside the POV character's belief state.

## Configuration knobs

### POV configuration (per scene)

- `single`: one POV character anchors the scene
- `multi`: each acting character gets a separate agent call for their turn, narrator stitches

Default is `single` because token costs scale roughly linearly with active agents per scene.

### Narrator voice (per scene)

- `first`: "I walked into the manor"
- `second`: "You walk into the manor" (rare, weaker model support)
- `third-limited`: "Alice walked into the manor, unaware that..." (narrator stays in Alice's head)
- `third-omniscient`: "Alice walked into the manor. Bob, watching from the shadows..."

The choice is per scene so a story can shift voice for effect.

### Plot mode

- `strict`: character agents receive the outline beat as a directive in their prompt. Predictable but can feel railroad-y.
- `guided`: character agents receive motivations crafted to make the beat the natural choice, with no explicit directive. Falls back to strict if the character refuses.
- `emergent`: the outline is treated as a starting suggestion. Character actions are unconstrained, and the director updates the outline downstream to keep things coherent.

### Perception mode

- `binary`: events have visibility tags, the filter is a pure function. Fast, deterministic, predictable, free.
- `llm-judged`: a separate small LLM call per scene per character decides what they noticed, with optional subtle-clue inclusion. Richer, costlier.

Mode is configurable globally and overridable per scene.

## The generation pipeline

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────┐
│ GenerateOutline │ -> │ GenerateProfiles │ -> │ Plan Scenes  │
└─────────────────┘    └──────────────────┘    └──────────────┘
                                                       │
                                                       v
                       ┌──────────────────────────────────────┐
                       │ For each scene:                      │
                       │   1. Director plans canonical events │
                       │   2. PerceptionFilter per character  │
                       │   3. CharacterAgent calls (active)   │
                       │   4. Director resolves outcomes      │
                       │   5. Narrator produces prose         │
                       │   6. Critic reviews                  │
                       │   7. Reviser if blocked (cap N)      │
                       │   8. Commit scene, append events     │
                       └──────────────────────────────────────┘
                                                       │
                                                       v
                                            ┌─────────────────────┐
                                            │ Cross-scene review  │
                                            │ Final polish pass   │
                                            └─────────────────────┘
```

Each numbered step inside the scene loop is a separately-testable use case behind its own port.

## Character promotion mid-story

When a background entity is promoted to a named character (by user, director, or critic), the system:

1. Calls `GenerateCharacterCard` with story-so-far and every prior mention of the entity to produce a card consistent with what has been shown.
2. Back-fills `CharacterMemory` by running the perception filter retroactively over scenes the character was present in.
3. From the next scene onward, the character has an agent like any other.

Promotion is a one-time cost per character: one card-generation call plus one perception call per back-filled scene.

## Critic responsibilities

The critic checks each generated scene against:

1. **POV violations**: did prose attributed to a POV character reference information not in their belief state at the time?
2. **Continuity**: do referenced objects, positions, and prior events make sense?
3. **Character consistency**: do dialogue and actions match the character's profile and voice?
4. **Outline adherence**: was the beat actually accomplished?
5. **Information leakage**: did any character act on knowledge they could not have?

Critiques carry a severity:
- `block`: regeneration required
- `warn`: noted but does not block
- `note`: informational only

Only `block` triggers revision. The critic loop has a configurable max iteration count (default 3) to prevent runaway regeneration.

## Token cost considerations

Multi-POV scenes with many named characters scale agent calls quickly. Two optimizations the architecture supports:

1. **Speaking-actor-only calls**: in multi-POV mode, only characters who act or speak this turn get a call. Silent observers are summarized by the narrator.
2. **Per-task model tiers**: assign a small, fast model to high-frequency calls (perception, summarizer) and reserve the strongest model for narrator and critic. See `ARCHITECTURE.md` for the configuration shape.
