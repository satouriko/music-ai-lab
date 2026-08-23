# Music AI Lab Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing roadmap web application into `site/` and extend it into a read-only browser for the repository roadmap, notes, Python code, and notebooks.

**Architecture:** Repository files remain the only content source. A build-time Node.js indexer reads whitelisted root directories and writes an ignored generated bundle that the Vinext/Next.js application renders through typed route components; the deployed Worker never reads the local filesystem at runtime.

Roadmap structure validation is shared by the standalone data check and the content-generation step, so an incomplete roadmap also fails the normal site build.

**Tech Stack:** Node.js 22, Vinext, Next.js 16, React 19, TypeScript 5.9, React Markdown, remark-gfm, Shiki, Node test runner, OpenAI Sites

**Spec:** `docs/superpowers/specs/2026-08-23-music-ai-lab-site-design.md`

## Global Constraints

- Preserve all existing uncommitted changes under `docs/weekly/`, `learning/`, `pyproject.toml`, and `uv.lock`.
- Keep `roadmap/roadmap.json`, Markdown, Python, and Notebook files as the only authoritative content sources.
- Do not commit content copies under `site/`; only ignored `.generated/` build output may contain bundled content.
- Preserve the existing OpenAI Sites `project_id` in `site/.openai/hosting.json`.
- Do not execute Python or notebooks from the website.
- Do not render raw Markdown HTML or Notebook HTML/JavaScript output.
- Do not add search, tags, authentication, a database, GitHub API integration, online editing, or roadmap-to-artifact relationships.
- Do not create commits or push. At task boundaries inspect the diff and leave commit authorization to the user.
- Do not create sample learning notes, code, projects, or notebooks; automated tests must use temporary fixtures.

---

## Planned File Structure

### Root content and documentation

- `roadmap/README.md`: standalone roadmap data contract and validation command.
- `roadmap/roadmap.json`: existing 52-week roadmap data at its canonical path.
- `README.md`: separate documentation for `roadmap/` data and the `site/` application.
- `docs/superpowers/specs/2026-08-23-music-ai-lab-site-design.md`: approved design.
- `docs/superpowers/plans/2026-08-23-music-ai-lab-site.md`: this executable plan.

### Build-time content layer

- `site/scripts/content-index.mjs`: allowlisted scanner, title extraction, notebook normalization, and bundle creation.
- `site/scripts/build-content.mjs`: deterministic writer for `site/.generated/content.json`.
- `site/scripts/content-index.test.mjs`: temporary-fixture coverage for content ingestion.
- `site/scripts/validate-roadmap.mjs`: validator for `../roadmap/roadmap.json`.
- `site/lib/content-types.ts`: route-facing content and roadmap types.
- `site/lib/content.ts`: generated bundle import and exact-path lookups.
- `site/lib/content-links.ts`: safe repository-relative link mapping.
- `site/lib/content-links.test.ts`: URL mapping and traversal tests.

### Shared UI and routes

- `site/components/site-header.tsx`: brand and primary navigation.
- `site/components/site-footer.tsx`: shared footer.
- `site/components/content-list.tsx`: grouped list rows.
- `site/components/markdown-content.tsx`: safe GFM renderer.
- `site/components/code-viewer.tsx`: Shiki output with line numbers.
- `site/components/notebook-viewer.tsx`: notebook cells and safe saved outputs.
- `site/app/page.tsx`: lab overview.
- `site/app/roadmap/`: current interactive roadmap.
- `site/app/notes/`: note index and details.
- `site/app/code/`: Python index and details.
- `site/app/notebooks/`: notebook index and details.

---

### Task 1: Separate roadmap data from the web application

