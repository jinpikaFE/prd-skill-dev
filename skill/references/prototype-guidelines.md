# Vue3 Prototype Guidelines

The `$prd` prototype is a Vue3 PRD workspace: it must support customer demos and requirement review while staying useful for AI-assisted coding.

## Template Rule

Use `assets/vue3-prd-template/` as the starting point for every new `$prd` package.

- Keep the project Vue3 + Vite + TypeScript.
- Use Pinia for review/prototype workspace state, Ant Design Vue for the fixed PRD workbench, Vant for mobile product prototypes, Ant Design Vue for desktop product prototypes, markdown-it for document preview, and Mermaid for PRD flowchart or mindmap rendering.
- Use pnpm as the default package manager. Check Node.js and pnpm before installing or starting the workspace: supported Node.js is `>=20 <25`, supported pnpm is `>=10 <12`, and the template is verified on Node `v24.15.0` with pnpm `11.1.1`.
- If Node.js is missing or outside range, help install a compatible Node runtime first. If pnpm is missing but Node is present, activate pnpm through Corepack when possible or another user-approved path.
- Keep PRD facts in `src/data/prdData.ts`, aligned with `requirements.json` and `prd.md`.
- Keep reusable review behavior in Vue components and the Pinia store.
- Keep `index.html` and `src/workbench/` as the fixed Ant Design Vue application. Keep `prototype.html` and `src/prototype/` as the product application embedded by iframe. Do not import Vant or Vant CSS from the workbench entry.
- Preserve `.prd-template.json` and its locked workbench files. Feature generation may change only the declared extension paths: prototype components/runtime, PRD data, generated documents, review JSON, and finalized version directories.
- Do not fall back to a standalone handcrafted HTML page.
- Do not copy external open-source project code into the generated package unless the user explicitly authorizes that dependency and license review. The bundled template may use common Vue3/Vite conventions and dependency choices.

## Required Workspace Behaviors

- Provide the PRD workspace as the first screen: left feature directory, top history/view controls, center PRD/prototype content, and right comment list.
- Default to `PRD 标注`, because requirement review starts from feature scope and annotated evidence. Include `高保真原型` and `文档查看` switches for customer demo and requirement reading.
- Resolve the target platform before product UI work. Explicit phone, App, H5, or mini-program requests use `mobile` and Vant. Explicit admin, management, Web console, or desktop workbench requests use `desktop` and Ant Design Vue. If no reliable platform signal exists, ask the user. If both platforms are requested, ask which one is primary and generate one primary platform.
- Build the high-fidelity product UI first in the isolated prototype document. Keep it one click away. Avoid a generic landing page unless explicitly requested.
- The left feature menu should look like a directory/file tree: larger feature groups as directories, smaller feature canvases as files. Order directories by feature priority. The first file under each directory should be that feature's Mermaid flowchart.
- Clicking one file should render only that file's PRD canvas. Do not force all features into one giant board.
- A small feature usually gets one operation snapshot. Use multiple snapshots only when one cannot clearly explain the state, comments, boundaries, or edge cases.
- Include controls for role, scenario, and workflow/data state when relevant.
- Show current requirement IDs for the active screen, selected annotation, selected comment, or selected interaction.
- Make traceability visible through annotation markers, board notes, panels, drawers, popovers, or inspectors.
- Include version/change affordances sourced from the same notes as `CHANGELOG.md`. Put the release button near the top history selector, require a second confirmation before release, and require a second confirmation before deleting a finalized version record. Finalized versions should also support rename with duplicate-name prevention.
- Page release freezes the current draft into an independent version directory. The snapshot must at least include product-added annotations, generated annotation edits, deleted annotation IDs, and comments. Viewing a finalized version must be read-only for annotations/comments and must read `versions/vX.Y.Z/review-data.json`, not the current draft JSON, after the version is created.
- Release always starts from the current draft. If the user is viewing a finalized version, clicking release should switch back to draft before opening or confirming the release. The first default release name is `1.0.0`, then increment the patch segment for later releases, such as `1.0.1`.
- Use Ant Design Vue `Menu`, `Select`, `Dropdown`, `Segmented`, `Modal`, and `Button` components for workbench navigation and controls. Avoid Vant and native `select` controls in the workbench.
- Support adding temporary comments on PRD annotations. Store comments in Pinia state and persist the draft to `review-data/draft.json` through the local Vite PRD file API.
- Support adding product annotations directly on the PRD canvas. Store added annotations in Pinia state and persist the draft to `review-data/draft.json` through the local Vite PRD file API.
- Do not use browser `localStorage`, session storage, IndexedDB, or browser-only persistence for annotations, annotation edits, deleted annotation IDs, comments, or version records.
- Page release, rename, and delete are file operations. Release creates `versions/vX.Y.Z/`, copies the current Vue3 workspace and generated documents, writes `versions/vX.Y.Z/review-data.json`, and updates `versions/index.json`. Rename changes the version directory and appends `renameHistory`; delete removes the directory and index record.
- Treat annotations as formal product explanations and comments as temporary review notes. Use separate labels, colors, lists, and edit/delete actions for both object types.
- Require second confirmation before deleting an annotation or comment. When deleting an annotation, make it clear that its related comments will be removed or orphaned according to the prototype data rule.
- The right panel should list all annotations and all comments separately. Clicking either an annotation or a comment should switch to the related canvas and locate/highlight the annotation marker.
- Provide zoom buttons, mouse-wheel zoom, and drag controls for the PRD canvas so focused function boards remain reviewable. Drag mode should be selected by default.
- Provide an in-page generated document viewer so reviewers can read `prd.md`, `requirements.json`, traceability, AI handoff, and changelog without leaving the prototype. Markdown files should be rendered through the Markdown preview library, not displayed as raw plain text.
- Include a download button in the document viewer for the currently selected generated document.
- Use iframe messaging for prototype interactions. The prototype should report requirement IDs and user-visible actions to the workbench with the `prd:prototype-interaction` message contract; the workbench should ignore messages from another origin.
- Use semantic component names, store fields, IDs, classes, and `data-req-id` / `data-req-ids` attributes so a coding agent can map UI to requirements.

