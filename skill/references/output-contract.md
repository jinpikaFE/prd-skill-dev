# Output Contract

This reference defines the reusable deliverables for a `$prd` Vue3 prototype workspace.

## Language Contract

Unless the user explicitly requests another language, write all generated PRD deliverables in Simplified Chinese:

- Markdown document headings, table headers, summaries, and body prose.
- `CHANGELOG.md` title, version entries, and change bullets.
- `ai-handoff.md` headings and requirement detail prose.
- In-page document titles and summaries in `src/data/generatedDocs.ts`.

Keep filenames, package names, `REQ-###` IDs, API endpoint names, field keys, and error codes in their technical form when that improves traceability.

## Folder Shape

Use this structure unless the user requests another one:

```text
<feature-slug>-prd/
|-- package.json
|-- pnpm-lock.yaml          Generated after pnpm install
|-- pnpm-workspace.yaml     Keeps approved pnpm dependency build scripts explicit
|-- index.html
|-- prototype.html          Isolated high-fidelity prototype entry embedded by iframe
|-- .prd-template.json      Locked workbench manifest and extension boundaries
|-- AGENTS.md               Generated-package editing boundaries
|-- vite.config.ts
|-- tsconfig.json
|-- tsconfig.node.json
|-- src/
|   |-- main.ts
|   |-- App.vue
|   |-- styles.css
|   |-- types.ts
|   |-- data/
|   |   |-- generatedDocs.ts
|   |   `-- prdData.ts
|   |-- prototype/
|   |   |-- main.ts
|   |   |-- mobile/
|   |   |   `-- MobilePrototype.vue
|   |   `-- desktop/
|   |       `-- DesktopPrototype.vue
|   |-- stores/
|   |   `-- prd.ts
|   `-- workbench/
|       |-- WorkbenchApp.vue
|       `-- components/
|-- prd.md
|-- requirements.json
|-- traceability-matrix.md
|-- ai-handoff.md
|-- CHANGELOG.md
|-- review-data/
|   `-- draft.json           Current draft annotations, annotation edits, deleted annotation IDs, and comments
`-- versions/
    |-- index.json            Finalized version index with dates, paths, and rename history
    `-- vX.Y.Z/             Only when the user explicitly finalizes a version
        `-- review-data.json
