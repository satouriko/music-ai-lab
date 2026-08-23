# Roadmap-Centered Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Music AI Lab as a content-first roadmap where every real note, code exercise, and notebook is presented through the weeks it supports.

**Architecture:** `roadmap/artifacts.json` becomes the canonical AI-readable relationship layer between roadmap weeks and repository content. The build-time index validates and embeds those relationships; Vinext statically exports the roadmap and every concrete artifact/content route as HTML plus RSC, while the hosted Worker only serves those files with the navigation protocol required for SPA transitions.

**Tech Stack:** Vinext, React 19, TypeScript, React Markdown, remark-gfm, Shiki, Node.js test runner, ESLint, CSS.

**Spec:** `docs/superpowers/specs/2026-08-23-music-ai-lab-site-design.md`

## Global Constraints

- `roadmap/` contains source data; `site/` contains website code/config/assets and ignored generated output only.
- Roadmap is the only primary navigation surface; do not expose repository-wide note/code/notebook lists.
- Whitespace must establish hierarchy without empty half-screens; compact metadata must not squeeze reading content.
- Notes keep a `720–780px` reading column and a separate `220px` right-side table of contents when space permits.
- Markdown fenced code and source files use Shiki plus an explicit Cascadia/Consolas/Liberation Mono fallback stack.
- Do not execute Markdown HTML, Notebook HTML/JavaScript, Python, or a Notebook kernel.
- Preserve the current Sites `project_id`; do not publish, stage, commit, or push without separate user approval.
- Keep the retained local server bound to `0.0.0.0`; hand off only the final WSL-IP preview.

---

### Task 1: Add the canonical roadmap artifact manifest

**Files:**
- Create: `roadmap/artifacts.json`
- Create: `site/scripts/artifact-validation.mjs`
- Create: `site/scripts/artifact-validation.test.mjs`
- Modify: `site/scripts/content-index.mjs`
- Modify: `site/scripts/content-index.test.mjs`
- Modify: `site/scripts/build-content.mjs`
- Create: `site/lib/artifact-types.ts`
- Modify: `site/lib/content-types.ts`
- Modify: `roadmap/README.md`

**Interfaces:**
- Consumes: `createContentBundle(repoRoot)` and validated `roadmap/roadmap.json`.
- Produces: `validateArtifacts(artifacts, content): void`, `Artifact`, `NoteArtifact`, `CodeArtifact`, `NotebookArtifact`, and `GeneratedContent.artifacts`.

- [x] **Step 1: Write failing relationship validation tests**

Create fixtures that assert:

```js
assert.doesNotThrow(() => validateArtifacts(validArtifacts, content));
assert.throws(
  () => validateArtifacts([{ ...validArtifacts[0], weeks: [53] }], content),
  /artifact environment-check references unknown week 53/,
);
assert.throws(
  () => validateArtifacts([{ ...validArtifacts[0], files: [{ path: 'secret.py', role: 'entry' }] }], content),
  /artifact environment-check references unknown content path secret\.py/,
);
assert.throws(
  () => validateArtifacts([], content),
  /orphan content learning\/00-environment\/environment_check\.py/,
);
```

Also assert duplicate IDs, empty week arrays, unknown category IDs, wrong artifact kind, duplicate file paths, and code artifacts without exactly one `entry` file.

- [x] **Step 2: Run the artifact tests and verify the missing module failure**

Run: `cd site && node --test scripts/artifact-validation.test.mjs`

Expected: FAIL because `artifact-validation.mjs` does not exist.

- [x] **Step 3: Define the artifact source schema**

Use this JSON shape:

```json
{
  "artifacts": [
    {
      "id": "environment-check",
      "kind": "code",
      "title": "环境与可复现性检查",
      "summary": "记录 Python、PyTorch、CUDA 与随机状态，建立可复现实验基线。",
      "weeks": [1],
      "categoryIds": ["math-ml"],
      "root": "learning/00-environment",
      "files": [
        {
          "path": "learning/00-environment/environment_check.py",
          "role": "entry"
        },
        {
          "path": "learning/00-environment/test_environment_check.py",
          "role": "test"
        }
      ]
    }
  ]
}
```

