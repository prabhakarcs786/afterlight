# Path Two release readiness — 2 October 2026

## Result

The functional release passed the checks below locally and on `https://afterlight-beige.vercel.app`. The final public media links returned HTTP 200 after deployment; MP4 byte-range streaming returned HTTP 206. Chrome playback and seeking passed at desktop and phone widths with all gallery images loaded and no overflow or browser errors. This is a bounded challenge-release assessment, not a guarantee of every possible input or provider response.

## Challenge requirements

| Requirement | Evidence |
| --- | --- |
| AI-assisted build with Next.js and Sanity | Next.js application, Sanity schemas and client, dated Copilot build notes and Codex release work |
| Functional, original application | Future museum with eight original 3D reconstructions and curator-supplied images |
| Thoughtful content model | Collection references; observations separated from fiction; image assets; workflow state and retained events |
| Honest build-process write-up | `BUILD_LOG.md` and `SUBMISSION.md` distinguish retrospective notes, demo templates, real model calls, and known limitations |
| Real Sanity project details | Project `solj2ppn`, private `production` dataset, included in submission |
| Judge-accessible demo and source | Public collection, public GitHub repository, application-only curator access instructions |
| Separate Path Two submission | `SUBMISSION.md` remains a DEV draft with `sanitychallenge`; publication is a separate author action |

The application uses the Sanity client and an application-owned workflow in Content Lake. It does not claim the App SDK or early-access Workflows engine; the challenge makes those optional.

## Checks completed

- **57 unit tests:** domain transitions, authorization, request validation, grounding of drafting inputs, photo processing and consent, repository revision guards, live acceptance, and local storage.
- **12 desktop/mobile browser tests:** original asset rendering, rotation, zoom/reset, WebGL fallback, filters, catalogue download, photo intake, approval/withdrawal, local persistence, stale editors, provenance, keyboard/dialog behaviour, and automated accessibility checks.
- **Production build / TypeScript / lint:** passed.
- **Sanity schema extraction:** passed, including native image-asset references and workflow fields.
- **Full dependency audit (including development dependencies):** zero reported vulnerabilities.
- **Local real-service photo workflow:** Sanity/Gemini suggestions, intake, sanitised image storage, image-aware drafting, save, stale-write rejection, review, approval, withdrawal, observed-field and image preservation; temporary object/asset cleanup confirmed.
- **Local live photo UI:** consent required; suggestions leave existing form values intact until explicit acceptance; no exhibit saved by this isolated check.
- **Hosted real-service photo workflow:** the same HTTP acceptance flow passed against the deployed Vercel release.
- **Hosted independent-browser workflow:** real model drafting and persisted history verified; stale editor preserved unsaved text; Sanity change events observed; approval appeared and withdrawal disappeared in a separate visitor browser without a manual reload.
- **Capture:** actual hosted browser interactions with real provider responses; nine screenshots and a narrated 1080p demo. Authentication and provider waits are removed from the edited video; the final narration is synthetic Microsoft Ava speech. The sample upload is an original cup-model render. Temporary capture content was removed.
- **Thumbnail correction:** PNGs regenerated from canvas pixels, excluding captured development overlays.

## Limits and handoff

- Shared curator access permits mutations. Arrange judge access privately; the video and public gallery need no code.
- Provider quotas and availability can affect live drafting. The app reports failure rather than silently substituting a sample template.
- Sanity image URLs can be accessed independently of dataset privacy. Do not upload confidential images; withdrawal does not revoke cached asset URLs.
- Workflow history retains the latest 100 events. This is not individual-user attribution or an immutable audit service.
- Automated accessibility checks and selected real workflows do not replace comprehensive manual accessibility or security review.
- Final cleanup confirmed 3 collections, 8 objects, and 4 exhibited—the original catalog counts.
- Review and publish the separate DEV post after the Git push. The assistant has not published that post as part of this release.
