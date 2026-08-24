# Contributing to OfferFlow

Thanks for helping improve OfferFlow.

## Development

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm test
npm run build
```

## Product constraints

Changes must preserve these boundaries:

1. Local-first: no backend database, login system, telemetry, or silent business-data upload.
2. RecruitmentCycle is the primary scope; Position and JD never cross cycles.
3. Application Pipeline stages are customizable but always map to a fixed PipelineCategory.
4. Pipeline History stores immutable name/category snapshots.
5. Secrets never enter normal export, global search, URLs, or logs.
6. LLM calls happen only after an explicit user action and use an OpenAI-compatible abstraction.
7. Destructive actions require a clear confirmation or recovery path.

Please include tests for data model, migration, privacy, export/import, and workflow changes.
