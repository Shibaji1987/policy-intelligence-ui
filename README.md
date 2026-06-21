# Policy Intelligence UI

Angular frontend for the Enterprise RAG Policy Intelligence Platform.

This UI exists to demonstrate the user-facing workflow of an enterprise policy
advisor:

```text
upload policy material
  -> inspect document versions
  -> inspect generated chunks
  -> run vector search
  -> ask the advisor for a grounded answer
  -> review source chunks and retrieval quality
```

Full local setup is documented in the API repo because the API repo owns the
Docker Compose stack:

```text
C:\Users\User\Documents\Codex\2026-06-14\files-mentioned-by-the-user-new\policy-intelligence-api\README.md
```

## Current slice

- Responsive enterprise application shell
- Document ingestion for PDF, TXT, and Markdown
- Fixed-size and sliding-window chunking controls
- Document and immutable version explorer
- Chunk inspection with embedding lifecycle status
- Typed API client and normalized error handling
- Lazy feature route, standalone components, signals, and `OnPush`

## Requirements

For Docker-based startup, only Docker Desktop and a shell that can run `.sh`
are required. The UI is built inside a Node container and served by Nginx.

For local UI development without Docker:

- Node.js 22.22.3 (`.nvmrc`)
- npm 10 or newer
- Policy Intelligence API on port 8080

## Run with Docker

The preferred project startup is from the API repo, because its Compose file
orchestrates UI, API, ML, and PostgreSQL together:

```bash
cd ../policy-intelligence-api
sh scripts/start-stack.sh
```

Open `http://localhost:4200`.

If Docker reports that it cannot connect to
`npipe:////./pipe/dockerDesktopLinuxEngine`, start Docker Desktop and wait until
the Linux engine is running. Verify with:

```bash
docker version
docker run --rm hello-world
```

## Run UI locally

```bash
npm ci
npm start
```

The Angular development server runs at `http://localhost:4200` and proxies
`/api` requests to `http://localhost:8080`.

If your default terminal still points to Node 20 or a global Angular CLI, use
the repo wrapper instead:

```bash
sh scripts/start-ui.sh
```

The wrapper frees a stale Angular dev server on port `4200` before starting.
It refuses to terminate unrelated processes.

## Verify

```powershell
npm run test
npm run build
```

## Structure

```text
src/app
|-- core
|   |-- config
|   `-- http
`-- features
    `-- documents
```

Business capabilities own their models, API adapter, view state, and UI.
Cross-cutting infrastructure belongs in `core`; a generic shared directory
should only be introduced when genuine reuse exists.

## Delivery

The production build emits static assets under `dist/policy-intelligence-ui`.
Runtime API routing should be handled by the deployment edge or reverse proxy.
Do not embed secrets in browser configuration.