```

The root is the Vue3 prototype project. Do not generate a separate single-file HTML PRD mode. `index.html` is the Ant Design Vue workbench entry. `prototype.html` is the isolated high-fidelity product entry loaded by the workbench iframe.

Do not create extra files unless they directly support the prototype, such as local images, data fixtures, a build output requested by the user, lockfiles, review data JSON, or finalized version snapshots. Ordinary drafts should not be copied into `versions/vX.Y.Z/`, but ordinary workspaces should still include `review-data/draft.json` and `versions/index.json`.

## Runtime And Install Contract

Before running the generated workspace, check:

- `node -v`: supported range is Node.js `>=20 <25`; the template has been verified on Node `v24.15.0`.
- `pnpm -v`: supported range is pnpm `>=10 <12`; the template has been verified on pnpm `11.1.1`.

Use pnpm by default:

- `package.json` should include `packageManager: "pnpm@11.1.1"`.
- `pnpm-workspace.yaml` should allow the dependency build scripts needed by the template, currently `esbuild` and `vue-demi`.
- Run `pnpm install` and commit or deliver `pnpm-lock.yaml` with the generated package when a lockfile is needed.
- Remove `package-lock.json` if it was created accidentally during draft work.
- If pnpm blocks dependency build scripts for `esbuild` or `vue-demi`, keep the template's pnpm build allowlist and use `pnpm approve-builds --all` only when the current install requires it.

If Node.js is missing or outside the supported range, help the user install a compatible Node.js version before continuing with package work. If Node.js exists but pnpm is missing, activate pnpm through Corepack when available or another user-approved install path. Ask before running commands that need external network or system-level changes.

## Vue3 Workspace

Start from `assets/vue3-prd-template/` and adapt it to the requested feature.

The default stack is Vue3 + Vite + TypeScript + Pinia + Ant Design Vue `4.2.6` + Ant Design Icons Vue `7.0.1` + Vant `4.10.0` + markdown-it + Mermaid. The PRD workbench always uses Ant Design Vue. A mobile high-fidelity prototype uses Vant; a desktop high-fidelity prototype uses Ant Design Vue. Mermaid is the default third-party renderer for PRD flowcharts and, when the requirement structure benefits from it, mindmaps. Do not treat these dependencies as requirements for the user's real production repository unless the user asks for that.

Resolve `targetPlatform` before editing the prototype:

- Explicit phone, App, H5, or mini-program request: `mobile`, with a realistic phone viewport such as `390 x 844` unless the supplied design specifies another size.
- Explicit admin, management, Web console, or desktop workbench request: `desktop`, with a realistic desktop viewport such as `1440 x 900` unless the supplied design specifies another size.
- No reliable platform signal: ask the user.
- Both mobile and desktop in one request: ask which is the primary target and generate one primary platform in the package.

The workspace must include:

- Left feature menu as a directory/file tree. Directories are larger feature groups ordered by priority; files are smaller feature pages under that group. The first file under each feature group should be a Mermaid-rendered flowchart for that feature. Subsequent files should be operation snapshots or snapshot groups for subfeatures.
- Clicking a left-side file should show only that function's PRD canvas, so the canvas does not become one oversized board. A subfeature may contain multiple snapshots when one snapshot cannot explain the interaction, comments, or edge cases clearly.
- Top history selector for finalized versions plus a release button near the selector. If no version has been finalized, show the current draft and make it clear that history appears only after the user says “定版” or uses the page release action. Use Ant Design Vue `Select`, `Dropdown`, `Segmented`, `Modal`, and `Button` controls in the workbench rather than Vant or native `select`.
- Releasing a draft and deleting a finalized version record must require a second confirmation. Version records should be renameable and deletable from the top history area. Page release/delete/rename are file operations through the local Vite PRD file API: release creates `versions/vX.Y.Z/`, writes `versions/vX.Y.Z/review-data.json`, and updates `versions/index.json`; rename changes the directory name, updates index and version JSON, and appends `renameHistory`; delete removes the directory and index record.
- Page-level release must freeze an independent snapshot containing custom annotations, annotation edits, deleted annotation IDs, and comments. Switching to a finalized version must read that version snapshot only, not the current draft state. Finalized versions should make annotation/comment creation, editing, and deletion read-only. If an old finalized record lacks a snapshot, show the initial baseline data instead of current draft data.
- The release source is always the current draft. If the reviewer is viewing a finalized version and clicks release, the workspace should switch back to the current draft before release. The first release name defaults to `1.0.0`; subsequent defaults increment the patch segment, such as `1.0.1`. Release and rename must prevent duplicate finalized version names. Every finalized version should display its release date.
- Top view switch between `PRD 标注` and `高保真原型`.
- Main PRD board view: a zoomable and draggable canvas with drag mode selected by default and mouse-wheel zoom. It should be generated after the high-fidelity prototype and should look like product operation snapshots with nearby requirement callouts, not abstract requirement cards. Flowchart and mindmap boards may be rendered with Mermaid inside the same canvas model.
- Ability to add a new product annotation directly on the PRD canvas. Added annotations should attach to the clicked frame, use a relevant `REQ-###` ID, persist to `review-data/draft.json` while in draft, support editing/deletion, and accept comments.
- High-fidelity prototype view: the interactive product UI for customer demonstration, built first and loaded through `prototype.html` in an iframe. Use Vant components for a mobile target and Ant Design Vue components for a desktop target.
- In-page document viewer for generated outputs such as `prd.md`, `requirements.json`, `traceability-matrix.md`, `ai-handoff.md`, and `CHANGELOG.md`, with Markdown preview rendering and a download button for the currently selected document.
- Right panel listing all PRD annotations and all PRD comments in separate sections.
- Ability to add a temporary comment to the selected PRD annotation.
- Ability to edit and delete annotations and comments.
- Any delete action for annotations, comments, or versions must require a second confirmation. Deleting an annotation should also make the consequence clear when related comments will be removed.
- Ability to click an annotation or comment and switch to the related canvas, locate the marker, and highlight the related annotation in the PRD board.
- Requirement bindings using `data-req-id` or `data-req-ids` in Vue templates.
- Data-driven content from `src/data/prdData.ts`.
- No browser `localStorage`, session storage, IndexedDB, or browser-only persistence for review data. The generated workbench must be opened through the Vite dev server so the built-in `__prd_file_store` middleware can write JSON files. Static production builds remain useful for read-only demos, but file write actions require the dev server.
- No Vant imports or Vant CSS in `src/main.ts`, `src/App.vue`, or `src/workbench/`. The mobile prototype may import Vant and `vant/lib/index.css` only inside the prototype document. This iframe boundary prevents Vant resets and component styles from changing the workbench `body`, menus, fields, buttons, and dialogs.
- Preserve `.prd-template.json` and every listed `lockedFiles` hash. Generated feature work belongs only in the manifest's extension paths. The validator must fail when a locked workbench file drifts.

Prototype-only controls such as comments, annotations, history selection, PRD/prototype switching, and requirement inspectors are review tools. Do not describe them as production UI unless the user explicitly asks. In those review tools, annotations are formal product explanations on the prototype; comments are temporary review notes and should use different labels and colors.

## `src/data/prdData.ts`

This file is the Vue app's generated data source. Keep it aligned with `requirements.json` and `prd.md`.

It should describe:

- `meta`: feature name, slug, version, updated time, draft/final state, `targetPlatform`, and `prototypeViewport`.
- `roles`: user role switches for scenario review.
- `scenarios`: scenario switches for review.
- `states`: workflow/data states such as normal, loading, validation error, permission issue, success, empty, and readonly when relevant.
- `requirements`: generated from the same `REQ-###` set as `requirements.json`.
- `featureGroups`: left-menu directory groups, ordered by priority, with child file items. The first child item should point to that group's Mermaid flowchart canvas.
- `boardSections`: per-file PRD canvases, usually one Mermaid flowchart/mindmap canvas or one subfeature snapshot canvas, with screen snapshots, notes, and annotations.
- `prototype`: high-fidelity product screens, fields, actions, state variants, and requirement bindings.
- `comments`: seeded review comments tied to annotation IDs.
- `versionHistory`: current draft plus finalized versions only when they exist. Runtime-created finalized versions should be loaded from `versions/index.json`, with each independent snapshot in `versions/vX.Y.Z/review-data.json`.

`src/data/generatedDocs.ts` should import generated documents with Vite raw imports so the page can display them:

```ts
import prdMd from "../../prd.md?raw";
```

Do not split facts across unrelated ad hoc constants. Future AI edits should be able to update requirement behavior primarily by changing the data source and affected Vue view code.

The document view should render Markdown with the bundled Markdown renderer rather than showing `.md` files as unformatted plain text. JSON documents can be wrapped in a fenced `json` block for readable preview while keeping the downloaded file unchanged.

## `requirements.json`

Use stable, AI-readable data. The exact feature can shape fields, but keep these top-level keys when possible:

```json
{
  "meta": {
    "featureName": "",
    "version": "0.1.0",
    "updatedAt": "",
    "source": "Generated from user request"
  },
  "roles": [],
  "scenarios": [],
  "states": [],
  "requirements": [],
  "flows": [],
  "fields": [],
  "permissions": [],
  "mockApis": [],
  "acceptanceChecks": []
}
```

Each item in `requirements` should include:

- `id`: stable `REQ-###` ID.
- `title`: short requirement title.
- `description`: business meaning.
- `priority`: `must`, `should`, or `could`.
- `screens`: related screens or regions.
- `interactions`: related controls or actions.
- `states`: related scenario or workflow states.
- `acceptanceCriteria`: verifiable conditions.

## `prd.md`

Write for product, customer-facing demo, and engineering review:

- Feature overview and target users.
- Business goals and non-goals.
- Roles and permissions.
- Screen list.
- Core flows.
- Scenario/state coverage.
- Field and validation rules.
- Requirement list with `REQ-###` IDs.
- Acceptance criteria.
- Open questions and assumptions.

## `traceability-matrix.md`

Include a table with at least:

```text
需求 ID | 需求 | 原型位置 | 交互 / 状态 | 验收信号
```

Every `REQ-###` in `requirements.json` must appear here, and each meaningful prototype control should expose the same ID in Vue markup.

## `ai-handoff.md`

Write for an AI coding agent as a detailed requirement context document, not as an implementation guide. The target development repository may already have its own framework, architecture, component rules, API client conventions, state management, testing style, and coding standards. Do not override those.

Use Simplified Chinese headings by default. Include:

- Functional points by `REQ-###`.
- In-scope and out-of-scope boundaries.
- User roles, permissions, and business constraints.
- Field-level details, validation rules, and copy requirements.
- State and scenario details, including normal, empty, loading, error, permission, readonly/disabled, validation failure, and success states when relevant.
- Interaction rules and expected user-visible results.
- Mock/API assumptions from the product perspective: endpoint intent, request fields, response fields, error codes, and unresolved backend questions.
- Likely issues, edge cases, ambiguity, and risk points that development should pay attention to.
- Acceptance checks and manual review points.

Avoid:

- Prescribing a framework, route structure, component tree, file layout, state library, API wrapper, database schema, or code organization for the real product.
- Writing an implementation task list such as “first implement X, then build Y” unless the user explicitly asks for development planning.
- Inventing backend contracts, security algorithms, analytics events, or permission semantics not present in the requirement.
- Treating prototype-only controls, such as the PRD console, as production UI requirements.

## `CHANGELOG.md`

Use reverse chronological entries:

```markdown
# 变更记录

## 0.1.0 - YYYY-MM-DD HH:mm CST

- 新增 `REQ-001`：...
- 新增原型场景：...
- 新增 AI 需求说明：...
```

If updating an existing package, preserve previous entries and add a new entry above them unless the user explicitly allows clearing the package.

## `versions/`

Use `versions/` only for finalized snapshots.

- Do not create a finalized version merely because files changed.
- Create `versions/vX.Y.Z/` only after the user explicitly says “定版”, “发版”, “固化版本”, “归档版本”, or equivalent.
- Always keep `versions/index.json` in the draft package, even when it has an empty `versions` array.
- The finalized directory should contain the complete Vue3 workspace and documents for that version, plus `review-data.json` containing that version's frozen annotations, annotation edits, deleted annotation IDs, comments, and version metadata.
- The top history selector should list finalized versions and the current draft separately.
- If no finalized versions exist, the selector should show only the current draft or a disabled “暂无定版历史” state.
- Renaming a finalized version should rename the matching `versions/vX.Y.Z/` directory, update `versions/index.json`, rewrite that version's `review-data.json`, and append `renameHistory`.
- Deleting a finalized version should delete the matching directory and remove only that record from `versions/index.json`.
