# Policy Intelligence UI

Angular frontend for the Enterprise RAG Policy Intelligence Platform.

This repo contains the browser application. It lets users upload policy
documents, inspect generated chunks, test vector search, ask the advisor, and
review source-grounded answers.

## Related Repositories

Clone all three repos side-by-side:

```text
policy-intelligence-workspace/
|-- policy-intelligence-api/
|-- policy-intelligence-ui/
`-- policy-intelligence-ml/
```

Repos:

```text
API: https://github.com/Shibaji1987/policy-intelligence-api
UI:  https://github.com/Shibaji1987/policy-intelligence-ui
ML:  https://github.com/Shibaji1987/policy-intelligence-ml
```

The API repo owns the full Docker Compose stack. Start the platform from there.

## Why This UI Exists

Most RAG demos hide the important internals. This UI is intentionally designed
to make the pipeline visible:

```text
upload policy material
  -> inspect document versions
  -> inspect generated chunks
  -> see embedding lifecycle status
  -> run direct vector search
  -> ask the advisor
  -> review answer, sources, and retrieval quality
```

That makes the app useful for demos, architecture discussions, debugging, and
explaining how RAG systems work beyond a chat box.

## What It Demonstrates

- Angular standalone components
- typed API client services
- lazy feature routing
- responsive enterprise dashboard layout
- document upload with multipart forms
- tenant and metadata capture for governed retrieval
- chunking controls
- document and version explorer
- chunk inspection
- vector search UI
- advisor interaction UI
- hybrid score display, including vector, keyword, and combined scores
- retrieval trace detail for retrieved, used, and discarded chunks
- feedback buttons for good/bad retrieval labels
- golden-question starter panel for evaluation walkthroughs
- Nginx-based production container
- API proxying from `/api` to the backend container

## User Workflow

```text
1. Open http://localhost:4200
2. Upload a PDF, TXT, or Markdown policy file
3. Choose chunking strategy, chunk size, and overlap
4. Confirm document versions appear
5. Inspect generated chunks
6. Run vector search
7. Ask the advisor a policy question
8. Review answer, sources, retrieval quality, and verification status
9. Inspect trace detail to see retrieved, used, and discarded chunks
10. Submit good/bad feedback for future model training
```

Suggested test question:

```text
Can contractors access production customer data, and what approval is required?
```

## Runtime Architecture

In Docker, this UI is built once with Node and served by Nginx:

```text
Browser
  -> Nginx UI container on localhost:4200
      -> static Angular assets
      -> /api proxy to Spring Boot API container
```

The browser uses relative API URLs:

```text
/api/v1
```

That means no browser secret or backend URL is embedded in the frontend bundle.
Nginx handles routing `/api` to the API service inside Docker.

## Requirements

For Docker-based startup:

- Docker Desktop
- Git Bash, WSL, or another shell that provides `sh`

For local UI development without Docker:

- Node.js 22.22.3
- npm 10 or newer
- API running on `http://localhost:8080`

## Start Full Platform With Docker

Run this from the API repo:

```bash
cd ../policy-intelligence-api
sh scripts/start-stack.sh
```

Open:

```text
http://localhost:4200
```

If Docker cannot connect to:

```text
npipe:////./pipe/dockerDesktopLinuxEngine
```

start Docker Desktop and verify:

```bash
docker version
docker run --rm hello-world
```

## Run UI Locally

Use this only when actively developing UI code.

```bash
npm ci
npm start
```

The Angular dev server runs at:

```text
http://localhost:4200
```

It proxies `/api` requests to:

```text
http://localhost:8080
```

If your machine has Node 20 globally, use the wrapper:

```bash
sh scripts/start-ui.sh
```

The wrapper uses the bundled Node 22 runtime if present and frees stale port
`4200` when it belongs to an old Angular process.

## Build And Verify

```bash
npm run build
```

Tests:

```bash
npm test
```

Full local check:

```bash
npm run check
```

## Docker Image

Build from this repo:

```bash
docker build -t policy-intelligence-ui .
```

The Dockerfile uses:

```text
node:22.22.3-alpine  -> build Angular
nginx:1.27-alpine    -> serve production assets
```

Nginx config:

```text
nginx.conf
```

Production assets are served from:

```text
/usr/share/nginx/html
```

## Project Structure

```text
src/app
|-- core
|   |-- config
|   `-- http
`-- features
    `-- documents
```

Important files:

```text
src/app/core/config/api.config.ts
src/app/features/documents/documents-api.service.ts
src/app/features/documents/documents-page.component.ts
nginx.conf
Dockerfile
scripts/start-ui.sh
```

## API Surface Used By UI

The UI calls:

```text
POST /api/v1/documents
GET  /api/v1/documents
GET  /api/v1/documents/{documentId}/versions
GET  /api/v1/documents/versions/{versionId}/chunks
GET  /api/v1/retrieval/search
POST /api/v1/advisor
GET  /api/v1/retrieval-traces
```

## Security Notes

- Do not put API keys in frontend code.
- Do not put backend host secrets into Angular environment files.
- The UI calls relative `/api` paths.
- Secrets belong in the API runtime, not the browser.

## Troubleshooting

### UI loads but API calls fail

Check the API through the UI proxy:

```bash
curl http://localhost:4200/api/v1/ml/health
```

If this fails, check API logs from the API repo:

```bash
sh scripts/logs-stack.sh api
```

### Port 4200 is already in use

For Docker:

```bash
docker compose ps
docker compose restart ui
```

For local Angular:

```bash
sh scripts/free-ui-port.sh 4200
sh scripts/start-ui.sh
```

### Angular CLI says Node version is too old

Use Node 22.22.3 or run:

```bash
sh scripts/start-ui.sh
```

## Delivery Notes

This UI is production-shaped for local/demo use:

- static frontend assets
- Nginx edge container
- no browser secrets
- relative API routing
- Docker-compatible build

For cloud production, add TLS, CDN or managed ingress, observability, and
environment-specific deployment manifests.