Add the `pytorch-training` code artifact for W02 and the `weekly-2026-w34` note artifact only for its actual W01 completion evidence. Do not infer W02/W04 from note keywords, and do not add a placeholder Notebook artifact.

Mirror the manifest with these discriminated TypeScript interfaces:

```ts
interface ArtifactBase {
  id: string;
  title: string;
  summary: string;
  weeks: number[];
  categoryIds: string[];
}

export interface NoteArtifact extends ArtifactBase {
  kind: 'note';
  path: string;
}

export interface CodeArtifact extends ArtifactBase {
  kind: 'code';
  root: string;
  files: Array<{ path: string; role: 'entry' | 'test' | 'support' }>;
}

export interface NotebookArtifact extends ArtifactBase {
  kind: 'notebook';
  path: string;
}

export type Artifact = NoteArtifact | CodeArtifact | NotebookArtifact;
```

- [x] **Step 4: Implement manifest validation and orphan detection**

`validateArtifacts` must:

```js
export function validateArtifacts(artifacts, content) {
  // validate discriminated shapes and non-empty strings
  // validate weeks against content.roadmap.weeks
  // validate categoryIds against content.roadmap.categories
  // validate note/notebook paths against indexed content
  // validate code roots and every declared Python file
  // require one entry file for each code artifact
  // reject duplicate artifact IDs and duplicate content ownership
  // reject indexed note/code/notebook paths that are not owned by an artifact
}
```

Exclude only collection instructions named `docs/weekly/README.md` and `docs/code-reading/README.md` from note indexing. Every indexed `.py` and `.ipynb` remains subject to orphan detection.

- [x] **Step 5: Load and validate artifacts during content generation**

Extend `createContentBundle` to parse `roadmap/artifacts.json`, report that exact path on malformed JSON, include `artifacts` in its result, and call `validateArtifacts` from `build-content.mjs` before writing `.generated/content.json`.

- [x] **Step 6: Run focused and full data tests**

Run:

```bash
cd site
npm test
npm run validate:data
npm run generate:content
```

Expected: tests pass and generated counts report one note, four Python files, zero notebooks, and three artifacts.

---

### Task 2: Add typed artifact relationships and safe links

**Files:**
- Create: `site/lib/artifacts.ts`
- Create: `site/lib/artifacts.test.ts`
- Modify: `site/lib/content.ts`

**Interfaces:**
- Consumes: `GeneratedContent.artifacts`, existing exact-path content lookups.
- Produces: `artifactHref(id): string`, `findArtifact(id): Artifact | undefined`, `artifactsForWeek(week): Artifact[]`, `artifactForContentPath(path): Artifact | undefined`, and `roadmapWeekHref(week): string`.

- [x] **Step 1: Write failing artifact lookup tests**

Use a small in-memory fixture and assert:

```ts
assert.deepEqual(artifactsForWeekFrom(fixture, 1).map((item) => item.id), [
  'environment-check',
  'weekly-2026-w34',
]);
assert.equal(artifactForContentPathFrom(fixture, 'learning/a.py')?.id, 'exercise');
assert.equal(artifactForContentPathFrom(fixture, '../secret.py'), undefined);
assert.equal(artifactHref('weekly-2026-w34'), '/artifacts/weekly-2026-w34');
assert.equal(roadmapWeekHref(4), '/#week-4');
```

- [x] **Step 2: Run the lookup tests and verify they fail**

Run: `cd site && node --import tsx --test lib/artifacts.test.ts`

Expected: FAIL because `artifacts.ts` does not exist.

- [x] **Step 3: Implement exact artifact lookups**

Build lookup maps once at module initialization. Do not resolve arbitrary filesystem paths at request time. `artifactForContentPath` must compare normalized manifest paths exactly and reject traversal-shaped input before lookup.

- [x] **Step 4: Expose artifact ownership to detail pages**

Keep `resolveRepositoryLink` returning safe direct URLs. Detail pages call `artifactForContentPath(path)` after their existing exact content lookup, so Markdown links remain simple while every rendered destination gains roadmap context. Preserve external HTTP(S), mail, fragment, traversal, and unknown-path behavior unchanged.

- [x] **Step 5: Run focused and full tests**

Run: `cd site && npm test`

