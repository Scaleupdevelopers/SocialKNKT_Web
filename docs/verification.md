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

The inspected backend's feeds search with media=false returns threads. Posts search currently exposes supported photo/video results; text-post search requires a backend contract correction. Pronunciation uses the mobile `user/complete-profile` endpoint for both `record_name` audio URLs and `phonetic_spelling`, including explicit clears. Editor saves omit `stepCount`; onboarding sends step 4. Chat implements verified text-message events; audio/media chat is not implemented without a verified contract.

## Flow comparison, 27 November 2026

The comparison uses Figma Final UI and the source revisions above. Source contracts and mocked browser checks do not establish that the deployed backend matches these revisions.

| Flow | Findings and verification scope |
| --- | --- |
| Signup, OTP and passwords | Canonical email handling; signup token held in memory until successful verification. A refreshed verification page safely returns to sign-in after verification because no pending token is persisted. |
| Onboarding details | Education year keys match the backend model; current-location selection preserves the chosen country; cascading location reads and submissions are guarded. |
| Pronunciation and profile editing | Actual MediaRecorder audio uploads, playback, retry and cleanup; shared recorder in the existing editor. Save and Skip proceed to Add Media. |
| Onboarding Add Media | Profile picture and banner save through existing signed uploads and profile actions, with partial-failure retry and preview cleanup. “Add Content” is explicitly unavailable pending the requested choice between profile headshots and feed posts; photos are not silently discarded or published. |
| Own/other profiles | Backend summary fields, recorded-name playback, report-user contract, block ownership, list pagination and recovery. |
| Home, Flicks and KNKT | Flick upload intent and mobile-compatible link media type; real question submission; resolvable thread links; visible post/flick view recording. |
| Comments and replies | Authoritative IDs replace temporary IDs; reply pagination, retry and parent comment counts. Deletion must restart offset pagination and invalidate outstanding reads so the next record is not skipped. The same regression is covered for profile posts and flicks. |
| Connections, search, notifications | Existing browser regression flows retained. Search limitations above remain backend-dependent. |
| Settings | Permanent-deletion copy matches backend behavior; deleted blocked-user records are filtered and list errors support retry. |
| Contact | Existing admin contact/email composition flow, as approved; no invented message-submit API. |
| Chat | Existing history and text socket lifecycle coverage retained. Live two-user send/read/reconnect and media/audio parity remain unverified. |
| KNKT Fund | Informational in both clients; no verified voting/donation API. Web copy says 10% while inspected mobile main says 20%; retain existing web copy pending product confirmation. |

New writes and destructive actions are tested with intercepted APIs and synthetic accounts. Browser evidence is kept locally in ignored test output; no live reports, blocks, posts, account deletions or uploads are required for this suite. No backend/mobile files are changed and no GitHub push is part of this task.

Before/after synthetic UI evidence compares `eecc21e` with this local change for onboarding pronunciation, pronunciation editor, user report, and Add Media at 1440×1024 and 390×844. The task's private local `work/flow-audit-evidence` directory retains these captures; current automated screenshots are regenerated under ignored `test-results/`. Real microphone hardware, identity-provider popups, signed storage persistence and deployed socket behavior are separate checks and remain unverified in this comparison.

Changed functions were checked against a cyclomatic complexity maximum of 9 and split into local components/helpers where needed. Some untouched legacy functions still exceed that threshold; the normal lint command does not enforce a whole-repository complexity limit. Normal lint also retains existing warnings and the production build reports a large bundle; neither is a deployment-readiness claim.

Final local verification for this comparison: `npm test` passed 213 tests in 26 files; `npm run test:e2e` passed 22 Chrome desktop/mobile tests; `npm run lint` passed with 37 warnings and no errors; `npm run build` passed with the large-bundle warning; `git diff --check` passed. These checks use the local source tree, synthetic API fixtures and the existing lockfile. No production rollout or live write verification is claimed.

Before QA sign-off, use authorized test accounts in a matching API/socket environment to verify two-user request acceptance/removal, profile upload storage and persistence, socket send/read/reconnect, account switching across tabs, and opening the configured email client. These live checks are separate from mocked browser tests. Deployment and store release are outside this task.


## Application loading shimmer (2026-11-27)

