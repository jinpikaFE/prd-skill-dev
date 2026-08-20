---
name: prd
description: Generate Vue3 high-fidelity interactive PRD prototype workspaces from brief feature requests, with annotated PRD boards, structured requirements, scenario coverage, traceability, AI-readable requirement details, comments, version directories, and version notes. Use when the user invokes $prd or asks for a PRD/prototype for a feature.
metadata:
  short-description: 生成可演示、可追踪的交互 PRD 原型
---

# PRD Prototype

Use this skill when the user says things like “用 `$prd` 生成某功能原型”, “做一个某功能 PRD 原型”, or wants a high-fidelity interactive PRD that can support customer demos, requirement review, and AI-assisted development.

The user should only need a short request. Infer the needed deliverables and ask questions only when the feature goal, target user, or business result is too ambiguous to choose a reasonable prototype.

## Default Outcome

Create a complete Vue3 PRD prototype workspace, usually in a new folder named after the feature unless the user gives a path:

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vite.config.ts`, `tsconfig.json`, `index.html`, `prototype.html`, and `src/`: Vue3 + Vite + TypeScript + Pinia + Ant Design Vue + Vant + markdown-it + Mermaid PRD workspace source copied from `assets/vue3-prd-template/` and adapted to the feature.
- `src/data/prdData.ts`: the app-facing requirement, board, prototype, comment, and version data source generated from the same facts as the documents.
- `src/data/generatedDocs.ts`: raw imports of the generated documents so reviewers can read PRD, requirements, traceability, handoff, and changelog inside the page.
- `prd.md`: human-readable structured PRD.
- `requirements.json`: machine-readable requirement source with stable IDs.
- `traceability-matrix.md`: requirement-to-screen-and-interaction mapping.
- `ai-handoff.md`: AI-readable requirement detail brief for coding agents, focused on functional points, boundaries, states, exceptions, risks, and open questions.
- `CHANGELOG.md`: version notes and requirement changes.
- `review-data/draft.json`: the current draft review snapshot, including product-added annotations, annotation edits, deleted annotation IDs, and comments.
- `versions/index.json`: finalized version index, including version name, release date, directory, review data path, and rename history.
- `versions/`: finalized Vue3 workspace snapshots. No finalized `versions/vX.Y.Z/` directory is created during ordinary draft generation, but the page release action and explicit “定版/发版” requests must create one.

Generated user-facing documents must default to Simplified Chinese, including headings, table labels, summaries, changelog entries, and in-page document titles. Keep filenames and technical IDs such as `REQ-001`, API error codes, and package names unchanged.

Read [references/output-contract.md](references/output-contract.md) before creating or updating the package. Read [references/prototype-guidelines.md](references/prototype-guidelines.md) before adapting the Vue3 workspace. Read [references/worktree-workflow.md](references/worktree-workflow.md) when working inside an existing Git repository, updating an existing project, or using multiple role agents/worktrees. Use [scripts/validate_prd_package.mjs](scripts/validate_prd_package.mjs) after generation whenever Node.js is available.

## Core Rules

- Before installing dependencies, starting the dev server, or validating the Vue3 workspace, check the local runtime. The default supported runtime is Node.js `>=20 <25` and pnpm `>=10 <12`; this skill was verified on Node `v24.15.0` and pnpm `11.1.1`.
- Use pnpm as the default package manager. Generated workspaces should include `packageManager: "pnpm@11.1.1"`, `pnpm-workspace.yaml` for approved dependency build scripts, a `pnpm-lock.yaml` after installation, and no `package-lock.json` unless the user explicitly asks for npm.
- If Node.js is missing or outside the supported range, pause package work and help the user install a compatible Node version before continuing. If Node is present but pnpm is missing, use Corepack or another user-approved installation path to activate pnpm, then run `pnpm install`.
- Treat `requirements.json` and `prd.md` as the requirement source; the Vue3 prototype must reflect them rather than inventing separate behavior.
- Resolve the prototype platform before generating product UI. Use `targetPlatform: "mobile"` for explicit phone, App, H5, or mini-program requests, and `targetPlatform: "desktop"` for explicit admin, management, Web console, or desktop workbench requests. Reference image dimensions and existing requirements may support an explicit signal, but a business feature name alone is not enough.
- If the request has no reliable platform signal, ask the user which platform to use. If the request contains both mobile and desktop surfaces, ask which one is the primary platform and generate only that primary prototype in the current package.
- Assign every meaningful requirement a stable `REQ-###` ID.
- Bind every meaningful clickable or state-changing prototype element to one or more requirement IDs with `data-req-id` or `data-req-ids` in the rendered Vue templates.
- Make the prototype scenario-driven, not only click-driven. Include realistic switches for role, scenario, data state, and workflow state when relevant.
- Include normal, empty, loading, error, permission, validation failure, disabled/readonly, and success states when they apply to the feature.
- Preserve the user's business constraints and supplied wording. Do not silently change backend contracts, core business meaning, or user-visible outcomes.
- Do not prescribe the target development framework, repository architecture, component tree, code layering, or implementation sequence unless the user explicitly asks or the target repository already defines it.
- Make the first screen the usable product experience, not a marketing landing page, unless the user explicitly asks for a landing page.
- Build the high-fidelity interactive prototype first. Then derive the PRD board from high-fidelity operation snapshots, with requirement callouts beside the snapshot instead of abstract standalone requirement cards.
- Keep generated documents and prototype aligned through shared IDs and repeated terminology.
- If updating an existing package, preserve historical version notes and do not overwrite unrelated user edits without approval.
- The Vue3 workspace should provide a left feature/requirement directory tree, a top history selector, an icon action that opens the active prototype's local folder, a PRD/prototype/document view switch, a zoomable and draggable annotated PRD canvas with drag mode selected by default, mouse-wheel canvas zoom, Mermaid-rendered flowcharts or mindmaps when useful, a platform-specific high-fidelity prototype view, an in-page generated document viewer with Markdown preview and download buttons, and a right panel that separates all annotations from all comments. Clicking an annotation or comment should switch to the related canvas and locate/highlight the marker.
- Treat annotations and comments as separate review objects. An annotation is the product's formal explanation on top of the prototype snapshot: feature point, boundary, rule, or product wording. A comment is a temporary review note: discussion, pending question, or short-lived record. Use different labels, colors, and lists for them.
- The PRD canvas must support product-added annotations. Added annotations should attach to a frame/requirement, become selectable, support editing/deletion, and accept comments like generated annotations. Comments must also support editing/deletion.
- Do not use browser `localStorage`, session storage, IndexedDB, or other browser-only persistence for review data. The local Vite dev server must provide the PRD workbench file API used by the template. Draft review data belongs in `review-data/draft.json`; finalized version metadata belongs in `versions/index.json`; each finalized version snapshot belongs in `versions/vX.Y.Z/review-data.json`; comments added after release belong in `versions/vX.Y.Z/review-comments.json`.
- Deleting any annotation, comment, or version record must require a second confirmation. The page should include a top release button near the history selector; releasing a draft also requires a second confirmation. Page release is a file operation: it must create `versions/vX.Y.Z/`, copy the current Vue3 prototype workspace and generated documents into that directory, write `versions/vX.Y.Z/review-data.json`, and update `versions/index.json`.
- Page release must create an independent immutable snapshot for that version, at least freezing custom annotations, annotation edits, deleted annotation IDs, and comments. Switching to a finalized version must read only that version snapshot; it must not read current draft state. Finalized annotations are read-only, but reviewers may still drag or zoom the canvas and add anonymous comments. Those post-release comments cannot be edited or deleted and must store and display `createdAt`. If an older version record has no snapshot field, show only the initial baseline data instead of current draft data.
- Support local authoring and hosted review as capability-driven runtime modes. Local draft mode exposes annotation, comment, version, folder, and review-package actions. Hosted mode has no draft and hides release, rename, delete, open-folder, and package actions; it lists only finalized versions and keeps annotations read-only. A newly generated static review package keeps comments disabled until the target deployment platform implements the generic state/comment endpoints described by `deployment-handoff.json`.
- The local “生成发布包” action must only create a platform-neutral ZIP under `publish/`. The package contains finalized history, `published-state.json`, and `deployment-handoff.json`; it must not log in to, link, configure, or deploy to Vercel or any other provider. After packaging, show the absolute package path, a human-readable Asia/Shanghai generation date, an action that opens the fixed `publish/` directory, and a copyable Codex prompt so the user can name a target platform in a later AI conversation. The prompt must make clear that finalized history and canvas pan/zoom are already built in, while anonymous comments are the only optional storage adapter.
- The release source is always the current draft. If the reviewer is viewing a finalized version and clicks release, switch back to the draft before opening or confirming release. The first release name defaults to `1.0.0`; later defaults increment the patch segment such as `1.0.1`. Release and rename must not create duplicate finalized version names. Every finalized version should display its release date and support rename/delete with confirmation.
- Renaming a finalized version is also a file operation: rename the corresponding `versions/vX.Y.Z/` directory, update `versions/index.json`, update the version's `review-data.json`, and append `renameHistory` with previous name, new name, and rename time. Deleting a version removes the version directory and its index record.
- Treat the workbench and the high-fidelity prototype as isolated applications. `index.html` and `src/workbench/` must use Ant Design Vue only. `prototype.html` must be embedded through an iframe; mobile prototype components use Vant, while desktop prototype components use Ant Design Vue. Never import Vant or its CSS from the workbench entry.
- Keep the generated template's `.prd-template.json`, locked workbench files, and `src/prototype/main.ts` bootstrap unchanged. Ordinary feature generation may modify prototype components and runtime below `src/prototype/`, but must not move UI-library registration or CSS loading out of the locked bootstrap. It may also modify `src/data/prdData.ts`, `src/data/generatedDocs.ts`, generated documents, review JSON, and version directories. Run the package validator to detect template drift and prototype styling hazards.
- Use Ant Design Vue components for workbench controls, including `Menu`, `Select`, `Dropdown`, `Segmented`, `Modal`, and `Button`. Do not use native `select` for these controls.
- Use Ant Design Vue `Tooltip` for explanatory hover hints on workbench actions and controls. Do not use the browser-native `title` attribute on buttons, menu items, links, or form controls; visible modal titles and iframe accessibility names remain valid.
- Prefer the locked workbench `EllipsisTooltipText` component whenever single-line or multi-line text is intentionally truncated. It must detect real overflow with element dimensions and show the full text Tooltip only when overflow exists, unless the caller explicitly requests an always-visible explanatory Tooltip.
- For long Ant Design Vue `Select` labels, render component-node labels with `EllipsisTooltipText` so the Select does not generate browser-native `title` hints for string labels.
- Render workbench `REQ-###` tags with the locked `RequirementTag` component. Its Ant Design Vue Tooltip should expose the matched requirement title, description, and first acceptance criterion from the shared requirement data.
- Ordinary generation or updates are draft work. Create `review-data/draft.json` and `versions/index.json` by default, but do not create a historical `versions/vX.Y.Z/` directory unless the user explicitly asks to finalize/release or uses the page release action.
- Do not generate a plain standalone HTML PRD mode. `$prd` is now a Vue3-template workflow; `index.html` is the Vite entry file for the Vue app.
- For medium or large PRD work, the skill may use a workflow model: a main integrator coordinates specialized roles such as requirement analyst, PRD board/prototype maker, boundary-and-risk reviewer, and final QA. Use multiple agents only when the environment supports it and the work can be split into non-overlapping outputs.
- When the task happens inside a real Git repository or existing product project, use worktrees as role workspaces when they will improve speed, isolate candidate outputs, reduce risk to the current working copy, or allow parallel iteration. Clean up temporary worktrees after the final output is accepted or after the selected changes are copied/merged back.
- Parallel agents and worktrees are helpers, not sources of truth. The final output must have one authoritative current package, and every accepted role contribution must be reconciled into the same `requirements.json`, `prd.md`, `index.html`, traceability matrix, AI-readable requirement detail brief, and changelog.

