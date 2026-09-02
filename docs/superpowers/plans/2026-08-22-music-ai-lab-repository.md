# Music AI Lab Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the initial `music-ai-lab` Git repository with documented learning boundaries and the existing roadmap website under `roadmap/`.

**Architecture:** The root is a Python learning repository managed by uv, while `roadmap/` is an independently buildable Node.js application. Subject exercises, exploratory notebooks, bounded projects, submodule references, and documentation remain separate by intent.

**Tech Stack:** Git, Python 3.11, uv metadata, Markdown, Next.js/Vinext roadmap source

**Spec:** `docs/superpowers/specs/2026-08-22-music-ai-lab-repository-design.md`

## Global Constraints

- Work only in `/home/jiahao/workspace/music-ai-lab`.
- Preserve the existing roadmap checkout unchanged; edits are made only in this
  repository's imported copy.
- Import only files tracked at roadmap commit `88e193e`.
- During the initial scaffold, install uv only for the current WSL user and do
  not use a system-wide package installation, create a remote, commit, or push.
  Publication is a separate follow-up that requires an explicit request.
- Do not create the `song2piano` repository in this task.
- Do not add large data, model weights, experiment runs, dependency directories, caches, or build output.

---

### Task 1: Establish the repository contract

**Files:**
- Create: `docs/superpowers/specs/2026-08-22-music-ai-lab-repository-design.md`
- Create: `docs/superpowers/plans/2026-08-22-music-ai-lab-repository.md`

**Interfaces:**
- Consumes: the directory and repository decisions approved before creation
- Produces: explicit boundaries used by the root README and validation steps

- [x] Initialize an empty Git repository on `codex/scaffold-music-ai-lab`.
- [x] Record the approved repository design.
- [x] Record this executable plan without commit or push steps.
- [x] Scan both documents for placeholders and contradictions.

### Task 2: Import the existing roadmap source

**Files:**
- Create: `roadmap/` from the tracked files in the existing roadmap repository

**Interfaces:**
- Consumes: clean roadmap commit `88e193e`
- Produces: an independently installable and buildable website under `roadmap/`

- [x] Export tracked files with `git archive 88e193e` into `roadmap/`.
- [x] Verify that `roadmap/.git`, `node_modules`, `.next`, and `dist` are absent.
- [x] Verify that `roadmap/package.json` and `roadmap/package-lock.json` are present.

### Task 3: Create the learning repository skeleton

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `.python-version`
- Create: `pyproject.toml`
- Create: `learning/README.md`
- Create: `notebooks/README.md`
- Create: `projects/README.md`
- Create: `references/README.md`
- Create: `docs/README.md`
- Create: `docs/weekly/README.md`
- Create: `docs/code-reading/README.md`
- Create: `tests/README.md`

**Interfaces:**
- Consumes: the repository contract from Task 1
- Produces: navigable directory boundaries and Python project metadata

- [x] Write the root README with purpose, directory rules, decision table,
      setup commands, first-two-weeks scope, and cloud data policy.
- [x] Add concise local README files so every tracked directory explains its
      acceptance criteria.
- [x] Declare Python 3.11 and generate `uv.lock` with the installed uv release.
- [x] Ignore generated Python, notebook, experiment, environment, and roadmap
      files without ignoring source or reports.

### Task 4: Validate the result

**Files:**
- Verify: all files created in Tasks 1-3

**Interfaces:**
- Consumes: complete repository scaffold and roadmap source
- Produces: evidence that the repository is clean, documented, and buildable

- [x] Inspect `git status`, branch, remotes, tracked candidates, and nested Git
      metadata.
- [x] Validate `pyproject.toml` with Python's standard TOML parser.
- [x] Install roadmap dependencies from its lockfile.
- [x] Run `npm run validate:data`, `npm run typecheck`, `npm run lint`, and
      `npm run build` from `roadmap/`.
- [x] Confirm generated dependencies and build output remain ignored.
- [x] Leave all work uncommitted for user review.

### Task 5: Apply the public-content and dependency follow-up

**Files:**
- Modify: public Markdown files and `roadmap/app/`
- Modify: `roadmap/package.json` and `roadmap/package-lock.json`
- Create: `uv.lock`

**Interfaces:**
- Consumes: the initial scaffold and its dependency audit
- Produces: learning-focused public copy and current reproducible environments

- [x] Describe learning as learning and Song2Piano as a personal-interest
      project throughout public documents and roadmap content.
- [x] Install uv 0.12.5 for the current WSL user and sync CPython 3.11.
- [x] Upgrade Next.js and `eslint-config-next` together to 16.3.2.
- [x] Re-run the complete roadmap validation and dependency audit.

## Validation record

- Initial roadmap import: 17 tracked source files, 0 hash mismatches against
  commit `88e193e`; the imported copy now contains the documented follow-up
  edits.
- Roadmap data: 52 weeks, 7 phases, 6 categories, and 4 extension paths valid.
- TypeScript typecheck, ESLint, and Vinext production build: passed after the
  Next.js 16.3.2 update.
- `pyproject.toml`: parsed successfully with Python's standard TOML parser.
- uv 0.12.5 generated `uv.lock`, installed CPython 3.11.16, and completed a
  locked environment sync.
- Initial Git state before publication: no commits, no remote, no nested Git
  repository, and generated roadmap dependencies and build files are ignored.
- Public copy and the Open Graph image describe learning and personal-interest
  projects consistently.
- Production dependency audit after upgrading Next.js and
  `eslint-config-next` to 16.3.2: zero known vulnerabilities.