**Files:**
- Move: `roadmap/` web application to `site/`
- Move: `site/app/data/roadmap.json` to `roadmap/roadmap.json`
- Create: `roadmap/README.md`
- Modify: `site/app/data/roadmap.ts`
- Modify: `site/scripts/validate-roadmap.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: current roadmap application and its JSON
- Produces: canonical `roadmap/roadmap.json` and a still-buildable application under `site/`

- [x] **Step 1: Record and protect the starting state**

Run:

```bash
git status --short --branch
git diff -- docs/weekly/README.md pyproject.toml uv.lock
git status --short --untracked-files=all
```

Expected: the approved spec and plan are the only task-owned root additions; pre-existing learning, weekly note, Python dependency, and lockfile changes remain identifiable.

- [x] **Step 2: Move the application and extract the data source**

```bash
mv roadmap site
mkdir roadmap
mv site/app/data/roadmap.json roadmap/roadmap.json
```

Expected: tracked web files appear as renames, ignored dependencies move with the application, and no content under `docs/`, `learning/`, `notebooks/`, or `projects/` moves.

- [x] **Step 3: Point the current app and validator at the root data**

Update `site/app/data/roadmap.ts`:

```ts
import raw from '../../../roadmap/roadmap.json';
```

Update `site/scripts/validate-roadmap.mjs`:

```js
const dataUrl = new URL('../../roadmap/roadmap.json', import.meta.url);
```

- [x] **Step 4: Document the new root contract**

`roadmap/README.md` must identify `roadmap.json` as the canonical AI-readable source and point validation to:

```bash
cd site
npm run validate:data
```

Update the root directory tree and all website commands in `README.md` from `roadmap/` to `site/`; describe `roadmap/` and `site/` separately.

- [x] **Step 5: Verify the migrated site before adding behavior**

```bash
cd site
npm run validate:data
npm run typecheck
npm run lint
npm run build
```

Expected: the original site remains buildable and validation reports `52 weeks, 7 phases, 6 categories, 4 extension paths` from the root JSON.

- [x] **Step 6: Review the boundary**

```bash
git status --short
git diff --summary
git diff --check
```

Expected: the move and data extraction are isolated from the user's learning work and have no whitespace errors.

---

### Task 2: Build a deterministic repository content index

**Files:**
- Create: `site/scripts/content-index.mjs`
- Create: `site/scripts/content-index.test.mjs`
- Create: `site/scripts/build-content.mjs`
- Modify: `site/package.json`
- Modify: `site/.gitignore`
- Create (ignored): `site/.generated/content.json`

**Interfaces:**
- Consumes: `createContentBundle(repoRoot: string)`
- Produces: `{ roadmap, notes, code, notebooks }` with POSIX repository paths

- [x] **Step 1: Write failing scanner and title tests**

Create temporary fixtures and assert:

```js
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createContentBundle, extractMarkdownTitle } from './content-index.mjs';

test('extractMarkdownTitle uses the first h1 and falls back to the filename', () => {
  assert.equal(extractMarkdownTitle('intro.md', 'text\n# Visible title\n'), 'Visible title');
  assert.equal(extractMarkdownTitle('intro.md', 'text only'), 'intro');
});