Expected: artifact relationships, traversal rejection, and existing content links all pass.

---

### Task 3: Build readable Markdown, Shiki code blocks, and a real table of contents

**Files:**
- Create: `site/lib/markdown-headings.ts`
- Create: `site/lib/markdown-headings.test.ts`
- Create: `site/lib/markdown-rendering.test.ts`
- Modify: `site/lib/highlight-code.ts`
- Modify: `site/lib/highlight-code.test.ts`
- Create: `site/components/table-of-contents.tsx`
- Modify: `site/components/markdown-content.tsx`

**Interfaces:**
- Consumes: Markdown source, safe repository links, direct Shiki grammar imports.
- Produces: `extractMarkdownHeadings(source): MarkdownHeading[]`, `normalizeHighlightLanguage(language): HighlightLanguage`, KaTeX math output, `MarkdownDocument`, and `TableOfContents`.

- [x] **Step 1: Write failing heading and language tests**

Cover Chinese headings, duplicate headings, ignored `#` inside fenced code, aliases, and unknown languages:

```ts
assert.deepEqual(extractMarkdownHeadings(source), [
  { id: '安装', level: 2, text: '安装' },
  { id: '安装-2', level: 3, text: '安装' },
]);
assert.equal(normalizeHighlightLanguage('sh'), 'bash');
assert.equal(normalizeHighlightLanguage('yml'), 'yaml');
assert.equal(normalizeHighlightLanguage('unknown'), 'text');
```

- [x] **Step 2: Run focused tests and verify failure**

Run:

```bash
cd site
node --import tsx --test lib/markdown-headings.test.ts lib/highlight-code.test.ts
```

Expected: FAIL on missing heading functions and unsupported languages.

- [x] **Step 3: Implement deterministic Markdown heading extraction**

Parse ATX level-two through level-four headings outside fenced blocks. Generate Unicode-safe IDs, collapse whitespace to hyphens, remove formatting punctuation, and suffix duplicates with `-2`, `-3`, and so on.

- [x] **Step 4: Extend Shiki with direct, Worker-safe grammars**

Import only:

```ts
import bash from 'shiki/langs/bash.mjs';
import json from 'shiki/langs/json.mjs';
import python from 'shiki/langs/python.mjs';
import yaml from 'shiki/langs/yaml.mjs';
```

Continue using `createHighlighterCore` and `createJavaScriptRegexEngine`; do not restore the full Shiki bundle or Oniguruma WASM.

- [x] **Step 5: Render fenced code through async Shiki components**

Use `MarkdownAsync` from `react-markdown`. Inline code remains a normal `<code>`. Fenced code removes the wrapper `<pre>` supplied by React Markdown and renders the controlled Shiki `<pre class="shiki">` output. Parse math with `remark-math` and render safe KaTeX with `rehype-katex`; raw Markdown HTML remains disabled.

- [x] **Step 6: Implement the responsive table of contents**

`TableOfContents` is a client component that computes the last heading above the sticky-header threshold on scroll and resize. Render a desktop `<nav aria-label="本文目录">` and a mobile `<details>` from the same heading data. Links use `aria-current="location"`; percent-encoded hashes are decoded before matching Chinese heading IDs, and the desktop directory scrolls in the same frame to center the active link. Long notes expose a working return-to-top control.

- [x] **Step 7: Run Markdown tests, typecheck, and a note render request**

Run:

```bash
cd site
npm test
npm run typecheck
curl -fsS http://172.17.164.39:3000/notes/docs/weekly/2026-W34.md >/dev/null
```

Expected: heading/highlight tests pass and the note artifact responds without a runtime error.

---

### Task 4: Add roadmap-aware artifact detail pages

**Files:**
- Create: `site/components/artifact-context.tsx`
- Create: `site/components/code-artifact.tsx`
- Create: `site/lib/artifact-presentation.ts`
- Create: `site/lib/artifact-presentation.test.ts`
- Create: `site/app/artifacts/[id]/page.tsx`
- Modify: `site/app/notes/[...path]/page.tsx`
- Modify: `site/app/code/[...path]/page.tsx`
- Modify: `site/app/notebooks/[...path]/page.tsx`
- Modify: `site/app/notes/page.tsx`
- Modify: `site/app/code/page.tsx`
- Modify: `site/app/notebooks/page.tsx`
- Delete: `site/components/content-list.tsx`

