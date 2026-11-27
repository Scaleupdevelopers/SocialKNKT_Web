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


## Remaining web API comparison (2026-11-27)

Compared local web baseline `e43268f` with backend `854ad9a7320729a67c9d5e957ee33098dbb33924` and mobile main `bd262ab5e4cecb8bf1057f255e16d1abeb37e6e9`. All changes are web-only on `feature/web-completion`; API calls remain in `src/action/action.js` and transport stays in `src/utils/helper.js`.

| Contract group | Comparison and web corrections |
| --- | --- |
| Authentication, signup, OTP, password recovery | Existing methods and fields match. HTTP failures now reject even for the SSO partial-registration flow; successful unfinished-registration responses remain supported. Invalid SSO user data cannot redirect to signup. |
| Profile, onboarding, geography, uploads, settings | Changed email is normalized consistently with login/recovery. Year-only and date-formatted education/location values compare by year; work dates retain full-date validation. Signed-upload and profile collection contracts retained. |
| Feed, profile posts, Flicks | Other-profile Flicks use the backend connection-aware default instead of forcing personal-only results. Home deletion restarts offset pagination and invalidates outstanding reads. Overlapping pages deduplicate by the caller's record identity. |
| Post comments and replies | Post owners can moderate comments/replies, matching backend and mobile; comment authors retain their existing controls. Thread moderation is not expanded. |
| KNKT, topics, location and search | Location regex metacharacters are escaped for literal prefix searches. Failed topic/location reads support retry and late responses cannot replace newer suggestions. Popular-topic views use the dedicated ranked endpoint while composers retain the full catalog. Location suggestions support offset pagination. Thread creation failures retain drafts, and a successful creation followed by refresh failure is reported separately. Existing comment/reply contracts remain. |
| Connections, chat, notifications, contact | Existing request and text-chat payloads match inspected callers. Comment-like notifications resolve the comment's parent post; thread notifications use the correct subject. Contact uses the approved admin-contact/email flow. |

Live read-only popular-topic check returned eight distinct topics. Live read-only location check: `[` reproduced HTTP 400 before escaping and returned a successful empty array afterward; `St. Louis` returned two results. Regression tests also cover literal `.`, `(` and `+`. Browser writes, moderation, identity-provider outcomes and error recovery use synthetic accounts/intercepted requests; this does not prove deployed backend behavior or live provider/storage/socket persistence.

Backend findings remain read-only and require the backend owner:

- Saved Flicks: missing `new ObjectId` still blocks the list; its projection also lacks the caller's `isLiked` state (`api/controllers/user/post/savePost/get-all-saved-post.js`).
- Reply deletion decrements the top-level post comment count although reply creation does not increment it (`api/controllers/user/post/comment/delete.js`).
- Popular-topic fallback uses string IDs to exclude ObjectId records and may repeat a topic; the web deduplicates IDs while retaining the returned order (`api/controllers/user/topics/get-popular.js`).
- Chat room listing can reuse another iteration's participant for an empty deleted room (`api/controllers/user/chat/room/get.js`).
- Source review found missing resource-ownership/membership checks in chat history, connection update/delete, post update and alternate-target account deletion; SSO also needs server-side provider credential verification. These were not tested against other users or exploited live. Client-side guards cannot enforce these server boundaries.

Previously documented text-post search, unstable offset ordering, Add Content product choice, and unverified live socket/media-chat limitations remain. Type-2 thread media stays optional on web because the backend supports it; mobile requires media, which is a product-parity difference rather than a rejected API contract. No backend/mobile changes, GitHub push, deployment or real-user write test is included.


Visual evidence: synthetic before/after notification labels and destinations were captured at 1440px and 390px in the private task workspace `work/api-audit-evidence`, with baseline `e43268f` and current runtime-file hashes recorded in `evidence.json`. Browser screenshots also cover lookup shimmer, retry and unavailable content. The temporary baseline snapshot and its servers were removed after capture. No real-user screenshots were committed.