## Working Method

1. Understand the requested feature, target users, business flow, data objects, and demo objective from the user's prompt and any supplied files.
2. Choose the working model and location. For simple standalone prototype folders, work directly. For larger or repository-backed PRD work, use the role/worktree workflow when appropriate.
3. Draft the structured PRD facts: requirements, roles, scenarios, states, fields, validations, permissions, flows, edge cases, and acceptance criteria.
4. Build or adapt the high-fidelity prototype first so the primary product interaction is complete and demoable. Use Vant for a mobile target and Ant Design Vue for a desktop target.
5. Generate the PRD board from the prototype states as operation snapshots. Put requirement callouts beside each snapshot, keep pins on the exact UI region, and preserve comment-to-annotation locating.
6. Copy `assets/vue3-prd-template/` into the output folder without changing its locked workbench files. Fill `src/data/prdData.ts`, `src/prototype/`, `review-data/draft.json`, `versions/index.json`, and the documents from the same requirement facts. Include Ant Design Vue workbench navigation and selectors, top history/view switching, an active-prototype folder button, a top release button with second confirmation, file-backed draft and per-version snapshots, finalized-version readonly mode, duplicate version-name prevention, deletable/renameable version records with second confirmation, zoomable/draggable annotated PRD canvas with drag mode selected by default, product-added annotations, the platform-specific high-fidelity prototype iframe, in-page document viewing and download, annotation/comment creation, annotation/comment editing and deletion, right all-annotation and all-comment lists, click-to-canvas locating, current requirement IDs, traceability, and version notes.
7. Generate the AI-readable requirement detail brief from the same structure: functional points, boundaries, state details, edge cases, validation rules, permission rules, mock/API assumptions, likely issues, open questions, and acceptance checks. Keep it descriptive rather than prescriptive about implementation.
8. If the user asked to finalize or release the version, copy the complete current output into `versions/vX.Y.Z/` and add it to the top history. Otherwise keep it as the current draft only.
9. Run the package validator when possible, then fix any missing IDs, files, mappings, board controls, comments, or version affordances before reporting completion.
10. If a temporary worktree was created, clean it up after the accepted result is preserved in the target location. Never delete a worktree that contains unreviewed or unpreserved changes.

## Final Response

Follow the active user or workspace final-answer rules. Briefly state the generated folder, the prototype file to open, validation result, and any unverified risks.