test('createContentBundle scans only approved roots with stable paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-ai-content-'));
  await mkdir(join(root, 'roadmap'), { recursive: true });
  await mkdir(join(root, 'docs/weekly'), { recursive: true });
  await mkdir(join(root, 'learning/topic'), { recursive: true });
  await mkdir(join(root, 'notebooks'), { recursive: true });
  await writeFile(join(root, 'roadmap/roadmap.json'), '{"weeks":[],"phases":[],"categories":[],"extensionPaths":[]}');
  await writeFile(join(root, 'docs/weekly/2026-W34.md'), '# Week 34\n');
  await writeFile(join(root, 'learning/topic/train.py'), 'print("ok")\n');
  await writeFile(join(root, 'secret.py'), 'do_not_publish = true\n');
  const bundle = await createContentBundle(root);
  assert.deepEqual(bundle.notes.map((item) => item.path), ['docs/weekly/2026-W34.md']);
  assert.deepEqual(bundle.code.map((item) => item.path), ['learning/topic/train.py']);
  assert.equal(JSON.stringify(bundle).includes('secret.py'), false);
});
```

- [x] **Step 2: Run the tests and observe the missing module failure**

```bash
cd site
node --test scripts/content-index.test.mjs
```

Expected: FAIL because `content-index.mjs` has not been implemented.

- [x] **Step 3: Implement the scanner and base bundle**

Export:

```js
export function extractMarkdownTitle(filePath, source) {}
export async function collectFiles(root, extensions) {}
export async function createContentBundle(repoRoot) {}
```

Scan only:

```js
const NOTE_ROOTS = ['docs/weekly', 'docs/code-reading'];
const CODE_ROOTS = ['learning', 'projects', 'tests'];
```

Do not follow symbolic links. Filter notes to `.md`, code to `.py`, sort every path, reject scan roots outside `repoRoot`, and return:

```js
{
  roadmap: JSON.parse(roadmapSource),
  notes: [{ path, title, section, source }],
  code: [{ path, title, section, language: 'python', source }],
  notebooks: [],
}
```

- [x] **Step 4: Run scanner tests**

```bash
cd site
node --test scripts/content-index.test.mjs
```

Expected: PASS for title fallback, deterministic paths, allowlisting, and exclusion of `secret.py`.

- [x] **Step 5: Add bundle generation to development and verification commands**

`build-content.mjs` resolves the repo root relative to itself, calls `createContentBundle`, creates `.generated/`, and writes pretty JSON with one trailing newline. Add `generate:content` and `test` scripts; prefix `dev`, `build`, `lint`, and `typecheck` with `npm run generate:content &&`. Ignore `/.generated/` in Git and ESLint.

- [x] **Step 6: Generate the real bundle and confirm it is ignored**

```bash
cd site
npm run generate:content
git check-ignore -v .generated/content.json
node -e 'const c=require("./.generated/content.json"); console.log(c.notes.length,c.code.length,c.notebooks.length)'
```

Expected: current notes and Python exercises are indexed, notebooks are empty, and the generated JSON is ignored.

---

### Task 3: Add typed content access and safe repository links

**Files:**
- Create: `site/lib/roadmap-types.ts`
- Create: `site/lib/content-types.ts`
- Create: `site/lib/content.ts`
- Create: `site/lib/content-links.ts`
- Create: `site/lib/content-links.test.ts`
- Modify: `site/package.json`
- Modify: `site/package-lock.json`

**Interfaces:**
- Consumes: `site/.generated/content.json`
- Produces: `content`, exact-path lookup functions, `contentHref`, and `resolveRepositoryLink`

- [x] **Step 1: Install rendering and TypeScript test dependencies**

```bash
cd site
npm install react-markdown remark-gfm shiki
npm install --save-dev tsx
```

Expected: the manifest and lockfile pin the resolved dependency graph and `npm audit --omit=dev` finds no known production vulnerability.

- [x] **Step 2: Define the generated content contract**

Move the existing roadmap interfaces from `site/app/data/types.ts` to `site/lib/roadmap-types.ts` and add:

```ts
export interface RoadmapData {
  phases: Phase[];
  weeks: WeekPlan[];
  categories: Category[];
  extensionPaths: ExtensionPath[];
}
```

Define:

```ts
export type ContentKind = 'note' | 'code' | 'notebook';

export interface NoteDocument {
  path: string;
  title: string;
  section: string;
  source: string;
}

export interface CodeDocument extends NoteDocument {
  language: 'python';
}

export type NotebookOutput =
  | { kind: 'text'; text: string }
  | { kind: 'error'; name: string; value: string; traceback: string }
  | { kind: 'image'; mimeType: 'image/png' | 'image/jpeg'; data: string }
  | { kind: 'unsupported'; mimeTypes: string[] };

export interface NotebookCell {
  kind: 'markdown' | 'code' | 'raw';
  source: string;
  executionCount: number | null;
  outputs: NotebookOutput[];
}

export interface NotebookDocument {
  path: string;
  title: string;
  section: 'notebooks';
  cells: NotebookCell[];
}