Final verification for this local change: `npm test -- --maxWorkers=4` passed **305 tests across 30 files**; `npm run test:e2e` passed **46 Chrome desktop/mobile tests**; `npm run build`, `npm run lint`, and `git diff --check` passed. Lint retains warnings, the production bundle retains its size warning, and synthetic comment fixtures emit existing empty-image-src warnings. Initial async test timing failures were corrected by awaiting navigation/effect completion without weakening assertions. Independent review cleared auth/profile, notification routing, moderation, Home/shared pagination and KNKT after regressions covered session changes, stale read failures and request-lock ownership. Live `/knkt/topics` rendered eight topics with no alert or horizontal overflow. These checks cover local source and controlled test responses, not deployment or live cross-account writes.


## Automatic scroll pagination (2026-11-27)

From baseline `6d676a2`, manual Load more / Load older controls were replaced by automatic near-end reads in Profile posts/media, Flicks and saved Flicks, Connections, Search, notifications/requests, chat lists/history, comments/opened replies and KNKT location suggestions. Existing Home and KNKT main-feed scrolling remains. No API contract, filter semantics or backend/mobile source changed.

The existing `RequestState.jsx` now provides the shared observer trigger. It uses a genuinely scrollable ancestor or the viewport, excludes document roots, disconnects stale observers, and stops on loading, exhaustion or errors. The existing request locks and stale-response guards remain responsible for request ownership. Failure recovery remains an explicit Retry action; there is no automatic retry loop. Accessible loading labels remain visually hidden while existing shimmer placeholders are visible.

Profile My Feed and Your Flicks use separate keyboard-focusable scroll areas capped at `min(60vh, 560px)`, so one expanding media list does not push the other indefinitely down the page. Chat prepends older messages while preserving the viewport position. Replies stay lazy until their thread is explicitly opened.

Browser regressions use actual scroll containers and the existing synthetic API fixtures. They require no manual pagination button, retained items while shimmer is shown, appended results, stopped reads at exhaustion, no next-page request before scrolling a full-page list, and no retry loop after failure. An initial root-selection defect (body overflow treated as an internal pane) was caught in independent review and corrected; tests now distinguish constrained panes from document overflow. The jsdom scroll-area fixture explicitly supplies dimensions because jsdom has no layout engine.

Thirty synthetic before/loading-after/completed-after screenshots at 1440px and 390px are retained in the private task output `outputs/auto-pagination-evidence`, with source hashes and a gallery. They cover Profile posts, My Feed media, profile Flicks, main Flicks and saved Flicks. Live successful Saved Flicks remains subject to the previously documented backend defect; browser tests intercept that endpoint. No real-user writes or backend/mobile changes were made.

Final checks: `npm test -- --maxWorkers=4` passed **321 tests across 31 files**; `npm run test:e2e` passed **48 Chrome desktop/mobile tests** (final Playwright result: passed, no failed tests). `npm run build`, `npm run lint` and `git diff --check` passed. Existing lint warnings, bundle-size warning and synthetic empty-image-src warnings remain. Independent source review cleared the final runtime changes. These results establish local behavior with controlled API fixtures, not live backend success or deployment.


## Live scroll verification and duplicate mount reads (2026-11-27)

Baseline `3275098`; Chrome 158 against the existing authenticated session on `http://localhost:5173`, using the configured real API (no intercepted list responses). Profile posts returned 10 then 2 records; My Feed returned 10 then 3. Both page requests succeeded with HTTP 200, pagination shimmer appeared, previous items remained and exhausted sentinels disappeared. No duplicate list IDs or pagination buttons were observed. Desktop 1440px and mobile-width 390px checks found no horizontal overflow or JavaScript page errors. Profile media's desktop pane retained its 560px cap. One existing media tile displayed its unavailable fallback.

Before: StrictMode's mount-effect replay issued page zero twice for Profile posts, My Feed, own Flicks and the main Flicks list. After: per-effect microtask cancellation skips the discarded setup, so each list issued page zero once; subsequent page requests also occurred once. Cleanup still invalidates stale responses; explicit reloads remain immediate. No global cache, API contract, layout or backend/mobile change was added. Header/profile metadata StrictMode reads are outside this list-loading fix.

