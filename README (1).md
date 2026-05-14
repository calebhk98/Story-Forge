# Story Forge

> Project name is a placeholder. Rename freely.

An AI-driven story generation system that produces fiction by simulating each named character as an independent perspective, rather than letting a single LLM see and narrate everything at once.

## What makes this different

Most AI story tools hand a single model the full scene context and ask it to write prose. Story Forge separates three knowledge layers:

1. **World state** is the omniscient ground truth. Every event lives here, including secret ones.
2. **Per-character belief state** is what a character has actually perceived, remembered, thought, said, and done. A character agent only ever sees this.
3. **Narrator view** has access to the full world state and decides what the reader learns based on the configured narrator voice.

If Bob secretly poisons Alice's drink, the world state records it. Bob's belief state contains it because he did it. Alice's belief state does not. The narrator may reveal it to the reader (dramatic irony, omniscient third) or withhold it (limited third). The architecture enforces this separation structurally, so a character agent cannot accidentally reference information their character would not know.

## Status

Early development. The repository currently contains design documentation only. The implementation plan is in `ROADMAP.md`.

## Documentation

Read these in roughly the listed order.

| Document | Purpose |
|---|---|
| `README.md` | This file |
| `GLOSSARY.md` | Terms used throughout the docs and code |
| `DOMAIN_MODEL.md` | The story-generation mechanics, conceptual model |
| `ARCHITECTURE.md` | Software architecture, layers, ports and adapters |
| `ROADMAP.md` | Phased implementation plan |
| `CODE_STYLE.md` | Coding standards and quality rules |
| `TESTING.md` | TDD workflow and commit conventions |
| `CONTRIBUTING.md` | Dev setup, PR process, where to ask |
| `LICENSE` | MIT |

## Planned capabilities

- **Per-scene POV options**: single character anchored or multi-character round-robin
- **Narrator voice options**: first person, second person, third-limited, third-omniscient, configurable per scene
- **Plot adherence modes**: strict outline, guided motivation, emergent
- **Perception modes**: binary visibility tags or LLM-judged inference
- **Pluggable LLM providers**: Anthropic, Gemini, any OpenAI-compatible API including most local model servers (Ollama, vLLM, llama.cpp, LM Studio) and hosted services (Together, Fireworks, Groq, OpenRouter, DeepSeek)
- **Per-task model selection**: assign different models to critic, character, narrator, perception, summarizer roles or use one model for all
- **Pluggable storage**: Postgres and SQLite as first-class options
- **Pluggable vector store**: pgvector, sqlite-vec, or external (Qdrant, Chroma)
- **Overnight runs**: checkpointed, resumable, with cost and token budgets
- **DB-backed settings**: no code changes required to switch providers, `.env` seeds initial values
- **Tenant-aware data model**: opaque `ownerId` on every primary entity so a consumer can layer auth on top without retrofit

## License

MIT. See `LICENSE`.