## PRD Board Layout

Model the PRD view after product review tools such as Modao/MockingBot-style annotated prototypes: flat, scan-friendly, and annotated.

- Use high-fidelity operation snapshots as the main visual surface. Each snapshot should represent an actual prototype state such as default, after switching mode, validation failure, loading, error, or success.
- Put numbered pins on the exact UI region they explain, and put the detailed callout text beside the snapshot.
- Include a Mermaid flowchart as the first canvas under each large feature group, before the subfeature snapshot files. Use Mermaid mindmap only when a requirement has broad conceptual branches that are clearer as a mindmap than as a linear flow.
- Let the left feature file selection switch the entire canvas to the selected flowchart or snapshot group.
- Keep annotations close to the relevant screen area, while longer details live in the side callouts, right panel, or documents.
- On smaller screens, keep navigation, board, and comments usable through responsive stacking or drawers.

## Requirement Binding

Use attributes on meaningful Vue template controls and regions:

```vue
<button data-req-id="REQ-003">提交</button>
<section data-req-ids="REQ-001 REQ-004">...</section>
```

When a user clicks a bound element, the prototype should reveal the related requirement ID and short requirement title in the PRD console.

In the PRD board, clicking a marker should select the annotation and make new comments attach to that marker. Clicking an annotation or comment in the right panel should switch to the matching file canvas, align the marker into view, and highlight it.

## Scenario Coverage

Represent applicable states directly in the UI:

- Normal data.
- Empty data.
- Loading.
- Error.
- No permission.
- Readonly or disabled.
- Validation failure.
- Success or completed state.

Do not add irrelevant states just to satisfy a checklist. If a state does not apply, explain that in `prd.md` or `ai-handoff.md`.

## Demo Quality

- Make the first viewport feel like a real product screen for the requested feature.
- Keep content dense enough for business review, especially dashboards, admin tools, CRM, SaaS, and operational products.
- Use responsive layout for common desktop and mobile widths.
- Avoid placeholder-only copy. Use realistic labels, data, amounts, statuses, and error messages.
- Avoid hidden interactions that cannot be discovered during a demo.
- Ensure text does not overflow buttons, tabs, cards, tables, or panels.
- Use accessible contrast and keyboard-friendly controls where practical.

## AI Coding Compatibility

- Keep product regions clearly named so a coding agent can map UI behavior to requirements without treating the prototype as the required production component architecture.
- Keep data examples in `src/data/prdData.ts` instead of scattered strings when practical.
- Keep state transitions explicit and readable.
- Include mock API intent, request fields, response fields, error codes, boundaries, likely issues, and open questions in `ai-handoff.md`.
- Do not use the prototype or `ai-handoff.md` to dictate the target app's framework, component tree, file layout, state management, route structure, or implementation order.
- Do not rely on minified code or canvas-only rendering for core product UI.