The live main Flicks endpoint and own-Flicks endpoint each returned only one item. Scrolling at the end did not start unnecessary reads or leave a shimmer stuck; real second-page Flicks behavior could not be exercised with this dataset. Existing synthetic Chrome coverage exercises multi-page Flicks. The existing session was reused; fresh password login was not needed. Normal application view tracking may run while scrolling; no posts, likes or profile edits were submitted.

Two StrictMode regression tests were added. The existing visibility test now supplies an actual video fixture and waits for its observer. Independent read-only review found no blockers. Network evidence above is aggregated; credentials, account IDs and response content are not stored here. No visual layout changed, so request counts and regression results are the before/after evidence for this fix.

Final verification: **323/323 unit tests** passed with `npm test -- --maxWorkers=2`; **48/48 Chrome checks** passed with `npm run test:e2e`; build, lint and diff checks passed (existing warnings remain). The earlier parallel unit run had one unrelated pronunciation cleanup timing failure; its focused rerun and the final full rerun passed without modifying that feature.


## Ask/Share location and category parity (2026-11-27)

Baseline `dded2bf`. All Header and Home entry points already share `AskShareModal`. It now uses a styled city/country dropdown instead of the browser-native datalist, and removable category chips with selected checkmarks instead of plain native checkboxes. The existing `action.js` functions remain the only API entry points: `getThreadLocations(query, page, 10)` and `getTopics()`. Location search is debounced, stale responses are ignored, and the existing paged-list/scroll trigger supports further results with shimmer and explicit retry. Selecting a location closes suggestions without querying the selected label again. Category selection remains capped at five; submission still sends type 1, trimmed question/location and topic IDs.

Keyboard checks cover focus returning to the location field, Escape dismissing its popup while preserving the modal, and category removal returning focus to its trigger. Dropdowns remain within the modal scroll area on narrow screens. Real Chrome checks on localhost confirmed Mumbai/Pune suggestions, live category catalog, five-selection limit and keyboard removal at 1440px/390px. No live thread was posted. Synthetic Chrome tests verify successful POST payload and the KNKT refresh after submission. Backend/mobile and KNKT page source remain unchanged.

Independent review identified focus/Escape issues and a function-complexity boundary; all were fixed and the final source review cleared. Before/after synthetic screenshots and source hashes are retained in the private task output `outputs/ask-share-dropdown-evidence`. Unit coverage includes debounce/stale reads, pagination failure/retry/deduplication, city selection, category limits/chip removal, draft preservation, submission locking and Escape/focus recovery.

Final verification: `npm test -- --maxWorkers=1` passed **327 tests across 31 files**; `npm run test:e2e -- tests/e2e/composer.spec.js` passed both desktop/mobile cases; build, lint and `git diff --check` passed with existing warnings. An earlier parallel run hit an unrelated KNKT observer-timing test failure; the final full single-worker run passed without changing KNKT source/tests. The private gallery contains 12 before/after captures at 1440px and 390px; the baseline native datalist popup cannot be captured as DOM UI and that limitation is recorded. No blocking visual findings remain.


## Remove composer picker shimmer (2026-11-27)

At the user's request, location/category reads inside Ask/Share and the KNKT thread composer no longer render shimmer placeholders or visible loading copy. Named visually hidden status regions remain for accessibility. KNKT composer categories already had no shimmer. Page/feed loading, API requests, selection, retries and automatic location pagination are unchanged.

From baseline `e642a34`: 31 affected unit tests passed; both desktop/mobile composer browser tests passed; build, lint and diff checks passed with existing warnings. Independent source review cleared the narrow change. Synthetic before/after loading captures are kept privately under `outputs/no-picker-shimmer-evidence`.


The subsequent screenshot report also fixes the location field's protruding input focus ring (focus now outlines the full rounded control), prevents re-focusing a selected city from querying its full label and showing a false empty result, and puts selected-category chips and the dropdown arrow in one compact wrapping row. Chrome verified the reported Indore, India selection with no re-opened listbox; mobile had no horizontal overflow. Regression coverage re-focuses selected locations and checks the category-row alignment.


