# Worktree Workflow

Use this reference when `$prd` work happens inside an existing Git repository, product project, or a larger PRD workflow that benefits from multiple role workspaces.

## When to Use a Worktree

Prefer a temporary worktree when:

- The current repository has unrelated local changes.
- The PRD package is being generated inside an existing app or docs repository.
- The work may involve many generated files, images, screenshots, or iterative Vue3 prototype changes.
- The user wants multiple prototype directions in parallel.
- The current branch must stay available for other work.
- Different roles can produce candidate outputs in parallel and then be integrated.

Do not force a worktree when:

- The user requested a simple standalone folder outside a repo.
- The target is already an isolated throwaway directory.
- The user explicitly asks to work in the current tree.
- Creating or switching branches would change scope or require unclear Git decisions.

## Setup Rules

- Check repository path, branch, and worktree status before creating a worktree.
- Preserve the user's existing work. Never reset, clean, stash, rebase, or force-push without explicit approval.
- Use a short `codex/prd-<feature-slug>` branch name unless the user specifies another branch.
- Put temporary worktrees in a clearly named sibling or temporary location.
- Keep the generated PRD package self-contained so it can be copied or merged back cleanly.

## Role Workflow

For medium or large PRD requests, the main agent can coordinate role-based work. Keep one clear integrator responsible for the final output; do not blindly merge role outputs.

Suggested roles:

- Requirement analyst: drafts or updates `requirements.json`, `prd.md`, requirement IDs, flows, fields, permissions, and acceptance criteria.
- PRD board/prototype maker: adapts the Vue3 workspace, including the annotated PRD board, high-fidelity prototype view, feature menu, view switch, comments, and locator behavior.
- Boundary and risk reviewer: strengthens `ai-handoff.md` with scope boundaries, edge cases, likely issues, open questions, backend assumptions, and user-visible failure modes.
- Traceability and version reviewer: checks `traceability-matrix.md`, `CHANGELOG.md`, finalized `versions/` behavior, and ID coverage.
- Final integrator: resolves conflicts, aligns terminology, runs validation, and preserves only the accepted output.

## Shared Requirement Source

All role work must converge on one requirement source.

- `requirements.json` and `prd.md` define the accepted requirement facts.
- `index.html`, `traceability-matrix.md`, `ai-handoff.md`, and `CHANGELOG.md` must be reconciled back to those accepted facts.
- A role may propose a new role, state, flow, field, permission, exception, comment, or requirement ID, but it is not accepted until the final integrator includes it in the authoritative package.
- Candidate-only details must not remain only in one worktree, one Vue component, one note, or one review comment.
- If two roles disagree, preserve the conflict as an open question instead of silently choosing a business meaning.

Use multiple agents only when:

- The user asked for speed, workflow parallelism, multiple roles, or multiple agents, or the loaded skill explicitly calls for this workflow.
- The outputs can be split cleanly by file or by candidate direction.
- The main agent can still review and integrate the final result.

Do not use multiple agents when a small one-screen prototype would be slowed down by coordination overhead.

## Worktree Branching Pattern

When role worktrees are useful, create a short-lived integration branch and optional role branches:

- Integration branch: `codex/prd-<feature-slug>`.
- Role branches: `codex/prd-<feature-slug>-requirements`, `codex/prd-<feature-slug>-prototype`, `codex/prd-<feature-slug>-review`.

Each role should write to a separate file set when possible:

- Requirements role: `requirements.json`, `prd.md`, and proposed `src/data/prdData.ts` changes.
- Prototype role: `src/`, `index.html`, `package.json`, Vite and TypeScript config.
- Risk/detail role: `ai-handoff.md`.
- Traceability/version role: `traceability-matrix.md`, `CHANGELOG.md`, `versions/` only when the user says “定版”.

The final integrator may edit all files after reviewing the role outputs.

## Final Integration

After parallel work:

- Pick one output directory as the current draft.
- Copy or merge only accepted changes from role worktrees into that directory.
- Re-run validation after integration, not only inside individual worktrees.
- Check that every `REQ-###` appears consistently in the PRD, Vue requirement bindings, traceability matrix, AI-readable requirement detail brief, and version notes.
- Keep rejected directions out of `versions/`; only user-approved final versions belong there.

## During Work

- Generate and validate inside the isolated worktree.
- Compare candidate outputs and integrate deliberately; do not treat a role worktree as accepted just because it exists.
- Keep versioned snapshots under the package's `versions/` directory only when the user says “定版”.
- Do not create a Git commit, push, or PR unless the user explicitly asks.
- If the target repository has its own AGENTS.md, README rules, or docs conventions, follow them for repository changes.

## Cleanup Rules

Clean up the temporary worktree only after one of these is true:

- The user accepted the result and it has been copied or merged into the intended location.
- The user asks to discard the prototype attempt.
- The worktree contains no unique changes that need preservation.

Before cleanup:

- Check the worktree status.
- If there are unpreserved changes, ask before deleting the worktree.
- Record where the accepted output now lives.

Cleanup should remove both the temporary worktree directory and its worktree registration. Do not delete finalized version directories or accepted output packages. Delete temporary branches only when they have been merged or their content has been preserved and the user has clearly approved branch cleanup.