export interface GeneratedContent {
  roadmap: import('./roadmap-types').RoadmapData;
  notes: NoteDocument[];
  code: CodeDocument[];
  notebooks: NotebookDocument[];
}
```

- [x] **Step 3: Write failing route and traversal tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { contentHref, resolveRepositoryLink } from './content-links';

const knownPaths = new Map([
  ['docs/weekly/2026-W34.md', 'note'],
  ['learning/00-environment/environment_check.py', 'code'],
  ['notebooks/2026-08-23-demo.ipynb', 'notebook'],
] as const);

test('contentHref keeps repository path segments', () => {
  assert.equal(contentHref('code', 'learning/a b/train.py'), '/code/learning/a%20b/train.py');
});

test('relative content resolves while traversal is rejected', () => {
  assert.equal(
    resolveRepositoryLink('docs/weekly/2026-W34.md', '../../learning/00-environment/environment_check.py', knownPaths),
    '/code/learning/00-environment/environment_check.py',
  );
  assert.equal(resolveRepositoryLink('docs/weekly/2026-W34.md', '../../../../etc/passwd', knownPaths), null);
  assert.equal(resolveRepositoryLink('docs/weekly/2026-W34.md', 'https://pytorch.org/', knownPaths), 'https://pytorch.org/');
});
```

- [x] **Step 4: Run tests and observe missing helper failure**

Add `node --import tsx --test lib/*.test.ts` to `npm test`, then run:

```bash
cd site
npm test
```

Expected: FAIL because the URL helpers do not exist.

- [x] **Step 5: Implement typed lookups and URL mapping**

`content.ts` imports the generated JSON, casts once to `GeneratedContent`, and exports `findNote(path)`, `findCode(path)`, and `findNotebook(path)` using exact equality.

`content-links.ts` must percent-encode individual segments, preserve `https:`, `http:`, `mailto:`, and fragment-only links, resolve relative paths with `node:path/posix` semantics, keep URL fragments, and return `null` for traversal or unknown paths.

- [x] **Step 6: Verify helper behavior and types**

```bash
cd site
npm test
npm run typecheck
```

Expected: all Node and TypeScript tests pass and the generated bundle satisfies the application contract.

---

### Task 4: Create the shared shell, homepage, and roadmap route

**Files:**
- Create: `site/components/site-header.tsx`
- Create: `site/components/site-footer.tsx`
- Create: `site/components/content-list.tsx`
- Create: `site/app/roadmap/page.tsx`
- Create: `site/app/roadmap/roadmap-client.tsx`
- Replace: `site/app/page.tsx`
- Modify: `site/app/layout.tsx`
- Modify: `site/app/globals.css`
- Remove: `site/app/data/roadmap.ts`
- Remove: `site/app/data/types.ts`

**Interfaces:**
- Consumes: typed roadmap and content summaries
- Produces: shared navigation, `/` overview, and `/roadmap` with existing interactions

- [x] **Step 1: Preserve the roadmap under its own route**

Move the current client page into `app/roadmap/roadmap-client.tsx`. Replace static data imports with a `RoadmapData` prop, remove the old page-owned header and footer, and retain content/week views, phase filters, week expansion, practice, and extension sections.

Create the server route:

```tsx
import { RoadmapClient } from './roadmap-client';
import { content } from '@/lib/content';

export default function RoadmapPage() {
  return <RoadmapClient roadmap={content.roadmap} />;
}
```

- [x] **Step 2: Add the shared site shell**

`SiteHeader` uses `next/link` and exposes `/`, `/roadmap`, `/notes`, `/code`, and `/notebooks`. `SiteFooter` retains the short evidence-first learning message and links home.

Update layout metadata to `Music AI Lab`, keep the existing Open Graph image, and render:

```tsx
<body className={`${geistSans.variable} ${geistMono.variable}`}>
  <SiteHeader />
  {children}
  <SiteFooter />
</body>
```

- [x] **Step 3: Build the home page from generated summaries**

Render four entry cards with counts. Determine the newest weekly note only from paths matching:

```ts
/^docs\/weekly\/\d{4}-W\d{2}\.md$/
```

Sort descending and link the first match. When absent, show a stable empty state instead of using file modification times.

- [x] **Step 4: Extend the current visual system**

Reuse paper, blue, gold, Geist, and editorial spacing. Add `.lab-home`, `.entry-grid`, `.content-list`, and shared shell styles while preserving every roadmap selector used by `RoadmapClient`.

- [x] **Step 5: Verify the route split**