**Interfaces:**
- Consumes: artifact lookups, `MarkdownDocument`, `CodeViewer`, and `NotebookViewer`.
- Produces: `/artifacts/[id]` as the primary artifact route and roadmap-contextual direct file routes.

- [x] **Step 1: Write route-data tests for artifact presentation**

Add pure helper tests for `artifactPresentation(artifact, content)` that assert a note returns one Markdown document, a code artifact returns one entry plus supporting files, and an unknown artifact returns `undefined`.

- [x] **Step 2: Run the route-data test and verify failure**

Run: `cd site && node --import tsx --test lib/artifact-presentation.test.ts`

Expected: FAIL because the presentation helper does not exist.

- [x] **Step 3: Implement the unified artifact page**

The route must use `generateStaticParams`, exact ID lookup, `notFound()`, and item-specific metadata. Render:

- note: artifact context, article title, `MarkdownDocument` and table of contents;
- code: artifact context, summary, compact role-labelled file index, then the entry file with Shiki;
- notebook: artifact context and safe saved outputs.

- [x] **Step 4: Add roadmap context to direct content routes**

Every direct note/code/notebook page resolves its owning artifact. The compact context bar links to every associated week and the artifact page. Unknown and unowned paths return 404 rather than appearing as repository-wide content.

- [x] **Step 5: Remove repository-wide list behavior**

Make `/notes`, `/code`, and `/notebooks` redirect to `/#roadmap`. Remove `ContentList` and all copy that advertises global note/code/notebook counts or collections.

- [x] **Step 6: Run route tests and request representative pages**

Run:

```bash
cd site
npm test
npm run typecheck
curl -fsS http://172.17.164.39:3000/artifacts/environment-check >/dev/null
curl -fsS http://172.17.164.39:3000/code/learning/00-environment/environment_check.py >/dev/null
```

Expected: both artifact and direct source pages render with roadmap context.

---

### Task 5: Rebuild the roadmap as the only primary surface

**Files:**
- Modify: `site/app/page.tsx`
- Modify: `site/app/roadmap/page.tsx`
- Modify: `site/app/roadmap/roadmap-client.tsx`
- Create: `site/components/roadmap-artifacts.tsx`
- Create: `site/lib/roadmap-artifacts.ts`
- Create: `site/lib/roadmap-artifacts.test.ts`
- Modify: `site/components/site-header.tsx`
- Modify: `site/components/site-footer.tsx`

**Interfaces:**
- Consumes: roadmap data, `artifactsForWeek`, and `artifactHref`.
- Produces: one root roadmap experience with compact phase navigation, weekly outline, artifact groups, and a compact ability-domain view.

- [x] **Step 1: Write failing roadmap artifact grouping tests**

Test a pure `groupArtifactsForWeek` helper:

```ts
assert.deepEqual(groupArtifactsForWeek(artifacts, 1), {
  notes: ['weekly-2026-w34'],
  code: ['environment-check'],
  notebooks: [],
});
```

Assert future weeks with no artifacts return empty arrays and do not request placeholder cards.

- [x] **Step 2: Run the focused test and verify failure**

Run: `cd site && node --import tsx --test lib/roadmap-artifacts.test.ts`

Expected: FAIL because the grouping helper does not exist.

- [x] **Step 3: Replace the four-entry home page with roadmap content**

`/` renders the roadmap directly. `/roadmap` renders the same server entry for compatibility. Remove the four large entry cards, latest-note panel, decorative weekly-brief card, and repeated count-based marketing copy.

- [x] **Step 4: Rebuild the roadmap client around continuous reading**

Use this visible order:

1. compact annual heading and one-paragraph orientation;
2. seven phase jump links;
3. view switch for “按周推进 / 能力域”;
4. compact phase filter;
5. border-separated weekly rows;
6. expanded week details and learning artifacts.

Keep expand/collapse, phase filtering, keyboard buttons, and the existing week content. Do not render empty artifact groups.

- [x] **Step 5: Replace category cards with a flat ability-domain index**