## Chat Figma alignment (2026-11-27)

Baseline `b46e075`. Reference: Final UI chat frame `213:4935` in Social-Knkt-web (`bboKaTs6bIBPPVITnAKsQZ`), with high-fidelity design context and screenshot; clock instance `213:5054`. The chat shell, room-list spacing, conversation identity/actions and composer now follow those nodes. Seven SVG files were downloaded directly from the tool-provided Figma asset URLs into the existing `public/assets/logo_icons` directory, without editing their paths or dimensions. Runtime code uses only local paths. User avatars and message content remain API-driven; the global site Header was not restyled.

| Local asset | Design slot | Native width × height |
| --- | --- | --- |
| chat-search.svg | 213:5129, conversation search | 32.1409 × 32.1409 |
| chat-more.svg | 213:5130, conversation options | 32.1409 × 32.1409 |
| chat-emoji.svg | 674:660, emoji control | 32 × 32 |
| chat-add.svg | 674:675, attachment control | 32 × 32 |
| chat-send.svg | 674:671, send control | 38 × 38 |
| chat-search-field.svg | 493:5939 live area, sidebar search | 16.6667 × 16.6667 |
| chat-time.svg | 213:5054, room timestamp | 47.266 × 42.8545, within the design overflow wrapper |

The extra sidebar New message/Refresh conversations buttons were removed. Search chat retains matching existing rooms and searches connections through the existing action, excluding duplicate users. Choosing an existing room does not create another room. Delete chat remains available under the three-dot menu, with its confirmation and double-submit protection. Conversation search filters loaded history only and suspends automatic older-message reads while filtering. The emoji control appends to the existing text draft without sending. Menu actions restore focus or focus the delete confirmation; cancellation returns to the trigger.

Attachments and audio-message sending remain unsupported by the existing verified text-chat implementation: the exact attachment icon is shown disabled, rather than introducing an unverified media contract. Offline/reconnect and uncertain-delivery recovery remain visible only in those states. Real Chrome verified the existing room/header and nonempty local SVG rendering without sending a message or deleting history. Existing backend ownership findings remain separate and unchanged.

Synthetic desktop/mobile browser checks cover history, offline recovery, menu/search/emoji interactions and exact rendered action-icon geometry. Unit regressions cover user search/deduplication, no extra history reads during message search, menu focus and unchanged send/delete/pagination behavior. Independent review cleared the final runtime changes. Private before/after evidence and hashes are under `outputs/chat-figma-evidence`; no real-user screenshots are committed.

Final evidence: 21 chat unit tests passed; four desktop/mobile chat browser tests passed; build, lint and diff checks passed (existing warnings remain). The broad `npm test -- --maxWorkers=2` run had 328 passes and three ConnectionRequestsPanel failures: its observer callback was not installed before the first assertion, then queued mock responses affected later cases. All three passed in an isolated single-worker rerun without changing that unrelated source/test. Do not treat the initial broad run as a clean full-suite pass.

The final private gallery contains 10 captures. Measured desktop shell x132/y116/width1176, sidebar359, room135.69 and header65.078px match the design within browser rounding; mobile header65px and no horizontal overflow. All seven nonempty SVGs retain their intrinsic rendered geometry and expected callsites. Header search/menu and emoji interactions passed, with no JavaScript page errors. No message was sent and no live conversation was deleted during verification.

## Chat contract audit and delivery recovery (2026-11-27)

Baseline `58a41c3`; backend source `f6cd6addc23a8dac4138c1706e0f4ddc9ebafdc4`; mobile main `bd262ab5e4cecb8bf1057f255e16d1abeb37e6e9` and development `51eb274a68a1125d5f19869344db171e4c4dbc56`. The inspected mobile chat implementations match. They use websocket transport with query `{token}`, `join_room`/`leave_room` `{roomId}`, `read_room` `{roomId,userId}`, and `message` `{roomId,message,access_token}`. History/search use zero-based pages of 20; rooms are unpaginated. Delete is a per-user history cutoff, not physical message deletion. Mobile does not call a notification API when sending.