```bash
cd site
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: `/` and `/roadmap` compile, the old `site/app/data/` imports are gone, and all roadmap controls remain present.

---

### Task 5: Render notes with safe repository-relative links

**Files:**
- Create: `site/components/markdown-content.tsx`
- Create: `site/app/notes/page.tsx`
- Create: `site/app/notes/[...path]/page.tsx`
- Modify: `site/app/globals.css`

**Interfaces:**
- Consumes: notes, exact lookup helpers, and repository link mapping
- Produces: grouped `/notes` index and safe GFM details

- [x] **Step 1: Implement the grouped note index**

Use `ContentList` with `docs/weekly` labeled “周记” and `docs/code-reading` labeled “源码阅读”. Every row shows its title and repository-relative path.

- [x] **Step 2: Implement safe Markdown rendering**

Use `react-markdown` with `remark-gfm` and do not add `rehype-raw`. Build a map of generated content paths and customize anchors:

```tsx
const resolved = resolveRepositoryLink(sourcePath, href ?? '', knownPaths);
if (resolved === null) return <code className="unresolved-link">{children}</code>;
if (/^https?:/.test(resolved)) return <a href={resolved} rel="noreferrer" target="_blank">{children}</a>;
return <Link href={resolved}>{children}</Link>;
```

- [x] **Step 3: Add the catch-all note route**

Join `params.path` with `/`, find the exact note, call `notFound()` when absent, and export `generateStaticParams()` from generated note paths. Render title, repository path, and `MarkdownContent`.

- [x] **Step 4: Verify the current weekly note and Python links**

```bash
cd site
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: the build includes `docs/weekly/2026-W34.md`, GFM tables compile, and links to known `learning/**/*.py` map to `/code/...`.

---

### Task 6: Add the read-only Python code browser

**Files:**
- Create: `site/lib/highlight-code.ts`
- Create: `site/lib/highlight-code.test.ts`
- Create: `site/components/code-viewer.tsx`
- Create: `site/app/code/page.tsx`
- Create: `site/app/code/[...path]/page.tsx`
- Modify: `site/app/globals.css`

**Interfaces:**
- Consumes: code documents and exact lookup helpers
- Produces: grouped Python routes with paths, line numbers, and syntax highlighting

- [x] **Step 1: Write a failing source-escaping regression test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { highlightCode } from './highlight-code';

test('highlightCode escapes source markup before producing Shiki HTML', async () => {
  const html = await highlightCode('print("<script>alert(1)</script>")', 'python');
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('&lt;script&gt;'), true);
});
```

Run `npm test`; expect failure before `highlight-code.ts` exists.

- [x] **Step 2: Implement one cached Shiki highlighter**

Support `python` and `text` with one theme. `CodeViewer` renders only Shiki HTML generated from source. Add CSS counters to `.shiki .line` for selectable line numbers and keep horizontal scrolling.

- [x] **Step 3: Add code index and detail routes**

Group by `learning`, `projects`, and `tests`. The catch-all detail route finds an exact generated path, calls `notFound()` for unknown paths, exports `generateStaticParams()`, and shows the repository-relative path above `CodeViewer`.

- [x] **Step 4: Verify real exercises without executing Python**

```bash
cd site
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: current `.py` files under `learning/` have routes, angle brackets are escaped, and the site build starts no Python process.

---

### Task 7: Parse and render notebooks without executing them

**Files:**
- Modify: `site/scripts/content-index.mjs`
- Modify: `site/scripts/content-index.test.mjs`
- Create: `site/components/notebook-viewer.tsx`
- Create: `site/app/notebooks/page.tsx`
- Create: `site/app/notebooks/[...path]/page.tsx`
- Modify: `site/app/globals.css`

**Interfaces:**
- Consumes: nbformat JSON cells and saved outputs
- Produces: normalized notebooks and safe notebook pages; never starts a kernel

- [x] **Step 1: Write failing notebook normalization tests**

Create this object only in the temporary test directory:

