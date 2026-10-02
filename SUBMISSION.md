---
title: "Afterlight: tiny objects, improbable afterlives, and a human final say"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

> Working draft. Replace every placeholder and add evidence from your actual Sanity-backed deployment before publishing. The default local demo is not proof of cloud connectivity.

## What I Built

Afterlight is a fictional museum looking back at ordinary objects from an imagined future. A cassette becomes a pocket-sized time machine. A key is permission to come home. A light bulb is borrowed sunrise.

The app opens into the collection, not a promotional page. You can inspect and rotate original 3D reconstructions, filter collections, and export a catalogue record. Behind the collection is a curator desk: intake, draft, review, exhibition, and withdrawal.

The important boundary is that a possible story is not an observable fact. Those fields stay separate, and automation cannot give itself permission to exhibit a draft.

## Demo

- Application: [ADD YOUR DEPLOYED URL]
- Repository: [ADD YOUR INDEPENDENT PATH TWO REPOSITORY URL]
- Sanity project ID: [REQUIRED: REAL PATH TWO PROJECT ID]
- Dataset: `production`
- Judge curator code: [APP-ONLY TEST CODE, NEVER A SANITY TOKEN]
- Screenshots or walkthrough: [ADD ACTUAL LIVE EVIDENCE]

Try adding an object, preparing its interpretation, editing the label, submitting it for review, and approving it. Then return it to draft: the public collection should no longer show it. Open the same record in a second tab to see a changed revision detected.

## How I Used Sanity

The schema has collections, artifacts, and embedded workflow events. Artifacts reference collections and separate observed material and details from fictional interpretation, exhibition copy, and a strangeness rating.

Workflow state sits beside the content. The application enforces allowed transitions and writes the state and event together using Sanity's revision precondition. An outdated editor gets a conflict instead of overwriting another curator. Studio has a custom stage-based navigation structure and separates observations, interpretation, and workflow fields.

Live events are delivered through a server-side Sanity listener. The browser receives only a change notification and refetches the appropriate public or protected view. Sanity credentials never enter the browser.

This is an application-owned workflow on Content Lake, not a claim that I used the early-access Workflows engine or App SDK. The distinction matters: Studio read-only fields are not a security boundary, and a writer with broad dataset credentials can bypass app rules.

## The Build Process

I used GitHub Copilot in VS Code to build this from an empty workspace. The starting request was to create independently runnable entries for both paths. The museum concept, implementation decisions, models, and tests were developed with the assistant.

The build proceeded in small checked steps:

1. **Rules before screens.** The first implementation established that automation can draft but not approve, incomplete labels cannot enter review, and exhibited content cannot be edited without first returning to draft.
2. **Persistence before polish.** The same transition function drives the local demo and the live mutation path. Tests verified stale revision rejection and the actual `ifRevisionId` call in the mocked Sanity boundary.
3. **Original objects.** Eight models were assembled in Three.js. A browser rendering script captured local PNGs after checking for nonblank pixels. The detail view keeps the object interactive rather than replacing it with a decorative screenshot.
4. **A complete curator loop.** Intake, template/model drafting, editing, review, approval, withdrawal, exports, and local persistence were connected to the UI.
5. **Let the browser disagree.** Desktop and mobile tests exercised the entire workflow. They found a low-contrast workflow-counter color; it was corrected and the same tests passed afterward.

These are retrospective build notes, not a fabricated verbatim prompt transcript. [OPTIONAL: ADD A REDACTED PUBLIC AGENT SESSION AFTER REVIEWING IT.]

## What Did Not Work First Time

The Sanity SDK's create types initially expected server-generated metadata because the generic was too broad. The seed transaction also inferred one literal collection instead of the common document shape. Both problems were caught by type-checking and repaired locally.

The initial accessibility scan measured the workflow counters below the required contrast ratio. Changing to the existing muted text color fixed the measured issue. An automated pass is not a complete accessibility certification.

I also kept two honesty boundaries in the product: sample drafting is called a template, not a live model call; local browser persistence is called a demo, not Sanity synchronization.

## What I Learned

The strange part can be the content. The useful part needs ordinary rigor: typed boundaries, a meaningful schema, human approval, optimistic concurrency, and a UI that does not lose an open draft when fresh data arrives.

The schema did more than store paragraphs. It decided which object belonged in a collection, what was observation versus invention, and whether the object was allowed to be exhibited at all.

## Verification and Limits

The implementation has domain, persistence, geometry, and HTTP tests, plus desktop/mobile Playwright workflows and automated accessibility scans. It also checks that the WebGL scene contains pixels and changes when rotation is enabled.

[ADD FINAL TEST COUNTS AND LIVE SANITY WRITE/EVENT EVIDENCE. The included mocks do not establish a live integration.]

The challenge scope is a curated collection with a shared curator code and the latest 100 workflow events per object. It is not individual identity, a two-person approval system, an immutable audit service, or historical research. For a production museum, those would be separate requirements.