Neither mobile branch implements chat attachment selection, upload, encoding or media rendering. Backend `api/models/Messages.js` has a required string message and no media fields. Generic signed upload exists but does not establish a chat-media contract. Attachments remain disabled pending the user's choice between sending uploaded URLs as ordinary text (plain text on mobile), or a coordinated backend/mobile media contract. Do not introduce an unverified attachment payload. Custom socket handlers were not found in the inspected backend startup/configuration/assets/tasks; deployment may use another service. REST message creation is not a safe automatic socket fallback: the inspected controller neither broadcasts nor resets read flags nor invokes push.

Web fixes prevent already observed IDs from falsely confirming a new identical-text send, and register the uncertainty timer before emission so synchronous confirmation cancels it. The 1,200-character composer limit matches mobile, including emoji insertion. Visible-tab focus refreshes room previews/read state; simultaneous focus/visibility events and initial reads coalesce. Search pagination remains unchanged. Confirmation still uses text/time/ID heuristics because the verified contract has no client-generated message ID or delivery acknowledgement; cross-device identical sends and clock skew remain limitations. Never automatically resend an uncertain message.

Backend findings remain reference-only: message GET/POST lack room-membership checks; room listing can reuse the prior participant after a deleted room; unread count ignores deletion cutoffs; `/chat/notification` trusts supplied sender details without a mapped authentication policy. These are source findings, not exploitation/deployment evidence. The private task output `outputs/chat-contract-audit.txt` contains exact backend/mobile paths and lines. No backend/mobile files or shared service data were changed.

Real Chrome at localhost:5173 opened an authenticated room and history without overflow, and confirmed maxlength=1200. Socket remained offline, so live two-user send/read/reconnect, upload persistence and media interoperability are unverified. Non-visual logic changes use regression evidence rather than new visual screenshots; existing chat browser captures continue to verify desktop/mobile layout.

Validation: full single-worker suite passed 337 tests in 31 files; after the final early-focus regression, the affected chat suites passed 30 tests in 2 files. Four Chrome desktop/mobile chat cases passed. Build/lint passed with existing warnings; diff check passed. Independent review found and cleared initial-focus duplicate loading and emoji-limit bypass. A strict complexity probe still flags the unchanged `useChatList.load` function at 11 (limit 9); changed functions introduce no new violation. No live messages, notifications, deletes or uploads were sent.

## Connection request dropdown layout (2026-11-27)

Baseline `905c8a9`. The generic `.connection-request-content > div` flex rule applied to both the action row and acceptance menu, making menu buttons horizontal and clipping later options. The action row now has its own class. The menu stacks Personal, Professional and Both vertically in document flow, stays within the panel width and pushes the footer below it. Request text can wrap; the avatar stays aligned to the start of the request; keyboard focus has an inset outline. Acceptance status mapping and API behavior are unchanged.

The browser regression failed on the baseline in desktop/mobile Chrome and passed after the fix, checking option visibility, vertical ordering, text clipping, footer separation and avatar alignment, then accepting Both with the existing request ID/status contract. Three request-panel unit tests passed; build and lint passed with existing warnings. Before/after synthetic captures are retained privately in the task output `outputs/connection-menu-evidence/index.html`. No live connection was accepted/declined during these checks.

## Remove extra connection footer (2026-11-27)

Figma design context and screenshot for `213:6784` in `bboKaTs6bIBPPVITnAKsQZ` confirm that Connection Requests has no View connections footer. Removed that button and its unused navigation hook from baseline `4feb2c8`. Existing header-icon/spacing differences are outside this targeted removal. Two Chrome desktop/mobile checks pass, including footer absence, dropdown layout, keyboard access and accepting Both. Lint passes with existing warnings; independent review cleared. Private synthetic before/after evidence: `outputs/connection-footer-removal`. No live request was accepted or declined.

