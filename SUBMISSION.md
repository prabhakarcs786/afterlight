---
title: "Afterlight: tiny objects, improbable afterlives, and a human final say"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

**A museum from 2126. Everyday objects, imagined stories, and a curator's final say.**

Afterlight lets us imagine what ordinary objects might mean to the future. A cassette becomes a pocket-sized time machine. A key is permission to come home. A light bulb is borrowed sunrise. Now a curator can also upload an image of their own object and give it a place in this fictional museum.

The app opens into the collection, not a promotional page. You can inspect and rotate original 3D reconstructions, filter collections, and export a catalogue record. Behind the collection is a curator desk: intake, draft, review, exhibition, and withdrawal.

The creative idea is the future museum. The design question underneath it is how to let AI be imaginative without treating its inventions as observations or letting it publish itself. Those fields stay separate, and the drafting action cannot approve an exhibit.

Uploaded images remain photos, not invented 3D reconstructions. Gemini can suggest catalogue details, but the form does not adopt them until the curator chooses **Use these details**. The suggestions are explicitly unverified. A separate fictional interpretation goes through drafting, review, and approval.

## Demo

- Application: [Open Afterlight](https://afterlight-beige.vercel.app)
- Recording: [Watch the 1 minute 38 second narrated walkthrough](https://afterlight-beige.vercel.app/demo.html), with English captions. [Direct MP4](https://afterlight-beige.vercel.app/demo/afterlight-demo.mp4) · [Transcript](https://afterlight-beige.vercel.app/demo/narration.txt). No login is required to watch.
- Repository: [Public source on GitHub](https://github.com/prabhakarcs786/afterlight)
- Sanity project ID: `solj2ppn`
- Dataset: `production` (private)
- Visitors can browse without a code. Judges can request the separate app-only curator code privately to exercise the editing workflow; provider and Sanity tokens are never shared.

![Real Gemini photo suggestions remain separate from the curator's form until explicitly accepted](https://afterlight-beige.vercel.app/demo/screenshots/04-ai-suggestions.png)

The recording and screenshots are from the deployed app using real Sanity and Gemini. The sample upload is an image rendered from an original cup model, not a personal photograph. Authentication and provider waits were removed from the video, and narration uses a synthetic Microsoft Ava voice. The temporary exhibit was withdrawn and cleaned up after capture.

### A Short Judge Walkthrough

1. Inspect the cassette: rotate the original model and compare its observed details with the clearly labelled fictional story.
2. Open **Curator desk -> New object -> Your photo**. Choose an image you have permission to upload.
3. Consent, request Gemini suggestions, review them, and choose **Use these details** only after checking them.
4. Save the intake record, draft its fictional interpretation, edit the label, and submit it for review.
5. Approve the exhibit, open it in the public collection, and inspect **From object to exhibit** for the recorded decisions.
6. Return it to draft with a reason. It disappears from the gallery, while its workflow history remains.

![A curator reviews the label before approving the exhibit](https://afterlight-beige.vercel.app/demo/screenshots/06-human-review.png)

![The public exhibit shows its retained workflow history](https://afterlight-beige.vercel.app/demo/screenshots/08-workflow-history.png)

Starter exhibits are disclosed as seed snapshots, not fabricated live approvals. A newly processed object has its actual retained draft, review, approval, and withdrawal events.

## Code

[Review the public Afterlight repository](https://github.com/prabhakarcs786/afterlight), including setup instructions, schemas, workflow logic, and automated checks.

## Sanity Project Details

Project `solj2ppn` uses the private `production` dataset. The public app serves approved exhibits through its server; curator access is separate from dataset credentials.

## How I Used Sanity

The schema has collections, artifacts, and embedded workflow events. Artifacts reference collections and separate observed material and details from fictional interpretation, exhibition copy, and a strangeness rating.

Photo exhibits reference native Sanity image assets with alternative text. Image contents are validated, resized, and stripped of metadata before upload. The original submitted base64 payload is not stored in the artifact document.

Workflow state sits beside the content. The application enforces allowed transitions and writes the state and event together using Sanity's revision precondition. An outdated editor gets a conflict instead of overwriting another curator. Studio has a custom stage-based navigation structure and separates observations, interpretation, and workflow fields.

Live events are delivered through a server-side Sanity listener. The browser receives only a change notification and refetches the appropriate public or protected view. Sanity credentials never enter the browser.

This is an application-owned workflow on Content Lake, not a claim that I used the early-access Workflows engine or App SDK. The distinction matters: Studio read-only fields are not a security boundary, and a writer with broad dataset credentials can bypass app rules.

## My Build Process

I used GitHub Copilot in VS Code for the initial build, and Codex for release review, verification, and the narrated showcase. The starting request was to create independently runnable entries for both paths. The museum concept, implementation decisions, models, and tests were developed with the assistant.

The build proceeded in small checked steps:

1. **Rules before screens.** The first implementation established that automation can draft but not approve, incomplete labels cannot enter review, and exhibited content cannot be edited without first returning to draft.
2. **Persistence before polish.** The same transition function drives the local demo and the live mutation path. Tests verified stale revision rejection and the actual `ifRevisionId` call in the mocked Sanity boundary.
3. **Original objects.** Eight models were assembled in Three.js. A browser rendering script captured local PNGs after checking for nonblank pixels. The detail view keeps the object interactive rather than replacing it with a decorative screenshot.
4. **A complete curator loop.** Intake, template/model drafting, editing, review, approval, withdrawal, exports, and local persistence were connected to the UI.
5. **Let the browser disagree.** Desktop and mobile tests exercised the entire workflow. They found a low-contrast workflow-counter color; it was corrected and the same tests passed afterward.

6. **Make the museum personal.** Feedback exposed that choosing from eight modelled objects was less compelling than contributing your own object. I added photo exhibits, image-aware Gemini drafting, explicit consent, and reviewable rather than auto-applied suggestions. I deliberately did not pretend a rotating photo was a reconstructed 3D model.
7. **Make the process visible.** Visitors can now inspect the exhibit's retained decision trail. The UI explicitly says when no approval event was recorded instead of manufacturing provenance for seeded examples.

8. **Prove the release before recording it.** Codex checked the new photo flow against real Sanity and Gemini, then exercised approval, withdrawal, and stale edits across separate browser sessions. The screenshot renderer also needed a correction: direct canvas export prevents development UI badges from being baked into the object images.

These are retrospective build notes, not a fabricated verbatim prompt transcript.

## What Did Not Work First Time

The Sanity SDK's create types initially expected server-generated metadata because the generic was too broad. The seed transaction also inferred one literal collection instead of the common document shape. Both problems were caught by type-checking and repaired locally.

The initial accessibility scan measured the workflow counters below the required contrast ratio. Changing to the existing muted text color fixed the measured issue. An automated pass is not a complete accessibility certification.

I also kept two honesty boundaries in the product: sample drafting is called a template, not a live model call; local browser persistence is called a demo, not Sanity synchronization.

The first Vercel deployment used the wrong framework preset and looked for a `dist` directory. Pinning `nextjs` in the deployment configuration fixed it. Drafting was also switched from OpenAI to Gemini so both challenge projects could use the same provider.

Photo support revealed a useful type error: the static 3D renderer initially accepted the new `photo` kind. Its input is now limited to the eight real model kinds; uploaded images take a separate display path.

## What I Learned

The strange part can be the content. The useful part needs ordinary rigor: typed boundaries, a meaningful schema, human approval, optimistic concurrency, and a UI that does not lose an open draft when fresh data arrives.

The schema did more than store paragraphs. It decided which object belonged in a collection, what was observation versus invention, and whether the object was allowed to be exhibited at all.

## Verification and Limits

The implementation has domain, persistence, geometry, and HTTP tests, plus desktop/mobile Playwright workflows and automated accessibility scans. It also checks that the WebGL scene contains pixels and changes when rotation is enabled.

On 2 October 2026, all 57 unit tests and 12 desktop/mobile browser tests passed, along with lint, TypeScript checking, the production build, Sanity schema extraction, and a production-dependency audit with zero reported vulnerabilities. The live photo acceptance check separately exercised real Gemini suggestions, Sanity image-asset storage, image-aware drafting, stale-write rejection, approval, withdrawal, and cleanup. It confirmed that observations and the stored photo were preserved. A live browser check also confirmed that suggestions did not overwrite the form until explicitly accepted, without saving an exhibit.

The same photo acceptance flow passed on the deployed Vercel release. A separate hosted browser check observed Sanity change events, verified approval and withdrawal in an independent visitor browser, confirmed stale editors retained unsaved inputs, and inspected the persisted workflow history. The temporary verification objects and their new photo assets were removed afterward.

Only upload images you are willing to make accessible by URL. Dataset privacy is not the same as image-CDN privacy, and withdrawing an exhibit does not revoke cached image URLs. The local demo keeps images in browser storage and uses sample drafting; it is not live-service evidence.

The challenge scope is a curated collection with a shared curator code and the latest 100 workflow events per object. It is not individual identity, a two-person approval system, an immutable audit service, or historical research. For a production museum, those would be separate requirements.