Read-only API loading indicators now reuse `LoadingSkeleton` in the existing common `RequestState.jsx` file and the Home-style highlight in `globals.css`. Lists, media, profiles, chat, comments, categories, onboarding geography, settings and contact use content-shaped placeholders. Existing Home and other specialized skeletons remain. Pagination keeps loaded results mounted; profile refresh keeps form drafts. Submission/upload feedback and API contracts are unchanged.

Regression checks cover deferred initial reads, replies and pagination, disabled location choices, refresh draft preservation and accessible loading labels. `tests/e2e/loading.spec.js` verifies the animated pseudo-element, visually hidden status, reduced-motion opt-out, retained connections during pagination and no horizontal overflow on Chrome desktop/mobile. Synthetic before (`dfabda1`) and after screenshots are retained privately in the task workspace `work/shimmer-evidence`; the browser suite regenerates after captures in ignored `test-results/`. Browser checks intercept APIs and do not establish live service behavior or physical screen-reader announcements.

Validation: 224 unit tests in 26 files passed; 22 existing browser cases and 2 new shimmer cases passed. Lint passes with existing warnings; production build passes with the existing large-bundle warning. Independent review found and resolved busy-status announcement suppression and missing initial profile-media announcements. Changed functions meet complexity below 10; untouched legacy violations remain outside this presentation change. An initial full-suite run exposed intermittent observer initialization in an existing Flick test; its isolated run and subsequent full run passed without changing production behavior.


## Chrome loading and pagination audit (2026-11-27)

Audited local `localhost:5173` from source `4e95a74` using the existing authenticated Chrome 158 session, then rechecked fixes locally. Desktop 1440×1024 and mobile-width 390×844 each covered Home, Connections, Search, Profile, Edit Profile, Settings, Chat, KNKT, Popular Topics, Flicks, KNKTfund, Contact Us, Work Experience, Education, Location, Pronunciation and Add Media. Temporary delayed GET responses made initial shimmer visible; normal networking was restored afterward. Static screens without read requests correctly have no shimmer. Auth/OTP submission flows were outside this read-loading audit.

Also exercised notifications/request panels, blocked users, profile posts/media, saved Flicks, existing chat history, comments and replies. Live Home pagination retained 10 posts and appended 3. Live KNKT initially appended five duplicate threads from overlapping pages; reusing the existing `mergeResults` helper now yields 12 unique cards from 10 initial cards, without duplicate-key errors. No uncaught JavaScript errors or horizontal overflow occurred in the route sweep. The account has insufficient records to exercise every next-page path live, so synthetic browser coverage supplies those cases without creating real data.

Loading layout fixes: media grids now reserve unoccupied columns (`auto-fill`) so a single placeholder no longer expands to 852×1136px; its measured tile is approximately 129×172px. Flicks pagination skeletons now participate in mandatory scroll snapping and cannot flex-shrink away; before the fix their viewport intersection was zero on desktop and mobile. Original cards remain mounted during loading. The Flicks layout also uses the actual header height and reserves a separate row for the optional All Flicks link, avoiding clipped navigation on mobile; regression checks require the header, saved link and feed to stay within the viewport.

`tests/e2e/loading.spec.js` now covers initial media sizing, profile posts/media, Flicks/saved Flicks, search, chat older messages, comments/replies, notification/request panels, KNKT overlapping pages and connections. Checks require positive placeholder dimensions, viewport visibility, retained content and removal after completion. Synthetic screenshot evidence is generated under ignored `test-results/`; Add Media before/after screenshots are retained privately in the task workspace `work/chrome-shimmer-audit`.

Live limitation: `user/post/get-saved-posts` returns HTTP 400 with “Error fetching saved flicks”, including on retry. The web stops its loader, displays retry feedback and shows shimmer while retrying. Successful saved-list and pagination UI were verified with intercepted synthetic data; live successful saved-list loading remains blocked by the backend response. No backend/mobile edits or pushes were made.

Validation: unit suite 224/224 passed; production build and lint passed with existing bundle/lint warnings. Focused Flicks viewport tests failed before the snapping correction and passed afterward. The full Chrome desktop/mobile suite passed 40/40; after the final Flicks height adjustment, both affected desktop/mobile pagination cases passed again (normal and saved modes). Independent agent review covers the implementation and regression checks.
