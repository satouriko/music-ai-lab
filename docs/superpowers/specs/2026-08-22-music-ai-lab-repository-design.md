# Music AI Lab Repository Design

## Goal

Create a public learning laboratory for music AI that keeps foundational study,
exploratory notebooks, bounded learning projects, source-reading references, and
the 52-week roadmap in one reproducible repository.

## Repository boundary

`music-ai-lab` owns learning and experimentation. It does not contain the
independent Song2Piano personal-interest project. Once that project starts, it
lives in the `song2piano` repository with its own dependencies, tests, history,
data references, and release process.

Work moves through the lab in this direction:

```text
learning -> notebooks -> projects -> reusable understanding
```

When an idea is ready for Song2Piano, it is implemented and tested in that
repository. `song2piano` must not depend on `music-ai-lab`.

## Directory model

- `roadmap/`: the existing interactive 52-week roadmap website. It retains its
  own Node.js manifest and lockfile and remains independently buildable.
- `learning/`: small, focused exercises organized by subject. These files teach
  one concept and are not expected to form complete applications.
- `notebooks/`: exploratory analysis, visualization, and hypothesis testing.
  Reusable logic moves out of notebooks when it stabilizes.
- `projects/`: bounded, reproducible learning projects that take roughly one to
  three weekends and end with a README, runnable commands, evaluation, and a
  short report.
- `references/`: third-party source repositories added as Git submodules and
  pinned by the parent repository. Local modifications belong in a fork.
- `docs/weekly/`: weekly plans, reviews, time records, and piano/theory practice
  notes.
- `docs/code-reading/`: notes about third-party code, including repository URL
  and inspected commit.
- `tests/`: tests for shared lab utilities and cross-project repository rules.
- `docs/superpowers/`: approved design and implementation records for material
  repository changes.

Directories are created when they have useful content; explanatory README files
are content and may establish a directory before its first exercise.

## Tooling

- The repository lives in the WSL Linux filesystem at
  `/home/jiahao/workspace/music-ai-lab`.
- Python compatibility starts at CPython 3.11 and is managed with uv. The
  repository keeps the generated `uv.lock` as its reproducible dependency lock.
- Python and roadmap dependencies remain independent: root `pyproject.toml`
  versus `roadmap/package.json`.
- Large datasets, model weights, and experiment artifacts are not committed to
  Git. Their authoritative copies live in Hugging Face repositories when their
  licenses permit third-party cloud storage.
- Private visibility never overrides a dataset license. Data that forbids any
  third-party copy must be fetched from its authorized source and treated as an
  ephemeral local cache.

## Roadmap migration

The initial import uses only files tracked by the existing roadmap repository at
commit `88e193e`. It excludes that checkout's `.git` directory, dependency
installation, build output, framework caches, and Wrangler state. After import,
the copy in this repository evolves independently. Keep `.openai/hosting.json`
so it retains its Sites identity, but do not republish the current deployment
without an explicit publishing request.

## Initial completion criteria

- The new repository is initialized on a `codex/` working branch and has no
  remote, commit, or push.
- The root README explains the purpose and correct use of every top-level
  directory, the lab-to-project boundary, setup commands, data policy, and the
  first two weeks' scope.
- The copied roadmap passes its existing data validation, typecheck, lint, and
  production build.
- Repository checks confirm that nested Git metadata, dependencies, caches, and
  build output were not imported.