## Private-profile content state (2026-11-27)

Baseline `d616c0f`. Other profiles with numeric/string `profileType=2` render the mobile private-account copy and original `assets/svg/lock.svg` (mobile main `bd262ab5e4cecb8bf1057f255e16d1abeb37e6e9`) instead of mounting post/feed/flick components. Web asset: `public/assets/logo_icons/profile-private-lock.svg`, original 39×44 geometry. All/Media/Posts remain selectable; own profiles stay accessible regardless of privacy. All retains profile summary/bio, and private documents are not mounted. Mobile-width All places the lock state before the long summary. No request errors are reclassified by matching arbitrary error messages.

Contract limitation: mobile's audience views allow accepted personal/professional connections, but current backend `f6cd6addc23a8dac4138c1706e0f4ddc9ebafdc4` rejects private profiles before relationship checks in `api/controllers/user/post/get-all-other-user-post.js:97`, `get-all-other-user-flick.js:96`, and `get-all-other-feed.js:91`. The web therefore respects that restriction even for accepted connections. Mobile copy says connect to view; acceptance alone cannot unlock those current web endpoints until the backend contract changes. Do not fall back to legacy `GET user/profile/posts`, which lacks equivalent privacy checks. No backend/mobile files were changed. This display guard is not a replacement for server authorization or an application-wide privacy audit.

Validation: 23 profile tests passed, covering all three tabs, string/numeric privacy, accepted/pending connections, owner access and stale public response after a private-profile refresh. Two synthetic Chrome desktop/mobile tests passed with zero other-profile content requests and a nonempty lock asset. Build/lint passed with existing warnings; independent review cleared. Before evidence is the user's supplied screenshot showing the retry error; after captures are private under `outputs/private-profile-evidence`. Live private-connection unlocking and mobile runtime were not tested.

All-tab follow-up from `b604e31`: the private-account icon/copy is vertically centered alongside the bio column, with a 320px minimum content area. Mobile ordering remains unchanged; standalone Media/Posts styling is unaffected. Both desktop/mobile Chrome checks pass with geometry assertions for centering and minimum height. Independent review cleared; private before/after captures are under `outputs/private-profile-centering`.

## Connection card API details (2026-11-27)

From `98fcb59`, removed invented SocialKNKT member designation and zero-count fallback. Cards retain image/name/username, followed by actual `jobTitle` and numeric `totalNoOfConnections`, then city and country. Missing fields are omitted; a real zero count remains visible. Backend `api/controllers/user/profile/connections/get.js` supplies these fields, with current/first work and place records; no new profile requests or API changes are needed. The name/username row wraps at narrow widths.

Eight Connections unit checks pass (including populated, missing and zero-count details), along with both desktop/mobile Chrome connection-flow cases, build, lint and independent review. Existing warnings remain. Synthetic captures are in `outputs/connection-card-details`; no live connection was changed.

Visual review also found mobile action buttons squeezing card details. At ≤700px, the profile/details now occupy a full row with actions below; a browser geometry assertion prevents recurrence. Final desktop/mobile captures and independent review confirm the corrected layout.

## Add Professional / Personal parity (2026-11-27)

Baseline `419db1e`. Mobile main `bd262ab5e4cecb8bf1057f255e16d1abeb37e6e9` and development `51eb274a68a1125d5f19869344db171e4c4dbc56` have identical audited Connections behavior. `lib/view/screens/dashboard/profile/connections_list.dart:195–215,243–255` shows own-list actions: personal=false → Add Personal; otherwise professional=false → Add Professional; both=true → no Add. Missing flags are not interpreted as false. Both=false follows mobile's first Add Personal branch. Other users' lists expose no relationship mutations.

Add calls `POST /user/connection-request` with `{connectUserId: peerId, connectionType: 'personal'|'professional'}` through the existing action. It creates a separate status-0 request rather than immediately changing the accepted connection. The recipient uses `PUT /user/connection-request` with `{connectionId: requestId,status}` (1 professional, 2 personal, 3 both, 4 decline). Existing opposite-type connection remains until further server-side action. API source: `api/controllers/user/connection-request/create.js:65–130`. Mobile controller: `lib/controllers/connection_request_controller.dart:91–108,133–139`.

