# Web integration verification

## Branches and boundaries

Development integration branch: `dev`. This work uses `feature/web-completion`, based on `d93fc742ec05b4259a5cd35ecec0a9f895787bd4`.
Production branch: `main`; its push workflow builds and deploys over SSH. Do not push or merge to main as part of local verification. Merge authority, required branch checks, issue tracker and QA owner are not documented in the repository and must be established before autonomous release.

Backend and Flutter repositories are reference-only. Contracts inspected at backend `854ad9a7320729a67c9d5e957ee33098dbb33924` and mobile main `bd262ab5e4cecb8bf1057f255e16d1abeb37e6e9` (development `51eb274a68a1125d5f19869344db171e4c4dbc56`). Design: Social-Knkt-web Figma file `bboKaTs6bIBPPVITnAKsQZ`, Final UI page `210:428`.

## Source conventions

Follow `dev`'s existing structure. All HTTP API functions, including signed uploads, belong in `src/action/action.js`; components and hooks import those functions rather than using fetch or request helpers directly. `src/utils/helper.js` owns authenticated transport and small shared utilities. Do not add per-feature API modules.

Keep reusable settings fields in the existing `src/pages/settings/components` directory and shared dialogs in `src/components/modals`. Header panels live beside Header in `src/layouts`. New route directories are limited to actual new screens (chat and search). Keep functions and JSX readable with separate statements and normal indentation. Do not compress whole components onto single lines.

The action contract tests also guard the single API module and prevent direct HTTP calls in UI code. Unit tests and Playwright fixtures use synthetic data; preserve this coverage when reorganizing files.

## Local setup

Use npm and the committed package-lock.json (`npm ci`). The existing CI selects Node 22; there is no narrower runtime pin. Copy `.env.example` into an ignored local environment file and supply the approved environment's public client configuration. Firebase initialization requires valid project configuration for normal interactive use. Never put private service credentials in VITE variables.

Set `VITE_SOCKET_URL` to the socket origin matching the API environment. Mobile source identifies `https://dev-api.socialknkt.com` for staging; that does not verify the deployment or authorize using its data. Without socket configuration, chat history remains readable and sending is disabled with reconnect feedback.

## Checks

After pulling/copying changes that update package-lock.json, stop the local Vite server, run `npm ci`, then restart it. If a previously running server still reports a missing installed import, use `npm run dev -- --host localhost --port 5173 --strictPort --force` to rebuild its dependency cache. Confirm the process belongs to this checkout; an old checkout on IPv4 and another server on IPv6 can serve different code for the same port. The canonical local checkout for this task is `/Users/shakti/Desktop/Projects/SocialKNKT/SocialKNKT-Frontend`.

- `npm run lint`: repository Oxlint rules; distinguish warnings from errors.
- `npm test`: API contract, component, pagination, retry, duplicate submission, profile and account isolation regression tests in jsdom.
- `npm run build`: production compilation; this does not establish deployed functionality.
- `npm run test:e2e`: Chrome at desktop 1440×1024 and emulated iPhone 13. Requires Google Chrome installed. Runs its own server on 127.0.0.1:5175 with synthetic Firebase configuration, synthetic accounts and intercepted API responses. No shared API writes are needed. Screenshots and failure traces are ignored under `test-results/`.

Browser coverage exercises connection filters and requests, profile persistence, search, notification navigation, chat history/offline state and contact email entry. Unit coverage includes socket lifecycle and profile upload contracts. Visual evidence must be retained in the approved private evidence location, with revision, viewport and mocked/live environment labels; do not commit personal screenshots or tokens.

## Behavior and limitations

Connections use the existing request endpoints, with personal/professional/both acceptance and authoritative request IDs. Edit profile reuses shared controls and preserves unrelated profile fields and collections. Search, notification links, saved flicks and shared links use existing API contracts and routes. Contact Us reads the existing admin contact details and opens an email draft; the user sends it from their mail app, and the web does not claim delivery.

The inspected backend's feeds search with media=false returns threads. Posts search currently exposes supported photo/video results; text-post search requires a backend contract correction. Clearing existing phonetic pronunciation is unsupported by the backend, and recorded pronunciation has no verified update contract. Chat implements verified text-message events; audio/media chat is not implemented without a verified contract.

Before QA sign-off, use authorized test accounts in a matching API/socket environment to verify two-user request acceptance/removal, profile upload storage and persistence, socket send/read/reconnect, account switching across tabs, and opening the configured email client. These live checks are separate from mocked browser tests. Deployment and store release are outside this task.