Each domain uses a heading, summary, topics, evidence, core links, and associated week buttons separated by rules. Avoid background panels and min-height values that force blank space.

- [x] **Step 6: Simplify the site shell**

Header contains only the brand and the current context when present; a single Roadmap does not need its own tab. Footer contains one compact repository-purpose sentence and a return-to-roadmap link. Remove the five-tab navigation and duplicate “查看路线” call to action.

- [x] **Step 7: Run tests and verify roadmap behavior**

Run:

```bash
cd site
npm test
npm run typecheck
curl -fsS http://172.17.164.39:3000/ >/dev/null
curl -fsS http://172.17.164.39:3000/roadmap >/dev/null
```

Expected: both routes render the roadmap; W01 exposes the environment and weekly-note artifacts and W03 has no empty artifact panel.

---

### Task 6: Establish balanced content-first visual rhythm

**Files:**
- Modify: `site/app/globals.css`
- Modify: `site/app/layout.tsx`

**Interfaces:**
- Consumes: final semantic class names from Tasks 3–5.
- Produces: desktop and mobile styling with readable type, functional whitespace, restrained grouping, sticky TOC, and safe overflow.

- [x] **Step 1: Remove obsolete card and silo styles**

Delete selectors used only by the old hero, entry grid, global content lists, large category cards, decorative brief card, and five-tab header. Do not leave unreachable CSS that can hide later regressions.

- [x] **Step 2: Define explicit typography variables**

Add:

```css
:root {
  --sans: var(--font-geist-sans), 'PingFang SC', 'Microsoft YaHei',
    'Noto Sans CJK SC', sans-serif;
  --mono: ui-monospace, 'Cascadia Mono', 'Cascadia Code', Consolas,
    'Liberation Mono', Menlo, monospace;
  --reading-width: 760px;
  --toc-width: 220px;
}
```

All inline code, fenced code, source code, paths, line numbers, and metadata use `--mono`.

- [x] **Step 3: Implement the page rhythm from the spec**

Use a `1280px` outer content width, `56–80px` page-top padding, `40–56px` article titles, `17–18px` article text, and `56–72px` major section gaps. Do not apply a global min-height to cards or sections.

- [x] **Step 4: Style the roadmap without flattening hierarchy**

Use phase headings, gold rules, blue active states, and restrained tinted backgrounds only for selected/expanded states. Weekly rows must remain scannable; expanded details gain breathing room without becoming isolated oversized cards.

- [x] **Step 5: Style article, TOC, and code surfaces**

Desktop article grid is `minmax(0, 760px) 220px` with a measured gap. TOC is sticky and scrollable within the viewport. Body and code use compact `line-height: 1.60–1.65`; code also uses `14–15px`, `tab-size: 2`, `white-space: pre`, and horizontal overflow. Merge a Markdown horizontal rule immediately before H2 into the heading separator so H2 spacing is identical with or without `---`. Remove the thick gold code shadow.

- [x] **Step 6: Add responsive breakpoints that preserve reading comfort**

At the first width that cannot fit both columns, hide the desktop TOC and show the mobile `<details>`. Below `640px`, use `18–22px` page gutters, stack weekly detail columns, keep `16–17px` body type, and allow only code/tables to scroll horizontally.

- [x] **Step 7: Run lint and production build**

Run:

```bash
cd site
npm run lint
npm run build
```

Expected: no unused JSX/CSS-induced lint issues; root, artifact, note, code, notebook, and roadmap routes appear in the build.

---

### Task 7: Update documentation and perform real visual acceptance

**Files:**
- Modify: `README.md`
- Modify: `site/README.md`
- Modify: `docs/superpowers/plans/2026-08-23-roadmap-centered-site-redesign.md`
- Verify: all task-owned files

**Interfaces:**
- Consumes: the complete redesigned site.
- Produces: current editing guidance, test evidence, visual screenshots, and an uncommitted handoff.

- [x] **Step 1: Update repository and site documentation**

Document `roadmap/artifacts.json`, artifact ownership rules, orphan build failures, the roadmap-first URL structure, content refresh commands, and the fact that collection README files are not presented as notes.

- [x] **Step 2: Run the full clean verification suite**

Run:

```bash
cd site
npm ci
npm test
npm run validate:data
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
cd ..
TMPDIR=/tmp TEMP=/tmp TMP=/tmp uv run pytest -q
git diff --check
```

Expected: all commands exit zero; production dependencies report zero known vulnerabilities.

- [x] **Step 3: Audit data ownership and routes**

Verify:

```bash
find roadmap -maxdepth 2 -type f -print | sort
git check-ignore -v site/.generated/content.json site/node_modules site/dist site/.vinext site/.wrangler
```

Expected: roadmap contains its README plus `roadmap.json` and `artifacts.json`; generated artifacts remain ignored; hosting config identity is unchanged.

- [x] **Step 4: Capture desktop visual acceptance screenshots**

With the retained server on `0.0.0.0:3000`, capture at `1440x1000`:

```bash
google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1440,1000 --screenshot=/tmp/music-ai-roadmap.png \
  http://172.17.164.39:3000/
google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1440,1000 --screenshot=/tmp/music-ai-note.png \
  http://172.17.164.39:3000/artifacts/weekly-2026-w34
google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1440,1000 --screenshot=/tmp/music-ai-code.png \
  http://172.17.164.39:3000/artifacts/environment-check
```

Inspect the images directly. Reject the build if a hero or title consumes half the viewport, content begins after a large blank area, Markdown code is monochrome/proportional, the TOC is missing, or artifact context is unclear.

- [x] **Step 5: Capture narrow-screen visual acceptance screenshots**

Repeat roadmap and note captures at `390x844`. Confirm readable body size, expandable TOC, stacked week details, intact code horizontal scrolling, and no page-level horizontal overflow.

- [x] **Step 6: Prepare the final local handoff without source-control mutation**

Run `git status --short --untracked-files=all`, report the independent code-review result and verification evidence, keep the local server running, and provide `http://172.17.164.39:3000/`. Do not stage, commit, push, or publish.

---

### Task 8: Convert the validated site to static export

**Files:**
- Modify: `site/next.config.ts`
- Modify: `site/app/artifacts/[id]/page.tsx`
- Modify: `site/app/code/[...path]/page.tsx`
- Modify: `site/app/code/page.tsx`
- Modify: `site/app/notes/page.tsx`
- Modify: `site/app/notebooks/page.tsx`
- Modify: `site/components/code-artifact.tsx`
- Create: `site/components/roadmap-redirect.tsx`
- Modify: `site/lib/artifacts.ts`
- Modify: `site/scripts/spa-navigation.acceptance.mjs`
- Create: `site/scripts/static-export.acceptance.mjs`

**Interfaces:**
- Consumes: validated generated content, concrete static params, and Vinext's emitted HTML/RSC files.
- Produces: `output: 'export'`, static `/code/[...path]` file selection, static compatibility entry pages, and browser acceptance that rejects document-replacing navigation.

- [x] **Step 1: Add failing static artifact and SPA acceptance**

Assert that the root, compatibility entries, representative artifact/note routes, and a test-source route exist as static HTML. Use a real Chrome document marker to reject hard navigation.

- [x] **Step 2: Enable Vinext static export**

Set `output: 'export'`, keep `generateStaticParams` for concrete content, and remove request-time search-parameter selection from the artifact route.

- [x] **Step 3: Route every exercise file through a concrete code path**

Replace `?file=...` links with `/code/<repository path>`. Make the direct code route render the owning artifact's compact file directory and select the requested file inside it.

- [x] **Step 4: Preserve legacy collection entry behavior**

Pre-render `/notes`, `/code`, and `/notebooks` with a client redirect and visible fallback link to `/#roadmap`, so static hosting does not turn the former entry routes into 404 pages.

- [x] **Step 5: Emulate the Sites RSC response contract in acceptance**

Serve the emitted `.rsc` file for `_rsc` requests with the build's `X-Vinext-RSC-Compatibility-Id`. This matches the Worker protocol and proves static files retain SPA transitions.

- [x] **Step 6: Verify the complete static build**

Run unit tests, roadmap validation, TypeScript, ESLint, production build, static artifact acceptance, and the real-Chrome SPA suite. The build must pre-render every concrete content route; an empty Notebook dynamic template may remain skipped until a real Notebook exists.
