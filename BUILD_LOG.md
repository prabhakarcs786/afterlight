# Afterlight Build Log

Date: September 30, 2026. Tool: GitHub Copilot in VS Code.

This is a retrospective account of this build, not a reconstructed chat transcript. Do not claim the steps below were separate human-authored prompts. The user requested two independently runnable challenge entries; the assistant selected and implemented this concept for Path Two.

## Intent

Create a strange but usable content application rather than a read-only blog. A fictional future museum provided a reason for both imaginative drafting and careful separation of observation, speculation, and approval.

## Implementation Sequence

| Stage | Concrete work | Evidence |
| --- | --- | --- |
| Challenge routing | Read the official challenge and confirmed separate posts/project IDs | Official challenge URL in README |
| Scaffold | Created an independent Next.js app with its own dependencies | Package manifest and lockfile |
| Domain | Modeled observed fields, fictional copy, collection references, and four stages | Domain tests |
| Persistence | Added revision preconditions, bounded JSON, curator access, and safe failures | HTTP and repository tests |
| Visual assets | Authored eight Three.js reconstructions and captured transparent PNGs | Geometry tests and asset-render script |
| UI | Added collection filters, 3D inspection, intake, editing, approval, withdrawal, and export | Browser workflow tests |
| Synchronization | Kept local demo data separate from SSE-driven Sanity refreshes; preserved stale editor input | Two-tab browser test |
| Validation | Ran type-checking, lint, unit tests, production build, schema extraction, browser tests, and dependency audit | Commands in README |

## Actual Problems Found

- Sanity create-call typing included server-owned `_rev` and `_updatedAt`. The create input type was narrowed, then rechecked.
- Literal collection tuples confused the generic seed transaction. A common collection document type repaired inference without changing content.
- ESLint found unused initial values and an empty cleanup catch; these were fixed before interface work continued.
- The browser accessibility scan measured the workflow step numbers at 4.32:1 contrast. Their color was changed and desktop/mobile scans were rerun.
- Transitive Sanity CLI dependencies had published advisories. Verified patched versions were pinned, and the full npm audit subsequently reported zero advisories.

## Decisions Worth Keeping

- The agent can propose a story, but the transition engine controls state. Generated fields cannot overwrite observations or approve content.
- Published-in-Sanity and exhibited-in-Afterlight are different concepts. The gallery checks the workflow stage explicitly.
- Drafts live in a private dataset for the recommended live setup. The server's public query returns only exhibited records.
- Live configuration errors never show bundled demo content as if it came from Sanity.
- The sample drafting path does not call a model, and the UI says so.
- Current event history is capped at 100 records. No claim of immutable auditing is made.
- This application uses the official client, not the early-access Workflows engine or App SDK. Bonus-feature descriptions must not imply otherwise.

## Verified Locally

At this stage of the build: 30 unit/integration tests, 8 desktop/mobile browser tests, type-check, lint, production build, Sanity schema extraction, and npm audit passed. The browser tests exercised real Next.js routes in demo mode, local storage, WebGL rendering/movement, and accessibility scans. Cloud repository tests used mocks.

## Live-Readiness Follow-Up

A later readiness pass found that missing model credentials could still select a sample drafting template in the server path. Live drafting now fails explicitly without a configured provider; templates remain demo-only. Production also requires an explicit mode.

The project now has a secret-safe configuration doctor, an interactive setup wizard, and an opt-in live workflow exercise that creates, drafts, edits, reviews, exhibits, withdraws, and cleans up a temporary object. It checks stale revisions and public visibility. The checks themselves have unit tests, including cleanup on failure, but no live exercise has run because account settings are absent.

Latest local regression: 42 unit/integration cases and 8 browser cases pass, with type-checking, lint, and production build also passing. The wizard passed shell syntax and structural checks; it was not run through account login or secret entry. These results are not cloud-connectivity evidence.

## Still Needs the Entrant

- Create the real Sanity project/dataset and configure private credentials.
- Seed and run a live write, then confirm the changed document and revision in Studio.
- Verify live event refresh across two browsers. A local-storage event test is not proof of SSE delivery.
- Configure and test the actual model provider for live drafting, and record cost/error behavior.
- Deploy publicly, add judge access instructions, and insert the real project ID and URLs into the submission.
- Capture the final live screenshots and publish the separate Path Two DEV post before the deadline.

When publishing an agent session, inspect it for API keys, application access codes, personal data, private paths, and unrelated context. Only publish with the user's approval.