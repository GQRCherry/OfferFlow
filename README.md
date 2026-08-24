# OfferFlow

A local-first, single-user recruiting-season workspace for organizing positions, applications, custom pipelines, assessments, interviews, offers, schedules, notes, and recruiting-site credentials—without a backend.

![OfferFlow dashboard](docs/screenshot-dashboard.jpg)

## Features

- Multiple recruitment cycles with archive/restore and strict Position/JD isolation
- Company and cycle-scoped position library with raw and structured JD data
- Application Kanban and sortable list using fixed statistical categories plus custom stages
- Immutable stage/result history snapshots
- Assessments, written tests, interviews, offer events, weekly focus, and monthly calendar
- One interview note and reflection per interview session, with safe Markdown rendering
- `Cmd/Ctrl + K` global search across ordinary current-cycle data
- Recruitment-site credentials in a separate AES-GCM encrypted IndexedDB store
- OpenAI-compatible JD parsing with an editable SiliconFlow preset
- Normal JSON backup/restore and application CSV export
- System, light, and dark themes
- Hash-based routing suitable for GitHub Pages and other static hosts

## Use on GitHub Pages

After GitHub Pages is enabled with **Source: GitHub Actions**, every push to `main` runs tests, builds the static app, and publishes `dist/` through `.github/workflows/deploy-pages.yml`.

The expected public URL is:

```text
https://gqrcherry.github.io/OfferFlow/
```

No Node.js, Python, database service, Docker, or account registration is required to use the published page.

## Local use

### Development

```bash
npm install
npm run dev
```

### Production build

```bash
npm ci
npm test
npm run build
```

Serve the generated static directory:

```bash
python -m http.server 8000 -d dist
```

or:

```bash
npx serve dist
```

Then open the displayed HTTP URL. Direct `file://` opening is not guaranteed because browsers restrict module loading, IndexedDB, and Web Crypto in local-file contexts.

## Where data is saved

Ordinary business data is stored in the current browser's IndexedDB database named `offerflow`. Recruitment-site secrets and LLM API Keys use separate object stores; locally saved secret payloads are encrypted with AES-GCM using a browser-local random key.

There is no cloud sync. Different browsers, browser profiles, devices, origins, GitHub Pages domains, and private-browsing sessions have separate data.

## Backups and browser cleanup risk

Clearing site data, resetting a browser profile, uninstalling a browser, or changing the deployment origin can permanently remove local OfferFlow data. Use **Data → Export JSON** regularly and keep backups in a location you control.

- Normal JSON exports contain ordinary business data and non-sensitive settings.
- Normal JSON and CSV exports do **not** contain recruitment-site passwords, account identifiers stored as secrets, LLM API Keys, or the local encryption key.
- Import validates the schema and cross-entity references before writing data.
- Full replacement is destructive and should only be used after exporting the current data.

## Recruitment-site credential security boundary

OfferFlow is a local personal recruitment-management tool, not a professional password manager. In no-master-password mode, encryption mainly lowers plaintext exposure if ordinary application data leaks. If an attacker controls the current browser, OS account, browser extensions, or OfferFlow runtime, sensitive information cannot be guaranteed secure.

## LLM API Key security

Do not put a real user key in `.env`, `VITE_*`, source code, issues, or commits. Pure frontend build-time secrets are visible to users.

Enter the API Key in **Settings → AI** and choose:

- **Local sensitive store**: encrypted and persisted in the current browser; or
- **Session only**: removed when the browser session ends.

OfferFlow sends only the current raw JD, and only after you explicitly click **AI 提纯**, to the configured third-party provider. Review that provider's privacy terms before use.

### SiliconFlow example

```text
Provider: SiliconFlow
Type: OpenAI-compatible
Base URL: https://api.siliconflow.cn/v1
Model: Qwen/Qwen3-8B (editable; use a model available to your account)
```

Provider model IDs can change. The model field is editable rather than embedded as an unchangeable business constant.

### Custom OpenAI-compatible example

```text
Provider: My Provider
Base URL: https://api.example.com/v1
Model: my-json-capable-model
API Key: entered in Settings
```

The provider must expose compatible `/chat/completions` and `/models` endpoints and allow browser requests from the OfferFlow origin.

## Privacy

- No analytics or telemetry
- No account system
- No backend or cloud database
- No automatic scraping, login, or application submission
- Global Search excludes passwords, API Keys, and raw JD text
- Markdown is rendered with sanitization
- External links use `noopener noreferrer`
- Business data leaves the browser only when the user explicitly invokes a configured LLM for JD parsing

## Project structure

```text
src/
├── app/                 # routing, layout, providers, error boundary
├── components/          # shared UI and safe Markdown
├── db/                  # Dexie schema, migrations, repositories
├── features/            # cycles, positions, applications, pipeline, events, interviews, AI, data, search, settings
├── security/            # AES-GCM secret storage
├── test/                # test setup and DB helpers
└── types/               # domain types
```

## Testing

```bash
npm test
npm run build
```

Tests cover default/custom pipelines, immutable history snapshots, pipeline copy, StructuredJD validation, secret filtering, export/import round trips, cycle-scoped references, and search privacy boundaries.

## Contributing and security

- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Product requirements](docs/Job-Hunt-PRD-v1.0.md)

## License

[MIT](LICENSE)