```js
{
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { language: 'python' } },
  cells: [
    { cell_type: 'markdown', metadata: {}, source: ['# Demo notebook\n', 'Explanation'] },
    {
      cell_type: 'code', metadata: {}, source: ['print("ok")'], execution_count: 3,
      outputs: [
        { output_type: 'stream', name: 'stdout', text: ['ok\n'] },
        { output_type: 'error', ename: 'ValueError', evalue: 'bad', traceback: ['trace'] },
        { output_type: 'display_data', data: { 'image/png': 'AAAA' }, metadata: {} },
        { output_type: 'display_data', data: { 'text/html': '<script>bad()</script>' }, metadata: {} }
      ]
    }
  ]
}
```

Assert the title is `Demo notebook`, array sources are joined, outputs normalize to `text`, `error`, `image`, and `unsupported`, and no normalized value contains executable HTML.

- [x] **Step 2: Run tests and observe the empty-notebook failure**

```bash
cd site
npm test
```

Expected: FAIL because the indexer still returns no parsed notebooks.

- [x] **Step 3: Implement notebook normalization**

Export and use:

```js
export function normalizeSource(source) {}
export function normalizeNotebookOutput(output) {}
export function parseNotebook(filePath, source) {}
```

Support `stream`, `error`, `execute_result`, and `display_data`. Prefer PNG, then JPEG, then `text/plain`; otherwise emit `{ kind: 'unsupported', mimeTypes: sortedKeys }`. Keep raw cells inert. Invalid JSON or a missing `cells` array must report the repository path.

- [x] **Step 4: Implement notebook index and detail rendering**

The empty index explains that no notebooks exist. Details render Markdown through `MarkdownContent`, code through `CodeViewer`, text and errors in inert `<pre>`, images as base64 data URLs, and unsupported MIME types as a visible “未展示输出” label. Do not render raw HTML or import execution libraries.

- [x] **Step 5: Verify fixture coverage and the real empty state**

```bash
cd site
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all temporary notebook cases pass, the real `/notebooks` page builds empty, and no sample `.ipynb` is added.

---

### Task 8: Finish documentation, responsive behavior, and full verification

**Files:**
- Modify: `site/README.md`
- Modify: `README.md`
- Modify: `site/app/globals.css`
- Verify: all task-owned files

**Interfaces:**
- Consumes: complete content browser and repository conventions
- Produces: documented commands, responsive pages, production evidence, and a clean handoff

- [x] **Step 1: Update application documentation**

`site/README.md` documents `npm ci`, development, tests, data validation, typecheck, lint, and build. Explain that ignored content is regenerated from `../roadmap`, `../docs`, `../learning`, `../projects`, `../tests`, and `../notebooks`.

The root README describes the route set and states that edits belong in root content directories, never in generated site data.

- [x] **Step 2: Complete responsive CSS**

Confirm the header wraps without overlap, prose has a readable maximum width, code/tables/wide outputs scroll horizontally, content indexes become one column on small screens, and no drawer or JavaScript-only responsive navigation was added.

- [x] **Step 3: Run full site verification from a clean install**

```bash
cd site
npm ci
npm test
npm run validate:data
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
```

Expected: every command exits zero, production dependencies have no known vulnerabilities, and the build contains home, roadmap, notes, code, and notebook routes.

- [x] **Step 4: Run repository regression and ignore checks**

```bash
uv run pytest -q
git diff --check
git status --short --untracked-files=all
git check-ignore -v site/.generated/content.json site/node_modules site/dist site/.vinext site/.wrangler
```

Expected: existing Python learning tests pass; only intended task changes plus pre-existing user changes remain visible; all generated web artifacts stay ignored.

- [x] **Step 5: Audit directory ownership and hosting identity**

```bash
find roadmap -maxdepth 2 -type f -print | sort
find site -path site/node_modules -prune -o -path site/dist -prune -o -path site/.vinext -prune -o -path site/.next -prune -o -type f -print | sort
git diff -- site/.openai/hosting.json
```

Expected: `roadmap/` contains only `README.md` and `roadmap.json`; `site/` contains code/config/assets plus ignored generated output; the hosting config moved without changing `project_id`.

- [x] **Step 6: Prepare user review without committing**

```bash
git diff --stat
git diff --summary
git diff --name-status
git log -8 --pretty=fuller
```

Report verified commands, open issues, and the exact task-owned file set. Do not stage, commit, push, or publish until the user separately approves those actions and the complete commit message.
