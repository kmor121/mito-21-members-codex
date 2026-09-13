# Base44 Dev Environment

## What this is
Vite 6 + React 19 SPA for the MITO21 membership system. Frontend-only — all data
goes through `@base44/sdk` to a remote Base44 backend
(`https://mito21-members-codex-da487265.base44.app`, app id `69ad0dadda7f546dda487265`).
No local database, no local backend, no external credentials needed.

## Running
- `docker compose -f docker-compose.base44.yml up -d` — starts Vite dev server on port 3000 (maps internal 5173).
- Vite `root` is `src/`, so the entry HTML is `src/index.html` (not the root `index.html`).
- `server.js` is a production static server for the built `dist/` — not used in dev.
- `npm install` runs inside the container on startup; node_modules are in an anonymous volume so host installs don't conflict.

## Verification
- `curl http://localhost:3000/` should return 200 with the Vite dev HTML (contains `@vite/client`).
- `curl http://localhost:3000/main.jsx` and `/App.jsx` should return 200 (live source modules).

## Notes
- The app is in Japanese (lang="ja").
- `base44Client.js` points to the remote Base44 backend when running on localhost; in production it uses `window.location.origin`.
- No `.env` or secrets required — the SDK client hardcodes the remote URL and app id.