Professional filter uses `GET /user/profile/connections` with `filter=1`; Personal=2; All omits the filter (mobile sends 0, same unfiltered behavior). Mobile `connections_filter.dart:4–22` and `connection_list_controller.dart:28–54,88–105` hide the filter during search and reset searches to All. Web now follows that behavior and preserves page-zero reset.

Pending/success/error state and the synchronous send lock now belong to the session-keyed page, so filter/search row remounts cannot submit twice or forget a successful send. Failure permits retry; managing a completed request clears the local acknowledgement and refreshes the list. Account changes reset state. No new API module, persistence store or per-card reads were added.

Limitation: current connections list includes accepted flags only, not an outgoing pending-upgrade field. Profile-detail `connectionId` can be overwritten by another relationship record, so it cannot reliably restore pending direction. A full reload/navigation away loses the local acknowledgement; existing pending requests may then be rejected by the backend. Web does not infer direction from duplicate-request errors or claim acceptance from a successful send. Server duplicate prevention is read-before-create, not proof of atomic uniqueness. Mobile also does not persist/refetch pending upgrades. Backend/mobile remain unchanged.

Verification: 26 focused Connections/action tests pass, including both type payloads, exact CTA visibility, errors/retry, duplicate clicks, pending filter remounts, successful search/filter retention and account isolation. Both Chrome desktop/mobile cases pass with mocked writes. Build/lint and changed-file complexity check pass (existing build/lint warnings remain). Independent review cleared the pending-remount race after the state/lock move. No real connection request was sent. Synthetic before/after filter-state evidence is retained in `outputs/connection-upgrade-evidence`.


## Connected private profile content (2026-11-27)

Supersedes the blanket private-profile lock behavior above. Baseline `8d68034`. Mobile main `bd262ab5e4cecb8bf1057f255e16d1abeb37e6e9` gates private content by nullable accepted personal/professional relationship IDs; pending `connectionId` does not grant access. Web now uses these accepted flags for private profiles and retains the lock for unaccepted audiences or blocked relationships. Owner/public routes remain unchanged.

The legacy POST other-user posts/feed/flicks routes reject every private profile before relationship checks. Accepted private profiles now use the mobile `GET user/profile/posts` contract through `src/action/action.js`: userId, zero-based page, media=false, postType=1 professional or 2 personal. Each permitted audience has ten raw items per page. All merges accepted audiences, deduplicates shared posts, and orders accumulated results newest-first. Media separates image/video and flick entries from these authorized-audience results. Raw-page lengths control pagination even when a page contains no matching media. The existing web Posts filter uses reversed legacy values; the adapter explicitly maps them.

Backend limitation: the mobile GET handler currently does not enforce privacy, accepted relationship, block, or deleted-post restrictions server-side. Web gating does not fix that server authorization gap. Backend/mobile remain unchanged; backend needs independent remediation. Source: `api/controllers/user/profile/posts/get-one.js` at backend `f6cd6addc23a8dac4138c1706e0f4ddc9ebafdc4`.

Verification: 42 focused Profile/action tests pass, including owner access, unconnected/pending lock, accepted personal/professional/both, blocked relationships, filter gating, refresh, sparse media pagination, and cross-page chronology. Full suite before the final chronology regression: 368 tests passed; final focused suite includes that regression. Chrome desktop/mobile locked and accepted-private cases pass against controlled API responses. Build, complexity and diff checks pass; existing lint/build warnings remain. Independent review cleared the cross-page ordering finding.

Live read-only browser verification reached the deployed mobile profile/posts route successfully, but the available session's connected target is public; the exact live private-connected pair remains unverified. No live relationship or privacy setting was modified. Before evidence: reported connected-profile lock and baseline source guard. Synthetic after screenshots: `outputs/connected-private-profile/after-desktop.png` and `after-mobile.png` in the task workspace.
